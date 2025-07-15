import type { PixelCoordinate, GridCoordinate } from '../types/canvas';
import type { ViewportBounds, ViewportState } from '../types/viewport';

/**
 * DPI转换常量
 */
export const DPI = 96; // Web标准DPI

/**
 * 厘米转像素
 * @param cm 厘米值
 * @returns 像素值
 */
export function cmToPx(cm: number): number {
  return (cm * DPI) / 2.54;
}

/**
 * 像素转厘米
 * @param px 像素值
 * @returns 厘米值
 */
export function pxToCm(px: number): number {
  return (px * 2.54) / DPI;
}

/**
 * 像素坐标转网格坐标（高精度实现）
 * @param pixelX 像素X坐标
 * @param pixelY 像素Y坐标
 * @param cellWidth 格子宽度
 * @param cellHeight 格子高度
 * @returns 网格坐标
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  cellWidth: number,
  cellHeight: number,
): GridCoordinate {
  // 高精度格子坐标计算，确保准确的边界处理
  const gridX = Math.floor(pixelX / cellWidth);
  const gridY = Math.floor(pixelY / cellHeight);

  return {
    x: gridX,
    y: gridY,
  };
}

/**
 * 网格坐标转像素坐标（精确版本）
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @param cellWidth 格子宽度
 * @param cellHeight 格子高度
 * @returns 精确的像素坐标
 */
export function gridToPixel(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
): PixelCoordinate {
  return {
    x: Math.round(gridX * cellWidth),
    y: Math.round(gridY * cellHeight),
  };
}

/**
 * 获取格子中心像素坐标
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @param cellWidth 格子宽度
 * @param cellHeight 格子高度
 * @returns 格子中心像素坐标
 */
export function getGridCenterPixel(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
): PixelCoordinate {
  return {
    x: gridX * cellWidth + cellWidth / 2,
    y: gridY * cellHeight + cellHeight / 2,
  };
}

/**
 * 检查网格坐标是否在边界内
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @param width 网格宽度
 * @param height 网格高度
 * @returns 是否在边界内
 */
export function isGridInBounds(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
): boolean {
  return gridX >= 0 && gridX < width && gridY >= 0 && gridY < height;
}

/**
 * 计算两个网格坐标之间的距离
 * @param grid1 第一个网格坐标
 * @param grid2 第二个网格坐标
 * @returns 距离
 */
export function getGridDistance(
  grid1: GridCoordinate,
  grid2: GridCoordinate,
): number {
  const dx = grid1.x - grid2.x;
  const dy = grid1.y - grid2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 获取从起点到终点的网格路径（Bresenham算法）
 * @param start 起点网格坐标
 * @param end 终点网格坐标
 * @returns 路径上的网格坐标数组
 */
export function getGridPath(
  start: GridCoordinate,
  end: GridCoordinate,
): GridCoordinate[] {
  const path: GridCoordinate[] = [];

  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    path.push({ x: x0, y: y0 });

    if (x0 === x1 && y0 === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return path;
}

/**
 * 网格坐标编码为数字（用于Map的key）
 * @param x 网格X坐标
 * @param y 网格Y坐标
 * @param width 网格宽度
 * @returns 编码后的数字
 */
export function encodeGridCoord(x: number, y: number, width: number): number {
  return y * width + x;
}

/**
 * 数字解码为网格坐标
 * @param encoded 编码的数字
 * @param width 网格宽度
 * @returns 网格坐标
 */
export function decodeGridCoord(
  encoded: number,
  width: number,
): GridCoordinate {
  return {
    x: encoded % width,
    y: Math.floor(encoded / width),
  };
}

// ========== 视图控制工具函数 ==========

/**
 * 在指定点进行缩放
 * @param mouseX 鼠标X坐标
 * @param mouseY 鼠标Y坐标
 * @param zoomDelta 缩放倍数
 * @param currentZoom 当前缩放级别
 * @param currentPan 当前平移偏移
 * @param minZoom 最小缩放级别
 * @param maxZoom 最大缩放级别
 * @returns 新的缩放和平移状态
 */
export function zoomAtPoint(
  mouseX: number,
  mouseY: number,
  zoomDelta: number,
  currentZoom: number,
  currentPan: PixelCoordinate,
  minZoom: number,
  maxZoom: number,
): { zoom: number; pan: PixelCoordinate } {
  const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom * zoomDelta));

  if (newZoom === currentZoom) {
    return { zoom: currentZoom, pan: currentPan };
  }

  const zoomRatio = newZoom / currentZoom;
  const newPan = {
    x: mouseX - (mouseX - currentPan.x) * zoomRatio,
    y: mouseY - (mouseY - currentPan.y) * zoomRatio,
  };

  return { zoom: newZoom, pan: newPan };
}

/**
 * 限制平移在边界内
 * @param newPan 新的平移坐标
 * @param canvasSize 画布尺寸
 * @param containerSize 容器尺寸
 * @param zoom 当前缩放级别
 * @returns 限制后的平移坐标
 */
export function clampPan(
  newPan: PixelCoordinate,
  canvasSize: { width: number; height: number },
  containerSize: { width: number; height: number },
  zoom: number,
): PixelCoordinate {
  const scaledCanvasWidth = canvasSize.width * zoom;
  const scaledCanvasHeight = canvasSize.height * zoom;

  // 添加边缘缓冲区（20像素），确保边缘区域始终可见和可编辑
  const edgeBuffer = 20;

  let minX, maxX, minY, maxY;

  if (scaledCanvasWidth > containerSize.width) {
    // 画布比容器宽：限制平移，确保画布不会完全移出容器，并添加缓冲区
    minX = containerSize.width - scaledCanvasWidth - edgeBuffer; // 负数：画布右边界对齐容器右边界，加上缓冲区
    maxX = edgeBuffer; // 画布左边界对齐容器左边界，加上缓冲区
  } else {
    // 画布比容器窄：允许更大的平移范围，可以居中显示，并添加缓冲区
    const extraSpace = containerSize.width - scaledCanvasWidth;
    minX = -extraSpace - edgeBuffer; // 允许画布右边界贴容器左边界，加上缓冲区
    maxX = extraSpace + edgeBuffer; // 允许画布左边界贴容器右边界，加上缓冲区
  }

  if (scaledCanvasHeight > containerSize.height) {
    // 画布比容器高：限制平移，确保画布不会完全移出容器，并添加缓冲区
    minY = containerSize.height - scaledCanvasHeight - edgeBuffer; // 负数：画布底边界对齐容器底边界，加上缓冲区
    maxY = edgeBuffer; // 画布顶边界对齐容器顶边界，加上缓冲区
  } else {
    // 画布比容器矮：允许更大的平移范围，可以居中显示，并添加缓冲区
    const extraSpace = containerSize.height - scaledCanvasHeight;
    minY = -extraSpace - edgeBuffer; // 允许画布底边界贴容器顶边界，加上缓冲区
    maxY = extraSpace + edgeBuffer; // 允许画布顶边界贴容器底边界，加上缓冲区
  }

  return {
    x: Math.max(minX, Math.min(maxX, newPan.x)),
    y: Math.max(minY, Math.min(maxY, newPan.y)),
  };
}

/**
 * 获取视口边界
 * @param canvasSize 画布尺寸
 * @param containerSize 容器尺寸
 * @param zoom 缩放级别
 * @returns 视口边界
 */
export function getViewportBounds(
  canvasSize: { width: number; height: number },
  containerSize: { width: number; height: number },
  zoom: number,
): ViewportBounds {
  const scaledCanvasWidth = canvasSize.width * zoom;
  const scaledCanvasHeight = canvasSize.height * zoom;

  // 添加与clampPan函数相同的边缘缓冲区
  const edgeBuffer = 20;

  let minX, maxX, minY, maxY;

  if (scaledCanvasWidth > containerSize.width) {
    minX = containerSize.width - scaledCanvasWidth - edgeBuffer;
    maxX = edgeBuffer;
  } else {
    const extraSpace = containerSize.width - scaledCanvasWidth;
    minX = -extraSpace - edgeBuffer;
    maxX = extraSpace + edgeBuffer;
  }

  if (scaledCanvasHeight > containerSize.height) {
    minY = containerSize.height - scaledCanvasHeight - edgeBuffer;
    maxY = edgeBuffer;
  } else {
    const extraSpace = containerSize.height - scaledCanvasHeight;
    minY = -extraSpace - edgeBuffer;
    maxY = extraSpace + edgeBuffer;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * 转换屏幕坐标到画布坐标（考虑缩放和平移）
 * @param screenX 屏幕X坐标
 * @param screenY 屏幕Y坐标
 * @param viewportState 视口状态
 * @returns 画布坐标
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewportState: ViewportState,
): PixelCoordinate {
  return {
    x: (screenX - viewportState.pan.x) / viewportState.zoom,
    y: (screenY - viewportState.pan.y) / viewportState.zoom,
  };
}

/**
 * 转换画布坐标到屏幕坐标（考虑缩放和平移）
 * @param canvasX 画布X坐标
 * @param canvasY 画布Y坐标
 * @param viewportState 视口状态
 * @returns 屏幕坐标
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewportState: ViewportState,
): PixelCoordinate {
  return {
    x: canvasX * viewportState.zoom + viewportState.pan.x,
    y: canvasY * viewportState.zoom + viewportState.pan.y,
  };
}
