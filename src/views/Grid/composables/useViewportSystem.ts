import { ref, computed, watch } from 'vue'
import type { ViewportState, PixelCoordinate, UseViewportSystemReturn } from '../types/grid'

/**
 * 视口系统 Composable
 * 负责缩放、平移、视口状态管理
 */
export function useViewportSystem(): UseViewportSystemReturn {
  // 响应式状态
  const zoom = ref(1)
  const pan = ref<PixelCoordinate>({ x: 0, y: 0 })
  const isDragging = ref(false)
  const lastMousePos = ref<PixelCoordinate>({ x: 0, y: 0 })

  // 缩放限制
  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 10

  /**
   * 计算视口状态
   */
  const viewportState = computed<ViewportState>(() => ({
    zoom: zoom.value,
    pan: pan.value,
    isDragging: isDragging.value,
  }))

  /**
   * 设置缩放级别
   * @param newZoom 新的缩放级别
   * @param centerX 缩放中心X坐标（可选）
   * @param centerY 缩放中心Y坐标（可选）
   */
  const setZoom = (newZoom: number, centerX?: number, centerY?: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))

    if (centerX !== undefined && centerY !== undefined) {
      // 以指定点为中心缩放
      const oldZoom = zoom.value
      const zoomRatio = clampedZoom / oldZoom

      pan.value = {
        x: centerX - (centerX - pan.value.x) * zoomRatio,
        y: centerY - (centerY - pan.value.y) * zoomRatio,
      }
    }

    zoom.value = clampedZoom
  }

  /**
   * 缩放到指定级别
   * @param zoomLevel 缩放级别
   */
  const zoomTo = (zoomLevel: number) => {
    setZoom(zoomLevel)
  }

  /**
   * 缩放增量
   * @param delta 缩放增量
   * @param centerX 缩放中心X坐标（可选）
   * @param centerY 缩放中心Y坐标（可选）
   */
  const zoomBy = (delta: number, centerX?: number, centerY?: number) => {
    setZoom(zoom.value + delta, centerX, centerY)
  }

  /**
   * 滚轮缩放
   * @param event 滚轮事件
   * @param canvasRect Canvas元素的边界矩形
   */
  const handleWheelZoom = (event: WheelEvent, canvasRect: DOMRect) => {
    event.preventDefault()

    const mouseX = event.clientX - canvasRect.left
    const mouseY = event.clientY - canvasRect.top

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    const newZoom = zoom.value * zoomFactor

    setZoom(newZoom, mouseX, mouseY)
  }

  /**
   * 设置平移偏移
   * @param x X偏移
   * @param y Y偏移
   */
  const setPan = (x: number, y: number) => {
    pan.value = { x, y }
  }

  /**
   * 平移增量
   * @param deltaX X增量
   * @param deltaY Y增量
   */
  const panBy = (deltaX: number, deltaY: number) => {
    pan.value = {
      x: pan.value.x + deltaX,
      y: pan.value.y + deltaY,
    }
  }

  /**
   * 开始拖拽
   * @param event 鼠标事件
   */
  const startDrag = (event: MouseEvent) => {
    isDragging.value = true
    lastMousePos.value = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  /**
   * 拖拽中
   * @param event 鼠标事件
   */
  const drag = (event: MouseEvent) => {
    if (!isDragging.value) return

    const deltaX = event.clientX - lastMousePos.value.x
    const deltaY = event.clientY - lastMousePos.value.y

    panBy(deltaX, deltaY)

    lastMousePos.value = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  /**
   * 结束拖拽
   */
  const endDrag = () => {
    isDragging.value = false
  }

  /**
   * 重置视口到初始状态
   */
  const resetView = () => {
    zoom.value = 1
    pan.value = { x: 0, y: 0 }
    isDragging.value = false
  }

  /**
   * 适应画布大小
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @param contentWidth 内容宽度
   * @param contentHeight 内容高度
   */
  const fitToCanvas = (
    canvasWidth: number,
    canvasHeight: number,
    contentWidth: number,
    contentHeight: number,
  ) => {
    const scaleX = canvasWidth / contentWidth
    const scaleY = canvasHeight / contentHeight
    const scale = Math.min(scaleX, scaleY) * 0.9 // 留10%边距

    setZoom(scale)

    // 居中显示
    const scaledContentWidth = contentWidth * scale
    const scaledContentHeight = contentHeight * scale

    setPan((canvasWidth - scaledContentWidth) / 2, (canvasHeight - scaledContentHeight) / 2)
  }

  /**
   * 屏幕坐标转换为世界坐标
   * @param screenX 屏幕X坐标
   * @param screenY 屏幕Y坐标
   * @returns 世界坐标
   */
  const screenToWorld = (screenX: number, screenY: number): PixelCoordinate => {
    return {
      x: (screenX - pan.value.x) / zoom.value,
      y: (screenY - pan.value.y) / zoom.value,
    }
  }

  /**
   * 世界坐标转换为屏幕坐标
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @returns 屏幕坐标
   */
  const worldToScreen = (worldX: number, worldY: number): PixelCoordinate => {
    return {
      x: worldX * zoom.value + pan.value.x,
      y: worldY * zoom.value + pan.value.y,
    }
  }

  /**
   * 获取可见区域的世界坐标范围
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @returns 可见区域范围
   */
  const getVisibleWorldBounds = (canvasWidth: number, canvasHeight: number) => {
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvasWidth, canvasHeight)

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    }
  }

  /**
   * 检查点是否在可见区域内
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @param canvasWidth Canvas宽度
   * @param canvasHeight Canvas高度
   * @returns 是否可见
   */
  const isPointVisible = (
    worldX: number,
    worldY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): boolean => {
    const bounds = getVisibleWorldBounds(canvasWidth, canvasHeight)
    return (
      worldX >= bounds.left &&
      worldX <= bounds.right &&
      worldY >= bounds.top &&
      worldY <= bounds.bottom
    )
  }

  /**
   * 平滑缩放动画
   * @param targetZoom 目标缩放级别
   * @param duration 动画时长（毫秒）
   * @param centerX 缩放中心X坐标（可选）
   * @param centerY 缩放中心Y坐标（可选）
   */
  const smoothZoomTo = (
    targetZoom: number,
    duration: number = 300,
    centerX?: number,
    centerY?: number,
  ) => {
    const startZoom = zoom.value
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用easeOutCubic缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentZoom = startZoom + (targetZoom - startZoom) * easeProgress

      setZoom(currentZoom, centerX, centerY)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  // 监听缩放变化，确保在合理范围内
  watch(zoom, (newZoom) => {
    if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
      zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    }
  })

  return {
    // 响应式数据
    viewportState: viewportState.value,
    zoom,
    pan,
    isDragging,

    // 缩放方法
    setZoom,
    zoomTo,
    zoomBy,
    handleWheelZoom,
    smoothZoomTo,

    // 平移方法
    setPan,
    panBy,

    // 拖拽方法
    startDrag,
    drag,
    endDrag,

    // 视口控制
    resetView,
    fitToCanvas,

    // 坐标转换
    screenToWorld,
    worldToScreen,
    getVisibleWorldBounds,
    isPointVisible,
  }
}
