import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import type {
  BasicCanvasProps,
  CanvasState,
  GridCoordinate,
} from '../types/canvas';
import type { DrawEvent, MouseEventData } from '../types/events';
import { CompressedGridStorage } from '../classes/GridStorage';
import { useGrid } from './useGrid';
import { useBrush } from './useBrush';
import { useColors } from './useColors';
import { useViewport } from './useViewport';
import { useHistory } from './useHistory';
import {
  pixelToGrid,
  getGridPath,
  screenToCanvas,
} from '../utils/coordinateUtils';

/**
 * Canvas核心逻辑Composable
 * 整合所有子系统，提供完整的画布功能
 */
export function useCanvas(props: BasicCanvasProps) {
  // DOM引用
  const canvasRef = ref<HTMLCanvasElement>();
  const containerRef = ref<HTMLDivElement>();

  // Canvas上下文
  const ctx = ref<CanvasRenderingContext2D>();

  // 画布状态
  const canvasState = ref<CanvasState>({
    isDrawing: false,
    currentTool: 'brush',
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
  const lastRenderTime = ref(0);
  const renderThrottleMs = 16; // 60fps
  let renderRequest = 0;

  /**
   * 初始化Canvas
   */
  const initCanvas = () => {
    if (!canvasRef.value || !containerRef.value) return;

    const canvas = canvasRef.value;
    const container = containerRef.value;

    // 设置Canvas尺寸
    const { physicalSize } = gridSystem.gridData.value;
    canvas.width = physicalSize.width;
    canvas.height = physicalSize.height;

    // 设置显示尺寸（支持缩放）
    canvas.style.width = physicalSize.width + 'px';
    canvas.style.height = physicalSize.height + 'px';

    // 获取上下文
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get canvas context');
      return;
    }

    ctx.value = context;

    // 初始化存储
    gridStorage.value = new CompressedGridStorage(props.width, props.height);

    // 设置Canvas属性
    context.imageSmoothingEnabled = false; // 像素画模式

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
  const getMouseCoordinates = (event: MouseEvent) => {
    if (!canvasRef.value) return null;

    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();

    // 获取原始逻辑尺寸（CSS像素，未缩放）
    const { physicalSize } = gridSystem.gridData.value;
    const originalLogicalWidth = physicalSize.width;
    const originalLogicalHeight = physicalSize.height;

    // 计算鼠标在画布上的相对位置（相对于显示的画布）
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    // 将鼠标位置映射到原始逻辑坐标系（考虑缩放）
    // rect.width 是缩放后的显示宽度
    // originalLogicalWidth 是原始逻辑宽度
    // 所以需要先计算相对比例，再映射到原始尺寸
    const relativeX = rawX / rect.width; // 相对位置比例 (0-1)
    const relativeY = rawY / rect.height; // 相对位置比例 (0-1)

    // 映射到原始逻辑坐标系
    let canvasX = relativeX * originalLogicalWidth;
    let canvasY = relativeY * originalLogicalHeight;

    // 边界检查（使用原始逻辑尺寸）
    canvasX = Math.max(0, Math.min(canvasX, originalLogicalWidth));
    canvasY = Math.max(0, Math.min(canvasY, originalLogicalHeight));

    // 高精度格子坐标计算
    const { cellWidth, cellHeight } = gridSystem.gridData.value;
    const gridX = Math.floor(canvasX / cellWidth);
    const gridY = Math.floor(canvasY / cellHeight);

    // 移除调试日志以提升性能

    return {
      pixelX: canvasX,
      pixelY: canvasY,
      gridX,
      gridY,
    };
  };

  /**
   * 鼠标按下事件
   */
  const handleMouseDown = (event: MouseEvent) => {
    if (props.readonly) return;

    const coords = getMouseCoordinates(event);
    if (!coords) return;

    canvasState.value.isDrawing = true;
    canvasState.value.lastDrawnCell = { x: coords.gridX, y: coords.gridY };

    // 开始历史记录动作
    historySystem.startAction('draw');

    // 开始绘制
    drawAtPosition(coords.gridX, coords.gridY);

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
        coords.gridX,
        coords.gridY,
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
      drawAtPosition(coords.gridX, coords.gridY);

      // 如果鼠标移动速度快，使用线性插值填充中间格子
      const lastCell = canvasState.value.lastDrawnCell;
      if (
        lastCell &&
        (lastCell.x !== coords.gridX || lastCell.y !== coords.gridY)
      ) {
        fillInterpolatedCells(lastCell, coords);
      }

      canvasState.value.lastDrawnCell = { x: coords.gridX, y: coords.gridY };

      // 触发绘制事件
      emitDrawEvent('move', coords);

      // 只在绘制时才重新渲染
      requestRender();
    }
  };

  /**
   * 优化的线性插值填充
   */
  const fillInterpolatedCells = (lastCell: GridCoordinate, coords: any) => {
    // 计算当前点与上一点之间的距离
    const dx = coords.gridX - lastCell.x;
    const dy = coords.gridY - lastCell.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果距离太小，跳过插值
    if (distance < 1.5) return;

    // 计算需要插入的点数量，限制最大步数防止性能问题
    const steps = Math.min(Math.ceil(distance * 2), 50); // 降低最大步数

    // 跟踪已经填充过的格子，避免重复
    const filledCellIndices = new Set<string>();
    filledCellIndices.add(`${coords.gridX},${coords.gridY}`);
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
  const emitDrawEvent = (type: DrawEvent['type'], coords: any) => {
    const event: DrawEvent = {
      type,
      gridX: coords.gridX,
      gridY: coords.gridY,
      pixelX: coords.pixelX,
      pixelY: coords.pixelY,
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

    // 应用视口变换
    context.setTransform(1, 0, 0, 1, 0, 0);

    // 优化：只在缩放或平移变化时更新CSS变换
    const canvas = canvasRef.value;
    if (canvas) {
      const transform = `scale(${viewportState.zoom}) translate(${
        viewportState.pan.x / viewportState.zoom
      }px, ${viewportState.pan.y / viewportState.zoom}px)`;

      if (canvas.style.transform !== transform) {
        canvas.style.transform = transform;
        canvas.style.transformOrigin = '0 0';
      }
    }

    // 清空画布
    context.clearRect(0, 0, physicalSize.width, physicalSize.height);

    // 绘制背景
    if (props.bgColor) {
      context.fillStyle = props.bgColor;
      context.fillRect(0, 0, physicalSize.width, physicalSize.height);
    }

    // 绘制网格
    gridSystem.drawGrid(context, physicalSize.width, physicalSize.height);

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
        const x = cell.x * cellWidth;
        const y = cell.y * cellHeight;
        context.fillRect(x, y, cellWidth, cellHeight);
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
