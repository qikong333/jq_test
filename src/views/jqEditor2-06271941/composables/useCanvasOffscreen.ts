/**
 * OffscreenCanvas 集成模块
 * 为现有的 useCanvas 组合式函数提供 OffscreenCanvas 支持
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { CanvasAdapter } from '../utils/canvasAdapter.js';
import { logCompatibilityInfo } from '../utils/browserCompatibility.js';

export interface OffscreenCanvasOptions {
  enableOffscreen?: boolean;
  enableBatching?: boolean;
  batchSize?: number;
  flushInterval?: number;
  gridWidth?: number;
  gridHeight?: number;
  cellSize?: number;
}

export interface CanvasDrawingAPI {
  fillCell: (x: number, y: number, color: string) => Promise<void>;
  eraseCell: (x: number, y: number) => Promise<void>;
  drawLine: (
    points: Array<{ x: number; y: number }>,
    color: string,
  ) => Promise<void>;
  clear: () => Promise<void>;
  flush: () => Promise<void>;
  getImageData: (
    x?: number,
    y?: number,
    width?: number,
    height?: number,
  ) => Promise<ImageData>;
  putImageData: (imageData: ImageData, x?: number, y?: number) => Promise<void>;
  getPerformanceMetrics: () => any;
  getStatus: () => any;
}

/**
 * OffscreenCanvas 增强的 Canvas 组合式函数
 */
export function useCanvasOffscreen(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: OffscreenCanvasOptions = {},
) {
  // 默认配置
  const defaultOptions: Required<OffscreenCanvasOptions> = {
    enableOffscreen: true,
    enableBatching: true,
    batchSize: 50,
    flushInterval: 16,
    gridWidth: 200,
    gridHeight: 200,
    cellSize: 9,
  };

  const config = { ...defaultOptions, ...options };

  // 状态管理
  const adapter = ref<CanvasAdapter | null>(null);
  const isReady = ref(false);
  const isOffscreenSupported = ref(false);
  const renderingStrategy = ref<string>('unknown');
  const performanceMetrics = ref<any>({});
  const compatibilityReport = ref<any>({});

  // 错误状态
  const lastError = ref<Error | null>(null);
  const errorCount = ref(0);

  /**
   * 初始化 OffscreenCanvas 适配器
   */
  const initializeAdapter = async () => {
    if (!canvasRef.value) {
      throw new Error('Canvas 元素未找到');
    }

    try {
      // 记录兼容性信息
      compatibilityReport.value = logCompatibilityInfo();
      isOffscreenSupported.value = compatibilityReport.value.support.overall;

      // 创建适配器
      adapter.value = new CanvasAdapter(canvasRef.value, config);

      // 等待初始化完成
      await adapter.value.waitForReady();

      // 更新状态
      const status = adapter.value.getStatus();
      isReady.value = status.isReady;
      renderingStrategy.value = status.renderingStrategy;
      performanceMetrics.value = status.performanceMetrics;

      console.log('🎨 OffscreenCanvas 适配器初始化完成');
      console.log('📊 渲染策略:', renderingStrategy.value);
      console.log('🔧 OffscreenCanvas 支持:', isOffscreenSupported.value);
    } catch (error) {
      lastError.value = error as Error;
      errorCount.value++;
      console.error('OffscreenCanvas 适配器初始化失败:', error);
      throw error;
    }
  };

  /**
   * 等待适配器就绪
   */
  const waitForReady = async (): Promise<void> => {
    if (isReady.value && adapter.value) {
      return;
    }

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (isReady.value && adapter.value) {
          resolve();
        } else if (lastError.value) {
          reject(lastError.value);
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
  };

  /**
   * 创建绘图 API
   */
  const createDrawingAPI = (): CanvasDrawingAPI => {
    return {
      async fillCell(x: number, y: number, color: string) {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          await adapter.value.fillCell(x, y, color);
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      async eraseCell(x: number, y: number) {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          await adapter.value.eraseCell(x, y);
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      async drawLine(points: Array<{ x: number; y: number }>, color: string) {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          await adapter.value.drawLine(points, color);
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      async clear() {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          await adapter.value.clear();
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      async flush() {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          await adapter.value.flush();
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      async getImageData(
        x?: number,
        y?: number,
        width?: number,
        height?: number,
      ) {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          return await adapter.value.getImageData(x, y, width, height);
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      async putImageData(imageData: ImageData, x?: number, y?: number) {
        await waitForReady();
        if (!adapter.value) throw new Error('适配器未初始化');

        try {
          await adapter.value.putImageData(imageData, x, y);
        } catch (error) {
          lastError.value = error as Error;
          errorCount.value++;
          throw error;
        }
      },

      getPerformanceMetrics() {
        if (!adapter.value) return {};
        return adapter.value.getPerformanceMetrics();
      },

      getStatus() {
        if (!adapter.value) return { isReady: false };
        return adapter.value.getStatus();
      },
    };
  };

  // 创建绘图 API 实例
  const drawingAPI = createDrawingAPI();

  /**
   * 更新性能指标
   */
  const updatePerformanceMetrics = () => {
    if (adapter.value) {
      performanceMetrics.value = adapter.value.getPerformanceMetrics();
    }
  };

  /**
   * 重置性能指标
   */
  const resetPerformanceMetrics = () => {
    if (adapter.value) {
      adapter.value.resetPerformanceMetrics();
      performanceMetrics.value = adapter.value.getPerformanceMetrics();
    }
  };

  /**
   * 获取详细状态信息
   */
  const getDetailedStatus = () => {
    return {
      isReady: isReady.value,
      isOffscreenSupported: isOffscreenSupported.value,
      renderingStrategy: renderingStrategy.value,
      performanceMetrics: performanceMetrics.value,
      compatibilityReport: compatibilityReport.value,
      lastError: lastError.value,
      errorCount: errorCount.value,
      adapterStatus: adapter.value?.getStatus() || null,
    };
  };

  /**
   * 切换渲染策略（用于测试）
   */
  const switchRenderingStrategy = async (forceTraditional: boolean = false) => {
    if (!adapter.value) return;

    // 销毁当前适配器
    adapter.value.destroy();

    // 重新创建适配器
    const newConfig = { ...config, enableOffscreen: !forceTraditional };
    adapter.value = new CanvasAdapter(canvasRef.value!, newConfig);

    // 等待初始化
    await adapter.value.waitForReady();

    // 更新状态
    const status = adapter.value.getStatus();
    renderingStrategy.value = status.renderingStrategy;
    performanceMetrics.value = status.performanceMetrics;

    console.log('🔄 渲染策略已切换到:', renderingStrategy.value);
  };

  // 计算属性
  const isUsingOffscreen = computed(() => {
    return renderingStrategy.value === 'offscreen-canvas';
  });

  const hasErrors = computed(() => {
    return errorCount.value > 0;
  });

  const averageRenderTime = computed(() => {
    return performanceMetrics.value.avgRenderTime || 0;
  });

  // 生命周期管理
  onMounted(async () => {
    try {
      await initializeAdapter();
    } catch (error) {
      console.error('OffscreenCanvas 组合式函数初始化失败:', error);
    }
  });

  onUnmounted(() => {
    if (adapter.value) {
      adapter.value.destroy();
      adapter.value = null;
    }
  });

  // 定期更新性能指标
  const metricsInterval = setInterval(updatePerformanceMetrics, 1000);
  onUnmounted(() => {
    clearInterval(metricsInterval);
  });

  return {
    // 状态
    isReady,
    isOffscreenSupported,
    renderingStrategy,
    performanceMetrics,
    compatibilityReport,
    lastError,
    errorCount,

    // 计算属性
    isUsingOffscreen,
    hasErrors,
    averageRenderTime,

    // 绘图 API
    ...drawingAPI,

    // 管理方法
    initializeAdapter,
    waitForReady,
    updatePerformanceMetrics,
    resetPerformanceMetrics,
    getDetailedStatus,
    switchRenderingStrategy,
  };
}
