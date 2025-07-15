import type { IPixelStorage, PixelData, Point, Rect } from '../types'

/**
 * 像素存储管理器
 * 高效管理和查询像素数据
 */
export class PixelStorage implements IPixelStorage {
  private pixels: Map<string, PixelData> = new Map()
  private spatialIndex: Map<string, Set<string>> = new Map()
  private gridSize: number = 32 // 空间索引网格大小
  private changeListeners: Set<(changes: PixelData[]) => void> = new Set()

  constructor(gridSize: number = 32) {
    this.gridSize = gridSize
  }
  getPixelsInRegion(rect: Rect): PixelData[] {
    throw new Error('Method not implemented.')
  }

  /**
   * 添加像素
   */
  setPixel(x: number, y: number, color: number, alpha: number = 1): void {
    const key = this.getPixelKey(x, y)
    const oldPixel = this.pixels.get(key)

    const pixel: PixelData = {
      x,
      y,
      color,
      alpha,
      timestamp: Date.now(),
    }

    this.pixels.set(key, pixel)
    this.updateSpatialIndex(x, y, key)

    // 通知变更
    this.notifyChange([pixel])
  }

  /**
   * 获取像素
   */
  getPixel(x: number, y: number): PixelData | null {
    const key = this.getPixelKey(x, y)
    return this.pixels.get(key) || null
  }

  /**
   * 删除像素
   */
  removePixel(x: number, y: number): boolean {
    const key = this.getPixelKey(x, y)
    const pixel = this.pixels.get(key)

    if (!pixel) return false

    this.pixels.delete(key)
    this.removeSpatialIndex(x, y, key)

    // 通知变更（删除的像素alpha设为0）
    this.notifyChange([{ ...pixel, alpha: 0 }])

    return true
  }

  /**
   * 批量设置像素
   */
  setPixels(pixels: PixelData[]): void {
    const changes: PixelData[] = []

    pixels.forEach((pixel) => {
      const key = this.getPixelKey(pixel.x, pixel.y)
      const updatedPixel = {
        ...pixel,
        timestamp: Date.now(),
      }

      this.pixels.set(key, updatedPixel)
      this.updateSpatialIndex(pixel.x, pixel.y, key)
      changes.push(updatedPixel)
    })

    this.notifyChange(changes)
  }

  /**
   * 批量删除像素
   */
  removePixels(positions: Point[]): PixelData[] {
    const removed: PixelData[] = []

    positions.forEach((pos) => {
      const key = this.getPixelKey(pos.x, pos.y)
      const pixel = this.pixels.get(key)

      if (pixel) {
        this.pixels.delete(key)
        this.removeSpatialIndex(pos.x, pos.y, key)
        removed.push({ ...pixel, alpha: 0 })
      }
    })

    if (removed.length > 0) {
      this.notifyChange(removed)
    }

    return removed
  }

  /**
   * 获取区域内的像素
   */
  getPixelsInRect(rect: Rect): PixelData[] {
    const pixels: PixelData[] = []
    const gridKeys = this.getGridKeysInRect(rect)

    gridKeys.forEach((gridKey) => {
      const pixelKeys = this.spatialIndex.get(gridKey)
      if (!pixelKeys) return

      pixelKeys.forEach((pixelKey) => {
        const pixel = this.pixels.get(pixelKey)
        if (pixel && this.isPixelInRect(pixel, rect)) {
          pixels.push(pixel)
        }
      })
    })

    return pixels
  }

  /**
   * 获取指定颜色的像素
   */
  getPixelsByColor(color: number, tolerance: number = 0): PixelData[] {
    const pixels: PixelData[] = []

    this.pixels.forEach((pixel) => {
      if (this.colorMatches(pixel.color, color, tolerance)) {
        pixels.push(pixel)
      }
    })

    return pixels
  }

  /**
   * 获取连通区域
   */
  getConnectedPixels(startX: number, startY: number, targetColor?: number): PixelData[] {
    const startPixel = this.getPixel(startX, startY)
    if (!startPixel) return []

    const searchColor = targetColor !== undefined ? targetColor : startPixel.color
    const visited = new Set<string>()
    const connected: PixelData[] = []
    const queue: Point[] = [{ x: startX, y: startY }]

    while (queue.length > 0) {
      const current = queue.shift()!
      const key = this.getPixelKey(current.x, current.y)

      if (visited.has(key)) continue
      visited.add(key)

      const pixel = this.getPixel(current.x, current.y)
      if (!pixel || pixel.color !== searchColor) continue

      connected.push(pixel)

      // 添加相邻像素到队列
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ]

      neighbors.forEach((neighbor) => {
        const neighborKey = this.getPixelKey(neighbor.x, neighbor.y)
        if (!visited.has(neighborKey)) {
          queue.push(neighbor)
        }
      })
    }

    return connected
  }

  /**
   * 清空所有像素
   */
  clear(): void {
    const allPixels = Array.from(this.pixels.values()).map((p) => ({ ...p, alpha: 0 }))

    this.pixels.clear()
    this.spatialIndex.clear()

    if (allPixels.length > 0) {
      this.notifyChange(allPixels)
    }
  }

  /**
   * 获取所有像素
   */
  getAllPixels(): PixelData[] {
    return Array.from(this.pixels.values())
  }

  /**
   * 获取像素数量
   */
  getPixelCount(): number {
    return this.pixels.size
  }

  /**
   * 获取边界框
   */
  getBounds(): Rect | null {
    if (this.pixels.size === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    this.pixels.forEach((pixel) => {
      minX = Math.min(minX, pixel.x)
      minY = Math.min(minY, pixel.y)
      maxX = Math.max(maxX, pixel.x)
      maxY = Math.max(maxY, pixel.y)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    }
  }

  /**
   * 添加变更监听器
   */
  addChangeListener(listener: (changes: PixelData[]) => void): void {
    this.changeListeners.add(listener)
  }

  /**
   * 移除变更监听器
   */
  removeChangeListener(listener: (changes: PixelData[]) => void): void {
    this.changeListeners.delete(listener)
  }

  /**
   * 序列化数据
   */
  serialize(): any {
    return {
      pixels: Array.from(this.pixels.entries()),
      gridSize: this.gridSize,
      timestamp: Date.now(),
    }
  }

  /**
   * 反序列化数据
   */
  deserialize(data: any): void {
    this.clear()

    if (data.pixels && Array.isArray(data.pixels)) {
      data.pixels.forEach(([key, pixel]: [string, PixelData]) => {
        this.pixels.set(key, pixel)
        this.updateSpatialIndex(pixel.x, pixel.y, key)
      })
    }

    if (data.gridSize) {
      this.gridSize = data.gridSize
    }
  }

  /**
   * 获取像素键
   */
  private getPixelKey(x: number, y: number): string {
    return `${Math.floor(x)},${Math.floor(y)}`
  }

  /**
   * 获取网格键
   */
  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize)
    const gridY = Math.floor(y / this.gridSize)
    return `${gridX},${gridY}`
  }

  /**
   * 更新空间索引
   */
  private updateSpatialIndex(x: number, y: number, pixelKey: string): void {
    const gridKey = this.getGridKey(x, y)

    if (!this.spatialIndex.has(gridKey)) {
      this.spatialIndex.set(gridKey, new Set())
    }

    this.spatialIndex.get(gridKey)!.add(pixelKey)
  }

  /**
   * 移除空间索引
   */
  private removeSpatialIndex(x: number, y: number, pixelKey: string): void {
    const gridKey = this.getGridKey(x, y)
    const pixelSet = this.spatialIndex.get(gridKey)

    if (pixelSet) {
      pixelSet.delete(pixelKey)
      if (pixelSet.size === 0) {
        this.spatialIndex.delete(gridKey)
      }
    }
  }

  /**
   * 获取矩形区域内的网格键
   */
  private getGridKeysInRect(rect: Rect): string[] {
    const keys: string[] = []

    const startGridX = Math.floor(rect.x / this.gridSize)
    const startGridY = Math.floor(rect.y / this.gridSize)
    const endGridX = Math.floor((rect.x + rect.width) / this.gridSize)
    const endGridY = Math.floor((rect.y + rect.height) / this.gridSize)

    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        keys.push(`${gridX},${gridY}`)
      }
    }

    return keys
  }

  /**
   * 检查像素是否在矩形内
   */
  private isPixelInRect(pixel: PixelData, rect: Rect): boolean {
    return (
      pixel.x >= rect.x &&
      pixel.x < rect.x + rect.width &&
      pixel.y >= rect.y &&
      pixel.y < rect.y + rect.height
    )
  }

  /**
   * 检查颜色是否匹配
   */
  private colorMatches(color1: number, color2: number, tolerance: number): boolean {
    if (tolerance === 0) return color1 === color2

    const r1 = (color1 >> 16) & 0xff
    const g1 = (color1 >> 8) & 0xff
    const b1 = color1 & 0xff

    const r2 = (color2 >> 16) & 0xff
    const g2 = (color2 >> 8) & 0xff
    const b2 = color2 & 0xff

    const diff = Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2))

    return diff <= tolerance
  }

  /**
   * 通知变更
   */
  private notifyChange(changes: PixelData[]): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(changes)
      } catch (error) {
        console.error('Error in pixel change listener:', error)
      }
    })
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pixelCount: number
    gridSize: number
    spatialIndexSize: number
    bounds: Rect | null
    memoryUsage: any
  } {
    const bounds = this.getBounds()

    return {
      pixelCount: this.pixels.size,
      gridSize: this.gridSize,
      spatialIndexSize: this.spatialIndex.size,
      bounds,
      memoryUsage: this.getMemoryUsage(),
    }
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): any {
    const pixelMemory = this.pixels.size * 32 // 估算每个像素32字节
    const indexMemory = this.spatialIndex.size * 16 // 估算每个索引16字节

    return {
      pixels: `${(pixelMemory / 1024).toFixed(2)} KB`,
      spatialIndex: `${(indexMemory / 1024).toFixed(2)} KB`,
      total: `${((pixelMemory + indexMemory) / 1024).toFixed(2)} KB`,
    }
  }
}
