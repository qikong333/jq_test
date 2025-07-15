import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { BasicCanvasProps, CanvasState, GridCoordinate } from '../types/canvas'
import type { DrawEvent } from '../types/events'
import type { CanvasStateCache } from '../types/performance'
import { useGrid } from './useGrid'
import { useBrush } from './useBrush'
import { useColors } from './useColors'
import { useViewport } from './useViewport'
import { useHistory } from './useHistory'
import { useGridStorage } from './useGridStorage'
import { useWindowsOptimization } from './useWindowsOptimization'
import { screenToCanvas } from '../utils/coordinateUtils'

/**
 * Canvas状态缓存管理类
 */
class CanvasStateCacheManager {
  private cache: CanvasStateCache = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 0,
  }
  private isDirty = true

  applyState(ctx: CanvasRenderingContext2D, newState: Partial<CanvasStateCache>): void {
    let hasChanges = false

    if (newState.fillStyle !== undefined && newState.fillStyle !== this.cache.fillStyle) {
      ctx.fillStyle = newState.fillStyle
      this.cache.fillStyle = newState.fillStyle
      hasChanges = true
    }

    if (newState.strokeStyle !== undefined && newState.strokeStyle !== this.cache.strokeStyle) {
      ctx.strokeStyle = newState.strokeStyle
      this.cache.strokeStyle = newState.strokeStyle
      hasChanges = true
    }

    if (newState.lineWidth !== undefined && newState.lineWidth !== this.cache.lineWidth) {
      ctx.lineWidth = newState.lineWidth
      this.cache.lineWidth = newState.lineWidth
      hasChanges = true
    }

    if (newState.globalAlpha !== undefined && newState.globalAlpha !== this.cache.globalAlpha) {
      ctx.globalAlpha = newState.globalAlpha
      this.cache.globalAlpha = newState.globalAlpha
      hasChanges = true
    }

    if (hasChanges) {
      this.isDirty = false
    }
  }

  reset(): void {
    this.cache = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 0,
    }
    this.isDirty = true
  }

  getCache(): CanvasStateCache {
    return { ...this.cache }
  }
}

// 全局Canvas状态缓存实例
const canvasStateCache = new CanvasStateCacheManager()

/**
 * 获取Canvas状态缓存
 * @returns Canvas状态缓存
 */
export function getCanvasStateCache(): CanvasStateCache {
  return canvasStateCache.getCache()
}

/**
 * 重置Canvas状态缓存
 */
export function resetCanvasStateCache(): void {
  canvasStateCache.reset()
}

/**
 * Canvas核心逻辑Composable
 * 整合所有子系统，提供完整的画布功能
 */
export function useCanvas(
  props: BasicCanvasProps,
  canvasRef?: Ref<HTMLCanvasElement | undefined>,
  containerRef?: Ref<HTMLDivElement | undefined>,
) {
  // DOM引用
  const _canvasRef = canvasRef || ref<HTMLCanvasElement>()
  const _containerRef = containerRef || ref<HTMLDivElement>()

  // Canvas上下文
  const ctx = ref<CanvasRenderingContext2D>()

  // 画布状态
  const canvasState = ref<CanvasState>({
    isDrawing: false,
    isPanning: false,
    currentTool: 'brush',
    zoom: 1,
    pan: { x: 0, y: 0 },
  })

  // 初始化子系统
  const gridSystem = useGrid(props)
  const colorSystem = useColors()
  const brushSystem = useBrush(gridSystem.gridData.value)
  const viewportSystem = useViewport(props, _canvasRef)
  const gridStorageSystem = useGridStorage()
  const windowsOptimization = useWindowsOptimization()

  // 存储系统
  const gridStorage = gridStorageSystem.gridStorage

  // 历史记录系统
  const historySystem = useHistory(gridStorage, props.width ?? 400, props.height ?? 800, {
    maxActions: props.maxUndoSteps || 50,
    maxMemoryMB: 100,
    snapshotInterval: 10,
    tileSize: 512,
    maxTiles: 100,
  })

  // 事件节流
  const lastDrawTime = ref(0)
  const lastFrameTime = ref(0)

  // 动态节流系统（集成Windows优化）
  const adaptiveThrottle = {
    get baseDelay() {
      // 使用Windows优化配置或默认值
      const perfConfig = windowsOptimization.getOptimizedPerformanceConfig()
      return perfConfig?.eventThrottling || 16
    },
    get maxDelay() {
      const perfConfig = windowsOptimization.getOptimizedPerformanceConfig()
      return perfConfig?.eventThrottling ? perfConfig.eventThrottling * 6 : 100
    },
    get performanceThreshold() {
      const perfConfig = windowsOptimization.getOptimizedPerformanceConfig()
      return perfConfig?.eventThrottling || 16.67
    },

    getDelay(frameTime: number): number {
      if (frameTime > this.performanceThreshold * 2) {
        return Math.min(this.maxDelay, this.baseDelay * 2)
      } else if (frameTime > this.performanceThreshold * 1.5) {
        return Math.min(this.maxDelay, this.baseDelay * 1.5)
      }
      return this.baseDelay
    },
  }

  // 渲染节流相关 - 预留用于性能优化
  let renderRequest = 0

  // 增量渲染系统
  const renderState = {
    isDirty: false,
    lastCellCount: 0,
    lastViewport: { zoom: 1, pan: { x: 0, y: 0 } },

    markDirty() {
      this.isDirty = true
    },

    shouldRender(): boolean {
      const currentCellCount = gridStorage.value?.getAllPaintedCells().length || 0
      const currentViewport = viewportSystem.viewportState

      // 检查是否需要重新渲染
      const cellCountChanged = currentCellCount !== this.lastCellCount
      const viewportChanged =
        currentViewport.zoom !== this.lastViewport.zoom ||
        currentViewport.pan.x !== this.lastViewport.pan.x ||
        currentViewport.pan.y !== this.lastViewport.pan.y

      if (cellCountChanged || viewportChanged || this.isDirty) {
        this.lastCellCount = currentCellCount
        this.lastViewport = { ...currentViewport }
        this.isDirty = false
        return true
      }

      return false
    },
  }

  /**
   * 初始化Canvas
   */
  const initCanvas = () => {
    if (!_canvasRef.value || !_containerRef.value) return

    const canvas = _canvasRef.value
    // 容器引用已在条件检查中验证

    // 获取设备像素比，确保高DPI屏幕显示清晰
    const dpr = window.devicePixelRatio || 1

    // 设置Canvas尺寸
    const { physicalSize } = gridSystem.gridData.value

    // 设置Canvas的实际像素尺寸（考虑设备像素比）
    canvas.width = physicalSize.width * dpr
    canvas.height = physicalSize.height * dpr

    // 设置Canvas的显示尺寸
    canvas.style.width = physicalSize.width + 'px'
    canvas.style.height = physicalSize.height + 'px'

    // 获取上下文（使用Windows优化配置）
    const contextOptions: CanvasRenderingContext2DSettings = {
      alpha: true,
      willReadFrequently: false,
    }

    // 应用Windows特定的上下文配置
    if (windowsOptimization.isWindowsSystem.value && windowsOptimization.windowsConfig.value) {
      const winConfig = windowsOptimization.windowsConfig.value
      contextOptions.willReadFrequently = winConfig.willReadFrequently
      contextOptions.alpha = winConfig.alpha
    }

    const context = canvas.getContext('2d', contextOptions)
    if (!context) {
      console.error('Failed to get canvas context')
      return
    }

    // 应用Windows Canvas样式优化
    if (windowsOptimization.isWindowsSystem.value) {
      windowsOptimization.applyCanvasOptimizations(canvas)
    } else {
      // 标准设备像素比处理
      context.scale(dpr, dpr)
    }

    ctx.value = context

    // 初始化网格存储通过gridStorageSystem
    gridStorageSystem.initStorage(props.width ?? 400, props.height ?? 800)

    // 设置Canvas属性（考虑Windows优化）
    const enableImageSmoothing =
      windowsOptimization.windowsConfig.value?.renderingOptimizations?.enableImageSmoothing ?? false
    context.imageSmoothingEnabled = enableImageSmoothing

    // 确保线条渲染清晰
    context.translate(0.5, 0.5)

    // 绑定事件（使用Windows优化的事件处理）
    bindEvents()

    // 初始渲染
    render()
  }

  /**
   * 绑定鼠标事件
   */
  const bindEvents = () => {
    if (!_canvasRef.value) return

    const canvas = _canvasRef.value

    // 获取Windows优化的事件配置
    const eventOptions =
      windowsOptimization.isWindowsSystem.value && windowsOptimization.eventConfig.value
        ? { passive: windowsOptimization.eventConfig.value.mouseEvents.passive }
        : undefined

    canvas.addEventListener('mousedown', handleMouseDown, eventOptions)
    canvas.addEventListener('mousemove', handleMouseMove, eventOptions)
    canvas.addEventListener('mouseup', handleMouseUp, eventOptions)
    canvas.addEventListener('mouseleave', handleMouseLeave, eventOptions)

    // Windows触摸事件支持
    if (
      windowsOptimization.isWindowsSystem.value &&
      windowsOptimization.systemCapabilities.value?.supportsTouch
    ) {
      // 使用Windows触摸手势支持
      // 注意：实际的触摸手势处理在useWindowsTouchGestures中实现
      console.log('Windows触摸支持已启用')
    }

    // 阻止右键菜单
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  /**
   * 解绑事件
   */
  const unbindEvents = () => {
    if (!_canvasRef.value) return

    const canvas = _canvasRef.value

    canvas.removeEventListener('mousedown', handleMouseDown)
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.removeEventListener('mouseup', handleMouseUp)
    canvas.removeEventListener('mouseleave', handleMouseLeave)
  }

  /**
   * 获取鼠标在Canvas上的坐标
   * @param event 鼠标事件
   * @returns 坐标信息
   */
  const getMouseCoordinates = (event: MouseEvent) => {
    if (!_canvasRef.value) return null

    const canvas = _canvasRef.value
    const rect = canvas.getBoundingClientRect()

    // 计算鼠标在画布上的相对位置（相对于显示的画布）
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top

    // 使用 screenToCanvas 函数进行正确的坐标转换，考虑缩放和平移
    const canvasCoords = screenToCanvas(rawX, rawY, viewportSystem.viewportState)
    let canvasX = canvasCoords.x
    let canvasY = canvasCoords.y

    // 获取物理尺寸进行边界检查
    const { physicalSize } = gridSystem.gridData.value
    const originalLogicalWidth = physicalSize.width
    const originalLogicalHeight = physicalSize.height

    // 边界检查（使用原始逻辑尺寸）
    canvasX = Math.max(0, Math.min(canvasX, originalLogicalWidth))
    canvasY = Math.max(0, Math.min(canvasY, originalLogicalHeight))

    // 高精度格子坐标计算
    const { cellWidth, cellHeight } = gridSystem.gridData.value
    const gridX = Math.floor(canvasX / cellWidth)
    const gridY = Math.floor(canvasY / cellHeight)

    // 移除调试日志以提升性能

    return {
      pixelX: canvasX,
      pixelY: canvasY,
      gridX,
      gridY,
      x: gridX, // GridCoordinate.x
      y: gridY, // GridCoordinate.y
    }
  }

  /**
   * 鼠标按下事件
   */
  const handleMouseDown = (event: MouseEvent) => {
    if (props.readonly) return

    const coords = getMouseCoordinates(event)
    if (!coords) return

    canvasState.value.isDrawing = true
    canvasState.value.lastDrawnCell = { x: coords.x, y: coords.y }

    // 开始历史记录动作
    historySystem.startAction('draw')

    // 开始绘制
    drawAtPosition(coords.x, coords.y)

    // 触发绘制事件
    emitDrawEvent('start', coords)
  }

  /**
   * 鼠标移动事件
   */
  const handleMouseMove = (event: MouseEvent) => {
    const coords = getMouseCoordinates(event)
    if (!coords) return

    // 更新画笔预览（只在非绘制状态下）
    if (!canvasState.value.isDrawing) {
      brushSystem.updateBrushPreview(
        coords.x,
        coords.y,
        props.width ?? 400,
        props.height ?? 800,
        true,
      )
      // 只在非绘制时才重新渲染画笔预览
      requestRender()
      return
    }

    // 如果正在绘制
    if (canvasState.value.isDrawing && !props.readonly) {
      // 动态节流处理
      const now = performance.now()
      const frameTime = now - lastFrameTime.value
      const throttleDelay = adaptiveThrottle.getDelay(frameTime)

      if (now - lastDrawTime.value < throttleDelay) return

      lastDrawTime.value = now
      lastFrameTime.value = now

      // 连续绘制优化：填充当前格子
      drawAtPosition(coords.x, coords.y)
      renderState.markDirty() // 标记需要重新渲染

      // 如果鼠标移动速度快，使用线性插值填充中间格子
      const lastCell = canvasState.value.lastDrawnCell
      if (lastCell && (lastCell.x !== coords.x || lastCell.y !== coords.y)) {
        fillInterpolatedCells(lastCell, coords)
      }

      canvasState.value.lastDrawnCell = { x: coords.x, y: coords.y }

      // 触发绘制事件
      emitDrawEvent('move', coords)

      // 只在绘制时才重新渲染
      requestRender()
    }
  }

  /**
   * 优化的线性插值填充
   */
  const fillInterpolatedCells = (
    lastCell: GridCoordinate,
    coords: GridCoordinate & { pixelX: number; pixelY: number },
  ) => {
    // 计算当前点与上一点之间的距离
    const dx = coords.x - lastCell.x
    const dy = coords.y - lastCell.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // 如果距离太小，跳过插值
    if (distance < 1.5) return

    // 计算需要插入的点数量，限制最大步数防止性能问题
    const steps = Math.min(Math.ceil(distance * 2), 50) // 降低最大步数

    // 跟踪已经填充过的格子，避免重复
    const filledCellIndices = new Set<string>()
    filledCellIndices.add(`${coords.x},${coords.y}`)
    filledCellIndices.add(`${lastCell.x},${lastCell.y}`)

    // 使用线性插值填充中间点
    for (let i = 1; i < steps; i++) {
      const ratio = i / steps
      const midGridX = Math.round(lastCell.x + dx * ratio)
      const midGridY = Math.round(lastCell.y + dy * ratio)
      const cellIndexKey = `${midGridX},${midGridY}`

      if (!filledCellIndices.has(cellIndexKey)) {
        filledCellIndices.add(cellIndexKey)
        drawAtPosition(midGridX, midGridY)
      }
    }
    renderState.markDirty() // 标记需要重新渲染
  }

  /**
   * 请求渲染（使用requestAnimationFrame节流和增量渲染）
   */
  const requestRender = () => {
    if (renderRequest) return

    renderRequest = requestAnimationFrame(() => {
      // 只在需要时渲染
      if (renderState.shouldRender()) {
        render()
      }
      renderRequest = 0
    })
  }

  /**
   * 鼠标抬起事件
   */
  const handleMouseUp = (event: MouseEvent) => {
    if (!canvasState.value.isDrawing) return

    const coords = getMouseCoordinates(event)
    if (coords) {
      emitDrawEvent('end', coords)
    }

    canvasState.value.isDrawing = false
    canvasState.value.lastDrawnCell = undefined

    // 完成历史记录动作
    historySystem.finishAction()
  }

  /**
   * 鼠标离开事件
   */
  const handleMouseLeave = () => {
    canvasState.value.isDrawing = false
    canvasState.value.lastDrawnCell = undefined
    brushSystem.hideBrushPreview()
    render()
  }

  /**
   * 在指定格子位置绘制
   * @param gridX 格子X坐标
   * @param gridY 格子Y坐标
   */
  const drawAtPosition = (gridX: number, gridY: number) => {
    if (!ctx.value || !gridStorage.value) return

    // 高精度边界检查
    if (gridX < 0 || gridY < 0 || gridX >= (props.width ?? 400) || gridY >= (props.height ?? 800)) {
      return // 移除console.warn减少性能开销
    }

    // 获取当前颜色和旧颜色
    const currentColor = colorSystem.currentColor.value
    const oldColor = gridStorage.value.getCell(gridX, gridY)

    // 记录历史变化
    historySystem.recordChange(gridX, gridY, oldColor, currentColor)

    // 存储到网格存储
    gridStorage.value.setCell(gridX, gridY, currentColor)

    // 获取格子的精确像素边界
    const { cellWidth, cellHeight } = gridSystem.gridData.value
    const cellPixelX = gridX * cellWidth
    const cellPixelY = gridY * cellHeight

    // 高性能绘制设置
    ctx.value.save()
    ctx.value.imageSmoothingEnabled = false
    ctx.value.fillStyle = currentColor

    // 使用精确的像素坐标进行填充
    ctx.value.fillRect(
      Math.round(cellPixelX),
      Math.round(cellPixelY),
      Math.round(cellWidth),
      Math.round(cellHeight),
    )

    ctx.value.restore()
  }

  /**
   * 触发绘制事件
   * @param type 事件类型
   * @param coords 坐标信息
   */
  const emitDrawEvent = (
    type: DrawEvent['type'],
    coords: GridCoordinate & { pixelX: number; pixelY: number },
  ) => {
    // 创建绘制事件对象
    const drawEvent: DrawEvent = {
      type,
      gridX: coords.x,
      gridY: coords.y,
      pixelX: coords.pixelX,
      pixelY: coords.pixelY,
      color: colorSystem.currentColor.value,
      brushSize: brushSystem.brushConfig.value.sizeCm,
      timestamp: Date.now(),
    }
    // 事件发射逻辑可在此处添加
    console.log('Draw event:', drawEvent)
  }

  /**
   * 渲染画布（优化版本）
   */
  const render = () => {
    if (!ctx.value || !gridStorage.value) return

    const renderStartTime = performance.now()
    const context = ctx.value
    const { physicalSize } = gridSystem.gridData.value
    const dpr = window.devicePixelRatio || 1

    // 保存当前状态
    context.save()

    // 重置变换并应用设备像素比
    context.setTransform(dpr, 0, 0, dpr, 0.5, 0.5)

    // 清空画布（使用实际像素尺寸）
    context.clearRect(0, 0, physicalSize.width, physicalSize.height)

    // 绘制背景（使用缓存）
    if (props.bgColor) {
      canvasStateCache.applyState(context, { fillStyle: props.bgColor })
      context.fillRect(0, 0, physicalSize.width, physicalSize.height)
    }

    // 绘制网格
    gridSystem.drawGrid(
      context,
      physicalSize.width,
      physicalSize.height,
      viewportSystem.viewportState,
    )

    // 绘制格子（已优化）
    drawGridCells(context)

    // 绘制画笔预览
    const { cellWidth, cellHeight } = gridSystem.gridData.value
    brushSystem.drawBrushPreview(
      context,
      cellWidth * viewportSystem.viewportState.zoom,
      cellHeight * viewportSystem.viewportState.zoom,
      viewportSystem.viewportState.pan.x,
      viewportSystem.viewportState.pan.y,
    )

    // 恢复状态
    context.restore()

    // 性能监控
    const renderTime = performance.now() - renderStartTime
    lastFrameTime.value = renderTime

    // 可选：输出性能统计（开发模式）
    if (import.meta.env.DEV && renderTime > 16.67) {
      console.warn(`渲染耗时: ${renderTime.toFixed(2)}ms (超过60fps阈值)`)
    }
  }

  /**
   * 检查格子是否在视口内
   * @param cell 格子信息
   * @param cellWidth 格子宽度
   * @param cellHeight 格子高度
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @returns 是否在视口内
   */
  const isInViewport = (
    cell: { x: number; y: number },
    cellWidth: number,
    cellHeight: number,
    canvasWidth: number,
    canvasHeight: number,
  ): boolean => {
    const { zoom, pan } = viewportSystem.viewportState
    const x = cell.x * cellWidth * zoom + pan.x
    const y = cell.y * cellHeight * zoom + pan.y
    const scaledCellWidth = cellWidth * zoom
    const scaledCellHeight = cellHeight * zoom

    // 检查格子是否与视口相交
    return (
      x < canvasWidth && y < canvasHeight && x + scaledCellWidth > 0 && y + scaledCellHeight > 0
    )
  }

  /**
   * 按颜色分组格子
   * @param cells 格子数组
   * @returns 按颜色分组的Map
   */
  const groupCellsByColor = (cells: Array<{ x: number; y: number; color?: string }>) => {
    const colorGroups = new Map<string, Array<{ x: number; y: number }>>()

    cells.forEach((cell) => {
      if (cell.color) {
        if (!colorGroups.has(cell.color)) {
          colorGroups.set(cell.color, [])
        }
        colorGroups.get(cell.color)!.push({ x: cell.x, y: cell.y })
      }
    })

    return colorGroups
  }

  /**
   * 绘制格子内容（优化版本）
   * @param context Canvas上下文
   */
  const drawGridCells = (context: CanvasRenderingContext2D) => {
    if (!gridStorage.value) return

    const { cellWidth, cellHeight, physicalSize } = gridSystem.gridData.value
    const { zoom, pan } = viewportSystem.viewportState
    const paintedCells = gridStorage.value.getAllPaintedCells()

    // 性能优化1: 视口裁剪 - 只处理可见的格子
    const visibleCells = paintedCells.filter(
      (cell) =>
        cell.color &&
        isInViewport(cell, cellWidth, cellHeight, physicalSize.width, physicalSize.height),
    )

    // 如果没有可见格子，直接返回
    if (visibleCells.length === 0) return

    // 性能优化2: 颜色分组 - 按颜色分组以减少状态切换
    const colorGroups = groupCellsByColor(visibleCells)

    context.save()

    // 性能优化3: 批量渲染 - 相同颜色的格子一次性渲染
    colorGroups.forEach((cells, color) => {
      // 只设置一次颜色状态
      canvasStateCache.applyState(context, { fillStyle: color })

      // 批量绘制相同颜色的格子
      cells.forEach((cell) => {
        const x = cell.x * cellWidth * zoom + pan.x
        const y = cell.y * cellHeight * zoom + pan.y
        const scaledCellWidth = cellWidth * zoom
        const scaledCellHeight = cellHeight * zoom
        context.fillRect(x, y, scaledCellWidth, scaledCellHeight)
      })
    })

    context.restore()
    // 重置缓存状态
    canvasStateCache.reset()
  }

  /**
   * 清空画布
   * @param saveToHistory 是否保存到历史记录，默认为true
   */
  const clearCanvas = (saveToHistory: boolean = true) => {
    if (!gridStorage.value) return

    if (saveToHistory) {
      // 开始清空动作的历史记录
      historySystem.startAction('clear')

      // 记录所有已绘制格子的变化
      const paintedCells = gridStorage.value.getAllPaintedCells()
      for (const cell of paintedCells) {
        historySystem.recordChange(cell.x, cell.y, cell.color || 'transparent', 'transparent')
      }
    }

    // 清空网格存储
    gridStorage.value.clear()

    if (saveToHistory) {
      // 完成历史记录动作
      historySystem.finishAction()
    }

    render()
  }

  /**
   * 导出Canvas为图像
   * @param format 图像格式
   * @returns 图像数据URL
   */
  const exportImage = (format: 'png' | 'jpeg' = 'png'): string => {
    if (!_canvasRef.value) return ''

    return _canvasRef.value.toDataURL(`image/${format}`)
  }

  /**
   * 获取Canvas统计信息
   */
  const getCanvasStats = () => {
    if (!gridStorage.value) return null

    return {
      ...gridStorage.value.getStats(),
      usedColors: gridStorage.value.getUsedColors(),
      canvasSize: gridSystem.gridData.value,
      brushInfo: brushSystem.getBrushInfo(),
    }
  }

  // 监听视口缩放变化，同步到网格系统
  watch(
    () => viewportSystem.viewportState.zoom,
    (newZoom) => {
      gridSystem.syncZoom(newZoom)
    },
  )

  // 生命周期
  onMounted(() => {
    initCanvas()
  })

  onUnmounted(() => {
    unbindEvents()
  })

  return {
    // DOM引用
    canvasRef: _canvasRef,
    containerRef: _containerRef,

    // 状态
    canvasState,

    // 子系统
    gridSystem,
    colorSystem,
    brushSystem,
    viewportSystem,
    historySystem,

    // 方法
    initCanvas,
    render,
    requestRender, // 暴露requestRender方法
    clearCanvas,
    exportImage,
    getCanvasStats,

    // 历史记录方法
    undo: historySystem.undo,
    redo: historySystem.redo,
    canUndo: historySystem.canUndo,
    canRedo: historySystem.canRedo,
    clearHistory: historySystem.clear,

    // 存储
    gridStorage,

    // Windows优化
    windowsOptimization,
  }
}
