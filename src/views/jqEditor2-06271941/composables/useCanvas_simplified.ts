import { ref, Ref, onMounted, onUnmounted, computed } from 'vue';

// 工具类型定义
export type ToolType =
  | 'pen'
  | 'eraser'
  | 'paintBucket'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'move'
  | 'colorPicker'
  | 'imageUpload'
  | 'fill'
  | 'picker'
  | 'select'
  | 'circleSelect'
  | 'lassoSelect';

// 扩展位置类型
interface CanvasPosition {
  x: number;
  y: number;
  hasBeenPanned?: boolean;
  lastZoom?: number;
}

export function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLDivElement | null>,
) {
  // 状态变量
  const ctx = ref<CanvasRenderingContext2D | null>(null);
  const isDrawing = ref(false);
  const currentTool = ref<ToolType>('pen');
  const currentColor = ref('#000000');
  const zoomLevel = ref(1);

  const canvasPosition = ref<CanvasPosition>({ x: 0, y: 0 });
  const snapToGrid = ref(true);
  const currentCell = ref({ x: 0, y: 0 });

  // 网格相关变量
  const offsetX = ref(0);
  const offsetY = ref(0);
  const gridColValue = ref(9);
  const gridRowValue = ref(9);
  const gridColCount = ref(200);
  const gridRowCount = ref(200);

  // 画布尺寸 (厘米)
  const canvasWidthCm = ref(20);
  const canvasHeightCm = ref(20);

  // 简化：使用固定DPI值
  const STANDARD_DPI = 96;

  // 像素值计算
  const canvasWidthPx = computed(() => cmToPx(canvasWidthCm.value));
  const canvasHeightPx = computed(() => cmToPx(canvasHeightCm.value));

  // 简化的厘米转换为像素 (cm to px)
  const cmToPx = (cm: number): number => {
    return Math.round((cm * STANDARD_DPI) / 2.54);
  };

  // 简化的像素转换为厘米 (px to cm)
  const pxToCm = (px: number): number => {
    return (px * 2.54) / STANDARD_DPI;
  };

  // 简化的画布尺寸获取
  const getCanvasLogicalSize = (canvas: HTMLCanvasElement) => {
    return {
      width: parseFloat(canvas.style.width) || canvas.width,
      height: parseFloat(canvas.style.height) || canvas.height,
    };
  };

  // 简化的Canvas设置（移除高DPI处理）
  const setupCanvas = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    // 直接设置画布尺寸，无需考虑设备像素比
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // 禁用平滑以保持像素风格
    ctx.imageSmoothingEnabled = false;
    // 兼容不同浏览器的前缀
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;
  };

  // 临时画布用于预览
  let tempCanvas: HTMLCanvasElement | null = null;
  let tempCtx: CanvasRenderingContext2D | null = null;

  // 内容画布 - 用于存储实际绘制内容
  let contentCanvas: HTMLCanvasElement | null = null;
  let contentCtx: CanvasRenderingContext2D | null = null;

  // 上一次绘制位置
  let lastX = 0;
  let lastY = 0;
  let startX = 0;
  let startY = 0;

  // 添加lastDrawTime变量用于节流
  let lastDrawTime = 0;

  // 添加集合用于跟踪已绘制的格子，防止重复绘制
  const drawnCells = new Set<string>();

  // 图片上传相关变量
  const imageFile = ref<File | null>(null);
  const imagePreview = ref<string | null>(null);
  const imagePosition = ref({ x: 0, y: 0 });
  const imageScale = ref(1);
  const isPlacingImage = ref(false);
  const tempImage = ref<HTMLImageElement | null>(null);

  // 简化的初始化画布
  const initCanvas = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;
    const displayWidth = canvasWidthPx.value;
    const displayHeight = canvasHeightPx.value;

    const context = canvas.getContext('2d');
    if (!context) return;

    ctx.value = context;

    // 使用简化的Canvas设置
    setupCanvas(canvas, context, displayWidth, displayHeight);

    // 初始化内容画布
    initContentCanvas();

    // 初始化临时画布
    initTempCanvas();

    // 绘制初始内容
    renderCanvas();
  };

  // 初始化内容画布
  const initContentCanvas = () => {
    if (!canvasRef.value) return;

    contentCanvas = document.createElement('canvas');
    const displayWidth = canvasWidthPx.value;
    const displayHeight = canvasHeightPx.value;

    contentCtx = contentCanvas.getContext('2d');
    if (contentCtx) {
      // 使用简化的Canvas设置
      setupCanvas(contentCanvas, contentCtx, displayWidth, displayHeight);

      // 默认填充白色背景
      contentCtx.fillStyle = '#ffffff';
      contentCtx.fillRect(0, 0, displayWidth, displayHeight);
    }
  };

  // 初始化临时画布
  const initTempCanvas = () => {
    if (!canvasRef.value) return;

    tempCanvas = document.createElement('canvas');
    const displayWidth = canvasWidthPx.value;
    const displayHeight = canvasHeightPx.value;

    tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      // 使用简化的Canvas设置
      setupCanvas(tempCanvas, tempCtx, displayWidth, displayHeight);
    }
  };

  // 渲染画布
  const renderCanvas = () => {
    if (!ctx.value || !canvasRef.value || !contentCanvas) return;

    const canvas = canvasRef.value;
    const context = ctx.value;

    // 清除当前画布
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制内容
    context.drawImage(contentCanvas, 0, 0);
  };

  // 简化的坐标转换
  const getCanvasCoordinates = (e: MouseEvent) => {
    if (!canvasRef.value) return { x: 0, y: 0 };

    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();

    // 获取鼠标在画布上的相对位置
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // 计算相对于画布的位置
    const relativeX = (rawX / rect.width) * canvas.width;
    const relativeY = (rawY / rect.height) * canvas.height;

    // 转换为格子坐标
    const cellX = Math.floor(relativeX / gridColValue.value);
    const cellY = Math.floor(relativeY / gridRowValue.value);

    const x = relativeX;
    const y = relativeY;

    return { x, y };
  };

  // 其他简化的绘制函数（这里只展示核心结构，实际实现需要完整的函数）
  const startDrawing = (e: MouseEvent) => {
    // 简化的绘制开始逻辑
    isDrawing.value = true;
    drawnCells.clear();

    const { x, y } = getCanvasCoordinates(e);
    startX = x;
    startY = y;
    lastX = x;
    lastY = y;

    if (currentTool.value === 'pen') {
      fillCell(x, y);
    } else if (currentTool.value === 'eraser') {
      eraseCell(x, y);
    }
    // 其他工具逻辑...
  };

  const draw = (e: MouseEvent) => {
    if (!isDrawing.value) return;

    const now = Date.now();
    if (now - lastDrawTime < 16) return;
    lastDrawTime = now;

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool.value === 'pen') {
      fillCell(x, y);
    } else if (currentTool.value === 'eraser') {
      eraseCell(x, y);
    }
    // 其他工具逻辑...

    lastX = x;
    lastY = y;
  };

  const stopDrawing = () => {
    if (!isDrawing.value) return;
    isDrawing.value = false;
    drawnCells.clear();
  };

  // 简化的格子填充
  const fillCell = (x: number, y: number) => {
    if (!contentCtx) return;

    const cellX = Math.floor(x / gridColValue.value) * gridColValue.value;
    const cellY = Math.floor(y / gridRowValue.value) * gridRowValue.value;

    const cellKey = `${cellX},${cellY}`;
    if (drawnCells.has(cellKey)) return;

    drawnCells.add(cellKey);

    contentCtx.fillStyle = currentColor.value;
    contentCtx.fillRect(cellX, cellY, gridColValue.value, gridRowValue.value);

    renderCanvas();
  };

  // 简化的格子擦除
  const eraseCell = (x: number, y: number) => {
    if (!contentCtx) return;

    const cellX = Math.floor(x / gridColValue.value) * gridColValue.value;
    const cellY = Math.floor(y / gridRowValue.value) * gridRowValue.value;

    contentCtx.clearRect(cellX, cellY, gridColValue.value, gridRowValue.value);
    renderCanvas();
  };

  // 其他必要的函数
  const clearCanvas = () => {
    if (!contentCtx || !contentCanvas) return;
    contentCtx.clearRect(0, 0, contentCanvas.width, contentCanvas.height);
    contentCtx.fillStyle = '#ffffff';
    contentCtx.fillRect(0, 0, contentCanvas.width, contentCanvas.height);
    renderCanvas();
  };

  const setTool = (tool: ToolType) => {
    currentTool.value = tool;
  };

  const setColor = (color: string) => {
    currentColor.value = color;
  };

  const setGridSize = (colValue: number, rowValue: number) => {
    gridColValue.value = Math.max(1, Math.round(colValue));
    gridRowValue.value = Math.max(1, Math.round(rowValue));

    if (canvasRef.value) {
      const canvas = canvasRef.value;
      const { width: logicalWidth, height: logicalHeight } =
        getCanvasLogicalSize(canvas);
      gridColCount.value = Math.floor(logicalWidth / gridColValue.value);
      gridRowCount.value = Math.floor(logicalHeight / gridRowValue.value);
    }

    renderCanvas();
  };

  return {
    ctx,
    isDrawing,
    currentTool,
    currentColor,
    zoomLevel,
    canvasPosition,
    snapToGrid,
    currentCell,
    offsetX,
    offsetY,
    gridColValue,
    gridRowValue,
    gridColCount,
    gridRowCount,
    canvasWidthCm,
    canvasHeightCm,
    canvasWidthPx,
    canvasHeightPx,
    imageFile,
    imagePreview,
    imagePosition,
    imageScale,
    isPlacingImage,
    tempImage,

    // 函数
    cmToPx,
    pxToCm,
    initCanvas,
    renderCanvas,
    getCanvasCoordinates,
    startDrawing,
    draw,
    stopDrawing,
    fillCell,
    eraseCell,
    clearCanvas,
    setTool,
    setColor,
    setGridSize,
  };
}
