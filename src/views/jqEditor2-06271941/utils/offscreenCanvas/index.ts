/**
 * OffscreenCanvas 工具库主入口
 * 导出所有相关的类、接口和工具函数
 */

// 导入用于内部函数使用
import { OffscreenCanvasManager } from './OffscreenCanvasManager';
import type { OffscreenCanvasConfig } from './OffscreenCanvasManager';
import type { CompatibilityResult } from './CompatibilityChecker';
import { compatibilityChecker } from './CompatibilityChecker';

// 兼容性检测
export {
  CompatibilityChecker,
  compatibilityChecker,
  type CompatibilityResult,
} from './CompatibilityChecker';

// 核心管理器
export {
  OffscreenCanvasManager,
  type OffscreenCanvasConfig,
  type RenderTask,
  type RenderResult,
} from './OffscreenCanvasManager';

// 渲染器
export {
  OffscreenRenderer,
  type DrawData,
  type FillData,
  type FilterData,
  type TransformData,
} from './OffscreenRenderer';

export { FallbackRenderer } from './FallbackRenderer';

// 通信桥接
export {
  RenderBridge,
  type BridgeMessage,
  type RenderRequest,
  type StatusUpdate,
} from './RenderBridge';

// 性能监控
export {
  PerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceThresholds,
} from './PerformanceMonitor';

// 工具函数和常量
export const OFFSCREEN_CANVAS_DEFAULTS = {
  width: 800,
  height: 600,
  enablePerformanceMonitoring: true,
  fallbackThreshold: 80,
} as const;

export const PERFORMANCE_THRESHOLDS = {
  maxCpuUsage: 80,
  maxMemoryUsage: 512,
  maxRenderTime: 16,
  minFrameRate: 30,
} as const;

/**
 * 创建 OffscreenCanvas 管理器的工厂函数
 */
export function createOffscreenCanvasManager(
  canvas: HTMLCanvasElement,
  config?: Partial<OffscreenCanvasConfig>,
): OffscreenCanvasManager {
  const finalConfig: OffscreenCanvasConfig = {
    ...OFFSCREEN_CANVAS_DEFAULTS,
    ...config,
  };

  return new OffscreenCanvasManager(canvas, finalConfig);
}

/**
 * 检查 OffscreenCanvas 支持情况的便捷函数
 */
export function checkOffscreenCanvasSupport(): CompatibilityResult {
  return compatibilityChecker.checkCompatibility();
}

/**
 * 获取推荐的配置基于当前环境
 */
export function getRecommendedConfig(
  canvasSize: { width: number; height: number },
  performanceLevel: 'low' | 'medium' | 'high' = 'medium',
): OffscreenCanvasConfig {
  const baseConfig = {
    width: canvasSize.width,
    height: canvasSize.height,
    enablePerformanceMonitoring: true,
  };

  switch (performanceLevel) {
    case 'low':
      return {
        ...baseConfig,
        fallbackThreshold: 60,
      };
    case 'medium':
      return {
        ...baseConfig,
        fallbackThreshold: 80,
      };
    case 'high':
      return {
        ...baseConfig,
        fallbackThreshold: 95,
      };
    default:
      return {
        ...baseConfig,
        fallbackThreshold: 80,
      };
  }
}

/**
 * 性能优化建议
 */
export const PERFORMANCE_TIPS = {
  highCpuUsage: [
    '降低渲染质量',
    '减少并发渲染任务',
    '启用渲染缓存',
    '使用降级渲染模式',
  ],
  highMemoryUsage: [
    '清理未使用的图像缓存',
    '减少图像分辨率',
    '限制历史记录数量',
    '启用内存回收',
  ],
  lowFrameRate: [
    '启用性能优化模式',
    '减少实时渲染频率',
    '使用防抖处理',
    '优化渲染算法',
  ],
  longRenderTime: [
    '分割大型渲染任务',
    '使用渐进式渲染',
    '启用多线程处理',
    '优化数据结构',
  ],
} as const;

/**
 * 错误类型定义
 */
export class OffscreenCanvasError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'OffscreenCanvasError';
  }
}

/**
 * 常见错误代码
 */
export const ERROR_CODES = {
  COMPATIBILITY_CHECK_FAILED: 'COMPATIBILITY_CHECK_FAILED',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  WORKER_CREATION_FAILED: 'WORKER_CREATION_FAILED',
  RENDER_TASK_FAILED: 'RENDER_TASK_FAILED',
  PERFORMANCE_THRESHOLD_EXCEEDED: 'PERFORMANCE_THRESHOLD_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
} as const;

/**
 * 调试工具
 */
class OffscreenCanvasDebugger {
  private static instance: OffscreenCanvasDebugger;
  private logs: Array<{
    timestamp: number;
    level: string;
    message: string;
    data?: any;
  }> = [];

  private maxLogs = 1000;

  static getInstance(): OffscreenCanvasDebugger {
    if (!OffscreenCanvasDebugger.instance) {
      OffscreenCanvasDebugger.instance = new OffscreenCanvasDebugger();
    }
    return OffscreenCanvasDebugger.instance;
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    const consoleMethod =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : console.log;
    consoleMethod(`[OffscreenCanvas] ${message}`, data || '');
  }

  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 导出调试器类和实例
export { OffscreenCanvasDebugger };
export const offscreenDebugger = OffscreenCanvasDebugger.getInstance();

/**
 * 版本信息
 */
export const VERSION = '1.0.0';

/**
 * 库信息
 */
export const LIBRARY_INFO = {
  name: 'OffscreenCanvas Utils',
  version: VERSION,
  description: 'OffscreenCanvas 渲染优化工具库',
  author: 'Canvas Editor Team',
  features: [
    'OffscreenCanvas 兼容性检测',
    '自动降级渲染',
    '性能监控和优化',
    '多线程渲染支持',
    '智能任务调度',
  ],
} as const;

/**
 * 打印库信息
 */
export function printLibraryInfo(): void {
  console.group(
    `%c${LIBRARY_INFO.name} v${LIBRARY_INFO.version}`,
    'color: #4CAF50; font-weight: bold;',
  );
  console.log(`%c${LIBRARY_INFO.description}`, 'color: #666;');
  console.log('功能特性:');
  LIBRARY_INFO.features.forEach((feature) => {
    console.log(`  • ${feature}`);
  });
  console.groupEnd();
}
