import { ref, onMounted, onUnmounted, watch } from 'vue';
import type {
  BasicCanvasProps,
  CanvasState,
  PixelCoordinate,
  GridCoordinate,
} from '../types/canvas';
import type { ToolType } from '../types/tools';
import { CompressedGridStorage } from '../classes/GridStorage';
import { useGrid } from './useGrid';
import { useBrush } from './useBrush';
import { useColors } from './useColors';
import { useViewport } from './useViewport';
import { useHistory } from './useHistory';

/**
 * Canvas核心逻辑Composable
 * 整合所有子系统，提供完整的画布功能
 */
export function useCanvas(props: BasicCanvasProps, getCenterOffset?: () => { x: number; y: number }) {
  // DOM引用
  const canvasRef = ref<HTMLCanvasElement>();
  const containerRef = ref<HTMLDivElement>();

  // Canvas上下文
  const ctx = ref<CanvasRenderingContext2D>();

  // Canvas状态
  const canvasState = ref<CanvasState>({
    isDrawing: false,
    isPanning: false,
    currentTool: 'brush' as ToolType,
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  // 初始化子系统
  const gridSystem = useGrid(props);
  const colorSystem = useColors();
  const brushSystem = useBrush(gridSystem.gridData.value);
  const viewportSystem = useViewport(props, canvasRef);

  // 存储系统
  const gridStorage = ref<CompressedGridStorage>();

  // 历史记录系统
  const historySystem = useHistory(gridStorage, props.width, props.height, {
    maxActions: props.maxUndoSteps || 50,
    maxMemoryMB: 100,
    snapshotInterval: 10,
    tileSize: 512,
    maxTiles: 100,
  });

  // 事件节流
  const lastDrawTime = ref(0);
  const drawThrottleMs = 16; // 60fps

  // 添加渲染节流
  let renderRequest = 0;

  /**
   * 初始化Canvas
   */
  const initCanvas = () => {
    if (!canvasRef.value || !containerRef.value) return;

    const canvas = canvasRef.value;
    const { physicalSize } = gridSystem.gridData.value;
    
    // 获取设备像素比
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 设置Canvas实际尺寸（考虑设备像素比）
    canvas.width = physicalSize.width * devicePixelRatio;
    canvas.height = physicalSize.height * devicePixelRatio;

    // 设置显示尺寸
    canvas.style.width = physicalSize.width + 'px';
    canvas.style.height = physicalSize.height + 'px';

    // 获取上下文
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get canvas context');
      return;
    }

    ctx.value = context;
    
    // 缩放上下文以匹配设备像素比
    context.scale(devicePixelRatio, devicePixelRatio);

    // 初始化存储
    gridStorage.value = new CompressedGridStorage(props.width, props.height);

    // 设置Canvas属性
    context.imageSmoothingEnabled = false; // 像素画模式
    
    // 设置更精确的渲染选项（注释掉非标准属性）
    // context.textRenderingOptimization = 'optimizeSpeed';
    
    console.log('Canvas initialized with DPR:', devicePixelRatio, {
      canvasSize: [canvas.width, canvas.height],
      displaySize: [physicalSize.width, physicalSize.height]
    });

    // 绑定事件
    bindEvents();

    // 初始渲染
    render();
  };

  /**
   * 绑定鼠标事件
   */
  const bindEvents = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // 阻止右键菜单
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  /**
   * 解绑事件
   */
  const unbindEvents = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;

    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
  };

  /**
   * 获取鼠标在Canvas上的坐标
   * @param event 鼠标事件
   * @returns 坐标信息
   */
  const getMouseCoordinates = (event: MouseEvent): {
    pixel: PixelCoordinate;
    grid: GridCoordinate;
  } | null => {
    if (!canvasRef.value || !ctx.value) return null;

    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();
    const { viewportState } = viewportSystem;

    // 获取鼠标在canvas元素上的位置（CSS像素）
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    // 考虑设备像素比，转换为canvas坐标
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasX = rawX * devicePixelRatio;
    const canvasY = rawY * devicePixelRatio;

    // 计算居中偏移
    const centerOffset = getCenterOffset ? getCenterOffset() : { x: 0, y: 0 };
    
    // 应用逆变换矩阵，将屏幕坐标转换为canvas逻辑坐标
    // 当前变换矩阵: [zoom, 0, 0, zoom, panX + centerX, panY + centerY]
    // 逆变换: [(x - panX - centerX) / zoom, (y - panY - centerY) / zoom]
    const logicalX = (canvasX - viewportState.pan.x - centerOffset.x) / viewportState.zoom;
    const logicalY = (canvasY - viewportState.pan.y - centerOffset.y) / viewportState.zoom;

    // 获取原始逻辑尺寸进行边界检查
    const { physicalSize, cellWidth, cellHeight } = gridSystem.gridData.value;
    
    // 边界检查
    const clampedX = Math.max(0, Math.min(logicalX, physicalSize.width));
    const clampedY = Math.max(0, Math.min(logicalY, physicalSize.height));

    // 高精度格子坐标计算
    const gridX = Math.floor(clampedX / cellWidth);
    const gridY = Math.floor(clampedY / cellHeight);

    // 移除调试日志以提升性能

    return {
      pixel: { x: clampedX, y: clampedY },
      grid: { x: gridX, y: gridY },
    };
  };

  /**
   * 鼠标按下事件
   */
  const handleMouseDown = (event: MouseEvent) => {
    if (!canvasRef.value || !gridStorage.value) return;
    if (props.readonly) return;

    const coords = getMouseCoordinates(event);
    if (!coords) return;

    canvasState.value.isDrawing = true;
    canvasState.value.lastDrawnCell = { x: coords.grid.x, y: coords.grid.y };

    // 开始历史记录动作
    historySystem.startAction('draw');

    // 开始绘制
    drawAtPosition(coords.grid.x, coords.grid.y);

    // 触发绘制事件
    emitDrawEvent('start', coords);
  };

  /**
   * 鼠标移动事件
   */
  const handleMouseMove = (event: MouseEvent) => {
    const coords = getMouseCoordinates(event);
    if (!coords) return;

    // 更新画笔预览（只在非绘制状态下）
    if (!canvasState.value.isDrawing) {
      brushSystem.updateBrushPreview(
        coords.grid.x,
        coords.grid.y,
        props.width,
        props.height,
        true,
      );
      // 只在非绘制时才重新渲染画笔预览
      requestRender();
      return;
    }

    // 如果正在绘制
    if (canvasState.value.isDrawing && !props.readonly) {
      // 节流处理
      const now = Date.now();
      if (now - lastDrawTime.value < drawThrottleMs) return;
      lastDrawTime.value = now;

      // 连续绘制优化：填充当前格子
      drawAtPosition(coords.grid.x, coords.grid.y);

      // 如果鼠标移动速度快，使用线性插值填充中间格子
      const lastCell = canvasState.value.lastDrawnCell;
      if (
        lastCell &&
        (lastCell.x !== coords.grid.x || lastCell.y !== coords.grid.y)
      ) {
        fillInterpolatedCells(lastCell, coords.grid);
      }

      canvasState.value.lastDrawnCell = { x: coords.grid.x, y: coords.grid.y };

      // 触发绘制事件
      emitDrawEvent('move', coords);

      // 只在绘制时才重新渲染
      requestRender();
    }
  };

  /**
   * 优化的线性插值填充
   */
  const fillInterpolatedCells = (lastCell: GridCoordinate, coords: GridCoordinate) => {
    // 计算当前点与上一点之间的距离
    const dx = coords.x - lastCell.x;
    const dy = coords.y - lastCell.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果距离太小，跳过插值
    if (distance < 1.5) return;

    // 计算需要插入的点数量，限制最大步数防止性能问题
    const steps = Math.min(Math.ceil(distance * 2), 50); // 降低最大步数

    // 跟踪已经填充过的格子，避免重复
    const filledCellIndices = new Set<string>();
    filledCellIndices.add(`${coords.x},${coords.y}`);
    filledCellIndices.add(`${lastCell.x},${lastCell.y}`);

    // 使用线性插值填充中间点
    for (let i = 1; i < steps; i++) {
      const ratio = i / steps;
      const midGridX = Math.round(lastCell.x + dx * ratio);
      const midGridY = Math.round(lastCell.y + dy * ratio);
      const cellIndexKey = `${midGridX},${midGridY}`;

      if (!filledCellIndices.has(cellIndexKey)) {
        filledCellIndices.add(cellIndexKey);
        drawAtPosition(midGridX, midGridY);
      }
    }
  };

  /**
   * 请求渲染（使用requestAnimationFrame节流）
   */
  const requestRender = () => {
    if (renderRequest) return;

    renderRequest = requestAnimationFrame(() => {
      render();
      renderRequest = 0;
    });
  };

  /**
   * 鼠标抬起事件
   */
  const handleMouseUp = (event: MouseEvent) => {
    if (!canvasState.value.isDrawing) return;

    const coords = getMouseCoordinates(event);
    if (coords) {
      emitDrawEvent('end', coords);
    }

    canvasState.value.isDrawing = false;
    canvasState.value.lastDrawnCell = undefined;

    // 完成历史记录动作
    historySystem.finishAction();
  };

  /**
   * 鼠标离开事件
   */
  const handleMouseLeave = () => {
    canvasState.value.isDrawing = false;
    canvasState.value.lastDrawnCell = undefined;
    brushSystem.hideBrushPreview();
    render();
  };

  /**
   * 在指定格子位置绘制
   * @param gridX 格子X坐标
   * @param gridY 格子Y坐标
   */
  const drawAtPosition = (gridX: number, gridY: number) => {
    if (!ctx.value || !gridStorage.value) return;

    // 高精度边界检查
    if (
      gridX < 0 ||
      gridY < 0 ||
      gridX >= props.width ||
      gridY >= props.height
    ) {
      return; // 移除console.warn减少性能开销
    }

    // 获取当前颜色和旧颜色
    const currentColor = colorSystem.currentColor.value;
    const oldColor = gridStorage.value.getCell(gridX, gridY);

    // 记录历史变化
    historySystem.recordChange(gridX, gridY, oldColor, currentColor);

    // 存储到网格存储
    gridStorage.value.setCell(gridX, gridY, currentColor);

    // 获取格子的精确像素边界
    const { cellWidth, cellHeight } = gridSystem.gridData.value;
    const cellPixelX = gridX * cellWidth;
    const cellPixelY = gridY * cellHeight;

    // 高性能绘制设置
    ctx.value.save();
    ctx.value.imageSmoothingEnabled = false;
    ctx.value.fillStyle = currentColor;

    // 使用精确的像素坐标进行填充
    ctx.value.fillRect(
      Math.round(cellPixelX),
      Math.round(cellPixelY),
      Math.round(cellWidth),
      Math.round(cellHeight),
    );

    ctx.value.restore();
  };

  /**
   * 触发绘制事件
   * @param type 事件类型
   * @param coords 坐标信息
   */
  const emitDrawEvent = (type: string, coords: { pixel: PixelCoordinate; grid: GridCoordinate }) => {
    return {
      type,
      coordinates: coords,
      color: colorSystem.currentColor.value,
      brushSize: brushSystem.brushConfig.value.sizeCm,
      timestamp: Date.now(),
    };
  };

  /**
   * 渲染画布
   */
  const render = () => {
    if (!ctx.value || !gridStorage.value) return;

    const context = ctx.value;
    const { physicalSize } = gridSystem.gridData.value;
    const { viewportState } = viewportSystem;

    // 保存当前状态
    context.save();

    // 应用视口变换 - 使用transform方法实现更一致的变换方式
    // 重置变换矩阵到单位矩阵
    context.resetTransform();
    
    // 计算居中偏移 - 参考jqEditor_now的centerView逻辑
    const centerOffset = getCenterOffset ? getCenterOffset() : { x: 0, y: 0 };
    
    // 应用平移和缩放变换，与SVG的matrix变换保持一致的顺序
    // 先应用居中偏移，再应用用户的平移和缩放
    context.translate(viewportState.pan.x + centerOffset.x, viewportState.pan.y + centerOffset.y);
    context.scale(viewportState.zoom, viewportState.zoom);

    // 移除CSS transform，改用canvas context transform
    const canvas = canvasRef.value;
    if (canvas && canvas.style.transform) {
      canvas.style.transform = '';
      canvas.style.transformOrigin = '';
    }

    // 清空画布 - 确保从坐标原点(0,0)开始
    context.clearRect(0, 0, physicalSize.width, physicalSize.height);

    // 绘制背景 - 确保从坐标原点(0,0)开始，与SVG网格保持一致
    if (props.bgColor) {
      context.fillStyle = props.bgColor;
      context.fillRect(0, 0, physicalSize.width, physicalSize.height);
    }

    // 网格现在使用SVG渲染，不再在Canvas中绘制
    // gridSystem.drawGrid(context, physicalSize.width, physicalSize.height);

    // 绘制格子
    drawGridCells(context);

    // 绘制画笔预览
    const { cellWidth, cellHeight } = gridSystem.gridData.value;
    brushSystem.drawBrushPreview(context, cellWidth, cellHeight);

    // 恢复状态
    context.restore();
  };

  /**
   * 绘制格子内容
   * @param context Canvas上下文
   */
  const drawGridCells = (context: CanvasRenderingContext2D) => {
    if (!gridStorage.value) return;

    const { cellWidth, cellHeight } = gridSystem.gridData.value;
    const paintedCells = gridStorage.value.getAllPaintedCells();

    context.save();
    paintedCells.forEach((cell) => {
      if (cell.color) {
        context.fillStyle = cell.color;
        // 确保坐标从(0,0)开始，与SVG网格保持一致
        const x = Math.round(cell.x * cellWidth);
        const y = Math.round(cell.y * cellHeight);
        context.fillRect(x, y, Math.round(cellWidth), Math.round(cellHeight));
      }
    });
    context.restore();
  };

  /**
   * 清空画布
   */
  const clearCanvas = () => {
    if (!gridStorage.value) return;

    // 开始清空动作的历史记录
    historySystem.startAction('clear');

    // 记录所有已绘制格子的变化
    const paintedCells = gridStorage.value.getAllPaintedCells();
    for (const cell of paintedCells) {
      historySystem.recordChange(
        cell.x,
        cell.y,
        cell.color || 'transparent',
        'transparent',
      );
    }

    // 清空网格存储
    gridStorage.value.clear();

    // 完成历史记录动作
    historySystem.finishAction();

    render();
  };

  /**
   * 导出Canvas为图像
   * @param format 图像格式
   * @returns 图像数据URL
   */
  const exportImage = (format: 'png' | 'jpeg' = 'png'): string => {
    if (!canvasRef.value) return '';

    return canvasRef.value.toDataURL(`image/${format}`);
  };

  /**
   * 获取Canvas统计信息
   */
  const getCanvasStats = () => {
    if (!gridStorage.value) return null;

    return {
      ...gridStorage.value.getStats(),
      usedColors: gridStorage.value.getUsedColors(),
      canvasSize: gridSystem.gridData.value,
      brushInfo: brushSystem.getBrushInfo(),
    };
  };

  // 监听视口缩放变化，同步到网格系统
  watch(
    () => viewportSystem.viewportState.zoom,
    (newZoom) => {
      gridSystem.syncZoom(newZoom);
    },
  );

  // 生命周期
  onMounted(() => {
    initCanvas();
  });

  onUnmounted(() => {
    unbindEvents();
  });

  return {
    // DOM引用
    canvasRef,
    containerRef,

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
  };
}
