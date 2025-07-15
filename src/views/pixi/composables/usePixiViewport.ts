import { ref, computed, watch } from 'vue'
import type { PixiEditorApp, ViewportState, Point, UsePixiViewportReturn } from '../types'

/**
 * PixiJS 视口管理 Composable
 * 负责缩放、平移、坐标转换等视口相关功能
 */
export function usePixiViewport(app: Ref<PixiEditorApp | null>): UsePixiViewportReturn {
  // 视口状态
  const viewport = ref<ViewportState>({
    x: 0,
    y: 0,
    scale: 1,
    width: 800,
    height: 600,
  })

  // 缩放限制
  const minZoom = 0.1
  const maxZoom = 50
  const zoomStep = 0.1

  // 计算属性
  const isZoomedIn = computed(() => viewport.value.scale > 1)
  const isZoomedOut = computed(() => viewport.value.scale < 1)
  const canZoomIn = computed(() => viewport.value.scale < maxZoom)
  const canZoomOut = computed(() => viewport.value.scale > minZoom)

  /**
   * 应用视口变换到 PixiJS 容器
   */
  const applyViewportTransform = () => {
    if (!app.value?.mainContainer) return

    const { x, y, scale } = viewport.value
    const container = app.value.mainContainer

    container.position.set(x, y)
    container.scale.set(scale)
  }

  /**
   * 以指定点为中心进行缩放
   */
  const zoomToPoint = (screenX: number, screenY: number, scaleDelta: number) => {
    if (!app.value) return

    const currentScale = viewport.value.scale
    const newScale = Math.max(minZoom, Math.min(maxZoom, currentScale * scaleDelta))

    if (newScale === currentScale) return

    // 计算缩放前的世界坐标
    const worldPoint = screenToWorld({ x: screenX, y: screenY })

    // 更新缩放
    viewport.value.scale = newScale

    // 计算缩放后的屏幕坐标
    const newScreenPoint = worldToScreen(worldPoint)

    // 调整视口位置以保持缩放中心点不变
    viewport.value.x += screenX - newScreenPoint.x
    viewport.value.y += screenY - newScreenPoint.y

    applyViewportTransform()
  }

  /**
   * 平移视口
   */
  const panViewport = (deltaX: number, deltaY: number) => {
    viewport.value.x += deltaX
    viewport.value.y += deltaY
    applyViewportTransform()
  }

  /**
   * 设置视口位置
   */
  const setViewportPosition = (x: number, y: number) => {
    viewport.value.x = x
    viewport.value.y = y
    applyViewportTransform()
  }

  /**
   * 设置缩放级别
   */
  const setZoom = (scale: number, centerX?: number, centerY?: number) => {
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, scale))

    if (centerX !== undefined && centerY !== undefined) {
      // 以指定点为中心缩放
      const scaleDelta = clampedScale / viewport.value.scale
      zoomToPoint(centerX, centerY, scaleDelta)
    } else {
      // 以视口中心缩放
      const centerScreenX = viewport.value.width / 2
      const centerScreenY = viewport.value.height / 2
      const scaleDelta = clampedScale / viewport.value.scale
      zoomToPoint(centerScreenX, centerScreenY, scaleDelta)
    }
  }

  /**
   * 重置视口到初始状态
   */
  const resetViewport = () => {
    viewport.value.x = 0
    viewport.value.y = 0
    viewport.value.scale = 1
    applyViewportTransform()
  }

  /**
   * 适应屏幕大小
   */
  const fitToScreen = () => {
    if (!app.value) return

    const canvasWidth = app.value.screen.width
    const canvasHeight = app.value.screen.height
    const contentWidth = viewport.value.width
    const contentHeight = viewport.value.height

    // 计算适应屏幕的缩放比例
    const scaleX = canvasWidth / contentWidth
    const scaleY = canvasHeight / contentHeight
    const scale = Math.min(scaleX, scaleY) * 0.9 // 留一些边距

    // 计算居中位置
    const scaledWidth = contentWidth * scale
    const scaledHeight = contentHeight * scale
    const x = (canvasWidth - scaledWidth) / 2
    const y = (canvasHeight - scaledHeight) / 2

    viewport.value.scale = scale
    viewport.value.x = x
    viewport.value.y = y

    applyViewportTransform()
  }

  /**
   * 屏幕坐标转世界坐标
   */
  const screenToWorld = (screenPoint: Point): Point => {
    const { x: viewX, y: viewY, scale } = viewport.value

    return {
      x: (screenPoint.x - viewX) / scale,
      y: (screenPoint.y - viewY) / scale,
    }
  }

  /**
   * 世界坐标转屏幕坐标
   */
  const worldToScreen = (worldPoint: Point): Point => {
    const { x: viewX, y: viewY, scale } = viewport.value

    return {
      x: worldPoint.x * scale + viewX,
      y: worldPoint.y * scale + viewY,
    }
  }

  /**
   * 获取可见区域的世界坐标范围
   */
  const getVisibleWorldBounds = () => {
    if (!app.value) return null

    const screenWidth = app.value.screen.width
    const screenHeight = app.value.screen.height

    const topLeft = screenToWorld({ x: 0, y: 0 })
    const bottomRight = screenToWorld({ x: screenWidth, y: screenHeight })

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
   * 检查世界坐标点是否在可见区域内
   */
  const isPointVisible = (worldPoint: Point): boolean => {
    const bounds = getVisibleWorldBounds()
    if (!bounds) return false

    return (
      worldPoint.x >= bounds.left &&
      worldPoint.x <= bounds.right &&
      worldPoint.y >= bounds.top &&
      worldPoint.y <= bounds.bottom
    )
  }

  /**
   * 平滑缩放动画
   */
  const smoothZoomToPoint = (
    screenX: number,
    screenY: number,
    targetScale: number,
    duration: number = 300,
  ) => {
    if (!app.value) return

    const startScale = viewport.value.scale
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用 easeOutCubic 缓动函数
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentScale = startScale + (targetScale - startScale) * eased

      const scaleDelta = currentScale / viewport.value.scale
      zoomToPoint(screenX, screenY, scaleDelta)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  /**
   * 平滑平移动画
   */
  const smoothPanTo = (targetX: number, targetY: number, duration: number = 300) => {
    const startX = viewport.value.x
    const startY = viewport.value.y
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用 easeOutCubic 缓动函数
      const eased = 1 - Math.pow(1 - progress, 3)

      viewport.value.x = startX + (targetX - startX) * eased
      viewport.value.y = startY + (targetY - startY) * eased

      applyViewportTransform()

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  // 监听视口变化，同步到 PixiJS 应用
  watch(
    () => app.value,
    (newApp) => {
      if (newApp && newApp.viewport) {
        viewport.value = { ...newApp.viewport }
        applyViewportTransform()
      }
    },
    { immediate: true },
  )

  // 监听视口状态变化，更新应用状态
  watch(
    viewport,
    (newViewport) => {
      if (app.value) {
        app.value.viewport = { ...newViewport }
      }
    },
    { deep: true },
  )

  return {
    viewport,
    zoomToPoint,
    panViewport,
    resetViewport,
    fitToScreen,
    screenToWorld,
    worldToScreen,
    setViewportPosition,
    setZoom,
    getVisibleWorldBounds,
    isPointVisible,
    smoothZoomToPoint,
    smoothPanTo,
    isZoomedIn,
    isZoomedOut,
    canZoomIn,
    canZoomOut,
  }
}
