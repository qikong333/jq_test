import type { PerformanceMetrics, PerformanceConfig, PerformanceLevel } from '../types/performance';
import { getCoordinateCacheStats, clearCoordinateCache } from './coordinateUtils';
import { getColorPoolStats, clearColorPool } from './colorUtils';
import { getCanvasStateCache, resetCanvasStateCache } from '../composables/useCanvas';

/**
 * 性能监控器
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    renderTime: 0,
    eventLatency: 0
  };
  
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private isMonitoring = false;
  private monitoringInterval?: number;
  
  private config: PerformanceConfig = {
    level: 'medium',
    eventThrottling: 16,
    batchSize: 100,
    cacheSize: 1000,
    enableGrid: true,
    enablePreview: true,
    enableAnimation: true,
    maxMemoryMB: 100
  };

  /**
   * 开始性能监控
   */
  startMonitoring(interval: number = 1000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
    }, interval);
    
    // 开始FPS监控
    this.startFPSMonitoring();
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      coordinateCache: getCoordinateCacheStats(),
      colorPool: getColorPoolStats(),
      canvasState: getCanvasStateCache()
    };
  }

  /**
   * 清空所有缓存
   */
  clearAllCaches(): void {
    clearCoordinateCache();
    clearColorPool();
    resetCanvasStateCache();
  }

  /**
   * 记录渲染时间
   */
  recordRenderTime(startTime: number): void {
    const renderTime = performance.now() - startTime;
    this.metrics.renderTime = renderTime;
  }

  /**
   * 记录事件延迟
   */
  recordEventLatency(startTime: number): void {
    const latency = performance.now() - startTime;
    this.metrics.eventLatency = latency;
  }

  /**
   * 获取性能等级建议
   */
  getPerformanceLevelSuggestion(): PerformanceLevel {
    const { fps, memoryUsage, frameTime } = this.metrics;
    
    if (fps < 30 || memoryUsage > 80 || frameTime > 33) {
      return 'critical';
    } else if (fps < 45 || memoryUsage > 60 || frameTime > 22) {
      return 'low';
    } else if (fps < 55 || memoryUsage > 40 || frameTime > 18) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const { fps, memoryUsage, frameTime, eventLatency } = this.metrics;
    const cacheStats = this.getCacheStats();
    
    if (fps < 30) {
      suggestions.push('帧率过低，建议降低渲染质量或减少绘制元素');
    }
    
    if (memoryUsage > 70) {
      suggestions.push('内存使用过高，建议清理缓存或减少数据存储');
    }
    
    if (frameTime > 25) {
      suggestions.push('帧时间过长，建议优化渲染逻辑或启用批量绘制');
    }
    
    if (eventLatency > 50) {
      suggestions.push('事件响应延迟过高，建议增加事件节流间隔');
    }
    
    if (cacheStats.coordinateCache.hitRate < 0.7) {
      suggestions.push('坐标缓存命中率较低，建议调整缓存策略');
    }
    
    if (cacheStats.colorPool.hitRate < 0.8) {
      suggestions.push('颜色池命中率较低，建议检查颜色使用模式');
    }
    
    return suggestions;
  }

  private startFPSMonitoring(): void {
    const measureFPS = () => {
      if (!this.isMonitoring) return;
      
      const now = performance.now();
      const deltaTime = now - this.lastFrameTime;
      
      this.frameTimeHistory.push(deltaTime);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
      
      this.frameCount++;
      this.lastFrameTime = now;
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  private updateMetrics(): void {
    // 计算FPS
    if (this.frameTimeHistory.length > 0) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.metrics.fps = Math.round(1000 / avgFrameTime);
      this.metrics.frameTime = Math.round(avgFrameTime * 100) / 100;
    }
    
    // 估算内存使用
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      this.metrics.memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    
    // CPU使用率（简单估算）
    this.metrics.cpuUsage = Math.min(100, Math.max(0, (this.metrics.frameTime / 16.67) * 100));
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 开始性能监控
 */
export function startPerformanceMonitoring(interval?: number): void {
  performanceMonitor.startMonitoring(interval);
}

/**
 * 停止性能监控
 */
export function stopPerformanceMonitoring(): void {
  performanceMonitor.stopMonitoring();
}

/**
 * 获取性能报告
 */
export function getPerformanceReport() {
  return {
    metrics: performanceMonitor.getMetrics(),
    cacheStats: performanceMonitor.getCacheStats(),
    level: performanceMonitor.getPerformanceLevelSuggestion(),
    suggestions: performanceMonitor.getOptimizationSuggestions()
  };
}

/**
 * 清空所有性能缓存
 */
export function clearAllPerformanceCaches(): void {
  performanceMonitor.clearAllCaches();
}