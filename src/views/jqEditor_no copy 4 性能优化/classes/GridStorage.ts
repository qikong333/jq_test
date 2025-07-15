import type { GridCell } from '../types/canvas'
import type { GridStats } from '../types/grid'
import { encodeGridCoord, decodeGridCoord } from '../utils/coordinateUtils'
import { normalizeColor } from '../utils/colorUtils'

/**
 * 压缩网格存储类
 * 使用稀疏存储节省内存，只存储有颜色的格子
 */
export class CompressedGridStorage {
  private paintedCells = new Map<number, string>()
  private width: number
  private height: number
  private defaultColor = 'transparent'

  // 统计信息
  private stats = {
    totalSets: 0,
    totalGets: 0,
    hitCount: 0,
    missCount: 0,
  }

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * 设置格子颜色（使用颜色池优化）
   * @param x 格子X坐标
   * @param y 格子Y坐标
   * @param color 颜色值
   */
  setCell(x: number, y: number, color: string): void {
    if (!this.isValidCoord(x, y)) {
      console.warn(`Invalid grid coordinate: (${x}, ${y})`)
      return
    }

    const key = encodeGridCoord(x, y, this.width)
    this.stats.totalSets++

    if (color === this.defaultColor || color === '') {
      // 透明或空颜色不存储，删除已存在的条目
      this.paintedCells.delete(key)
    } else {
      // 使用颜色池标准化颜色
      const normalizedColor = normalizeColor(color);
      this.paintedCells.set(key, normalizedColor)
    }
  }

  /**
   * 获取格子颜色
   * @param x 格子X坐标
   * @param y 格子Y坐标
   * @returns 颜色值
   */
  getCell(x: number, y: number): string {
    if (!this.isValidCoord(x, y)) {
      return this.defaultColor
    }

    const key = encodeGridCoord(x, y, this.width)
    this.stats.totalGets++

    const color = this.paintedCells.get(key)
    if (color !== undefined) {
      this.stats.hitCount++
      return color
    } else {
      this.stats.missCount++
      return this.defaultColor
    }
  }

  /**
   * 批量设置格子
   * @param cells 格子数组
   */
  setCells(cells: GridCell[]): void {
    cells.forEach((cell) => {
      if (cell.color) {
        this.setCell(cell.x, cell.y, cell.color)
      }
    })
  }

  /**
   * 获取所有已绘制的格子
   * @returns 格子数组
   */
  getAllPaintedCells(): GridCell[] {
    const cells: GridCell[] = []

    for (const [encoded, color] of this.paintedCells) {
      const coord = decodeGridCoord(encoded, this.width)
      cells.push({
        x: coord.x,
        y: coord.y,
        color,
      })
    }

    return cells
  }

  /**
   * 获取指定区域的格子
   * @param startX 起始X坐标
   * @param startY 起始Y坐标
   * @param endX 结束X坐标
   * @param endY 结束Y坐标
   * @returns 格子数组
   */
  getCellsInRegion(startX: number, startY: number, endX: number, endY: number): GridCell[] {
    const cells: GridCell[] = []

    for (let x = Math.max(0, startX); x <= Math.min(this.width - 1, endX); x++) {
      for (let y = Math.max(0, startY); y <= Math.min(this.height - 1, endY); y++) {
        const color = this.getCell(x, y)
        if (color !== this.defaultColor) {
          cells.push({ x, y, color })
        }
      }
    }

    return cells
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.paintedCells.clear()
    this.resetStats()
  }

  /**
   * 清空指定区域
   * @param startX 起始X坐标
   * @param startY 起始Y坐标
   * @param endX 结束X坐标
   * @param endY 结束Y坐标
   */
  clearRegion(startX: number, startY: number, endX: number, endY: number): void {
    for (let x = Math.max(0, startX); x <= Math.min(this.width - 1, endX); x++) {
      for (let y = Math.max(0, startY); y <= Math.min(this.height - 1, endY); y++) {
        this.setCell(x, y, this.defaultColor)
      }
    }
  }

  /**
   * 获取存储统计信息
   * @returns 统计信息
   */
  getStats(): GridStats {
    const totalCells = this.width * this.height
    const paintedCells = this.paintedCells.size
    const memoryPerCell = 12 // 估算每个格子占用的内存（key + value）

    return {
      totalGrids: totalCells,
      visibleGrids: totalCells, // 这里简化处理
      paintedGrids: paintedCells,
      emptyGrids: totalCells - paintedCells,
      memoryUsage: paintedCells * memoryPerCell,
      compressionRatio: paintedCells / totalCells,
    }
  }

  /**
   * 获取性能统计
   * @returns 性能统计
   */
  getPerformanceStats() {
    return {
      ...this.stats,
      hitRate: this.stats.totalGets > 0 ? this.stats.hitCount / this.stats.totalGets : 0,
      storageSize: this.paintedCells.size,
      memoryUsage: this.paintedCells.size * 12, // 估算内存使用
    }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalSets: 0,
      totalGets: 0,
      hitCount: 0,
      missCount: 0,
    }
  }

  /**
   * 检查坐标是否有效
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否有效
   */
  private isValidCoord(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  /**
   * 获取所有使用的颜色
   * @returns 颜色数组
   */
  getUsedColors(): string[] {
    const colors = new Set<string>()
    for (const color of this.paintedCells.values()) {
      colors.add(color)
    }
    return Array.from(colors)
  }

  /**
   * 获取某种颜色的格子数量
   * @param color 颜色
   * @returns 格子数量
   */
  getColorCount(color: string): number {
    let count = 0
    for (const cellColor of this.paintedCells.values()) {
      if (cellColor === color) {
        count++
      }
    }
    return count
  }

  /**
   * 导出数据
   * @returns 导出的数据
   */
  exportData(): Map<string, string> {
    const exportMap = new Map<string, string>()

    for (const [encoded, color] of this.paintedCells) {
      const coord = decodeGridCoord(encoded, this.width)
      const key = `${coord.x},${coord.y}`
      exportMap.set(key, color)
    }

    return exportMap
  }

  /**
   * 导入数据
   * @param data 导入的数据
   */
  importData(data: Map<string, string>): void {
    this.clear()

    for (const [key, color] of data) {
      const [x, y] = key.split(',').map(Number)
      this.setCell(x, y, color)
    }
  }
}
