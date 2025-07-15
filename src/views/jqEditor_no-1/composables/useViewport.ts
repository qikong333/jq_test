import { ref, reactive, computed, onMounted, onUnmounted, type Ref } from 'vue';
import type { BasicCanvasProps } from '../types/canvas';
import type {
  ViewportState,
  ZoomConfig,
  PanConfig,
  PanState,
} from '../types/viewport';
import { clampPan, screenToCanvas } from '../utils/coordinateUtils';

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
  });

  // 缩放配置
  const zoomConfig = reactive<ZoomConfig>({
    minZoom: 1, // 修改为1.0，即100%
    maxZoom: 5, // 修改为5.0，即500%
    zoomStep: 1.1, // 调整为更平滑的缩放步长
    centerMode: 'mouse',
  });

  // 平移配置
  const panConfig = reactive<PanConfig>({
    enableKeyboardPan: true,
    panStep: 10,
    boundaryMode: 'clamp',
  });

  // 平移状态
  const panState = reactive<PanState>({
    isPanning: false,
    spacePressed: false,
    startPoint: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
  });

  // 缩放节流控制已移除，使用jqEditor_now的直接缩放方式

  // 计算容器尺寸
  const containerSize = computed(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  // 计算画布尺寸
  const canvasSize = computed(() => {
    const actualWidthPx = (props.actualWidth * 96) / 2.54;
    const actualHeightPx = (props.actualHeight * 96) / 2.54;
    return {
      width: actualWidthPx,
      height: actualHeightPx,
    };
  });

  /**
   * 滚轮缩放事件处理 - 参考jqEditor_now的实现
   */
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    
    const canvas = canvasRef.value;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const oldZoom = viewportState.zoom;
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;  // 使用jqEditor_now的缩放因子
    const newZoom = Math.max(
      zoomConfig.minZoom,
      Math.min(zoomConfig.maxZoom, viewportState.zoom * zoomFactor)
    );
    
    // 只有缩放值真正改变时才处理
    if (Math.abs(newZoom - viewportState.zoom) < 0.001) {
      return;
    }
    
    viewportState.zoom = newZoom;
    
    // 以鼠标位置为中心缩放 - 参考jqEditor_now的实现
    const zoomRatio = viewportState.zoom / oldZoom;
    viewportState.pan.x = mouseX - (mouseX - viewportState.pan.x) * zoomRatio;
    viewportState.pan.y = mouseY - (mouseY - viewportState.pan.y) * zoomRatio;
  };

  /**
   * 键盘事件处理
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !panState.spacePressed) {
      event.preventDefault();
      panState.spacePressed = true;
      document.body.style.cursor = 'grab';
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      panState.spacePressed = false;
      panState.isPanning = false;
      document.body.style.cursor = '';
    }
  };

  /**
   * 鼠标平移事件处理
   */
  const handleMouseDown = (event: MouseEvent) => {
    if (!panState.spacePressed) return;

    event.preventDefault();
    panState.isPanning = true;
    viewportState.isPanning = true;
    document.body.style.cursor = 'grabbing';

    panState.startPoint = { x: event.clientX, y: event.clientY };
    panState.startPan = { ...viewportState.pan };
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!panState.isPanning) return;

    const deltaX = event.clientX - panState.startPoint.x;
    const deltaY = event.clientY - panState.startPoint.y;

    let newPan = {
      x: panState.startPan.x + deltaX,
      y: panState.startPan.y + deltaY,
    };

    if (panConfig.boundaryMode === 'clamp') {
      newPan = clampPan(
        newPan,
        canvasSize.value,
        containerSize.value,
        viewportState.zoom,
      );
    }

    viewportState.pan = newPan;
  };

  const handleMouseUp = () => {
    if (panState.isPanning) {
      panState.isPanning = false;
      viewportState.isPanning = false;
      document.body.style.cursor = panState.spacePressed ? 'grab' : '';
    }
  };

  /**
   * 重置视图到初始状态
   */
  const resetView = () => {
    viewportState.zoom = 1
    viewportState.pan = { x: 0, y: 0 }
  }
  
  /**
   * 居中显示画布 - 参考jqEditor_now的centerView逻辑
   */
  const centerView = () => {
    if (!canvasRef.value) return
    
    // 重置缩放
    viewportState.zoom = 1
    // 重置平移，居中偏移由getCenterOffset函数处理
    viewportState.pan = { x: 0, y: 0 }
  };

  /**
   * 适合窗口大小
   */
  const fitToWindow = () => {
    const scaleX = containerSize.value.width / canvasSize.value.width;
    const scaleY = containerSize.value.height / canvasSize.value.height;
    const scale = Math.min(scaleX, scaleY, 1);

    viewportState.zoom = scale;
    viewportState.pan = {
      x: (containerSize.value.width - canvasSize.value.width * scale) / 2,
      y: (containerSize.value.height - canvasSize.value.height * scale) / 2,
    };
  };

  /**
   * 绑定事件监听器
   */
  const bindEvents = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    // 滚轮缩放 - 移除passive:false以允许默认滚动行为
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // 键盘事件
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // 鼠标平移事件
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  /**
   * 解绑事件监听器
   */
  const unbindEvents = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    canvas.removeEventListener('wheel', handleWheel);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  /**
   * 转换鼠标坐标到画布坐标
   */
  const getCanvasCoordinates = (event: MouseEvent) => {
    const canvas = canvasRef.value;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    return screenToCanvas(screenX, screenY, viewportState);
  };

  // 生命周期
  onMounted(() => {
    bindEvents();
  });

  onUnmounted(() => {
    unbindEvents();
    // 恢复默认鼠标样式
    document.body.style.cursor = '';
  });

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
    centerView,
    fitToWindow,
    getCanvasCoordinates,
    bindEvents,
    unbindEvents,
  };
}
