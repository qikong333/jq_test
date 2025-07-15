// ========== 鼠标事件类型 ==========
export interface MouseEventData {
  clientX: number;
  clientY: number;
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  timestamp: number;
}

// ========== 绘制事件 ==========
export interface DrawEvent {
  type: 'start' | 'move' | 'end';
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  color: string;
  brushSize: number;
  timestamp: number;
}

// ========== 事件处理器配置 ==========
export interface EventHandlerConfig {
  throttleMs: number; // 节流间隔
  debounceMs: number; // 防抖间隔
  batchSize: number; // 批处理大小
  maxQueueSize: number; // 最大队列大小
  enableBatching: boolean; // 启用批处理
}

// ========== 事件队列项 ==========
export interface EventQueueItem {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  priority: number;
  processed: boolean;
}

// ========== 事件统计 ==========
export interface EventStats {
  totalEvents: number; // 总事件数
  processedEvents: number; // 已处理事件数
  droppedEvents: number; // 丢弃事件数
  averageLatency: number; // 平均延迟
  queueSize: number; // 当前队列大小
  throughput: number; // 吞吐量(events/s)
}

// ========== 键盘事件 ==========
export interface KeyboardEventData {
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  repeat: boolean;
}
