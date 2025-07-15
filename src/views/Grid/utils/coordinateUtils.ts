import type { PixelCoordinate, GridCoordinate } from '../types/grid'

/**
 * 坐标转换缓存类
 * 用于缓存频繁的坐标转换计算结果，提高性能
 */
export class CoordinateCache {
  private cache = new Map<string, number>()
  private maxSize = 1000

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get(key: string): number | undefined {
    return this.cache.get(key)
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   */
  set(key: string, value: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size
  }
}

// 全局坐标转换缓存实例
const coordinateCache = new CoordinateCache()

/**
 * 厘米转像素
 * @param cm 厘米值
 * @param dpi DPI值，默认96
 * @returns 像素值
 */
export function cmToPx(cm: number, dpi: number = 96): number {
  const cacheKey = `cm2px_${cm}_${dpi}`
  const cached = coordinateCache.get(cacheKey)
  
  if (cached !== undefined) {
    return cached
  }
  
  // 1英寸 = 2.54厘米
  const result = (cm / 2.54) * dpi
  coordinateCache.set(cacheKey, result)
  
  return result
}

/**
 * 像素转厘米
 * @param px 像素值
 * @param dpi DPI值，默认96
 * @returns 厘米值
 */
export function pxToCm(px: number, dpi: number = 96): number {
  const cacheKey = `px2cm_${px}_${dpi}`
  const cached = coordinateCache.get(cacheKey)
  
  if (cached !== undefined) {
    return cached
  }
  
  // 1英寸 = 2.54厘米
  const result = (px / dpi) * 2.54
  coordinateCache.set(cacheKey, result)
  
  return result
}

/**
 * 像素坐标转网格坐标
 * @param pixelX 像素X坐标
 * @param pixelY 像素Y坐标
 * @param cellWidth 格子宽度（像素）
 * @param cellHeight 格子高度（像素）
 * @returns 网格坐标
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  cellWidth: number,
  cellHeight: number,
): GridCoordinate {
  return {
    x: Math.floor(pixelX / cellWidth),
    y: Math.floor(pixelY / cellHeight),
  }
}

/**
 * 网格坐标转像素坐标
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @param cellWidth 格子宽度（像素）
 * @param cellHeight 格子高度（像素）
 * @returns 像素坐标
 */
export function gridToPixel(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
): PixelCoordinate {
  return {
    x: gridX * cellWidth,
    y: gridY * cellHeight,
  }
}

/**
 * 网格坐标编码为字符串
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @returns 编码字符串
 */
export function encodeGridCoord(gridX: number, gridY: number): string {
  return `${gridX},${gridY}`
}

/**
 * 解码网格坐标字符串
 * @param encoded 编码字符串
 * @returns 网格坐标
 */
export function decodeGridCoord(encoded: string): GridCoordinate {
  const [x, y] = encoded.split(',').map(Number)
  return { x, y }
}

/**
 * 计算两点之间的距离
 * @param x1 第一个点的X坐标
 * @param y1 第一个点的Y坐标
 * @param x2 第二个点的X坐标
 * @param y2 第二个点的Y坐标
 * @returns 距离
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 计算点到矩形的距离
 * @param pointX 点的X坐标
 * @param pointY 点的Y坐标
 * @param rectX 矩形左上角X坐标
 * @param rectY 矩形左上角Y坐标
 * @param rectWidth 矩形宽度
 * @param rectHeight 矩形高度
 * @returns 距离（0表示点在矩形内）
 */
export function distanceToRect(
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): number {
  const dx = Math.max(rectX - pointX, 0, pointX - (rectX + rectWidth))
  const dy = Math.max(rectY - pointY, 0, pointY - (rectY + rectHeight))
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 检查点是否在矩形内
 * @param pointX 点的X坐标
 * @param pointY 点的Y坐标
 * @param rectX 矩形左上角X坐标
 * @param rectY 矩形左上角Y坐标
 * @param rectWidth 矩形宽度
 * @param rectHeight 矩形高度
 * @returns 是否在矩形内
 */
export function isPointInRect(
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): boolean {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  )
}

/**
 * 检查两个矩形是否相交
 * @param rect1X 矩形1左上角X坐标
 * @param rect1Y 矩形1左上角Y坐标
 * @param rect1Width 矩形1宽度
 * @param rect1Height 矩形1高度
 * @param rect2X 矩形2左上角X坐标
 * @param rect2Y 矩形2左上角Y坐标
 * @param rect2Width 矩形2宽度
 * @param rect2Height 矩形2高度
 * @returns 是否相交
 */
export function rectsIntersect(
  rect1X: number,
  rect1Y: number,
  rect1Width: number,
  rect1Height: number,
  rect2X: number,
  rect2Y: number,
  rect2Width: number,
  rect2Height: number,
): boolean {
  return !(
    rect1X + rect1Width < rect2X ||
    rect2X + rect2Width < rect1X ||
    rect1Y + rect1Height < rect2Y ||
    rect2Y + rect2Height < rect1Y
  )
}

/**
 * 限制数值在指定范围内
 * @param value 数值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的数值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 线性插值
 * @param start 起始值
 * @param end 结束值
 * @param t 插值参数（0-1）
 * @returns 插值结果
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1)
}

/**
 * 将角度转换为弧度
 * @param degrees 角度
 * @returns 弧度
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * 将弧度转换为角度
 * @param radians 弧度
 * @returns 角度
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * 计算网格对齐的坐标
 * @param x X坐标
 * @param y Y坐标
 * @param cellWidth 格子宽度
 * @param cellHeight 格子高度
 * @returns 对齐后的坐标
 */
export function snapToGrid(
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
): PixelCoordinate {
  return {
    x: Math.round(x / cellWidth) * cellWidth,
    y: Math.round(y / cellHeight) * cellHeight,
  }
}

/**
 * 获取网格单元格的边界
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @param cellWidth 格子宽度
 * @param cellHeight 格子高度
 * @returns 边界信息
 */
export function getGridCellBounds(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
) {
  return {
    x: gridX * cellWidth,
    y: gridY * cellHeight,
    width: cellWidth,
    height: cellHeight,
    centerX: gridX * cellWidth + cellWidth / 2,
    centerY: gridY * cellHeight + cellHeight / 2,
  }
}

/**
 * 清除坐标转换缓存
 */
export function clearCoordinateCache(): void {
  coordinateCache.clear()
}

/**
 * 获取坐标转换缓存统计信息
 */
export function getCoordinateCacheStats() {
  return {
    size: coordinateCache.size,
    maxSize: 1000,
  }
}