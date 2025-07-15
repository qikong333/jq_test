import type {
  HistoryAction,
  HistorySnapshot,
  MemoryConfig,
  CompressionConfig,
  HistoryError,
} from '../types/history';

/**
 * 历史记录存储管理器
 * 负责历史记录的存储、压缩、清理和恢复
 * 支持内存优化和性能监控
 */
export class HistoryStorage {
  private actions: Map<string, HistoryAction> = new Map();
  private snapshots: Map<string, HistorySnapshot> = new Map();
  private actionOrder: string[] = []; // 维护动作的时间顺序
  private config: MemoryConfig;
  private compressionConfig: CompressionConfig;
  private memoryUsage: number = 0;

  constructor(config: MemoryConfig, compressionConfig?: CompressionConfig) {
    this.config = config;
    this.compressionConfig = compressionConfig || {
      enabled: false,
      algorithm: 'none',
      threshold: 1024 * 1024, // 1MB
      level: 6,
    };
  }

  /**
   * 存储历史动作
   * @param action 历史动作
   * @returns 是否成功存储
   */
  storeAction(action: HistoryAction): boolean {
    try {
      // 检查内存限制
      const actionSize = this.estimateActionSize(action);
      if (this.shouldCleanupMemory(actionSize)) {
        this.cleanupOldActions();
      }

      // 存储动作
      this.actions.set(action.id, action);
      this.actionOrder.push(action.id);
      this.memoryUsage += actionSize;

      // 检查是否需要创建快照
      if (this.shouldCreateSnapshot()) {
        this.createSnapshotPoint();
      }

      // 限制动作数量
      this.enforceActionLimit();

      return true;
    } catch (error) {
      this.handleError(
        'STORE_ACTION_FAILED',
        `Failed to store action: ${error}`,
        action.id,
      );
      return false;
    }
  }

  /**
   * 获取历史动作
   * @param actionId 动作ID
   * @returns 历史动作或undefined
   */
  getAction(actionId: string): HistoryAction | undefined {
    return this.actions.get(actionId);
  }

  /**
   * 获取指定范围的动作
   * @param startIndex 起始索引
   * @param endIndex 结束索引
   * @returns 动作数组
   */
  getActionRange(startIndex: number, endIndex: number): HistoryAction[] {
    const actions: HistoryAction[] = [];
    const start = Math.max(0, startIndex);
    const end = Math.min(this.actionOrder.length, endIndex);

    for (let i = start; i < end; i++) {
      const actionId = this.actionOrder[i];
      const action = this.actions.get(actionId);
      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * 存储快照
   * @param snapshot 快照数据
   * @returns 是否成功存储
   */
  storeSnapshot(snapshot: HistorySnapshot): boolean {
    try {
      // 压缩快照数据（如果启用）
      if (
        this.compressionConfig.enabled &&
        snapshot.memorySize > this.compressionConfig.threshold
      ) {
        snapshot = this.compressSnapshot(snapshot);
      }

      this.snapshots.set(snapshot.id, snapshot);
      this.memoryUsage += snapshot.memorySize;

      return true;
    } catch (error) {
      this.handleError(
        'STORE_SNAPSHOT_FAILED',
        `Failed to store snapshot: ${error}`,
        snapshot.id,
      );
      return false;
    }
  }

  /**
   * 获取快照
   * @param snapshotId 快照ID
   * @returns 快照数据或undefined
   */
  getSnapshot(snapshotId: string): HistorySnapshot | undefined {
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot && this.isCompressed(snapshot)) {
      return this.decompressSnapshot(snapshot);
    }
    return snapshot;
  }

  /**
   * 获取最近的快照
   * @param beforeIndex 指定索引之前的快照
   * @returns 快照数据或undefined
   */
  getLatestSnapshot(beforeIndex?: number): HistorySnapshot | undefined {
    const snapshots = Array.from(this.snapshots.values());
    snapshots.sort((a, b) => b.actionIndex - a.actionIndex);

    if (beforeIndex !== undefined) {
      const validSnapshots = snapshots.filter(
        (s) => s.actionIndex <= beforeIndex,
      );
      return validSnapshots.length > 0 ? validSnapshots[0] : undefined;
    }

    return snapshots.length > 0 ? snapshots[0] : undefined;
  }

  /**
   * 删除指定索引之后的所有动作
   * @param index 索引位置
   */
  truncateActionsAfter(index: number): void {
    const actionsToRemove = this.actionOrder.slice(index + 1);

    for (const actionId of actionsToRemove) {
      const action = this.actions.get(actionId);
      if (action) {
        this.memoryUsage -= this.estimateActionSize(action);
        this.actions.delete(actionId);
      }
    }

    this.actionOrder = this.actionOrder.slice(0, index + 1);

    // 清理无效的快照
    this.cleanupInvalidSnapshots();
  }

  /**
   * 清空所有历史记录
   */
  clear(): void {
    this.actions.clear();
    this.snapshots.clear();
    this.actionOrder = [];
    this.memoryUsage = 0;
  }

  /**
   * 获取存储统计信息
   * @returns 存储统计信息
   */
  getStats() {
    return {
      totalActions: this.actions.size,
      totalSnapshots: this.snapshots.size,
      memoryUsage: this.memoryUsage,
      memoryUsageMB: this.memoryUsage / (1024 * 1024),
      averageActionSize:
        this.actions.size > 0 ? this.memoryUsage / this.actions.size : 0,
      compressionEnabled: this.compressionConfig.enabled,
      oldestActionTime: this.getOldestActionTime(),
      newestActionTime: this.getNewestActionTime(),
    };
  }

  /**
   * 估算动作的内存占用
   * @param action 历史动作
   * @returns 内存大小(bytes)
   */
  private estimateActionSize(action: HistoryAction): number {
    // 基础对象大小
    let size = 200; // 基础HistoryAction对象

    // 动作ID
    size += action.id.length * 2;

    // 变化数组
    size += action.changes.length * 100; // 每个变化约100bytes

    // 分片ID集合
    size += action.tileIds.size * 20; // 每个分片ID约20bytes

    return size;
  }

  /**
   * 检查是否需要清理内存
   * @param newActionSize 新动作的大小
   * @returns 是否需要清理
   */
  private shouldCleanupMemory(newActionSize: number): boolean {
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    return this.memoryUsage + newActionSize > maxMemoryBytes;
  }

  /**
   * 清理旧的动作
   */
  private cleanupOldActions(): void {
    const targetMemory = this.config.maxMemoryMB * 1024 * 1024 * 0.8; // 清理到80%

    while (this.memoryUsage > targetMemory && this.actionOrder.length > 1) {
      const oldestActionId = this.actionOrder.shift();
      if (oldestActionId) {
        const action = this.actions.get(oldestActionId);
        if (action) {
          this.memoryUsage -= this.estimateActionSize(action);
          this.actions.delete(oldestActionId);
        }
      }
    }
  }

  /**
   * 检查是否需要创建快照
   * @returns 是否需要创建快照
   */
  private shouldCreateSnapshot(): boolean {
    return this.actionOrder.length % this.config.snapshotInterval === 0;
  }

  /**
   * 创建快照点标记
   */
  private createSnapshotPoint(): void {
    // 这里只是标记需要创建快照，实际快照创建由上层调用
    // 因为需要访问当前的画布状态
  }

  /**
   * 强制执行动作数量限制
   */
  private enforceActionLimit(): void {
    while (this.actionOrder.length > this.config.maxActions) {
      const oldestActionId = this.actionOrder.shift();
      if (oldestActionId) {
        const action = this.actions.get(oldestActionId);
        if (action) {
          this.memoryUsage -= this.estimateActionSize(action);
          this.actions.delete(oldestActionId);
        }
      }
    }
  }

  /**
   * 压缩快照
   * @param snapshot 原始快照
   * @returns 压缩后的快照
   */
  private compressSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
    // 简化版本：这里可以实现实际的压缩算法
    // 暂时返回原始快照
    return snapshot;
  }

  /**
   * 解压快照
   * @param snapshot 压缩的快照
   * @returns 解压后的快照
   */
  private decompressSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
    // 简化版本：这里可以实现实际的解压算法
    // 暂时返回原始快照
    return snapshot;
  }

  /**
   * 检查快照是否被压缩
   * @param snapshot 快照
   * @returns 是否被压缩
   */
  private isCompressed(snapshot: HistorySnapshot): boolean {
    // 简化版本：实际实现中可以添加压缩标记
    return false;
  }

  /**
   * 清理无效的快照
   */
  private cleanupInvalidSnapshots(): void {
    const maxActionIndex = this.actionOrder.length - 1;
    const snapshotsToRemove: string[] = [];

    for (const [snapshotId, snapshot] of this.snapshots) {
      if (snapshot.actionIndex > maxActionIndex) {
        snapshotsToRemove.push(snapshotId);
      }
    }

    for (const snapshotId of snapshotsToRemove) {
      const snapshot = this.snapshots.get(snapshotId);
      if (snapshot) {
        this.memoryUsage -= snapshot.memorySize;
        this.snapshots.delete(snapshotId);
      }
    }
  }

  /**
   * 获取最旧动作的时间
   * @returns 时间戳或undefined
   */
  private getOldestActionTime(): number | undefined {
    if (this.actionOrder.length === 0) return undefined;
    const oldestId = this.actionOrder[0];
    const oldestAction = this.actions.get(oldestId);
    return oldestAction?.startTime;
  }

  /**
   * 获取最新动作的时间
   * @returns 时间戳或undefined
   */
  private getNewestActionTime(): number | undefined {
    if (this.actionOrder.length === 0) return undefined;
    const newestId = this.actionOrder[this.actionOrder.length - 1];
    const newestAction = this.actions.get(newestId);
    return newestAction?.startTime;
  }

  /**
   * 处理错误
   * @param code 错误代码
   * @param message 错误信息
   * @param actionId 相关动作ID
   */
  private handleError(code: string, message: string, actionId?: string): void {
    const error: HistoryError = {
      code,
      message,
      actionId,
      timestamp: Date.now(),
    };

    console.error('HistoryStorage Error:', error);
    // 这里可以添加错误报告机制
  }
}
