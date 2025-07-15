import { ref, reactive, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { BasicCanvasProps } from '../types/canvas'
import type { ViewportState, ZoomConfig, PanConfig, PanState } from '../types/viewport'
import { zoomAtPoint, screenToCanvas } from '../utils/coordinateUtils'

/**
 * 视图控制系统Composable
 * 统一管理缩放和平移功能
 */
export function useViewport(
  props: BasicCanvasProps,
  canvasRef: Ref<HTMLCanvasElement | undefined>,
) {
  // 视口状态
  const viewportState = reactive<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    isZooming: false,
    isPanning: false,
  })

  // 缩放配置
  const zoomConfig = reactive<ZoomConfig>({
    minZoom: 0.1, // 修改为0.1，即10%
    maxZoom: 5, // 修改为5.0，即500%
    zoomStep: 1.1, // 调整为更平滑的缩放步长
    centerMode: 'mouse',
  })

  // 平移配置
  const panConfig = reactive<PanConfig>({
    enableKeyboardPan: true,
    panStep: 10,
    boundaryMode: 'free',
  })

  // 平移状态
  const panState = reactive<PanState>({
    isPanning: false,
    spacePressed: false,
    startPoint: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
  })

  // 节流控制
  const lastZoomTime = ref(0)
  const zoomThrottleMs = 16 // 60fps

  // 计算容器尺寸
  const containerSize = computed(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  // 计算画布尺寸
  const canvasSize = computed(() => {
    const actualWidthPx = ((props.actualWidth || 100) * 96) / 2.54
    const actualHeightPx = ((props.actualHeight || 100) * 96) / 2.54
    return {
      width: actualWidthPx,
      height: actualHeightPx,
    }
  })

  /**
   * 滚轮缩放事件处理
   */
  const handleWheel = (event: WheelEvent) => {
    // 移除ctrlKey检查，允许直接使用滚轮缩放
    event.preventDefault()

    // 节流控制
    const now = Date.now()
    if (now - lastZoomTime.value < zoomThrottleMs) return
    lastZoomTime.value = now

    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const zoomDelta = event.deltaY > 0 ? 1 / zoomConfig.zoomStep : zoomConfig.zoomStep

    const result = zoomAtPoint(
      mouseX,
      mouseY,
      zoomDelta,
      viewportState.zoom,
      viewportState.pan,
      zoomConfig.minZoom,
      zoomConfig.maxZoom,
    )

    viewportState.zoom = result.zoom
    viewportState.pan = result.pan
  }

  /**
   * 键盘事件处理
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !panState.spacePressed) {
      event.preventDefault()
      panState.spacePressed = true
      document.body.style.cursor = 'grab'
    }
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault()
      panState.spacePressed = false
      panState.isPanning = false
      document.body.style.cursor = ''
    }
  }

  /**
   * 鼠标平移事件处理
   */
  const handleMouseDown = (event: MouseEvent) => {
    if (!panState.spacePressed) return

    event.preventDefault()
    panState.isPanning = true
    viewportState.isPanning = true
    document.body.style.cursor = 'grabbing'

    panState.startPoint = { x: event.clientX, y: event.clientY }
    panState.startPan = { ...viewportState.pan }
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!panState.isPanning) return

    const deltaX = event.clientX - panState.startPoint.x
    const deltaY = event.clientY - panState.startPoint.y

    const newPan = {
      x: panState.startPan.x + deltaX,
      y: panState.startPan.y + deltaY,
    }

    viewportState.pan = newPan
  }

  const handleMouseUp = () => {
    if (panState.isPanning) {
      panState.isPanning = false
      viewportState.isPanning = false
      document.body.style.cursor = panState.spacePressed ? 'grab' : ''
    }
  }

  /**
   * 重置视图
   */
  const resetView = () => {
    viewportState.zoom = 1
    viewportState.pan = { x: 0, y: 0 }
  }

  /**
   * 适合窗口大小
   */
  const fitToWindow = () => {
    const scaleX = containerSize.value.width / canvasSize.value.width
    const scaleY = containerSize.value.height / canvasSize.value.height
    const scale = Math.min(scaleX, scaleY, 1)

    viewportState.zoom = scale
    viewportState.pan = {
      x: (containerSize.value.width - canvasSize.value.width * scale) / 2,
      y: (containerSize.value.height - canvasSize.value.height * scale) / 2,
    }
  }

  /**
   * 绑定事件监听器
   */
  const bindEvents = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    // 滚轮缩放 - 移除passive:false以允许默认滚动行为
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // 键盘事件
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    // 鼠标平移事件
    canvas.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  /**
   * 解绑事件监听器
   */
  const unbindEvents = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    canvas.removeEventListener('wheel', handleWheel)
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    canvas.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  /**
   * 转换鼠标坐标到画布坐标
   */
  const getCanvasCoordinates = (event: MouseEvent) => {
    const canvas = canvasRef.value
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top

    return screenToCanvas(screenX, screenY, viewportState)
  }

  // 生命周期
  onMounted(() => {
    bindEvents()
  })

  onUnmounted(() => {
    unbindEvents()
    // 恢复默认鼠标样式
    document.body.style.cursor = ''
  })

  return {
    // 状态
    viewportState,
    zoomConfig,
    panConfig,
    panState,

    // 计算属性
    containerSize,
    canvasSize,

    // 方法
    resetView,
    fitToWindow,
    getCanvasCoordinates,
    bindEvents,
    unbindEvents,
    handleWheel,
  }
}
