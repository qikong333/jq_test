import { ref } from 'vue'
import type {
  ViewportState,
  GridData,
  GridVisibility,
  GridRenderConfig,
  UseGridRendererReturn,
} from '../types/grid'

/**
 * 网格渲染器 Composable
 * 负责高性能的网格渲染和Canvas操作
 */
export function useGridRenderer(): UseGridRendererReturn {
  // 渲染统计
  const renderStats = ref({
    lastRenderTime: 0,
    frameCount: 0,
    averageRenderTime: 0,
  })

  // 渲染缓存
  const renderCache = ref<Map<string, ImageData>>(new Map())

  /**
   * 高性能网格渲染
   * @param ctx Canvas上下文
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @param gridData 网格数据
   * @param gridVisibility 网格可见性
   * @param gridConfig 网格配置
   * @param viewportState 视口状态
   */
  const renderGrid = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    gridData: GridData,
    gridVisibility: GridVisibility,
    gridConfig: GridRenderConfig,
    viewportState: ViewportState,
  ) => {
    const startTime = performance.now()

    // 如果网格不可见，直接返回
    if (!gridVisibility.showGrid) {
      return
    }

    // 设置高性能渲染模式
    ctx.save()

    // 禁用抗锯齿以获得像素完美的网格线
    ctx.imageSmoothingEnabled = false

    // 设置线条样式
    ctx.globalAlpha = gridConfig.opacity * gridVisibility.opacity
    ctx.strokeStyle = gridConfig.color

    // 确保线宽在高DPI屏幕上正确显示
    const dpr = window.devicePixelRatio || 1
    ctx.lineWidth = gridVisibility.lineWidth / dpr

    // 计算可见网格范围
    const { cellWidth, cellHeight } = gridData
    const scaledCellWidth = cellWidth * viewportState.zoom
    const scaledCellHeight = cellHeight * viewportState.zoom

    // 计算需要绘制的网格线范围
    const startX = Math.max(0, Math.floor(-viewportState.pan.x / scaledCellWidth))
    const startY = Math.max(0, Math.floor(-viewportState.pan.y / scaledCellHeight))
    const endX = Math.ceil((canvasWidth - viewportState.pan.x) / scaledCellWidth) + 1
    const endY = Math.ceil((canvasHeight - viewportState.pan.y) / scaledCellHeight) + 1

    // 批量绘制垂直线
    ctx.beginPath()
    for (let x = startX; x <= endX; x++) {
      const pixelX = Math.round(x * scaledCellWidth + viewportState.pan.x)
      if (pixelX >= 0 && pixelX <= canvasWidth) {
        ctx.moveTo(pixelX, Math.max(0, viewportState.pan.y))
        ctx.lineTo(pixelX, Math.min(canvasHeight, endY * scaledCellHeight + viewportState.pan.y))
      }
    }

    // 批量绘制水平线
    for (let y = startY; y <= endY; y++) {
      const pixelY = Math.round(y * scaledCellHeight + viewportState.pan.y)
      if (pixelY >= 0 && pixelY <= canvasHeight) {
        ctx.moveTo(Math.max(0, viewportState.pan.x), pixelY)
        ctx.lineTo(Math.min(canvasWidth, endX * scaledCellWidth + viewportState.pan.x), pixelY)
      }
    }

    ctx.stroke()
    ctx.restore()

    // 绘制子网格（如果启用）
    if (gridVisibility.showSubGrid) {
      renderSubGrid(ctx, canvasWidth, canvasHeight, gridData, gridConfig, viewportState)
    }

    // 更新渲染统计
    updateRenderStats(performance.now() - startTime)
  }

  /**
   * 渲染子网格
   * @param ctx Canvas上下文
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @param gridData 网格数据
   * @param gridConfig 网格配置
   * @param viewportState 视口状态
   */
  const renderSubGrid = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    gridData: GridData,
    gridConfig: GridRenderConfig,
    viewportState: ViewportState,
  ) => {
    const { cellWidth, cellHeight } = gridData

    // 子网格间距（每5个格子一条子网格线）
    const subGridSpacingX = cellWidth * 5 * viewportState.zoom
    const subGridSpacingY = cellHeight * 5 * viewportState.zoom

    ctx.save()
    ctx.globalAlpha = gridConfig.subGridOpacity
    ctx.strokeStyle = gridConfig.subGridColor

    // 确保子网格线宽在高DPI屏幕上正确显示
    const dpr = window.devicePixelRatio || 1
    ctx.lineWidth = gridConfig.subGridLineWidth / dpr

    // 计算子网格范围
    const startX = Math.floor(-viewportState.pan.x / subGridSpacingX)
    const startY = Math.floor(-viewportState.pan.y / subGridSpacingY)
    const endX = Math.ceil((canvasWidth - viewportState.pan.x) / subGridSpacingX)
    const endY = Math.ceil((canvasHeight - viewportState.pan.y) / subGridSpacingY)

    // 绘制子网格垂直线
    ctx.beginPath()
    for (let x = startX; x <= endX; x++) {
      const pixelX = x * subGridSpacingX + viewportState.pan.x
      if (pixelX >= 0 && pixelX <= canvasWidth) {
        ctx.moveTo(pixelX, Math.max(0, viewportState.pan.y))
        ctx.lineTo(pixelX, Math.min(canvasHeight, endY * subGridSpacingY + viewportState.pan.y))
      }
    }

    // 绘制子网格水平线
    for (let y = startY; y <= endY; y++) {
      const pixelY = y * subGridSpacingY + viewportState.pan.y
      if (pixelY >= 0 && pixelY <= canvasHeight) {
        ctx.moveTo(Math.max(0, viewportState.pan.x), pixelY)
        ctx.lineTo(Math.min(canvasWidth, endX * subGridSpacingX + viewportState.pan.x), pixelY)
      }
    }

    ctx.stroke()
    ctx.restore()
  }

  /**
   * 清除Canvas
   * @param ctx Canvas上下文
   * @param width Canvas宽度
   * @param height Canvas高度
   */
  const clearCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)
  }

  /**
   * 设置Canvas的高DPI支持
   * @param canvas Canvas元素
   * @param ctx Canvas上下文
   * @param width 逻辑宽度
   * @param height 逻辑高度
   */
  const setupHighDPI = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    const dpr = window.devicePixelRatio || 1

    // 设置Canvas的实际像素尺寸
    canvas.width = width * dpr
    canvas.height = height * dpr

    // 设置Canvas的CSS尺寸
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // 缩放上下文以匹配设备像素比
    ctx.scale(dpr, dpr)
  }

  /**
   * 导出Canvas为图片
   * @param canvas Canvas元素
   * @param format 图片格式
   * @param quality 图片质量（0-1）
   * @returns 图片数据URL
   */
  const exportCanvasAsImage = (
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 1,
  ): string => {
    return canvas.toDataURL(`image/${format}`, quality)
  }

  /**
   * 创建离屏Canvas用于缓存
   * @param width Canvas宽度
   * @param height Canvas高度
   * @returns 离屏Canvas和上下文
   */
  const createOffscreenCanvas = (width: number, height: number) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    setupHighDPI(canvas, ctx, width, height)

    return { canvas, ctx }
  }

  /**
   * 缓存网格渲染结果
   * @param key 缓存键
   * @param imageData 图像数据
   */
  const cacheRenderResult = (key: string, imageData: ImageData) => {
    // 限制缓存大小，避免内存泄漏
    if (renderCache.value.size > 50) {
      const firstKey = renderCache.value.keys().next().value
      if (firstKey) {
        renderCache.value.delete(firstKey)
      }
    }

    renderCache.value.set(key, imageData)
  }

  /**
   * 获取缓存的渲染结果
   * @param key 缓存键
   * @returns 图像数据或null
   */
  const getCachedRenderResult = (key: string): ImageData | null => {
    return renderCache.value.get(key) || null
  }

  /**
   * 清除渲染缓存
   */
  const clearRenderCache = () => {
    renderCache.value.clear()
  }

  /**
   * 更新渲染统计
   * @param renderTime 渲染时间
   */
  const updateRenderStats = (renderTime: number) => {
    renderStats.value.lastRenderTime = renderTime
    renderStats.value.frameCount++

    // 计算平均渲染时间（使用滑动平均）
    const alpha = 0.1
    renderStats.value.averageRenderTime =
      renderStats.value.averageRenderTime * (1 - alpha) + renderTime * alpha
  }

  /**
   * 重置渲染统计
   */
  const resetRenderStats = () => {
    renderStats.value = {
      lastRenderTime: 0,
      frameCount: 0,
      averageRenderTime: 0,
    }
  }

  /**
   * 检查是否需要重新渲染
   * @param lastViewportState 上次的视口状态
   * @param currentViewportState 当前的视口状态
   * @param threshold 变化阈值
   * @returns 是否需要重新渲染
   */
  const shouldRerender = (
    lastViewportState: ViewportState,
    currentViewportState: ViewportState,
    threshold: number = 0.1,
  ): boolean => {
    const zoomDiff = Math.abs(lastViewportState.zoom - currentViewportState.zoom)
    const panXDiff = Math.abs(lastViewportState.pan.x - currentViewportState.pan.x)
    const panYDiff = Math.abs(lastViewportState.pan.y - currentViewportState.pan.y)

    return zoomDiff > threshold || panXDiff > threshold || panYDiff > threshold
  }

  return {
    // 渲染方法
    renderGrid,
    renderSubGrid,
    clearCanvas,

    // Canvas工具
    setupHighDPI,
    exportCanvasAsImage,
    createOffscreenCanvas,

    // 缓存管理
    cacheRenderResult,
    getCachedRenderResult,
    clearRenderCache,

    // 性能监控
    renderStats,
    updateRenderStats,
    resetRenderStats,
    shouldRerender,
  }
}
