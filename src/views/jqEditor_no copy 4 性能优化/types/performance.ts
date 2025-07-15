// ========== 性能级别 ==========
import type { GridCoordinate } from './grid';

export type PerformanceLevel = 'high' | 'medium' | 'low' | 'critical';

// ========== 性能指标 ==========
export interface PerformanceMetrics {
  fps: number; // 帧率
  frameTime: number; // 帧时间(ms)
  memoryUsage: number; // 内存使用量(MB)
  cpuUsage: number; // CPU使用率(%)
  renderTime: number; // 渲染时间(ms)
  eventLatency: number; // 事件延迟(ms)
}

// ========== 性能配置 ==========
export interface PerformanceConfig {
  level: PerformanceLevel; // 性能等级
  eventThrottling: number; // 事件节流间隔(ms)
  batchSize: number; // 批处理大小
  cacheSize: number; // 缓存大小
  enableGrid: boolean; // 启用网格
  enablePreview: boolean; // 启用预览
  enableAnimation: boolean; // 启用动画
  maxMemoryMB: number; // 最大内存限制(MB)
}

// ========== 性能监控配置 ==========
export interface MonitorConfig {
  interval: number; // 监控间隔(ms)
  historySize: number; // 历史数据大小
  warningThresholds: {
    fps: number;
    memoryMB: number;
    frameTimeMs: number;
  };
  criticalThresholds: {
    fps: number;
    memoryMB: number;
    frameTimeMs: number;
  };
}

// ========== 性能警告 ==========
export interface PerformanceWarning {
  level: PerformanceLevel;
  message: string;
  suggestion: string;
  timestamp: number;
  metrics: PerformanceMetrics;
}

// ========== 缓存系统 ==========
export interface CoordinateCacheEntry {
  key: string;
  result: GridCoordinate;
  timestamp: number;
}

export interface CacheConfig {
  maxSize: number;
  ttl: number; // 缓存生存时间（毫秒）
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

// ========== 颜色池系统 ==========
export interface ColorPoolStats {
  totalColors: number;
  memoryUsage: number;
  hitRate: number;
}

// ========== Canvas状态缓存 ==========
export interface CanvasStateCache {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
}

// ========== 脏区域 ==========
export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ========== 批量渲染 ==========
export interface BatchRenderItem {
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ========== 内存管理 ==========
export interface MemoryStats {
  usedJSHeapSize: number; // 已使用堆内存
  totalJSHeapSize: number; // 总堆内存
  jsHeapSizeLimit: number; // 堆内存限制
  canvasMemory: number; // Canvas占用内存估算
  cacheMemory: number; // 缓存占用内存
}

// ========== 性能优化建议 ==========
export interface OptimizationSuggestion {
  type: 'memory' | 'cpu' | 'render' | 'event';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
}
