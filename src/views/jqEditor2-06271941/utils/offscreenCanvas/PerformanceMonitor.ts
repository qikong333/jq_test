/**
 * 性能监控器
 * 监控 OffscreenCanvas 渲染性能和系统资源使用情况
 */

export interface PerformanceMetrics {
  cpuUsage: number; // CPU 使用率百分比
  memoryUsage: number; // 内存使用量 (MB)
  renderTime: number; // 渲染时间 (ms)
  frameRate: number; // 帧率 (FPS)
  queueLength: number; // 渲染队列长度
  timestamp: number; // 时间戳
}

export interface PerformanceThresholds {
  maxCpuUsage: number; // 最大 CPU 使用率
  maxMemoryUsage: number; // 最大内存使用量
  maxRenderTime: number; // 最大渲染时间
  minFrameRate: number; // 最小帧率
}

export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'render-time' | 'frame-rate';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private isMonitoring = false;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100; // 保留最近100个指标
  private monitoringInterval: number | null = null;
  private frameTimeHistory: number[] = [];
  private lastFrameTime = 0;
  private renderTimeHistory: number[] = [];

  // 性能阈值
  private thresholds: PerformanceThresholds = {
    maxCpuUsage: 80, // 80%
    maxMemoryUsage: 512, // 512MB
    maxRenderTime: 16, // 16ms (60fps)
    minFrameRate: 30, // 30fps
  };

  // 回调函数
  public onPerformanceAlert: ((alert: PerformanceAlert) => void) | null = null;
  public onMetricsUpdate: ((metrics: PerformanceMetrics) => void) | null = null;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }
  }

  /**
   * 开始性能监控
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // 每秒收集一次性能指标
    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, 1000);

    // console.log('性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // console.log('性能监控已停止');
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      cpuUsage: this.estimateCpuUsage(),
      memoryUsage: this.getMemoryUsage(),
      renderTime: this.getAverageRenderTime(),
      frameRate: this.calculateFrameRate(),
      queueLength: 0, // 这个值需要从外部设置
      timestamp: Date.now(),
    };

    // 添加到历史记录
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // 检查性能阈值
    this.checkThresholds(metrics);

    // 触发回调
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(metrics);
    }
  }

  /**
   * 估算 CPU 使用率
   */
  private estimateCpuUsage(): number {
    // 由于浏览器限制，无法直接获取 CPU 使用率
    // 这里使用渲染时间和帧率来估算
    const avgRenderTime = this.getAverageRenderTime();
    const frameRate = this.calculateFrameRate();

    // 简单的估算公式
    const cpuEstimate = Math.min(100, (avgRenderTime / 16.67) * 100); // 基于60fps的理想时间
    const frameRateImpact = Math.max(0, ((60 - frameRate) / 60) * 50); // 帧率影响

    return Math.min(100, cpuEstimate + frameRateImpact);
  }

  /**
   * 获取内存使用量
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / (1024 * 1024); // 转换为 MB
    }

    // 如果无法获取内存信息，返回估算值
    return this.estimateMemoryUsage();
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    // 基于历史数据和渲染复杂度的简单估算
    const baseMemory = 50; // 基础内存使用量 (MB)
    const renderComplexity = this.getAverageRenderTime() / 16.67; // 渲染复杂度

    return baseMemory + renderComplexity * 10;
  }

  /**
   * 获取平均渲染时间
   */
  private getAverageRenderTime(): number {
    if (this.renderTimeHistory.length === 0) {
      return 0;
    }

    const sum = this.renderTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.renderTimeHistory.length;
  }

  /**
   * 计算帧率
   */
  private calculateFrameRate(): number {
    if (this.frameTimeHistory.length < 2) {
      return 60; // 默认值
    }

    const recentFrames = this.frameTimeHistory.slice(-10); // 最近10帧
    const totalTime = recentFrames[recentFrames.length - 1] - recentFrames[0];
    const frameCount = recentFrames.length - 1;

    if (totalTime === 0) return 60;

    return Math.round(1000 / (totalTime / frameCount));
  }

  /**
   * 记录帧时间
   */
  recordFrameTime(): void {
    const now = performance.now();
    this.frameTimeHistory.push(now);

    // 保留最近50帧的数据
    if (this.frameTimeHistory.length > 50) {
      this.frameTimeHistory.shift();
    }
  }

  /**
   * 记录渲染时间
   */
  recordRenderTime(renderTime: number): void {
    this.renderTimeHistory.push(renderTime);

    // 保留最近50次渲染的数据
    if (this.renderTimeHistory.length > 50) {
      this.renderTimeHistory.shift();
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    // 检查 CPU 使用率
    if (metrics.cpuUsage > this.thresholds.maxCpuUsage) {
      this.triggerAlert({
        type: 'cpu',
        severity:
          metrics.cpuUsage > this.thresholds.maxCpuUsage * 1.2
            ? 'critical'
            : 'warning',
        message: `CPU 使用率过高: ${metrics.cpuUsage.toFixed(1)}%`,
        value: metrics.cpuUsage,
        threshold: this.thresholds.maxCpuUsage,
        timestamp: metrics.timestamp,
      });
    }

    // 检查内存使用量
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.triggerAlert({
        type: 'memory',
        severity:
          metrics.memoryUsage > this.thresholds.maxMemoryUsage * 1.2
            ? 'critical'
            : 'warning',
        message: `内存使用量过高: ${metrics.memoryUsage.toFixed(1)}MB`,
        value: metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: metrics.timestamp,
      });
    }

    // 检查渲染时间
    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      this.triggerAlert({
        type: 'render-time',
        severity:
          metrics.renderTime > this.thresholds.maxRenderTime * 2
            ? 'critical'
            : 'warning',
        message: `渲染时间过长: ${metrics.renderTime.toFixed(1)}ms`,
        value: metrics.renderTime,
        threshold: this.thresholds.maxRenderTime,
        timestamp: metrics.timestamp,
      });
    }

    // 检查帧率
    if (metrics.frameRate < this.thresholds.minFrameRate) {
      this.triggerAlert({
        type: 'frame-rate',
        severity:
          metrics.frameRate < this.thresholds.minFrameRate * 0.5
            ? 'critical'
            : 'warning',
        message: `帧率过低: ${metrics.frameRate}fps`,
        value: metrics.frameRate,
        threshold: this.thresholds.minFrameRate,
        timestamp: metrics.timestamp,
      });
    }
  }

  /**
   * 触发性能警报
   */
  private triggerAlert(alert: PerformanceAlert): void {
    console.warn('性能警报:', alert);

    if (this.onPerformanceAlert) {
      this.onPerformanceAlert(alert);
    }
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        renderTime: 0,
        frameRate: 60,
        queueLength: 0,
        timestamp: Date.now(),
      };
    }

    return this.metrics[this.metrics.length - 1];
  }

  /**
   * 获取性能历史
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    if (this.metrics.length === 0) {
      return null;
    }

    const cpuValues = this.metrics.map((m) => m.cpuUsage);
    const memoryValues = this.metrics.map((m) => m.memoryUsage);
    const renderTimeValues = this.metrics.map((m) => m.renderTime);
    const frameRateValues = this.metrics.map((m) => m.frameRate);

    return {
      cpu: {
        avg: this.average(cpuValues),
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
      },
      memory: {
        avg: this.average(memoryValues),
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
      },
      renderTime: {
        avg: this.average(renderTimeValues),
        min: Math.min(...renderTimeValues),
        max: Math.max(...renderTimeValues),
      },
      frameRate: {
        avg: this.average(frameRateValues),
        min: Math.min(...frameRateValues),
        max: Math.max(...frameRateValues),
      },
    };
  }

  /**
   * 计算平均值
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 更新性能阈值
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 获取性能阈值
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * 重置性能数据
   */
  reset(): void {
    this.metrics = [];
    this.frameTimeHistory = [];
    this.renderTimeHistory = [];
    this.lastFrameTime = performance.now();
  }

  /**
   * 设置队列长度（由外部调用）
   */
  setQueueLength(length: number): void {
    if (this.metrics.length > 0) {
      this.metrics[this.metrics.length - 1].queueLength = length;
    }
  }

  /**
   * 获取性能建议
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const current = this.getCurrentMetrics();
    const stats = this.getPerformanceStats();

    if (!stats) return recommendations;

    if (stats.cpu.avg > 70) {
      recommendations.push('CPU 使用率较高，建议降低渲染质量或减少并发任务');
    }

    if (stats.memory.avg > 400) {
      recommendations.push('内存使用量较高，建议清理缓存或减少图像尺寸');
    }

    if (stats.renderTime.avg > 20) {
      recommendations.push('渲染时间较长，建议优化渲染算法或使用降级策略');
    }

    if (stats.frameRate.avg < 40) {
      recommendations.push('帧率较低，建议启用性能优化模式');
    }

    if (current.queueLength > 10) {
      recommendations.push('渲染队列积压，建议暂停新任务或清理队列');
    }

    return recommendations;
  }
}
