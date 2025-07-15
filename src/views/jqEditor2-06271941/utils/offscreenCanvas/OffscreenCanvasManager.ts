/**
 * OffscreenCanvas 管理器
 * 负责管理 OffscreenCanvas 的生命周期和渲染协调
 */

import {
  compatibilityChecker,
  CompatibilityResult,
} from './CompatibilityChecker';
import { OffscreenRenderer } from './OffscreenRenderer';
import { RenderBridge } from './RenderBridge';
import { FallbackRenderer } from './FallbackRenderer';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface OffscreenCanvasConfig {
  width: number;
  height: number;
  enablePerformanceMonitoring: boolean;
  fallbackThreshold: number; // CPU 使用率阈值
  workerPath?: string;
}

export interface RenderTask {
  id: string;
  type: 'draw' | 'fill' | 'filter' | 'transform';
  data: any;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
}

export interface RenderResult {
  taskId: string;
  success: boolean;
  data?: ImageData | ImageBitmap;
  error?: string;
  performanceMetrics?: {
    renderTime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

export class OffscreenCanvasManager {
  private canvas: HTMLCanvasElement;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private renderer: OffscreenRenderer | FallbackRenderer;
  private bridge: RenderBridge;
  private performanceMonitor: PerformanceMonitor;
  private compatibilityResult: CompatibilityResult;
  private config: OffscreenCanvasConfig;
  private isInitialized = false;
  private renderQueue: RenderTask[] = [];
  private isProcessing = false;

  constructor(canvas: HTMLCanvasElement, config: OffscreenCanvasConfig) {
    this.canvas = canvas;
    this.config = config;
    this.compatibilityResult = compatibilityChecker.checkCompatibility();
    this.performanceMonitor = new PerformanceMonitor();
    this.bridge = new RenderBridge();

    // 根据兼容性选择渲染器
    if (this.compatibilityResult.isSupported) {
      this.renderer = new OffscreenRenderer(config);
    } else {
      this.renderer = new FallbackRenderer(canvas, config);
    }
  }

  /**
   * 初始化 OffscreenCanvas 管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 设置画布尺寸
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;

      if (this.compatibilityResult.isSupported) {
        // 创建 OffscreenCanvas
        this.offscreenCanvas = this.canvas.transferControlToOffscreen();
        await (this.renderer as OffscreenRenderer).initialize(
          this.offscreenCanvas,
        );
      } else {
        // 使用降级渲染器
        await (this.renderer as FallbackRenderer).initialize();
      }

      // 初始化性能监控
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.start();
      }

      // 设置渲染桥接
      this.bridge.onRenderComplete = this.handleRenderComplete.bind(this);
      this.bridge.onRenderError = this.handleRenderError.bind(this);

      this.isInitialized = true;
      // console.log('OffscreenCanvas 管理器初始化完成', {
      //   mode: this.compatibilityResult.isSupported
      //     ? 'OffscreenCanvas'
      //     : 'Fallback',
      //   compatibility: this.compatibilityResult,
      // });
    } catch (error) {
      console.error('OffscreenCanvas 管理器初始化失败:', error);
      // 降级到 FallbackRenderer
      if (!(this.renderer instanceof FallbackRenderer)) {
        this.renderer = new FallbackRenderer(this.canvas, this.config);
        await this.renderer.initialize();
        this.isInitialized = true;
      }
    }
  }

  /**
   * 添加渲染任务到队列
   */
  async queueRenderTask(
    task: Omit<RenderTask, 'id' | 'timestamp'>,
  ): Promise<string> {
    const renderTask: RenderTask = {
      ...task,
      id: this.generateTaskId(),
      timestamp: Date.now(),
    };

    // 根据优先级插入队列
    if (task.priority === 'high') {
      this.renderQueue.unshift(renderTask);
    } else {
      this.renderQueue.push(renderTask);
    }

    // 开始处理队列
    this.processRenderQueue();

    return renderTask.id;
  }

  /**
   * 处理渲染队列
   */
  private async processRenderQueue(): Promise<void> {
    if (this.isProcessing || this.renderQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.renderQueue.length > 0) {
      const task = this.renderQueue.shift()!;

      try {
        // 检查性能状态
        if (this.config.enablePerformanceMonitoring) {
          const metrics = this.performanceMonitor.getCurrentMetrics();
          if (metrics.cpuUsage > this.config.fallbackThreshold) {
            // CPU 使用率过高，降级处理
            await this.handleHighCpuUsage(task);
            continue;
          }
        }

        // 执行渲染任务
        await this.executeRenderTask(task);
      } catch (error) {
        console.error('渲染任务执行失败:', error);
        this.handleRenderError(task.id, error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 执行单个渲染任务
   */
  private async executeRenderTask(task: RenderTask): Promise<void> {
    const startTime = performance.now();

    try {
      let result: any;

      switch (task.type) {
        case 'draw':
          result = await this.renderer.draw(task.data);
          break;
        case 'fill':
          result = await this.renderer.fill(task.data);
          break;
        case 'filter':
          result = await this.renderer.applyFilter(task.data);
          break;
        case 'transform':
          result = await this.renderer.transform(task.data);
          break;
        default:
          throw new Error(`未知的渲染任务类型: ${task.type}`);
      }

      const renderTime = performance.now() - startTime;
      const metrics = this.config.enablePerformanceMonitoring
        ? this.performanceMonitor.getCurrentMetrics()
        : undefined;

      this.handleRenderComplete({
        taskId: task.id,
        success: true,
        data: result,
        performanceMetrics: metrics
          ? {
              renderTime,
              cpuUsage: metrics.cpuUsage,
              memoryUsage: metrics.memoryUsage,
            }
          : undefined,
      });
    } catch (error) {
      this.handleRenderError(task.id, error as Error);
    }
  }

  /**
   * 处理高 CPU 使用率情况
   */
  private async handleHighCpuUsage(task: RenderTask): Promise<void> {
    console.warn('CPU 使用率过高，降级处理渲染任务:', task.id);

    // 降低任务优先级或延迟处理
    if (task.priority === 'high') {
      task.priority = 'normal';
      this.renderQueue.push(task);
    } else {
      // 延迟处理
      setTimeout(() => {
        this.renderQueue.push(task);
        this.processRenderQueue();
      }, 100);
    }
  }

  /**
   * 处理渲染完成
   */
  private handleRenderComplete(result: RenderResult): void {
    this.bridge.notifyRenderComplete(result);
  }

  /**
   * 处理渲染错误
   */
  private handleRenderError(taskId: string, error: Error): void {
    const result: RenderResult = {
      taskId,
      success: false,
      error: error.message,
    };
    this.bridge.notifyRenderError(result);
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isOffscreenSupported: this.compatibilityResult.isSupported,
      queueLength: this.renderQueue.length,
      isProcessing: this.isProcessing,
      performanceMetrics: this.config.enablePerformanceMonitoring
        ? this.performanceMonitor.getCurrentMetrics()
        : null,
    };
  }

  /**
   * 清空渲染队列
   */
  clearQueue(): void {
    this.renderQueue = [];
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    this.clearQueue();

    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor.stop();
    }

    if (this.renderer) {
      await this.renderer.destroy();
    }

    this.bridge.destroy();
    this.isInitialized = false;
  }

  /**
   * 获取兼容性信息
   */
  getCompatibilityInfo(): CompatibilityResult {
    return this.compatibilityResult;
  }

  /**
   * 注册渲染完成回调
   */
  onRenderComplete(callback: (result: RenderResult) => void): void {
    this.bridge.onRenderComplete = callback;
  }

  /**
   * 注册渲染错误回调
   */
  onRenderError(callback: (result: RenderResult) => void): void {
    this.bridge.onRenderError = callback;
  }
}
