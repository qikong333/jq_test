import { ref, computed, reactive } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type {
  HistoryAction,
  HistoryChange,
  HistorySnapshot,
  HistoryState,
  HistoryStats,
  HistoryOperationResult,
  MemoryConfig,
  CompressionConfig,
} from '../types/history';
import { TileManager } from '../classes/TileManager';
import { HistoryStorage } from '../classes/HistoryStorage';
import type { CompressedGridStorage } from '../classes/GridStorage';

/**
 * 历史记录管理Composable返回接口
 */
export interface UseHistoryReturn {
  // 状态
  historyState: Ref<HistoryState>;
  historyStats: Ref<HistoryStats>;

  // 操作方法
  startAction: (type: HistoryAction['type']) => void;
  recordChange: (
    x: number,
    y: number,
    oldColor: string,
    newColor: string,
  ) => void;
  finishAction: () => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;

  // 管理方法
  clear: () => void;
  createSnapshot: () => void;
  optimizeMemory: () => void;

  // 工具方法
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  getMemoryUsage: () => number;
  getActionHistory: () => HistoryAction[];
}

/**
 * 历史记录管理Composable
 * 为jqEditor2提供独立的撤销重做功能
 *
 * @param gridStorage 网格存储实例
 * @param canvasWidth 画布宽度
 * @param canvasHeight 画布高度
 * @param config 内存配置
 */
export function useHistory(
  gridStorage: Ref<CompressedGridStorage | undefined>,
  canvasWidth: number,
  canvasHeight: number,
  config?: Partial<MemoryConfig>,
): UseHistoryReturn {
  // ========== 配置初始化 ==========
  const defaultConfig: MemoryConfig = {
    maxActions: 50,
    maxMemoryMB: 100,
    snapshotInterval: 10,
    tileSize: 512,
    maxTiles: 100,
  };

  const memoryConfig = { ...defaultConfig, ...config };

  const compressionConfig: CompressionConfig = {
    enabled: false,
    algorithm: 'none',
    threshold: 1024 * 1024, // 1MB
    level: 6,
  };

  // ========== 核心实例 ==========
  const tileManager = new TileManager(canvasWidth, canvasHeight, memoryConfig);
  const historyStorage = new HistoryStorage(memoryConfig, compressionConfig);

  // ========== 状态管理 ==========
  const currentActionIndex = ref(-1);
  const currentAction = ref<HistoryAction | null>(null);
  const pendingChanges = ref<HistoryChange[]>([]);
  const isRecording = ref(false);

  // 历史记录状态
  const historyState = ref<HistoryState>({
    currentIndex: -1,
    canUndo: false,
    canRedo: false,
    totalActions: 0,
    memoryUsage: 0,
    activeOperation: false,
  });

  // 历史记录统计
  const historyStats = ref<HistoryStats>({
    totalActions: 0,
    totalChanges: 0,
    memoryUsage: 0,
    activeTiles: 0,
    averageActionSize: 0,
    snapshotCount: 0,
    lastActionTime: 0,
  });

  // ========== 计算属性 ==========
  const canUndo = computed(() => historyState.value.canUndo);
  const canRedo = computed(() => historyState.value.canRedo);

  // ========== 核心方法 ==========

  /**
   * 开始记录历史动作
   * @param type 动作类型
   */
  const startAction = (type: HistoryAction['type']): void => {
    if (isRecording.value) {
      console.warn(
        'History: Action already in progress, finishing previous action',
      );
      finishAction();
    }

    const actionId = generateActionId();
    const startTime = Date.now();

    currentAction.value = {
      id: actionId,
      type,
      changes: [],
      startTime,
      endTime: startTime,
      tileIds: new Set(),
    };

    pendingChanges.value = [];
    isRecording.value = true;
    historyState.value.activeOperation = true;

    console.log(`History: Started ${type} action ${actionId}`);
  };

  /**
   * 记录单个格子的变化
   * @param x 格子X坐标
   * @param y 格子Y坐标
   * @param oldColor 原始颜色
   * @param newColor 新颜色
   */
  const recordChange = (
    x: number,
    y: number,
    oldColor: string,
    newColor: string,
  ): void => {
    if (!isRecording.value || !currentAction.value) {
      console.warn('History: No active action to record change');
      return;
    }

    // 跳过无效变化
    if (oldColor === newColor) {
      return;
    }

    const change: HistoryChange = {
      x,
      y,
      oldColor,
      newColor,
      timestamp: Date.now(),
    };

    pendingChanges.value.push(change);

    // 记录影响的分片
    const tileId = tileManager.getTileId(x, y);
    currentAction.value.tileIds.add(tileId);

    // 批量处理变化（性能优化）
    if (pendingChanges.value.length >= 100) {
      flushPendingChanges();
    }
  };

  /**
   * 完成当前历史动作
   */
  const finishAction = (): void => {
    if (!isRecording.value || !currentAction.value) {
      return;
    }

    // 刷新待处理的变化
    flushPendingChanges();

    // 完成动作
    currentAction.value.endTime = Date.now();

    // 只有在有实际变化时才存储
    if (currentAction.value.changes.length > 0) {
      // 清理后续历史记录（分支操作）
      if (currentActionIndex.value < historyStats.value.totalActions - 1) {
        historyStorage.truncateActionsAfter(currentActionIndex.value);
      }

      // 存储动作
      const success = historyStorage.storeAction(currentAction.value);

      if (success) {
        // 更新分片管理器
        for (const tileId of currentAction.value.tileIds) {
          tileManager.addActionToTile(tileId, currentAction.value.id);
        }

        // 更新索引
        currentActionIndex.value++;

        // 检查是否需要创建快照
        if (currentActionIndex.value % memoryConfig.snapshotInterval === 0) {
          createSnapshot();
        }

        console.log(
          `History: Finished action ${currentAction.value.id} with ${currentAction.value.changes.length} changes`,
        );
      } else {
        console.error('History: Failed to store action');
      }
    }

    // 重置状态
    currentAction.value = null;
    pendingChanges.value = [];
    isRecording.value = false;
    historyState.value.activeOperation = false;

    // 更新状态
    updateHistoryState();
  };

  /**
   * 撤销操作
   */
  const undo = async (): Promise<boolean> => {
    if (!canUndo.value || !gridStorage.value) {
      return false;
    }

    const startTime = Date.now();
    let changesApplied = 0;

    try {
      // 如果有正在进行的操作，先完成它
      if (isRecording.value) {
        finishAction();
      }

      // 获取要撤销的动作
      const actionIndex = currentActionIndex.value;
      const action = historyStorage.getActionRange(
        actionIndex,
        actionIndex + 1,
      )[0];

      if (!action) {
        return false;
      }

      // 反向应用变化
      for (const change of action.changes.reverse()) {
        gridStorage.value.setCell(change.x, change.y, change.oldColor);
        changesApplied++;
      }

      // 更新索引
      currentActionIndex.value--;

      // 更新状态
      updateHistoryState();

      const timeTaken = Date.now() - startTime;
      console.log(
        `History: Undo completed in ${timeTaken}ms, applied ${changesApplied} changes`,
      );

      return true;
    } catch (error) {
      console.error('History: Undo failed:', error);
      return false;
    }
  };

  /**
   * 重做操作
   */
  const redo = async (): Promise<boolean> => {
    if (!canRedo.value || !gridStorage.value) {
      return false;
    }

    const startTime = Date.now();
    let changesApplied = 0;

    try {
      // 获取要重做的动作
      const actionIndex = currentActionIndex.value + 1;
      const action = historyStorage.getActionRange(
        actionIndex,
        actionIndex + 1,
      )[0];

      if (!action) {
        return false;
      }

      // 正向应用变化
      for (const change of action.changes) {
        gridStorage.value.setCell(change.x, change.y, change.newColor);
        changesApplied++;
      }

      // 更新索引
      currentActionIndex.value++;

      // 更新状态
      updateHistoryState();

      const timeTaken = Date.now() - startTime;
      console.log(
        `History: Redo completed in ${timeTaken}ms, applied ${changesApplied} changes`,
      );

      return true;
    } catch (error) {
      console.error('History: Redo failed:', error);
      return false;
    }
  };

  /**
   * 创建快照
   */
  const createSnapshot = (): void => {
    if (!gridStorage.value) {
      return;
    }

    try {
      const snapshotId = generateSnapshotId();
      const gridData = gridStorage.value.exportData();

      const snapshot: HistorySnapshot = {
        id: snapshotId,
        actionIndex: currentActionIndex.value,
        gridData,
        timestamp: Date.now(),
        memorySize: estimateGridDataSize(gridData),
      };

      historyStorage.storeSnapshot(snapshot);
      console.log(
        `History: Created snapshot ${snapshotId} at action ${currentActionIndex.value}`,
      );
    } catch (error) {
      console.error('History: Failed to create snapshot:', error);
    }
  };

  /**
   * 清空历史记录
   */
  const clear = (): void => {
    // 如果有正在进行的操作，先完成它
    if (isRecording.value) {
      finishAction();
    }

    historyStorage.clear();
    tileManager.clear();
    currentActionIndex.value = -1;
    currentAction.value = null;
    pendingChanges.value = [];
    isRecording.value = false;

    updateHistoryState();
    console.log('History: Cleared all history records');
  };

  /**
   * 优化内存使用
   */
  const optimizeMemory = (): void => {
    const beforeStats = historyStorage.getStats();

    // 这里可以实现具体的内存优化逻辑
    // 例如：压缩旧的快照、清理不活跃的分片等

    const afterStats = historyStorage.getStats();
    console.log(
      `History: Memory optimization completed, saved ${
        beforeStats.memoryUsageMB - afterStats.memoryUsageMB
      }MB`,
    );
  };

  /**
   * 获取内存使用量
   */
  const getMemoryUsage = (): number => {
    return historyStorage.getStats().memoryUsageMB;
  };

  /**
   * 获取动作历史
   */
  const getActionHistory = (): HistoryAction[] => {
    return historyStorage.getActionRange(0, currentActionIndex.value + 1);
  };

  // ========== 辅助方法 ==========

  /**
   * 刷新待处理的变化
   */
  const flushPendingChanges = (): void => {
    if (!currentAction.value || pendingChanges.value.length === 0) {
      return;
    }

    currentAction.value.changes.push(...pendingChanges.value);
    pendingChanges.value = [];
  };

  /**
   * 更新历史记录状态
   */
  const updateHistoryState = (): void => {
    const storageStats = historyStorage.getStats();
    const tileStats = tileManager.getStats();

    historyState.value = {
      currentIndex: currentActionIndex.value,
      canUndo: currentActionIndex.value >= 0,
      canRedo: currentActionIndex.value < storageStats.totalActions - 1,
      totalActions: storageStats.totalActions,
      memoryUsage: storageStats.memoryUsageMB,
      activeOperation: isRecording.value,
    };

    historyStats.value = {
      totalActions: storageStats.totalActions,
      totalChanges: getActionHistory().reduce(
        (sum, action) => sum + action.changes.length,
        0,
      ),
      memoryUsage: storageStats.memoryUsageMB,
      activeTiles: tileStats.totalTiles,
      averageActionSize: storageStats.averageActionSize,
      snapshotCount: storageStats.totalSnapshots,
      lastActionTime: storageStats.newestActionTime || 0,
    };
  };

  /**
   * 生成动作ID
   */
  const generateActionId = (): string => {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * 生成快照ID
   */
  const generateSnapshotId = (): string => {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * 估算网格数据大小
   */
  const estimateGridDataSize = (gridData: Map<string, string>): number => {
    let size = 0;
    for (const [key, value] of gridData) {
      size += (key.length + value.length) * 2; // 字符串在内存中的大概大小
    }
    return size;
  };

  // ========== 初始化 ==========
  updateHistoryState();

  return {
    // 状态
    historyState,
    historyStats,

    // 操作方法
    startAction,
    recordChange,
    finishAction,
    undo,
    redo,

    // 管理方法
    clear,
    createSnapshot,
    optimizeMemory,

    // 工具方法
    canUndo,
    canRedo,
    getMemoryUsage,
    getActionHistory,
  };
}
