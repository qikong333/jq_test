// ========== 历史记录核心类型定义 ==========

/**
 * 历史记录变化项
 * 记录单个格子的颜色变化
 */
export interface HistoryChange {
  x: number; // 格子X坐标
  y: number; // 格子Y坐标
  oldColor: string; // 原始颜色
  newColor: string; // 新颜色
  timestamp: number; // 变化时间戳
}

/**
 * 历史记录动作
 * 表示一次完整的用户操作（如一次绘制动作）
 */
export interface HistoryAction {
  id: string; // 唯一标识符
  type: 'draw' | 'erase' | 'fill' | 'clear' | 'move'; // 操作类型
  changes: HistoryChange[]; // 变化列表
  startTime: number; // 动作开始时间
  endTime: number; // 动作结束时间
  tileIds: Set<string>; // 影响的分片ID集合
}

/**
 * 快照节点
 * 存储特定时间点的完整画布状态
 */
export interface HistorySnapshot {
  id: string; // 快照ID
  actionIndex: number; // 对应的动作索引
  gridData: Map<string, string>; // 完整网格数据副本
  timestamp: number; // 快照时间
  memorySize: number; // 内存占用估算(bytes)
}

/**
 * 分片历史记录
 * 管理单个分片的历史信息
 */
export interface TileHistory {
  tileId: string; // 分片ID (格式: "x_y")
  x: number; // 分片起始X坐标
  y: number; // 分片起始Y坐标
  size: number; // 分片尺寸
  actions: string[]; // 影响此分片的动作ID列表
  lastModified: number; // 最后修改时间
}

/**
 * 内存配置
 * 控制历史记录的内存使用策略
 */
export interface MemoryConfig {
  maxActions: number; // 最大动作数量 (默认50)
  maxMemoryMB: number; // 最大内存限制 (默认100MB)
  snapshotInterval: number; // 快照间隔 (默认10个动作)
  tileSize: number; // 分片大小 (默认512)
  maxTiles: number; // 最大活跃分片数 (默认100)
}

/**
 * 历史记录状态
 * 表示当前历史记录系统的状态
 */
export interface HistoryState {
  currentIndex: number; // 当前历史索引
  canUndo: boolean; // 是否可撤销
  canRedo: boolean; // 是否可重做
  totalActions: number; // 总动作数
  memoryUsage: number; // 当前内存使用量(MB)
  activeOperation: boolean; // 是否正在进行操作
}

/**
 * 历史记录统计
 * 提供详细的历史记录统计信息
 */
export interface HistoryStats {
  totalActions: number; // 总动作数
  totalChanges: number; // 总变化数
  memoryUsage: number; // 内存使用量(MB)
  activeTiles: number; // 活跃分片数
  averageActionSize: number; // 平均动作大小(bytes)
  snapshotCount: number; // 快照数量
  lastActionTime: number; // 最后操作时间
}

/**
 * 历史记录操作结果
 * 撤销/重做操作的返回结果
 */
export interface HistoryOperationResult {
  success: boolean; // 操作是否成功
  actionId?: string; // 相关动作ID
  changesApplied: number; // 应用的变化数量
  timeTaken: number; // 操作耗时(ms)
  memoryUsed: number; // 内存使用量(bytes)
}

/**
 * 历史记录错误类型
 */
export interface HistoryError {
  code: string; // 错误代码
  message: string; // 错误信息
  actionId?: string; // 相关动作ID
  timestamp: number; // 错误发生时间
}

/**
 * 分片坐标信息
 */
export interface TileCoordinate {
  tileX: number; // 分片X坐标
  tileY: number; // 分片Y坐标
  localX: number; // 分片内局部X坐标
  localY: number; // 分片内局部Y坐标
}

/**
 * 历史记录压缩配置
 */
export interface CompressionConfig {
  enabled: boolean; // 是否启用压缩
  algorithm: 'lz4' | 'gzip' | 'none'; // 压缩算法
  threshold: number; // 压缩阈值(bytes)
  level: number; // 压缩级别(1-9)
}

/**
 * 历史记录性能指标
 */
export interface HistoryPerformance {
  averageRecordTime: number; // 平均记录时间(ms)
  averageUndoTime: number; // 平均撤销时间(ms)
  averageRedoTime: number; // 平均重做时间(ms)
  memoryEfficiency: number; // 内存效率(0-1)
  compressionRatio: number; // 压缩比例(0-1)
}
