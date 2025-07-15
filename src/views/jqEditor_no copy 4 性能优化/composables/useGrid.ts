import { computed, ref, watch } from 'vue'
import type { BasicCanvasProps } from '../types/canvas'
import type { GridData, GridVisibility, GridRenderConfig } from '../types/grid'
import { cmToPx } from '../utils/coordinateUtils'

/**
 * 网格系统Composable
 * 负责网格计算、显示控制和渲染配置
 */
export function useGrid(props: BasicCanvasProps) {
  // 响应式状态
  const showGrid = ref(true)
  const zoom = ref(1)
  const gridRenderConfig = ref<GridRenderConfig>({
    color: '#cccccc',
    subGridColor: '#eeeeee',
    opacity: 0.6,
    subGridOpacity: 0.3,
    lineWidth: 1,
    subGridLineWidth: 0.5,
  })

  /**
   * 计算网格基础数据
   * 使用computed进行缓存，props不变时只计算一次
   */
  const gridData = computed<GridData>(() => {
    const actualWidthPx = cmToPx(props.actualWidth ?? 10)
    const actualHeightPx = cmToPx(props.actualHeight ?? 20)

    return {
      cellWidth: actualWidthPx / (props.width ?? 400),
      cellHeight: actualHeightPx / (props.height ?? 800),
      totalCells: (props.width ?? 400) * (props.height ?? 800),
      physicalSize: {
        width: actualWidthPx,
        height: actualHeightPx,
      },
      dpi: 96,
    }
  })

  /**
   * 计算网格可见性
   * 根据缩放级别智能控制网格显示
   */
  const gridVisibility = computed<GridVisibility>(() => {
    const minCellSize = Math.min(gridData.value.cellWidth, gridData.value.cellHeight)
    const scaledCellSize = minCellSize * zoom.value

    return {
      showGrid: showGrid.value && scaledCellSize >= 2, // 小于2px隐藏网格
      showSubGrid: showGrid.value && scaledCellSize >= 20, // 大于20px显示子网格
      lineWidth: scaledCellSize >= 10 ? 2 : 1, // 动态线宽
      opacity: Math.min(1, scaledCellSize / 10), // 动态透明度
    }
  })

  /**
   * 绘制网格到Canvas
   * @param ctx Canvas上下文
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @param viewportX 视口X偏移
   * @param viewportY 视口Y偏移
   */
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    viewportState: { zoom: number; pan: { x: number; y: number } },
  ) => {
    if (!gridVisibility.value.showGrid) return

    const { cellWidth, cellHeight } = gridData.value
    const { lineWidth, opacity } = gridVisibility.value
    const config = gridRenderConfig.value

    // 设置高性能绘制模式
    ctx.save()
    ctx.globalAlpha = config.opacity * opacity
    ctx.strokeStyle = config.color

    // 确保线宽在高DPI屏幕上正确显示
    const dpr = window.devicePixelRatio || 1
    ctx.lineWidth = lineWidth / dpr

    // 禁用抗锯齿以确保像素完美的网格线
    ctx.imageSmoothingEnabled = false

    // 高精度计算可见范围，避免绘制不可见的网格线
    const scaledCellWidth = cellWidth * viewportState.zoom
    const scaledCellHeight = cellHeight * viewportState.zoom
    const startX = Math.max(0, Math.floor(-viewportState.pan.x / scaledCellWidth))
    const startY = Math.max(0, Math.floor(-viewportState.pan.y / scaledCellHeight))
    const endX = Math.min(props.width ?? 400, Math.ceil((canvasWidth - viewportState.pan.x) / scaledCellWidth) + 1)
    const endY = Math.min(
      props.height ?? 800,
      Math.ceil((canvasHeight - viewportState.pan.y) / scaledCellHeight) + 1,
    )

    // 批量绘制垂直线 - 优化性能
    ctx.beginPath()
    for (let x = startX; x <= endX; x++) {
      const pixelX = Math.round(x * scaledCellWidth + viewportState.pan.x)
      if (pixelX >= 0 && pixelX <= canvasWidth) {
        ctx.moveTo(pixelX, Math.max(0, viewportState.pan.y))
        ctx.lineTo(pixelX, Math.min(canvasHeight, (props.height ?? 800) * scaledCellHeight + viewportState.pan.y))
      }
    }

    // 批量绘制水平线 - 优化性能
    for (let y = startY; y <= endY; y++) {
      const pixelY = Math.round(y * scaledCellHeight + viewportState.pan.y)
      if (pixelY >= 0 && pixelY <= canvasHeight) {
        ctx.moveTo(Math.max(0, viewportState.pan.x), pixelY)
        ctx.lineTo(Math.min(canvasWidth, (props.width ?? 400) * scaledCellWidth + viewportState.pan.x), pixelY)
      }
    }

    ctx.stroke()
    ctx.restore()

    // 绘制子网格（如果启用）
    if (gridVisibility.value.showSubGrid) {
      drawSubGrid(ctx, canvasWidth, canvasHeight, viewportState)
    }
  }

  /**
   * 绘制子网格
   * @param ctx Canvas上下文
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @param viewportX 视口X偏移
   * @param viewportY 视口Y偏移
   */
  const drawSubGrid = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    viewportState: { zoom: number; pan: { x: number; y: number } },
  ) => {
    const { cellWidth, cellHeight } = gridData.value
    const config = gridRenderConfig.value

    // 子网格间距（每5个格子一条子网格线）
    const subGridSpacingX = cellWidth * 5 * viewportState.zoom
    const subGridSpacingY = cellHeight * 5 * viewportState.zoom

    ctx.save()
    ctx.globalAlpha = config.subGridOpacity
    ctx.strokeStyle = config.subGridColor

    // 确保子网格线宽在高DPI屏幕上正确显示
    const dpr = window.devicePixelRatio || 1
    ctx.lineWidth = config.subGridLineWidth / dpr

    // 绘制子网格垂直线
    ctx.beginPath()
    for (let x = 0; x * subGridSpacingX <= (props.width ?? 400) * cellWidth * viewportState.zoom; x++) {
      const pixelX = x * subGridSpacingX + viewportState.pan.x
      if (pixelX >= 0 && pixelX <= canvasWidth) {
        ctx.moveTo(pixelX, Math.max(0, viewportState.pan.y))
        ctx.lineTo(pixelX, Math.min(canvasHeight, (props.height ?? 800) * cellHeight * viewportState.zoom + viewportState.pan.y))
      }
    }

    // 绘制子网格水平线
    for (let y = 0; y * subGridSpacingY <= (props.height ?? 800) * cellHeight * viewportState.zoom; y++) {
      const pixelY = y * subGridSpacingY + viewportState.pan.y
      if (pixelY >= 0 && pixelY <= canvasHeight) {
        ctx.moveTo(Math.max(0, viewportState.pan.x), pixelY)
        ctx.lineTo(Math.min(canvasWidth, (props.width ?? 400) * cellWidth * viewportState.zoom + viewportState.pan.x), pixelY)
      }
    }

    ctx.stroke()
    ctx.restore()
  }

  /**
   * 切换网格显示
   */
  const toggleGrid = () => {
    showGrid.value = !showGrid.value
  }

  /**
   * 设置缩放级别
   * @param newZoom 新的缩放级别
   */
  const setZoom = (newZoom: number) => {
    zoom.value = Math.max(0.1, Math.min(10, newZoom))
  }

  /**
   * 同步外部缩放状态
   * @param externalZoom 外部缩放级别
   */
  const syncZoom = (externalZoom: number) => {
    zoom.value = externalZoom
  }

  /**
   * 更新网格配置
   * @param config 新的配置
   */
  const updateGridConfig = (config: Partial<GridRenderConfig>) => {
    gridRenderConfig.value = { ...gridRenderConfig.value, ...config }
  }

  /**
   * 获取格子在画布上的像素边界
   * @param gridX 格子X坐标
   * @param gridY 格子Y坐标
   * @returns 像素边界 { x, y, width, height }
   */
  const getGridCellBounds = (gridX: number, gridY: number) => {
    const { cellWidth, cellHeight } = gridData.value
    return {
      x: gridX * cellWidth,
      y: gridY * cellHeight,
      width: cellWidth,
      height: cellHeight,
    }
  }

  /**
   * 获取可见的网格范围
   * @param viewportX 视口X偏移
   * @param viewportY 视口Y偏移
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @returns 可见范围 { startX, startY, endX, endY }
   */
  const getVisibleGridRange = (
    viewportX: number,
    viewportY: number,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    const { cellWidth, cellHeight } = gridData.value

    return {
      startX: Math.max(0, Math.floor(-viewportX / cellWidth)),
      startY: Math.max(0, Math.floor(-viewportY / cellHeight)),
      endX: Math.min(props.width ?? 400, Math.ceil((canvasWidth - viewportX) / cellWidth)),
      endY: Math.min(props.height ?? 800, Math.ceil((canvasHeight - viewportY) / cellHeight)),
    }
  }

  // 监听props变化，重新计算网格
  watch(
    () => [props.width, props.height, props.actualWidth, props.actualHeight],
    () => {
      // gridData是computed，会自动重新计算
      // 移除调试日志以提升性能
    },
    { deep: true },
  )

  return {
    // 响应式数据
    gridData,
    gridVisibility,
    showGrid,
    zoom,
    gridRenderConfig,

    // 方法
    drawGrid,
    toggleGrid,
    setZoom,
    syncZoom,
    updateGridConfig,
    getGridCellBounds,
    getVisibleGridRange,
  }
}
