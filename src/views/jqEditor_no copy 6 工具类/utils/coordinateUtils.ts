import type { PixelCoordinate, GridCoordinate } from '../types/canvas'
import type { ViewportState, ViewportBounds } from '../types/viewport'
import type { CoordinateCacheEntry, CacheConfig, CacheStats } from '../types/performance'

/**
 * 坐标转换缓存类
 */
class CoordinateCache {
  private cache = new Map<string, CoordinateCacheEntry>()
  private accessOrder = new Map<string, number>()
  private accessCounter = 0
  private config: CacheConfig
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
  }

  constructor(config: CacheConfig = { maxSize: 1000, ttl: 5000 }) {
    this.config = config
  }

  get(key: string): GridCoordinate | null {
    const entry = this.cache.get(key)
    const now = performance.now()

    if (!entry || now - entry.timestamp > this.config.ttl) {
      this.stats.misses++
      if (entry) {
        this.cache.delete(key)
      }
      this.updateStats()
      return null
    }

    this.stats.hits++
    this.accessOrder.set(key, ++this.accessCounter)
    this.updateStats()
    return entry.result
  }

  set(key: string, value: GridCoordinate): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      key,
      result: value,
      timestamp: performance.now(),
    })

    this.stats.size = this.cache.size
  }

  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, hitRate: 0, size: 0 }
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
    this.stats.size = this.cache.size
  }
}

// 全局坐标缓存实例
const coordinateCache = new CoordinateCache({ maxSize: 1000, ttl: 5000 })

/**
 * 获取坐标缓存统计信息
 * @returns 缓存统计
 */
export function getCoordinateCacheStats(): CacheStats {
  return coordinateCache.getStats()
}

/**
 * 清空坐标缓存
 */
export function clearCoordinateCache(): void {
  coordinateCache.clear()
}

/**
 * DPI转换常量
 */
export const DPI = 96 // Web标准DPI

/**
 * 厘米转像素
 * @param cm 厘米值
 * @returns 像素值
 */
export function cmToPx(cm: number): number {
  return (cm * DPI) / 2.54
}

/**
 * 像素转厘米
 * @param px 像素值
 * @returns 厘米值
 */
export function pxToCm(px: number): number {
  return (px * 2.54) / DPI
}

/**
 * 像素坐标转网格坐标（高精度实现，带缓存）
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
  // 生成缓存键（量化坐标以提高缓存命中率）
  const quantizedX = Math.round(pixelX * 100) / 100
  const quantizedY = Math.round(pixelY * 100) / 100
  const cacheKey = `pixel_${quantizedX}_${quantizedY}_${cellWidth}_${cellHeight}`

  // 尝试从缓存获取
  const cached = coordinateCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // 高精度格子坐标计算，确保准确的边界处理
  const gridX = Math.floor(pixelX / cellWidth)
  const gridY = Math.floor(pixelY / cellHeight)

  const result = {
    x: gridX,
    y: gridY,
  }

  // 存入缓存
  coordinateCache.set(cacheKey, result)

  return result
}

/**
 * 网格坐标转像素坐标
 * @param gridX 网格X坐标
 * @param gridY 网格Y坐标
 * @param cellWidth 格子宽度
 * @param cellHeight 格子高度
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
 * 网格坐标编码为数字（用于Map键）
 * @param x 网格X坐标
 * @param y 网格Y坐标
 * @param width 网格宽度
 * @returns 编码的数字
 */
export function encodeGridCoord(x: number, y: number, width: number): number {
  return y * width + x
}

/**
 * 数字解码为网格坐标
 * @param encoded 编码的数字
 * @param width 网格宽度
 * @returns 网格坐标
 */
export function decodeGridCoord(encoded: number, width: number): GridCoordinate {
  return {
    x: encoded % width,
    y: Math.floor(encoded / width),
  }
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
 * 检查点是否在矩形内
 * @param x 点的X坐标
 * @param y 点的Y坐标
 * @param rectX 矩形左上角X坐标
 * @param rectY 矩形左上角Y坐标
 * @param rectWidth 矩形宽度
 * @param rectHeight 矩形高度
 * @returns 是否在矩形内
 */
export function isPointInRect(
  x: number,
  y: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): boolean {
  return x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight
}

/**
 * 限制值在指定范围内
 * @param value 要限制的值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 线性插值
 * @param start 起始值
 * @param end 结束值
 * @param t 插值参数 (0-1)
 * @returns 插值结果
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
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
  return gridX >= 0 && gridX < width && gridY >= 0 && gridY < height
}

/**
 * 获取网格路径（用于绘制连续线条）
 * @param startGrid 起始网格坐标
 * @param endGrid 结束网格坐标
 * @returns 网格坐标数组
 */
export function getGridPath(startGrid: GridCoordinate, endGrid: GridCoordinate): GridCoordinate[] {
  const path: GridCoordinate[] = []
  const dx = Math.abs(endGrid.x - startGrid.x)
  const dy = Math.abs(endGrid.y - startGrid.y)
  const sx = startGrid.x < endGrid.x ? 1 : -1
  const sy = startGrid.y < endGrid.y ? 1 : -1
  let err = dx - dy

  let x = startGrid.x
  let y = startGrid.y

  while (true) {
    path.push({ x, y })

    if (x === endGrid.x && y === endGrid.y) break

    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return path
}

// ========== 视口相关函数 ==========

/**
 * 在指定点进行缩放
 * @param mouseX 鼠标X坐标
 * @param mouseY 鼠标Y坐标
 * @param zoomDelta 缩放增量
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
  // 限制缩放级别
  const newZoom = clamp(currentZoom * zoomDelta, minZoom, maxZoom)

  if (newZoom === currentZoom) {
    return { zoom: currentZoom, pan: currentPan }
  }

  // 计算缩放中心点相对于画布的位置
  const zoomRatio = newZoom / currentZoom

  // 调整平移以保持鼠标位置不变
  const newPan = {
    x: mouseX - (mouseX - currentPan.x) * zoomRatio,
    y: mouseY - (mouseY - currentPan.y) * zoomRatio,
  }

  return {
    zoom: newZoom,
    pan: newPan,
  }
}

/**
 * 限制平移在边界内
 * @param pan 平移偏移
 * @param canvasSize 画布尺寸
 * @param containerSize 容器尺寸
 * @param zoom 缩放级别
 * @returns 限制后的平移偏移
 */
export function clampPan(
  pan: PixelCoordinate,
  canvasSize: { width: number; height: number },
  containerSize: { width: number; height: number },
  zoom: number,
): PixelCoordinate {
  const scaledCanvasWidth = canvasSize.width * zoom
  const scaledCanvasHeight = canvasSize.height * zoom

  // 计算平移边界
  const minX = Math.min(0, containerSize.width - scaledCanvasWidth)
  const maxX = Math.max(0, containerSize.width - scaledCanvasWidth)
  const minY = Math.min(0, containerSize.height - scaledCanvasHeight)
  const maxY = Math.max(0, containerSize.height - scaledCanvasHeight)

  return {
    x: clamp(pan.x, minX, maxX),
    y: clamp(pan.y, minY, maxY),
  }
}

/**
 * 获取视口边界
 * @param viewportState 视口状态
 * @param canvasSize 画布尺寸
 * @param containerSize 容器尺寸
 * @returns 视口边界
 */
export function getViewportBounds(
  viewportState: ViewportState,
  canvasSize: { width: number; height: number },
  containerSize: { width: number; height: number },
): ViewportBounds {
  const { zoom, pan } = viewportState

  return {
    minX: -pan.x / zoom,
    minY: -pan.y / zoom,
    maxX: (-pan.x + containerSize.width) / zoom,
    maxY: (-pan.y + containerSize.height) / zoom,
  }
}

/**
 * 屏幕坐标转画布坐标（带缓存）
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
  const { zoom, pan } = viewportState

  // 生成缓存键（量化坐标和视口状态）
  const quantizedX = Math.round(screenX * 100) / 100
  const quantizedY = Math.round(screenY * 100) / 100
  const quantizedZoom = Math.round(zoom * 1000) / 1000
  const quantizedPanX = Math.round(pan.x * 100) / 100
  const quantizedPanY = Math.round(pan.y * 100) / 100
  const cacheKey = `screen_${quantizedX}_${quantizedY}_${quantizedZoom}_${quantizedPanX}_${quantizedPanY}`

  // 尝试从缓存获取
  const cached = coordinateCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const result = {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  }

  // 存入缓存
  coordinateCache.set(cacheKey, result)

  return result
}

/**
 * 画布坐标转屏幕坐标
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
  const { zoom, pan } = viewportState

  return {
    x: canvasX * zoom + pan.x,
    y: canvasY * zoom + pan.y,
  }
}
