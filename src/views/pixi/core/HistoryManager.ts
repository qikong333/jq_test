import type { IHistoryManager, HistoryItem, PixelData } from '../types'

/**
 * 历史记录管理器
 * 实现撤销/重做功能
 */
export class HistoryManager {
  private history: HistoryItem[] = []
  private currentIndex: number = -1
  private maxHistorySize: number = 50
  private changeListeners: Set<() => void> = new Set()

  constructor(maxSize: number = 50) {
    this.maxHistorySize = maxSize
  }

  /**
   * 保存状态到历史记录
   */
  saveState(description: string, data: unknown, preview?: string): void {
    // 如果当前不在历史记录末尾，删除后续记录
    if (this.currentIndex < this.history.length - 1) {
      this.history.splice(this.currentIndex + 1)
    }

    const historyItem: HistoryItem = {
      id: this.generateId(),
      timestamp: Date.now(),
      description,
      data: this.deepClone(data),
      preview,
      size: this.calculateDataSize(data),
    }

    this.history.push(historyItem)
    this.currentIndex = this.history.length - 1

    // 限制历史记录大小
    this.trimHistory()

    this.notifyChange()
  }

  /**
   * 撤销操作
   */
  undo(): HistoryItem | null {
    if (!this.canUndo()) return null

    this.currentIndex--
    const item = this.getCurrentState()
    this.notifyChange()

    return item
  }

  /**
   * 重做操作
   */
  redo(): HistoryItem | null {
    if (!this.canRedo()) return null

    this.currentIndex++
    const item = this.getCurrentState()
    this.notifyChange()

    return item
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): HistoryItem | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex]
    }
    return null
  }

  /**
   * 跳转到指定历史记录
   */
  jumpToState(index: number): HistoryItem | null {
    if (index < 0 || index >= this.history.length) return null

    this.currentIndex = index
    const item = this.getCurrentState()
    this.notifyChange()

    return item
  }

  /**
   * 获取历史记录列表
   */
  getHistory(): HistoryItem[] {
    return this.history.map((item) => ({
      ...item,
      data: undefined, // 不返回实际数据，只返回元信息
    }))
  }

  /**
   * 获取历史记录摘要
   */
  getHistorySummary() {
    return {
      total: this.history.length,
      current: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      memoryUsage: this.getMemoryUsage(),
    }
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
    this.notifyChange()
  }

  /**
   * 批量操作开始
   */
  beginBatch(description: string): string {
    const batchId = this.generateId()

    // 保存批量操作开始状态
    this.saveState(`开始: ${description}`, {
      type: 'batch_start',
      batchId,
      description,
    })

    return batchId
  }

  /**
   * 批量操作结束
   */
  endBatch(batchId: string, finalData: unknown): void {
    // 查找批量操作开始的位置
    let batchStartIndex = -1
    for (let i = this.history.length - 1; i >= 0; i--) {
      const item = this.history[i]
      if (item.data?.type === 'batch_start' && item.data?.batchId === batchId) {
        batchStartIndex = i
        break
      }
    }

    if (batchStartIndex === -1) {
      console.warn('Batch start not found')
      return
    }

    // 获取批量操作描述
    const batchDescription = this.history[batchStartIndex].data.description

    // 删除批量操作期间的所有记录
    this.history.splice(batchStartIndex)
    this.currentIndex = this.history.length - 1

    // 保存最终状态
    this.saveState(batchDescription, finalData)
  }

  /**
   * 设置最大历史记录大小
   */
  setMaxSize(size: number): void {
    this.maxHistorySize = Math.max(1, size)
    this.trimHistory()
  }

  /**
   * 添加变更监听器
   */
  addChangeListener(listener: () => void): void {
    this.changeListeners.add(listener)
  }

  /**
   * 移除变更监听器
   */
  removeChangeListener(listener: () => void): void {
    this.changeListeners.delete(listener)
  }

  /**
   * 获取指定状态的数据
   */
  getStateData(index: number): unknown {
    if (index >= 0 && index < this.history.length) {
      return this.deepClone(this.history[index].data)
    }
    return null
  }

  /**
   * 压缩历史记录
   */
  compress(): void {
    // 移除过旧的记录，只保留最近的记录
    const keepCount = Math.floor(this.maxHistorySize * 0.7)

    if (this.history.length > keepCount) {
      const removeCount = this.history.length - keepCount
      this.history.splice(0, removeCount)
      this.currentIndex = Math.max(0, this.currentIndex - removeCount)
    }

    this.notifyChange()
  }

  /**
   * 导出历史记录
   */
  export(): unknown {
    return {
      history: this.history,
      currentIndex: this.currentIndex,
      maxHistorySize: this.maxHistorySize,
      exportTime: Date.now(),
    }
  }

  /**
   * 导入历史记录
   */
  import(data: unknown): boolean {
    try {
      if (!data.history || !Array.isArray(data.history)) {
        return false
      }

      this.history = data.history
      this.currentIndex = data.currentIndex || -1

      if (data.maxHistorySize) {
        this.maxHistorySize = data.maxHistorySize
      }

      // 验证当前索引
      if (this.currentIndex >= this.history.length) {
        this.currentIndex = this.history.length - 1
      }

      this.notifyChange()
      return true
    } catch (error) {
      console.error('Failed to import history:', error)
      return false
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 深度克隆对象
   */
  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item))
    }

    if (typeof obj === 'object') {
      const cloned: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key])
        }
      }
      return cloned
    }

    return obj
  }

  /**
   * 计算数据大小（估算）
   */
  private calculateDataSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2 // 估算字节数
    } catch (error) {
      return 0
    }
  }

  /**
   * 修剪历史记录
   */
  private trimHistory(): void {
    while (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.currentIndex--
    }

    // 确保当前索引有效
    if (this.currentIndex < 0 && this.history.length > 0) {
      this.currentIndex = 0
    }
  }

  /**
   * 通知变更
   */
  private notifyChange(): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        console.error('Error in history change listener:', error)
      }
    })
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): unknown {
    let totalSize = 0

    this.history.forEach((item) => {
      totalSize += item.size || 0
    })

    return {
      totalItems: this.history.length,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      averageSize:
        this.history.length > 0
          ? `${(totalSize / this.history.length / 1024).toFixed(2)} KB`
          : '0 KB',
      maxSize: this.maxHistorySize,
    }
  }

  /**
   * 获取撤销/重做预览信息
   */
  getUndoRedoInfo() {
    const undoItem = this.canUndo() ? this.history[this.currentIndex - 1] : null
    const redoItem = this.canRedo() ? this.history[this.currentIndex + 1] : null

    return {
      undo: undoItem
        ? {
            description: undoItem.description,
            timestamp: undoItem.timestamp,
            preview: undoItem.preview,
          }
        : null,
      redo: redoItem
        ? {
            description: redoItem.description,
            timestamp: redoItem.timestamp,
            preview: redoItem.preview,
          }
        : null,
    }
  }

  /**
   * 创建状态快照
   */
  createSnapshot(description: string, pixelData: PixelData[]): void {
    const snapshot = {
      type: 'pixel_snapshot',
      pixels: pixelData,
      timestamp: Date.now(),
    }

    this.saveState(description, snapshot)
  }

  /**
   * 恢复状态快照
   */
  restoreSnapshot(index: number): PixelData[] | null {
    const item = this.getStateData(index)

    if (item && item.type === 'pixel_snapshot' && item.pixels) {
      return item.pixels
    }

    return null
  }
}
