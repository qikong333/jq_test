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
  const snapToGrid = ref(true); // 是否启用格子对齐
  const currentCell = ref({ x: 0, y: 0 }); // 当前鼠标所在的格子坐标

  // 网格相关变量
  const offsetX = ref(0);
  const offsetY = ref(0);
  const gridColValue = ref(9);
  const gridRowValue = ref(9);
  const gridColCount = ref(200); // 横向格子数量
  const gridRowCount = ref(200); // 纵向格子数量

  // 画布尺寸 (厘米)
  const canvasWidthCm = ref(20); // 默认20厘米宽
  const canvasHeightCm = ref(20); // 默认20厘米高
  // 简化：使用固定DPI值
  const STANDARD_DPI = 96;

  // 像素值计算
  const canvasWidthPx = computed(() => cmToPx(canvasWidthCm.value));
  const canvasHeightPx = computed(() => cmToPx(canvasHeightCm.value));

  // 简化的厘米转换为像素 (cm to px)
  const cmToPx = (cm: number): number => {
    // 使用固定DPI值，简化计算
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
    // 计算CSS显示尺寸
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

  // 渲染画布（将内容画布内容绘制到显示画布，网格由SVG负责）
  const renderCanvas = () => {
    if (!ctx.value || !canvasRef.value || !contentCanvas) return;

    const canvas = canvasRef.value;
    const context = ctx.value;

    // 清除当前画布
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制内容
    context.drawImage(contentCanvas, 0, 0);

    // 网格由SVG负责，不再在Canvas中绘制
  };

  // 优化的跨屏幕兼容坐标计算（完整设备像素比支持）
  const getCanvasCoordinates = (e: MouseEvent) => {
    if (!canvasRef.value) return { x: 0, y: 0 };

    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();

    // 获取原始逻辑尺寸（CSS像素，未缩放）
    const { width: originalLogicalWidth, height: originalLogicalHeight } =
      getCanvasLogicalSize(canvas);

    // 计算鼠标在画布上的相对位置（相对于显示的画布）
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // 将鼠标位置映射到原始逻辑坐标系（考虑缩放）
    // rect.width 是缩放后的显示宽度
    // originalLogicalWidth 是原始逻辑宽度
    // 所以需要先计算相对比例，再映射到原始尺寸
    const relativeX = rawX / rect.width; // 相对位置比例 (0-1)
    const relativeY = rawY / rect.height; // 相对位置比例 (0-1)

    // 映射到原始逻辑坐标系
    let x = relativeX * originalLogicalWidth;
    let y = relativeY * originalLogicalHeight;

    // 边界检查（使用原始逻辑尺寸）
    x = Math.max(0, Math.min(x, originalLogicalWidth));
    y = Math.max(0, Math.min(y, originalLogicalHeight));

    // 计算格子坐标
    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;
    const cellX = Math.floor(x / cellWidth);
    const cellY = Math.floor(y / cellHeight);

    // 更新当前格子坐标
    currentCell.value = { x: cellX, y: cellY };

    // 网格对齐优化
    if (snapToGrid.value && currentTool.value !== 'move') {
      // 精确对齐到格子边界
      x = cellX * cellWidth;
      y = cellY * cellHeight;
    }

    // 调试信息（缩放问题诊断）
    console.log('缩放坐标计算:', {
      zoomLevel: zoomLevel.value,
      rawMouse: { x: rawX, y: rawY },
      rectSize: { width: rect.width, height: rect.height },
      originalLogicalSize: {
        width: originalLogicalWidth,
        height: originalLogicalHeight,
      },
      relativePos: { x: relativeX, y: relativeY },
      finalCoords: { x, y },
      cellCoords: { x: cellX, y: cellY },
    });

    return { x, y };
  };

  // 开始绘制
  const startDrawing = (e: MouseEvent) => {
    if (!ctx.value || !canvasRef.value || !contentCtx || !contentCanvas) return;

    isDrawing.value = true;

    // 清空已绘制格子的记录，开始新的绘制操作
    drawnCells.clear();

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool.value === 'move') {
      // 移动工具逻辑在此处理
      startPanCanvas(e);
      return;
    }

    // 保存起始坐标
    startX = x;
    startY = y;
    lastX = x;
    lastY = y;

    if (currentTool.value === 'pen') {
      // 绘制格子而不是开始一条线
      fillCell(x, y);
    } else if (currentTool.value === 'colorPicker') {
      // 使用取色器，但不自动切换回上一个工具
      pickColor(x, y);
    } else if (currentTool.value === 'paintBucket') {
      fillArea(x, y);
    } else if (currentTool.value === 'eraser') {
      // 添加对橡皮擦的初始处理
      eraseCell(x, y);
    } else if (isPlacingImage.value && tempImage.value) {
      // 图片放置模式下的处理，无需检查当前工具
      imagePosition.value = { x, y };
      drawImagePreview();
    } else {
      // 保存当前画布状态到临时画布
      if (tempCtx && tempCanvas && contentCanvas) {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(contentCanvas, 0, 0);
      }
    }
  };

  // 绘制
  const draw = (e: MouseEvent) => {
    if (!isDrawing.value || !ctx.value) return;

    // 使用节流方式处理鼠标移动事件
    const now = Date.now();
    if (now - lastDrawTime < 16) {
      // 约60fps
      return;
    }
    lastDrawTime = now;

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool.value === 'move') {
      panCanvas(e);
      return;
    }

    // 处理图片放置
    if (isPlacingImage.value && tempImage.value) {
      imagePosition.value = { x, y };
      drawImagePreview();
      return;
    }

    if (currentTool.value === 'pen') {
      // 填充当前格子
      fillCell(x, y);

      // 如果鼠标移动速度快，使用线性插值填充中间格子
      if (lastX !== x || lastY !== y) {
        // 计算当前点与上一点之间的距离
        const dx = x - lastX;
        const dy = y - lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 计算需要插入的点数量
        // 使用格子大小的1/3作为步长，确保不会漏掉任何格子
        const cellSize = Math.min(gridColValue.value, gridRowValue.value) / 3;
        const steps = Math.max(1, Math.ceil(distance / cellSize));

        // 限制最大步数，防止性能问题
        const maxSteps = 200;
        const actualSteps = Math.min(steps, maxSteps);

        // 跟踪已经填充过的格子索引，避免重复
        const filledCellIndices = new Set<string>();

        // 记录当前格子索引
        const currentCellX = Math.floor(x / gridColValue.value);
        const currentCellY = Math.floor(y / gridRowValue.value);
        filledCellIndices.add(`${currentCellX},${currentCellY}`);

        // 记录上一个格子索引
        const lastCellX = Math.floor(lastX / gridColValue.value);
        const lastCellY = Math.floor(lastY / gridRowValue.value);
        filledCellIndices.add(`${lastCellX},${lastCellY}`);

        // 使用线性插值填充中间点
        for (let i = 1; i < actualSteps; i++) {
          const ratio = i / actualSteps;
          // 计算插值点的坐标，不进行额外的舍入
          const midX = lastX + dx * ratio;
          const midY = lastY + dy * ratio;

          // 计算格子索引
          const cellIndexX = Math.floor(midX / gridColValue.value);
          const cellIndexY = Math.floor(midY / gridRowValue.value);
          const cellIndexKey = `${cellIndexX},${cellIndexY}`;

          // 如果这个格子索引已经处理过，跳过
          if (filledCellIndices.has(cellIndexKey)) {
            continue;
          }

          // 记录这个格子已经处理过
          filledCellIndices.add(cellIndexKey);

          // 填充这个中间点对应的格子
          fillCell(midX, midY);
        }
      }
    } else if (currentTool.value === 'eraser') {
      // 擦除当前格子
      eraseCell(x, y);

      // 同样为橡皮擦添加连贯性处理，使用与画笔相同的优化逻辑
      if (lastX !== x || lastY !== y) {
        // 计算当前点与上一点之间的距离
        const dx = x - lastX;
        const dy = y - lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 计算需要插入的点数量
        const cellSize = Math.min(gridColValue.value, gridRowValue.value) / 3;
        const steps = Math.max(1, Math.ceil(distance / cellSize));

        // 限制最大步数，防止性能问题
        const maxSteps = 200;
        const actualSteps = Math.min(steps, maxSteps);

        // 跟踪已经擦除过的格子索引，避免重复
        const erasedCellIndices = new Set<string>();

        // 记录当前格子索引
        const currentCellX = Math.floor(x / gridColValue.value);
        const currentCellY = Math.floor(y / gridRowValue.value);
        erasedCellIndices.add(`${currentCellX},${currentCellY}`);

        // 记录上一个格子索引
        const lastCellX = Math.floor(lastX / gridColValue.value);
        const lastCellY = Math.floor(lastY / gridRowValue.value);
        erasedCellIndices.add(`${lastCellX},${lastCellY}`);

        // 使用线性插值填充中间点
        for (let i = 1; i < actualSteps; i++) {
          const ratio = i / actualSteps;
          // 计算插值点的坐标，不进行额外的舍入
          const midX = lastX + dx * ratio;
          const midY = lastY + dy * ratio;

          // 计算格子索引
          const cellIndexX = Math.floor(midX / gridColValue.value);
          const cellIndexY = Math.floor(midY / gridRowValue.value);
          const cellIndexKey = `${cellIndexX},${cellIndexY}`;

          // 如果这个格子索引已经处理过，跳过
          if (erasedCellIndices.has(cellIndexKey)) {
            continue;
          }

          // 记录这个格子已经处理过
          erasedCellIndices.add(cellIndexKey);

          // 擦除这个中间点对应的格子
          eraseCell(midX, midY);
        }
      }
    } else if (['rectangle', 'circle', 'line'].includes(currentTool.value)) {
      // 对于形状工具，我们在临时画布上进行预览
      if (!tempCtx || !tempCanvas || !canvasRef.value) return;

      // 获取临时画布的上下文
      const canvas = canvasRef.value;

      // 在主画布上清除并重绘
      ctx.value.clearRect(0, 0, canvas.width, canvas.height);
      // 重绘原始内容
      ctx.value.drawImage(tempCanvas, 0, 0);

      // 绘制当前形状
      ctx.value.save();
      ctx.value.strokeStyle = currentColor.value;
      ctx.value.fillStyle = currentColor.value;
      ctx.value.lineWidth = 3;

      if (currentTool.value === 'rectangle') {
        // 矩形预览
        const width = x - startX;
        const height = y - startY;
        ctx.value.strokeRect(startX, startY, width, height);
      } else if (currentTool.value === 'circle') {
        // 圆形预览
        const radius = Math.sqrt(
          Math.pow(x - startX, 2) + Math.pow(y - startY, 2),
        );
        ctx.value.beginPath();
        ctx.value.arc(startX, startY, radius, 0, Math.PI * 2);
        ctx.value.stroke();
      } else if (currentTool.value === 'line') {
        // 直线预览
        ctx.value.beginPath();
        ctx.value.moveTo(startX, startY);
        ctx.value.lineTo(x, y);
        ctx.value.stroke();
      }

      ctx.value.restore();
    }

    // 更新上一个点的坐标
    lastX = x;
    lastY = y;
  };

  // 停止绘制
  const stopDrawing = () => {
    if (!isDrawing.value) return;

    isDrawing.value = false;

    if (currentTool.value === 'move') {
      // 结束移动
      stopPanCanvas();
    } else if (isPlacingImage.value) {
      // 图片放置结束后，重新绘制预览
      drawImagePreview();
    } else if (['rectangle', 'circle', 'line'].includes(currentTool.value)) {
      // 完成形状绘制，基于格子
      finalizeShape();
    } else {
      // 其他工具结束后更新画布显示
      optimizedRenderCanvas();
    }
  };

  // 清空画布
  const clearCanvas = () => {
    if (!contentCtx || !contentCanvas || !canvasRef.value) return;

    contentCtx.fillStyle = '#ffffff';
    contentCtx.fillRect(0, 0, contentCanvas.width, contentCanvas.height);

    // 重置过滤缓存
    lastFilteredVersion = 0;

    // 重绘画布
    optimizedRenderCanvas();
  };

  // 导出为图片
  const exportAsImage = () => {
    if (!canvasRef.value || !contentCanvas) return '';

    // 直接返回内容画布的内容（不包含网格）
    return contentCanvas.toDataURL('image/png');
  };

  // 设置工具
  const setTool = (tool: ToolType) => {
    currentTool.value = tool;

    // 根据工具类型更改鼠标样式
    if (canvasRef.value) {
      if (tool === 'move') {
        // 使用视角移动的鼠标样式
        canvasRef.value.style.cursor = 'all-scroll';
      } else if (tool === 'colorPicker') {
        canvasRef.value.style.cursor = 'crosshair';
      } else if (tool === 'paintBucket') {
        // 更改为自定义CSS cursor或更合适的内置光标
        canvasRef.value.style.cursor = 'pointer'; // 使用pointer光标更直观地表示点击填充
      } else if (tool === 'eraser') {
        canvasRef.value.style.cursor = 'no-drop';
      } else if (['rectangle', 'circle', 'line'].includes(tool)) {
        canvasRef.value.style.cursor = 'crosshair';
      } else if (tool === 'imageUpload') {
        canvasRef.value.style.cursor = 'move'; // 图片上传工具使用移动光标
      } else {
        canvasRef.value.style.cursor = 'default';
      }
    }
  };

  // 设置颜色
  const setColor = (color: string) => {
    console.log('setColor被调用，设置颜色为:', color);
    currentColor.value = color;
    console.log('currentColor.value已更新为:', currentColor.value);
  };

  // 优化的网格大小设置
  const setGridSize = (colValue: number, rowValue: number) => {
    // 确保网格大小为正整数，提高渲染精度
    const newColValue = Math.max(1, Math.round(colValue));
    const newRowValue = Math.max(1, Math.round(rowValue));

    // 避免不必要的更新
    if (
      gridColValue.value === newColValue &&
      gridRowValue.value === newRowValue
    ) {
      return;
    }

    gridColValue.value = newColValue;
    gridRowValue.value = newRowValue;

    // 使用逻辑尺寸计算格子数量，确保跨屏幕一致性
    if (canvasRef.value) {
      const canvas = canvasRef.value;
      const { width: logicalWidth, height: logicalHeight } =
        getCanvasLogicalSize(canvas);

      gridColCount.value = Math.floor(logicalWidth / gridColValue.value);
      gridRowCount.value = Math.floor(logicalHeight / gridRowValue.value);

      console.log('网格大小优化:', {
        cellSize: { col: newColValue, row: newRowValue },
        logicalSize: { width: logicalWidth, height: logicalHeight },
        gridCount: { col: gridColCount.value, row: gridRowCount.value },
        devicePixelRatio: getDevicePixelRatio(),
      });
    }

    // 防抖更新渲染
    optimizedRenderCanvas();
  };

  // 优化的格子数量设置
  const setGridCount = (colCount: number, rowCount: number) => {
    const newColCount = Math.max(1, Math.round(colCount));
    const newRowCount = Math.max(1, Math.round(rowCount));

    // 避免不必要的更新
    if (
      gridColCount.value === newColCount &&
      gridRowCount.value === newRowCount
    ) {
      return;
    }

    gridColCount.value = newColCount;
    gridRowCount.value = newRowCount;

    // 使用逻辑尺寸计算格子大小，确保跨屏幕一致性
    if (canvasRef.value) {
      const canvas = canvasRef.value;
      const { width: logicalWidth, height: logicalHeight } =
        getCanvasLogicalSize(canvas);

      // 计算精确的格子大小
      const idealColSize = logicalWidth / newColCount;
      const idealRowSize = logicalHeight / newRowCount;

      // 使用整数像素对齐，避免抗锯齿问题
      gridColValue.value = Math.max(1, Math.round(idealColSize));
      gridRowValue.value = Math.max(1, Math.round(idealRowSize));

      console.log('格子数量优化:', {
        gridCount: { col: newColCount, row: newRowCount },
        logicalSize: { width: logicalWidth, height: logicalHeight },
        cellSize: { col: gridColValue.value, row: gridRowValue.value },
        devicePixelRatio: getDevicePixelRatio(),
      });
    }

    // 防抖更新渲染
    optimizedRenderCanvas();
  };

  // 画布缩放
  const setZoom = (zoom: number) => {
    zoomLevel.value = zoom;
    if (canvasRef.value && containerRef.value) {
      updateCanvasPosition();
    }
  };

  // 处理滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 限制缩放范围
    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 2; // 最大放大到200%

    if (e.deltaY < 0 && zoomLevel.value < MAX_ZOOM) {
      // 放大
      zoomLevel.value = Math.min(zoomLevel.value * 1.1, MAX_ZOOM);
    } else if (e.deltaY > 0 && zoomLevel.value > MIN_ZOOM) {
      // 缩小
      zoomLevel.value = Math.max(zoomLevel.value / 1.1, MIN_ZOOM);
    }

    // 更新画布位置
    updateCanvasPosition();
  };

  // 更新画布位置（考虑设备像素比）
  const updateCanvasPosition = () => {
    if (!canvasRef.value || !containerRef.value) return;

    const container = containerRef.value;
    const canvas = canvasRef.value;
    const devicePixelRatio = getDevicePixelRatio();

    const containerRect = container.getBoundingClientRect();

    // 使用逻辑尺寸而非物理尺寸进行位置计算
    const { width: logicalWidth, height: logicalHeight } =
      getCanvasLogicalSize(canvas);

    const canvasWidth = logicalWidth * zoomLevel.value;
    const canvasHeight = logicalHeight * zoomLevel.value;

    // 如果是首次定位或重置位置，则居中显示
    if (!canvasPosition.value.hasBeenPanned) {
      canvasPosition.value = {
        x: (containerRect.width - canvasWidth) / 2,
        y: (containerRect.height - canvasHeight) / 2,
        hasBeenPanned: false,
      };
    } else {
      // 如果是缩放导致的更新，则调整位置保持视图中心
      const oldZoom = canvasPosition.value.lastZoom || 1;
      const zoomRatio = zoomLevel.value / oldZoom;

      // 计算容器中心点
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;

      // 计算画布中心点相对于容器中心的偏移量（使用逻辑尺寸）
      const offsetFromCenterX =
        containerCenterX -
        canvasPosition.value.x -
        (logicalWidth * oldZoom) / 2;
      const offsetFromCenterY =
        containerCenterY -
        canvasPosition.value.y -
        (logicalHeight * oldZoom) / 2;

      // 按缩放比例调整偏移量
      const newOffsetX = offsetFromCenterX * zoomRatio;
      const newOffsetY = offsetFromCenterY * zoomRatio;

      // 计算新的画布位置（使用逻辑尺寸）
      canvasPosition.value = {
        x: containerCenterX - newOffsetX - (logicalWidth * zoomLevel.value) / 2,
        y:
          containerCenterY - newOffsetY - (logicalHeight * zoomLevel.value) / 2,
        hasBeenPanned: true,
        lastZoom: zoomLevel.value,
      };
    }

    // 重绘画布
    renderCanvas();
  };

  // 取色器功能（考虑设备像素比）
  const pickColor = (x: number, y: number) => {
    if (!contentCtx || !contentCanvas || !canvasRef.value) return;

    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;
    const devicePixelRatio = getDevicePixelRatio();

    // 计算格子的左上角坐标
    const cellX = Math.floor(x / cellWidth) * cellWidth;
    const cellY = Math.floor(y / cellHeight) * cellHeight;

    // 获取格子中心位置
    const centerX = cellX + Math.floor(cellWidth / 2);
    const centerY = cellY + Math.floor(cellHeight / 2);

    // 使用逻辑尺寸进行边界检查
    const { width: logicalWidth, height: logicalHeight } =
      getCanvasLogicalSize(contentCanvas);

    // 确保坐标在逻辑画布范围内
    if (
      centerX < 0 ||
      centerX >= logicalWidth ||
      centerY < 0 ||
      centerY >= logicalHeight
    ) {
      return;
    }

    // 将逻辑坐标转换为物理坐标进行像素获取
    const physicalX = Math.floor(centerX * devicePixelRatio);
    const physicalY = Math.floor(centerY * devicePixelRatio);

    // 获取像素数据（使用物理坐标）
    const pixel = contentCtx.getImageData(physicalX, physicalY, 1, 1).data;

    // 将RGB值转换为十六进制
    const hex =
      '#' +
      ('0' + pixel[0].toString(16)).slice(-2) +
      ('0' + pixel[1].toString(16)).slice(-2) +
      ('0' + pixel[2].toString(16)).slice(-2);

    // 设置为当前颜色
    currentColor.value = hex;

    // 添加视觉反馈
    showPickedColorFeedback(cellX, cellY, cellWidth, cellHeight, hex);

    // 更新UI
    optimizedRenderCanvas();
  };

  // 显示取色视觉反馈
  const showPickedColorFeedback = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) => {
    if (!ctx.value || !canvasRef.value) return;

    // 在选中的格子周围绘制指示器
    ctx.value.save();

    // 外边框
    ctx.value.strokeStyle = '#ffffff';
    ctx.value.lineWidth = 2;
    ctx.value.strokeRect(x - 2, y - 2, width + 4, height + 4);

    // 内边框
    ctx.value.strokeStyle = '#000000';
    ctx.value.lineWidth = 1;
    ctx.value.strokeRect(x - 1, y - 1, width + 2, height + 2);

    // 在格子上方显示颜色值
    ctx.value.fillStyle = '#ffffff';
    ctx.value.strokeStyle = '#000000';
    ctx.value.lineWidth = 3;
    ctx.value.font = 'bold 12px Arial';
    ctx.value.textAlign = 'center';

    // 先绘制描边
    ctx.value.strokeText(color.toUpperCase(), x + width / 2, y - 5);
    // 再绘制文本
    ctx.value.fillText(color.toUpperCase(), x + width / 2, y - 5);

    ctx.value.restore();

    // 只显示短暂的反馈，不再使用定时器自动移除
    // 当用户再次使用取色器或其他工具时，反馈会被清除
  };

  // 填充工具实现
  const fillArea = (x: number, y: number) => {
    if (!contentCtx || !contentCanvas || !canvasRef.value) {
      console.error('填充工具错误: 画布或上下文未初始化');
      return;
    }

    // 直接执行填充操作，无需显示加载状态和等待
    performFloodFill(x, y);
  };

  // 执行实际的填充操作 - 使用格子为单位的填充
  const performFloodFill = (x: number, y: number) => {
    if (!contentCtx || !contentCanvas || !canvasRef.value) return;

    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;

    // 计算初始格子坐标
    const startCellX = Math.floor(x / cellWidth);
    const startCellY = Math.floor(y / cellHeight);

    // 计算格子绝对位置（左上角坐标）
    const cellAbsX = startCellX * cellWidth;
    const cellAbsY = startCellY * cellHeight;

    // 获取初始格子的颜色（考虑设备像素比）
    const cellCenterX = cellAbsX + Math.floor(cellWidth / 2);
    const cellCenterY = cellAbsY + Math.floor(cellHeight / 2);
    const devicePixelRatio = getDevicePixelRatio();

    // 使用逻辑尺寸进行边界检查
    const { width: logicalWidth, height: logicalHeight } =
      getCanvasLogicalSize(contentCanvas);

    // 确保坐标在逻辑画布范围内
    if (
      cellCenterX < 0 ||
      cellCenterX >= logicalWidth ||
      cellCenterY < 0 ||
      cellCenterY >= logicalHeight
    ) {
      optimizedRenderCanvas(); // 恢复画布
      return;
    }

    // 将逻辑坐标转换为物理坐标
    const physicalCenterX = Math.floor(cellCenterX * devicePixelRatio);
    const physicalCenterY = Math.floor(cellCenterY * devicePixelRatio);

    // 获取目标色（使用物理坐标）
    const targetColorData = contentCtx.getImageData(
      physicalCenterX,
      physicalCenterY,
      1,
      1,
    ).data;

    const targetColor = {
      r: targetColorData[0],
      g: targetColorData[1],
      b: targetColorData[2],
      a: targetColorData[3],
    };

    // 获取填充色
    const fillColor = hexToRgba(currentColor.value);

    // 如果颜色相同，不需要填充
    if (
      targetColor.r === fillColor.r &&
      targetColor.g === fillColor.g &&
      targetColor.b === fillColor.b
    ) {
      optimizedRenderCanvas(); // 恢复画布
      return;
    }

    // 计算网格尺寸（使用逻辑尺寸）
    const { width: canvasLogicalWidth, height: canvasLogicalHeight } =
      getCanvasLogicalSize(contentCanvas);
    const gridWidth = Math.ceil(canvasLogicalWidth / cellWidth);
    const gridHeight = Math.ceil(canvasLogicalHeight / cellHeight);

    // 创建访问标记数组
    const visited = Array(gridHeight)
      .fill(0)
      .map(() => Array(gridWidth).fill(false));

    // 创建要处理的单元格队列
    const queue: Array<[number, number]> = [];
    queue.push([startCellX, startCellY]);
    visited[startCellY][startCellX] = true;

    // 已填充单元格计数
    let filledCellsCount = 0;
    let batchSize = 0;
    const MAX_BATCH_SIZE = 500; // 每批处理的最大单元格数

    // 创建填充批处理函数
    const processBatch = () => {
      // 重置当前批次大小
      batchSize = 0;

      while (queue.length > 0 && batchSize < MAX_BATCH_SIZE) {
        // 取出队列中的第一个单元格
        const cell = queue.shift();
        if (!cell) break;

        const [cellX, cellY] = cell;
        batchSize++;
        filledCellsCount++;

        // 计算单元格实际像素位置
        const pixelX = cellX * cellWidth;
        const pixelY = cellY * cellHeight;

        // 检查单元格中心颜色是否与目标颜色相同
        const checkX = pixelX + Math.floor(cellWidth / 2);
        const checkY = pixelY + Math.floor(cellHeight / 2);

        // 确保检查点在画布逻辑范围内
        if (
          !contentCanvas ||
          checkX < 0 ||
          checkX >= canvasLogicalWidth ||
          checkY < 0 ||
          checkY >= canvasLogicalHeight
        ) {
          continue;
        }

        // 获取当前格子中心点的颜色（转换为物理坐标）
        if (!contentCtx) continue;

        const devicePixelRatio = getDevicePixelRatio();
        const physicalCheckX = Math.floor(checkX * devicePixelRatio);
        const physicalCheckY = Math.floor(checkY * devicePixelRatio);
        const colorData = contentCtx.getImageData(
          physicalCheckX,
          physicalCheckY,
          1,
          1,
        ).data;

        // 判断颜色是否与目标颜色相同
        if (
          colorData[0] === targetColor.r &&
          colorData[1] === targetColor.g &&
          colorData[2] === targetColor.b &&
          colorData[3] === targetColor.a
        ) {
          // 填充这个单元格 - 直接使用现有的fillCell功能
          if (contentCtx) {
            contentCtx.fillStyle = currentColor.value;
            console.log('fillCell使用的颜色:', currentColor.value);
            contentCtx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          }

          // 检查四个相邻格子
          const directions: Array<[number, number]> = [
            [0, -1], // 上
            [1, 0], // 右
            [0, 1], // 下
            [-1, 0], // 左
          ];

          for (const [dx, dy] of directions) {
            const newCellX = cellX + dx;
            const newCellY = cellY + dy;

            // 确保新格子在有效范围内且未访问过
            if (
              newCellX >= 0 &&
              newCellX < gridWidth &&
              newCellY >= 0 &&
              newCellY < gridHeight &&
              !visited[newCellY][newCellX]
            ) {
              queue.push([newCellX, newCellY]);
              visited[newCellY][newCellX] = true;
            }
          }
        }
      }

      // 判断是否还需要继续处理
      if (queue.length > 0) {
        // 每批次之间允许UI更新
        setTimeout(processBatch, 0);
      } else {
        // 填充完成，刷新画布显示
        optimizedRenderCanvas();
        console.log(`填充完成，共填充 ${filledCellsCount} 个格子`);
      }
    };

    // 开始处理第一批
    processBatch();
  };

  // 将十六进制颜色转换为RGBA对象
  const hexToRgba = (hex: string) => {
    try {
      // 移除#前缀
      hex = hex.replace('#', '');

      // 处理简写形式 (例如 #FFF)
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map((char) => char + char)
          .join('');
      }

      // 确保是有效的十六进制颜色
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        console.error('无效的十六进制颜色:', hex);
        return { r: 0, g: 0, b: 0, a: 255 }; // 默认返回黑色
      }

      // 解析RGB值
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      return { r, g, b, a: 255 };
    } catch (error) {
      console.error('颜色转换错误:', error);
      return { r: 0, g: 0, b: 0, a: 255 }; // 默认返回黑色
    }
  };

  // 移动画布功能 - 修改为视角移动
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  const startPanCanvas = (e: MouseEvent) => {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    if (canvasRef.value) {
      canvasRef.value.style.cursor = 'grabbing';
    }
  };

  const panCanvas = (e: MouseEvent) => {
    if (!isPanning) return;

    // 计算鼠标移动的距离
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;

    // 更新画布位置，视角移动方向与鼠标移动方向相同
    // 与原来的相反，实现"视角移动"的效果
    canvasPosition.value = {
      x: canvasPosition.value.x + dx,
      y: canvasPosition.value.y + dy,
      hasBeenPanned: true,
      lastZoom: zoomLevel.value,
    };

    // 记录当前鼠标位置，用于下一次计算
    panStartX = e.clientX;
    panStartY = e.clientY;

    // 更新画布显示
    optimizedRenderCanvas();
  };

  const stopPanCanvas = () => {
    isPanning = false;
    if (canvasRef.value && currentTool.value === 'move') {
      canvasRef.value.style.cursor = 'all-scroll';
    }
  };

  // 优化的格子填充函数
  const fillCell = (x: number, y: number) => {
    if (!contentCtx || !contentCanvas || !canvasRef.value) return;

    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;

    // 高精度格子坐标计算
    const cellIndexX = Math.floor(x / cellWidth);
    const cellIndexY = Math.floor(y / cellHeight);

    // 边界检查
    if (
      cellIndexX < 0 ||
      cellIndexY < 0 ||
      cellIndexX >= gridColCount.value ||
      cellIndexY >= gridRowCount.value
    ) {
      return;
    }

    // 生成唯一的格子标识符
    const cellKey = `${cellIndexX},${cellIndexY}`;

    // 去重检查：避免重复绘制
    if (drawnCells.has(cellKey)) {
      return;
    }

    // 逻辑坐标系中的格子坐标（已经通过setupHighDPICanvas处理了设备像素比）
    const cellX = cellIndexX * cellWidth;
    const cellY = cellIndexY * cellHeight;

    // 调试信息
    console.log('fillCell 调试:', {
      input: { x, y },
      cellIndex: { x: cellIndexX, y: cellIndexY },
      cellPosition: { x: cellX, y: cellY },
      cellSize: { width: cellWidth, height: cellHeight },
      color: currentColor.value,
      canvasSize: { width: contentCanvas.width, height: contentCanvas.height },
      gridCounts: { col: gridColCount.value, row: gridRowCount.value },
    });

    // 标记格子已绘制
    drawnCells.add(cellKey);

    // 高性能绘制设置
    contentCtx.save();

    // 禁用抗锯齿，确保像素完美
    contentCtx.imageSmoothingEnabled = false;
    (contentCtx as any).mozImageSmoothingEnabled = false;
    (contentCtx as any).webkitImageSmoothingEnabled = false;
    (contentCtx as any).msImageSmoothingEnabled = false;

    // 设置填充颜色
    contentCtx.fillStyle = currentColor.value;

    // 使用逻辑坐标进行填充（context已经被缩放处理）
    contentCtx.fillRect(
      Math.round(cellX),
      Math.round(cellY),
      Math.round(cellWidth),
      Math.round(cellHeight),
    );

    contentCtx.restore();

    // 重置过滤缓存
    lastFilteredVersion = 0;

    // 延迟渲染以提高性能
    optimizedRenderCanvas();
  };

  // 擦除一个格子单元
  const eraseCell = (x: number, y: number) => {
    if (!contentCtx || !contentCanvas || !canvasRef.value) return;

    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;

    // 高精度格子坐标计算
    const cellIndexX = Math.floor(x / cellWidth);
    const cellIndexY = Math.floor(y / cellHeight);

    // 边界检查
    if (
      cellIndexX < 0 ||
      cellIndexY < 0 ||
      cellIndexX >= gridColCount.value ||
      cellIndexY >= gridRowCount.value
    ) {
      return;
    }

    // 使用格子索引作为唯一标识符
    const cellKey = `${cellIndexX},${cellIndexY}`;

    // 如果这个格子已经擦除过，则跳过
    if (drawnCells.has(cellKey)) {
      return;
    }

    // 标记这个格子已经擦除过
    drawnCells.add(cellKey);

    // 逻辑坐标系中的格子坐标（已经通过setupHighDPICanvas处理了设备像素比）
    const cellX = cellIndexX * cellWidth;
    const cellY = cellIndexY * cellHeight;

    // 使用 clearRect 清除格子，而不是用白色填充
    // 这样可以完全移除原始像素，避免抗锯齿残留
    contentCtx.save();

    // 确保不使用抗锯齿
    contentCtx.imageSmoothingEnabled = false;
    (contentCtx as any).mozImageSmoothingEnabled = false;
    (contentCtx as any).webkitImageSmoothingEnabled = false;
    (contentCtx as any).msImageSmoothingEnabled = false;

    // 先清除区域（使用逻辑坐标，context已经被缩放处理）
    contentCtx.clearRect(
      Math.round(cellX),
      Math.round(cellY),
      Math.round(cellWidth),
      Math.round(cellHeight),
    );

    // 然后填充白色背景，确保完全覆盖
    contentCtx.fillStyle = '#ffffff';
    contentCtx.fillRect(
      Math.round(cellX),
      Math.round(cellY),
      Math.round(cellWidth),
      Math.round(cellHeight),
    );

    contentCtx.restore();

    // 重置过滤缓存，因为内容已更改
    lastFilteredVersion = 0;

    // 更新画布显示（不绘制额外的边框）
    optimizedRenderCanvas();
  };

  // 完成形状绘制，将预览的形状转换为基于格子的形状
  const finalizeShape = () => {
    if (
      !ctx.value ||
      !canvasRef.value ||
      !tempCanvas ||
      !contentCtx ||
      !contentCanvas
    )
      return;

    const canvas = canvasRef.value;
    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;

    // 创建临时画布用于渲染形状（使用逻辑尺寸）
    const shapeCanvas = document.createElement('canvas');
    const { width: logicalWidth, height: logicalHeight } =
      getCanvasLogicalSize(canvas);

    const shapeCtx = shapeCanvas.getContext('2d');
    if (!shapeCtx) return;

    // 设置高DPI画布
    setupHighDPICanvas(shapeCanvas, shapeCtx, logicalWidth, logicalHeight);

    // 首先绘制原始画布内容
    shapeCtx.drawImage(tempCanvas, 0, 0);

    // 然后根据当前工具绘制形状
    shapeCtx.strokeStyle = currentColor.value;
    shapeCtx.fillStyle = currentColor.value;
    shapeCtx.lineWidth = 3;

    if (currentTool.value === 'rectangle') {
      // 绘制矩形
      const startCellX = Math.floor(startX / cellWidth) * cellWidth;
      const startCellY = Math.floor(startY / cellHeight) * cellHeight;
      const endCellX = Math.floor(lastX / cellWidth) * cellWidth;
      const endCellY = Math.floor(lastY / cellHeight) * cellHeight;

      // 遍历所有包含在矩形中的格子并填充
      const minX = Math.min(startCellX, endCellX);
      const maxX = Math.max(startCellX, endCellX);
      const minY = Math.min(startCellY, endCellY);
      const maxY = Math.max(startCellY, endCellY);

      for (let x = minX; x <= maxX; x += cellWidth) {
        for (let y = minY; y <= maxY; y += cellHeight) {
          // 只填充边界格子
          if (x === minX || x === maxX || y === minY || y === maxY) {
            shapeCtx.fillRect(x, y, cellWidth, cellHeight);
          }
        }
      }
    } else if (currentTool.value === 'circle') {
      // 计算圆心和半径（以格子为单位）
      const centerCellX =
        Math.floor(startX / cellWidth) * cellWidth + cellWidth / 2;
      const centerCellY =
        Math.floor(startY / cellHeight) * cellHeight + cellHeight / 2;
      const radius = Math.sqrt(
        Math.pow(lastX - startX, 2) + Math.pow(lastY - startY, 2),
      );

      // 用格子近似绘制圆
      for (let x = 0; x < logicalWidth; x += cellWidth) {
        for (let y = 0; y < logicalHeight; y += cellHeight) {
          // 计算当前格子中心到圆心的距离
          const cellCenterX = x + cellWidth / 2;
          const cellCenterY = y + cellHeight / 2;
          const distance = Math.sqrt(
            Math.pow(cellCenterX - centerCellX, 2) +
              Math.pow(cellCenterY - centerCellY, 2),
          );

          // 如果距离接近半径，则填充此格子（创建圆的轮廓）
          const tolerance = Math.max(cellWidth, cellHeight);
          if (Math.abs(distance - radius) < tolerance) {
            shapeCtx.fillRect(x, y, cellWidth, cellHeight);
          }
        }
      }
    } else if (currentTool.value === 'line') {
      // 基于布雷森汉姆算法在格子上绘制线
      const startCellX = Math.floor(startX / cellWidth);
      const startCellY = Math.floor(startY / cellHeight);
      const endCellX = Math.floor(lastX / cellWidth);
      const endCellY = Math.floor(lastY / cellHeight);

      // 布雷森汉姆算法计算线上的所有格子
      let x = startCellX;
      let y = startCellY;
      const dx = Math.abs(endCellX - startCellX);
      const dy = Math.abs(endCellY - startCellY);
      const sx = startCellX < endCellX ? 1 : -1;
      const sy = startCellY < endCellY ? 1 : -1;
      let err = dx - dy;

      while (true) {
        // 填充当前格子
        shapeCtx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

        // 判断是否达到终点
        if (x === endCellX && y === endCellY) break;

        // 更新坐标
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    }

    // 将结果绘制回内容画布
    contentCtx.clearRect(0, 0, logicalWidth, logicalHeight);
    contentCtx.drawImage(shapeCanvas, 0, 0);

    // 更新显示
    optimizedRenderCanvas();
  };

  // 设置是否启用格子对齐
  const setSnapToGrid = (value: boolean) => {
    snapToGrid.value = value;
  };

  // 设置画布尺寸 (厘米)
  const setCanvasSize = (widthCm: number, heightCm: number) => {
    if (!canvasRef.value || !contentCanvas || !tempCanvas) return;

    // 更新尺寸变量
    canvasWidthCm.value = widthCm;
    canvasHeightCm.value = heightCm;

    // 计算CSS显示像素值
    const displayWidthPx = cmToPx(widthCm);
    const displayHeightPx = cmToPx(heightCm);

    // 保存当前内容以便在调整大小后恢复
    const oldContent = document.createElement('canvas');
    const { width: oldDisplayWidth, height: oldDisplayHeight } =
      getCanvasLogicalSize(contentCanvas);

    const oldCtx = oldContent.getContext('2d');
    if (oldCtx) {
      setupHighDPICanvas(oldContent, oldCtx, oldDisplayWidth, oldDisplayHeight);
      oldCtx.drawImage(contentCanvas, 0, 0, oldDisplayWidth, oldDisplayHeight);
    }

    // 调整主画布大小
    const canvas = canvasRef.value;
    const mainCtx = canvas.getContext('2d');
    if (mainCtx) {
      setupHighDPICanvas(canvas, mainCtx, displayWidthPx, displayHeightPx);
    }

    // 调整内容画布大小
    if (contentCtx) {
      setupHighDPICanvas(
        contentCanvas,
        contentCtx,
        displayWidthPx,
        displayHeightPx,
      );

      contentCtx.fillStyle = '#ffffff';
      contentCtx.fillRect(0, 0, displayWidthPx, displayHeightPx);
      contentCtx.drawImage(oldContent, 0, 0, displayWidthPx, displayHeightPx);
    }

    // 调整临时画布大小
    if (tempCtx) {
      setupHighDPICanvas(tempCanvas, tempCtx, displayWidthPx, displayHeightPx);
    }

    // 重置画布位置标志，使其居中显示
    canvasPosition.value.hasBeenPanned = false;

    // 更新画布位置和显示
    updateCanvasPosition();
  };

  // 高性能防抖函数，支持立即执行
  const debounce = (fn: Function, delay: number) => {
    let timer: number | null = null;
    let lastCallTime = 0;

    return function (...args: any[]) {
      const now = Date.now();

      if (timer) clearTimeout(timer);

      // 如果距离上次调用时间足够长，立即执行
      if (now - lastCallTime >= delay) {
        lastCallTime = now;
        fn(...args);
      } else {
        // 否则延迟执行
        timer = window.setTimeout(
          () => {
            lastCallTime = Date.now();
            fn(...args);
            timer = null;
          },
          delay - (now - lastCallTime),
        );
      }
    };
  };

  // 智能渲染系统
  let animationFrameId: number | null = null;
  let pendingDraw = false;
  let lastRenderTime = 0;
  const MAX_FPS = 60;
  const MIN_FRAME_TIME = 1000 / MAX_FPS;

  // 优化的渲染函数，根据操作类型智能调节渲染频率
  const optimizedRenderCanvas = (immediate = false) => {
    const now = performance.now();

    // 对于实时操作（如移动、取色），使用高频率渲染
    if (
      immediate ||
      currentTool.value === 'move' ||
      currentTool.value === 'colorPicker'
    ) {
      if (pendingDraw) return;

      pendingDraw = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        renderCanvasWithColorFilter();
        lastRenderTime = performance.now();
        pendingDraw = false;
        animationFrameId = null;
      });
    } else {
      // 对于绘制操作，使用防抖策略
      if (now - lastRenderTime < MIN_FRAME_TIME) {
        // 如果渲染过于频繁，延迟执行
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
          renderCanvasWithColorFilter();
          lastRenderTime = performance.now();
          animationFrameId = null;
        });
      } else {
        // 立即渲染
        renderCanvasWithColorFilter();
        lastRenderTime = now;
      }
    }
  };

  // 上传图片功能
  const uploadImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 验证文件类型
      if (!file.type.match('image.*')) {
        reject(new Error('请选择图片文件'));
        return;
      }

      // 检查文件大小，超过10MB拒绝
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('图片文件过大，请选择10MB以下的图片'));
        return;
      }

      console.log(
        `开始处理图片: ${file.name}, 大小: ${(file.size / 1024).toFixed(
          2,
        )}KB, 类型: ${file.type}`,
      );

      // 读取文件内容
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (e.target && result && typeof result === 'string') {
          imageFile.value = file;
          imagePreview.value = result;

          // 预加载图片
          const img = new Image();

          // 设置更长的超时时间
          const timeout = setTimeout(() => {
            reject(new Error('图片加载超时，请尝试使用更小的图片'));
          }, 30000); // 30秒超时

          img.onload = () => {
            clearTimeout(timeout);
            console.log(`图片加载成功，尺寸: ${img.width}x${img.height}`);

            // 检查图片尺寸
            if (img.width > 4000 || img.height > 4000) {
              reject(new Error('图片尺寸过大，请使用4000x4000像素以下的图片'));
              return;
            }

            tempImage.value = img;
            resolve(result);
          };

          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('图片加载失败，请检查图片格式是否正确'));
          };

          img.src = result;
        } else {
          reject(new Error('文件读取失败'));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取出错'));
      };

      reader.readAsDataURL(file);
    });
  };

  // 开始放置图片
  const startImagePlacement = () => {
    if (!tempImage.value) {
      console.error('无法开始图片放置：图片未加载');
      return;
    }

    console.log(
      '开始图片放置，图片尺寸:',
      tempImage.value.width,
      'x',
      tempImage.value.height,
    );

    isPlacingImage.value = true;

    // 重置图片位置到画布中心
    if (canvasRef.value) {
      // 计算合适的缩放比例
      const optimalScale = calculateOptimalScale(tempImage.value);
      imageScale.value = optimalScale;

      // 放置在画布中心
      imagePosition.value = {
        x: (canvasRef.value.width - tempImage.value.width * optimalScale) / 2,
        y: (canvasRef.value.height - tempImage.value.height * optimalScale) / 2,
      };

      console.log(
        '图片初始位置:',
        imagePosition.value.x,
        imagePosition.value.y,
        '缩放比例:',
        imageScale.value,
      );
    }

    // 绘制临时预览
    drawImagePreview();
  };

  // 计算最佳缩放比例
  const calculateOptimalScale = (img: HTMLImageElement): number => {
    if (!canvasRef.value) return 1;

    const canvasWidth = canvasRef.value.width;
    const canvasHeight = canvasRef.value.height;

    // 计算图片与画布的比例，保留一些边距
    const maxWidth = canvasWidth * 0.9;
    const maxHeight = canvasHeight * 0.9;

    const widthRatio = maxWidth / img.width;
    const heightRatio = maxHeight / img.height;

    // 取较小的缩放比例，确保图片完全可见
    // 但不要超过1.0，避免图片放大失真
    return Math.min(widthRatio, heightRatio, 1);
  };

  // 移动图片位置
  const moveImagePreview = (x: number, y: number) => {
    if (!isPlacingImage.value || !tempImage.value || !canvasRef.value) return;

    // 计算边界
    const imgWidth = tempImage.value.width * imageScale.value;
    const imgHeight = tempImage.value.height * imageScale.value;
    const canvasWidth = canvasRef.value.width;
    const canvasHeight = canvasRef.value.height;

    // 确保图片至少有25%在画布内
    const minX = -imgWidth * 0.75;
    const maxX = canvasWidth - imgWidth * 0.25;
    const minY = -imgHeight * 0.75;
    const maxY = canvasHeight - imgHeight * 0.25;

    // 确保图片位置在合理范围内
    const boundedX = Math.max(minX, Math.min(maxX, x));
    const boundedY = Math.max(minY, Math.min(maxY, y));

    imagePosition.value = { x: boundedX, y: boundedY };

    // 更新预览
    drawImagePreview();
  };

  // 绘制图片预览
  const drawImagePreview = () => {
    if (!ctx.value || !canvasRef.value || !tempImage.value) {
      console.error('无法绘制图片预览：缺少必要的引用');
      return;
    }

    try {
      // 清除画布并重绘内容
      renderCanvas();

      // 绘制半透明的图片预览
      ctx.value.save();

      // 禁用图像平滑
      ctx.value.imageSmoothingEnabled = false;
      // 兼容不同浏览器的前缀
      (ctx.value as any).mozImageSmoothingEnabled = false;
      (ctx.value as any).webkitImageSmoothingEnabled = false;
      (ctx.value as any).msImageSmoothingEnabled = false;

      ctx.value.globalAlpha = 0.7;
      ctx.value.drawImage(
        tempImage.value,
        imagePosition.value.x,
        imagePosition.value.y,
        tempImage.value.width * imageScale.value,
        tempImage.value.height * imageScale.value,
      );

      // 绘制边框
      ctx.value.strokeStyle = '#000000';
      ctx.value.lineWidth = 2;
      ctx.value.strokeRect(
        imagePosition.value.x,
        imagePosition.value.y,
        tempImage.value.width * imageScale.value,
        tempImage.value.height * imageScale.value,
      );

      // 添加拖动提示
      ctx.value.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.value.font = 'bold 14px Arial';
      ctx.value.textAlign = 'center';
      ctx.value.fillText(
        '拖动调整位置',
        imagePosition.value.x + (tempImage.value.width * imageScale.value) / 2,
        imagePosition.value.y + (tempImage.value.height * imageScale.value) / 2,
      );

      ctx.value.restore();
    } catch (error) {
      console.error('绘制图片预览时出错:', error);
    }
  };

  // 调整图片大小
  const scaleImage = (scale: number) => {
    imageScale.value = scale;
    if (isPlacingImage.value) {
      drawImagePreview();
    }
  };

  // 将图片应用到画布
  const applyImageToCanvas = () => {
    if (!contentCtx || !tempImage.value || !contentCanvas || !canvasRef.value)
      return;

    console.log('应用图片到画布，让图片铺满整个画布');

    // 清空当前画布内容
    clearCanvas();

    // 获取原始图片尺寸
    const originalImgWidth = tempImage.value.width;
    const originalImgHeight = tempImage.value.height;

    // 使用当前设置的格子数
    const targetGridWidth = gridColCount.value;
    const targetGridHeight = gridRowCount.value;

    console.log(
      `原始图片尺寸: ${originalImgWidth}x${originalImgHeight}, 目标格子数: ${targetGridWidth}x${targetGridHeight}`,
    );

    // 获取画布的显示尺寸，确保与getCanvasCoordinates中的计算一致
    const canvas = canvasRef.value;
    const { width: displayWidth, height: displayHeight } =
      getCanvasLogicalSize(canvas);

    // 使用显示尺寸来计算格子大小，与setGridCount保持一致
    gridColValue.value = Math.round((displayWidth / targetGridWidth) * 2) / 2; // 允许 0.5 像素精度
    gridRowValue.value = Math.round((displayHeight / targetGridHeight) * 2) / 2; // 允许 0.5 像素精度

    // 确保至少为 1 像素
    gridColValue.value = Math.max(1, gridColValue.value);
    gridRowValue.value = Math.max(1, gridRowValue.value);

    // 计算单元格大小
    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;

    console.log(`格子大小: ${cellWidth.toFixed(2)}x${cellHeight.toFixed(2)}`);

    // 创建临时画布进行像素化处理
    const pixelateCanvas = document.createElement('canvas');
    const pixelateCtx = pixelateCanvas.getContext('2d');
    if (!pixelateCtx) return;

    // 设置临时画布大小为目标格子数
    pixelateCanvas.width = targetGridWidth;
    pixelateCanvas.height = targetGridHeight;

    // 禁用平滑以保持像素风格
    pixelateCtx.imageSmoothingEnabled = false;
    // 兼容不同浏览器的前缀
    (pixelateCtx as any).mozImageSmoothingEnabled = false;
    (pixelateCtx as any).webkitImageSmoothingEnabled = false;
    (pixelateCtx as any).msImageSmoothingEnabled = false;

    // 将原始图片缩放绘制到临时画布，实现降采样
    pixelateCtx.drawImage(
      tempImage.value,
      0,
      0,
      originalImgWidth,
      originalImgHeight, // 源图像区域
      0,
      0,
      targetGridWidth,
      targetGridHeight, // 目标区域
    );

    // 获取缩放后的像素数据
    const imageData = pixelateCtx.getImageData(
      0,
      0,
      targetGridWidth,
      targetGridHeight,
    );
    const data = imageData.data;

    console.log(
      `开始应用图片，处理 ${targetGridWidth}x${targetGridHeight} 个格子`,
    );

    // 遍历每个格子，应用颜色
    for (let y = 0; y < targetGridHeight; y++) {
      for (let x = 0; x < targetGridWidth; x++) {
        // 获取像素颜色
        const index = (y * targetGridWidth + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        // 跳过完全透明的像素
        if (a < 10) continue;

        // 将RGB值转换为十六进制
        const hex =
          '#' +
          ('0' + r.toString(16)).slice(-2) +
          ('0' + g.toString(16)).slice(-2) +
          ('0' + b.toString(16)).slice(-2);

        // 计算画布上的实际位置
        const canvasX = x * cellWidth;
        const canvasY = y * cellHeight;

        // 绘制到内容画布
        contentCtx.fillStyle = hex;
        contentCtx.fillRect(canvasX, canvasY, cellWidth, cellHeight);
      }
    }

    // 完成图片放置
    isPlacingImage.value = false;

    // 更新画布
    optimizedRenderCanvas();

    console.log('图片应用完成');
  };

  // 取消图片放置
  const cancelImagePlacement = () => {
    isPlacingImage.value = false;
    tempImage.value = null;
    imagePreview.value = null;

    // 恢复画布
    optimizedRenderCanvas();
  };

  // 事件处理程序
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      // 只处理左键点击
      startDrawing(e);

      // 添加临时事件监听器
      if (canvasRef.value) {
        canvasRef.value.addEventListener('mousemove', handleMouseMove, {
          passive: true,
        });
        // 在document上监听鼠标释放事件，以防止鼠标移出画布时无法停止绘制
        document.addEventListener('mouseup', handleMouseUp);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDrawing.value) {
      draw(e);
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      // 只处理左键释放
      stopDrawing();

      // 移除临时事件监听器
      if (canvasRef.value) {
        canvasRef.value.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    }
  };

  // 设置事件监听器
  const setupEventListeners = () => {
    if (!canvasRef.value) return;

    // 鼠标按下事件
    canvasRef.value.addEventListener('mousedown', handleMouseDown);

    // 移动事件监听仅在绘制过程中添加，提高性能

    // 触摸事件支持
    canvasRef.value.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0,
        });
        handleMouseDown(mouseEvent);
      }
      e.preventDefault(); // 防止页面滚动
    });

    canvasRef.value.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDrawing.value) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        handleMouseMove(mouseEvent);
      }
      e.preventDefault(); // 防止页面滚动
    });

    canvasRef.value.addEventListener('touchend', () => {
      const mouseEvent = new MouseEvent('mouseup', { button: 0 });
      handleMouseUp(mouseEvent);
    });

    // 初始定位
    updateCanvasPosition();
  };

  // 清理事件监听器
  const cleanupEventListeners = () => {
    if (!canvasRef.value) return;

    canvasRef.value.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  // 在组件挂载和卸载时处理事件监听器
  onMounted(() => {
    initCanvas();
    setupEventListeners();
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  // 获取画布所有颜色
  const getCanvasColors = (): string[] => {
    if (!contentCtx || !contentCanvas) {
      console.warn('画布未初始化，无法获取颜色');
      return [];
    }

    const colors = new Set<string>();
    const cellWidth = gridColValue.value;
    const cellHeight = gridRowValue.value;

    // 计算网格数量（使用逻辑尺寸）
    const { width: canvasLogicalW, height: canvasLogicalH } =
      getCanvasLogicalSize(contentCanvas);
    const gridWidth = Math.ceil(canvasLogicalW / cellWidth);
    const gridHeight = Math.ceil(canvasLogicalH / cellHeight);

    // 遍历每个格子，获取格子中心的颜色
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        // 计算格子中心坐标
        const centerX = col * cellWidth + Math.floor(cellWidth / 2);
        const centerY = row * cellHeight + Math.floor(cellHeight / 2);

        // 确保坐标在画布逻辑范围内
        if (
          centerX >= 0 &&
          centerX < canvasLogicalW &&
          centerY >= 0 &&
          centerY < canvasLogicalH
        ) {
          // 获取像素数据（转换为物理坐标）
          const devicePixelRatio = getDevicePixelRatio();
          const physicalX = Math.floor(centerX * devicePixelRatio);
          const physicalY = Math.floor(centerY * devicePixelRatio);
          const pixel = contentCtx.getImageData(
            physicalX,
            physicalY,
            1,
            1,
          ).data;

          // 检查是否为透明像素（alpha值大于0表示有内容）
          if (pixel[3] > 0) {
            // 将RGB值转换为十六进制
            const hex =
              '#' +
              ('0' + pixel[0].toString(16)).slice(-2) +
              ('0' + pixel[1].toString(16)).slice(-2) +
              ('0' + pixel[2].toString(16)).slice(-2);

            // 只排除白色背景（画布的默认背景色），黑色是有效的绘画颜色
            if (hex !== '#ffffff') {
              colors.add(hex);
            }
          }
        }
      }
    }

    // 转换为数组并排序
    return Array.from(colors).sort();
  };

  // 隐藏/显示特定颜色的状态
  const hiddenColors = ref<Set<string>>(new Set());

  // 缓存过滤后的画布
  let filteredCanvas: HTMLCanvasElement | null = null;
  let filteredCtx: CanvasRenderingContext2D | null = null;
  let lastFilteredVersion = 0;
  let lastContentVersion = 0;

  // 切换颜色的显示/隐藏状态
  const toggleColorVisibility = (color: string) => {
    if (hiddenColors.value.has(color)) {
      hiddenColors.value.delete(color);
    } else {
      hiddenColors.value.add(color);
    }
    // 标记需要重新过滤
    lastFilteredVersion = 0;
    // 重新渲染画布以应用显示/隐藏效果
    optimizedRenderCanvas();
  };

  // 检查颜色是否被隐藏
  const isColorHidden = (color: string): boolean => {
    return hiddenColors.value.has(color);
  };

  // 初始化过滤画布
  const initFilteredCanvas = () => {
    if (!contentCanvas) return;

    filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = contentCanvas.width;
    filteredCanvas.height = contentCanvas.height;
    filteredCtx = filteredCanvas.getContext('2d');

    if (filteredCtx) {
      // 禁用平滑
      filteredCtx.imageSmoothingEnabled = false;
      (filteredCtx as any).mozImageSmoothingEnabled = false;
      (filteredCtx as any).webkitImageSmoothingEnabled = false;
      (filteredCtx as any).msImageSmoothingEnabled = false;
    }
  };

  // 更新过滤后的画布
  const updateFilteredCanvas = () => {
    if (!filteredCtx || !filteredCanvas || !contentCanvas || !contentCtx)
      return;

    // 复制原始内容
    filteredCtx.clearRect(0, 0, filteredCanvas.width, filteredCanvas.height);
    filteredCtx.drawImage(contentCanvas, 0, 0);

    if (hiddenColors.value.size > 0) {
      // 获取图像数据
      const imageData = filteredCtx.getImageData(
        0,
        0,
        filteredCanvas.width,
        filteredCanvas.height,
      );
      const data = imageData.data;

      // 遍历每个像素，隐藏指定颜色
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 0) {
          const hex =
            '#' +
            ('0' + r.toString(16)).slice(-2) +
            ('0' + g.toString(16)).slice(-2) +
            ('0' + b.toString(16)).slice(-2);

          // 如果这个颜色被隐藏，将其完全透明
          if (hiddenColors.value.has(hex)) {
            data[i + 3] = 0; // 设置为完全透明
          }
        }
      }

      // 将修改后的图像数据绘制回过滤画布
      filteredCtx.putImageData(imageData, 0, 0);
    }

    lastFilteredVersion = Date.now();
  };

  // 使用颜色过滤器渲染画布
  const renderCanvasWithColorFilter = () => {
    if (!ctx.value || !canvasRef.value || !contentCanvas || !contentCtx) return;

    const canvas = canvasRef.value;
    const context = ctx.value;

    // 清除当前画布
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (hiddenColors.value.size === 0) {
      // 如果没有隐藏的颜色，直接绘制原始内容
      context.drawImage(contentCanvas, 0, 0);
    } else {
      // 初始化过滤画布（如果需要）
      if (!filteredCanvas || !filteredCtx) {
        initFilteredCanvas();
      }

      // 检查是否需要更新过滤画布
      const currentContentVersion = Date.now();
      if (
        lastFilteredVersion === 0 ||
        Math.abs(currentContentVersion - lastContentVersion) > 100
      ) {
        // 限制更新频率
        updateFilteredCanvas();
        lastContentVersion = currentContentVersion;
      }

      // 绘制过滤后的内容
      if (filteredCanvas) {
        context.drawImage(filteredCanvas, 0, 0);
      }
    }
  };

  // 删除特定颜色
  const deleteColor = (colorToDelete: string) => {
    if (!contentCtx || !contentCanvas) return;

    console.log('删除颜色:', colorToDelete);

    // 获取图像数据
    const imageData = contentCtx.getImageData(
      0,
      0,
      contentCanvas.width,
      contentCanvas.height,
    );
    const data = imageData.data;

    let deletedPixelsCount = 0;

    // 遍历每个像素，将指定颜色替换为白色
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0) {
        const hex =
          '#' +
          ('0' + r.toString(16)).slice(-2) +
          ('0' + g.toString(16)).slice(-2) +
          ('0' + b.toString(16)).slice(-2);

        // 如果像素颜色匹配要删除的颜色（忽略大小写）
        if (hex.toLowerCase() === colorToDelete.toLowerCase()) {
          // 替换为白色背景
          data[i] = 255; // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
          data[i + 3] = 255; // A
          deletedPixelsCount++;
        }
      }
    }

    // 将修改后的图像数据绘制回内容画布
    contentCtx.putImageData(imageData, 0, 0);

    // 从隐藏颜色列表中移除（如果存在）
    hiddenColors.value.delete(colorToDelete);

    // 重置过滤缓存，因为内容已更改
    lastFilteredVersion = 0;

    // 重新渲染画布
    optimizedRenderCanvas();

    console.log(`删除完成，共删除 ${deletedPixelsCount} 个像素`);

    return deletedPixelsCount;
  };

  // 替换特定颜色
  const replaceColor = (oldColor: string, newColor: string) => {
    if (!contentCtx || !contentCanvas) {
      console.warn('画布未初始化，无法替换颜色');
      return;
    }

    console.log('替换颜色:', { oldColor, newColor });

    // 获取图像数据
    const imageData = contentCtx.getImageData(
      0,
      0,
      contentCanvas.width,
      contentCanvas.height,
    );
    const data = imageData.data;

    let replacedPixelsCount = 0;

    // 将新颜色从十六进制转换为RGB
    const newRgb = hexToRgba(newColor);
    if (!newRgb) {
      console.error('无效的新颜色格式:', newColor);
      return;
    }

    // 遍历每个像素，将指定颜色替换为新颜色
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0) {
        const hex =
          '#' +
          ('0' + r.toString(16)).slice(-2) +
          ('0' + g.toString(16)).slice(-2) +
          ('0' + b.toString(16)).slice(-2);

        // 如果像素颜色匹配要替换的颜色
        if (hex.toLowerCase() === oldColor.toLowerCase()) {
          // 替换为新颜色
          data[i] = newRgb.r; // R
          data[i + 1] = newRgb.g; // G
          data[i + 2] = newRgb.b; // B
          // alpha值保持不变
          replacedPixelsCount++;
        }
      }
    }

    // 将修改后的图像数据绘制回内容画布
    contentCtx.putImageData(imageData, 0, 0);

    // 从隐藏颜色列表中更新颜色
    if (hiddenColors.value.has(oldColor)) {
      hiddenColors.value.delete(oldColor);
      hiddenColors.value.add(newColor);
    }

    // 重置过滤缓存，因为内容已更改
    lastFilteredVersion = 0;

    // 重新渲染画布
    optimizedRenderCanvas();

    console.log(`颜色替换完成，共替换 ${replacedPixelsCount} 个像素`);

    return replacedPixelsCount;
  };

  // 清除所有颜色过滤器
  const clearColorFilters = () => {
    hiddenColors.value.clear();
    lastFilteredVersion = 0; // 重置缓存
    optimizedRenderCanvas();
  };

  return {
    ctx,
    isDrawing,
    currentTool,
    currentColor,
    zoomLevel,
    canvasPosition,
    gridColValue,
    gridRowValue,
    gridColCount,
    gridRowCount,
    snapToGrid,
    canvasWidthCm,
    canvasHeightCm,
    dpiValue,
    currentCell,
    initCanvas,
    clearCanvas,
    exportAsImage,
    setTool,
    setColor,
    setGridSize,
    setGridCount,
    setZoom,
    setSnapToGrid,
    setCanvasSize,
    cmToPx,
    pxToCm,
    updateCanvasPosition,
    renderCanvas: optimizedRenderCanvas,
    handleWheel,
    // 添加图片相关函数到返回值
    uploadImage,
    startImagePlacement,
    applyImageToCanvas,
    cancelImagePlacement,
    scaleImage,
    imageScale,
    imagePreview,
    isPlacingImage,
    tempImage,
    // 导出网格偏移量
    offsetX,
    offsetY,
    getCanvasColors,
    toggleColorVisibility,
    isColorHidden,
    renderCanvasWithColorFilter,
    deleteColor,
    clearColorFilters,
    replaceColor,
  };
}
