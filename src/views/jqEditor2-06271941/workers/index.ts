// Worker 集成接口 - 主线程调用入口

import { workerManager } from './WorkerManager';
import type {
  FloodFillRequest,
  FloodFillResponse,
  ColorProcessRequest,
  ColorProcessResponse,
  ImageProcessRequest,
  ImageProcessResponse,
  GeometryCalculationRequest,
  GeometryCalculationResponse,
  WorkerPerformanceMetrics,
  WorkerInfo,
} from './types';

/**
 * Worker 服务类 - 提供统一的 Worker 调用接口
 */
export class WorkerService {
  private static instance: WorkerService;
  private manager = workerManager;

  private constructor() {}

  public static getInstance(): WorkerService {
    if (!WorkerService.instance) {
      WorkerService.instance = new WorkerService();
    }
    return WorkerService.instance;
  }

  // ==================== 填充算法相关 ====================

  /**
   * 执行洪水填充算法
   */
  public async floodFill(
    request: FloodFillRequest,
  ): Promise<FloodFillResponse> {
    return this.manager.executeTask<FloodFillResponse>('floodFill', request, {
      priority: 'high',
      timeout: 15000, // 15秒超时
    });
  }

  /**
   * 执行桶填充算法
   */
  public async bucketFill(request: {
    imageData: ImageData;
    startX: number;
    startY: number;
    fillColor: [number, number, number, number];
    tolerance?: number;
  }): Promise<any> {
    return this.manager.executeTask('bucketFill', request, {
      priority: 'high',
      timeout: 10000,
    });
  }

  // ==================== 颜色处理相关 ====================

  /**
   * 颜色格式转换
   */
  public async convertColors(
    request: ColorProcessRequest,
  ): Promise<ColorProcessResponse> {
    return this.manager.executeTask<ColorProcessResponse>(
      'colorConvert',
      request,
      {
        priority: 'normal',
        timeout: 8000,
      },
    );
  }

  /**
   * 颜色混合
   */
  public async blendColors(
    request: ColorProcessRequest,
  ): Promise<ColorProcessResponse> {
    return this.manager.executeTask<ColorProcessResponse>(
      'colorBlend',
      request,
      {
        priority: 'normal',
        timeout: 8000,
      },
    );
  }

  /**
   * 颜色分析
   */
  public async analyzeColors(
    request: ColorProcessRequest,
  ): Promise<ColorProcessResponse> {
    return this.manager.executeTask<ColorProcessResponse>(
      'colorAnalyze',
      request,
      {
        priority: 'low',
        timeout: 12000,
      },
    );
  }

  // ==================== 图像处理相关 ====================

  /**
   * 图像缩放
   */
  public async resizeImage(
    request: ImageProcessRequest,
  ): Promise<ImageProcessResponse> {
    return this.manager.executeTask<ImageProcessResponse>(
      'imageResize',
      request,
      {
        priority: 'normal',
        timeout: 20000, // 图像处理可能需要更长时间
      },
    );
  }

  /**
   * 应用图像滤镜
   */
  public async applyImageFilter(
    request: ImageProcessRequest,
  ): Promise<ImageProcessResponse> {
    return this.manager.executeTask<ImageProcessResponse>(
      'imageFilter',
      request,
      {
        priority: 'normal',
        timeout: 15000,
      },
    );
  }

  /**
   * 图像变换（旋转、翻转、缩放）
   */
  public async transformImage(
    request: ImageProcessRequest,
  ): Promise<ImageProcessResponse> {
    return this.manager.executeTask<ImageProcessResponse>(
      'imageTransform',
      request,
      {
        priority: 'normal',
        timeout: 15000,
      },
    );
  }

  // ==================== 几何计算相关 ====================

  /**
   * 几何计算
   */
  public async calculateGeometry(
    request: GeometryCalculationRequest,
  ): Promise<GeometryCalculationResponse> {
    return this.manager.executeTask<GeometryCalculationResponse>(
      'geometryCalculate',
      request,
      {
        priority: 'normal',
        timeout: 10000,
      },
    );
  }

  /**
   * 路径优化
   */
  public async optimizePath(request: {
    points: Array<{ x: number; y: number }>;
    options?: {
      algorithm?: 'douglas-peucker' | 'smooth';
      tolerance?: number;
      smoothingFactor?: number;
    };
  }): Promise<any> {
    return this.manager.executeTask('pathOptimize', request, {
      priority: 'low',
      timeout: 15000,
    });
  }

  // ==================== 性能监控和管理 ====================

  /**
   * 获取 Worker 性能指标
   */
  public getPerformanceMetrics(): WorkerPerformanceMetrics[] {
    return this.manager.getPerformanceMetrics();
  }

  /**
   * 获取 Worker 状态信息
   */
  public getWorkerStatus(): WorkerInfo[] {
    return this.manager.getWorkerStatus();
  }

  /**
   * 销毁所有 Worker
   */
  public destroy(): void {
    this.manager.destroy();
  }
}

// ==================== 便捷函数 ====================

/**
 * 获取 Worker 服务实例
 */
export const getWorkerService = (): WorkerService => {
  return WorkerService.getInstance();
};

/**
 * 快速洪水填充
 */
export const quickFloodFill = async (
  imageData: ImageData,
  startX: number,
  startY: number,
  targetColor: [number, number, number, number],
  fillColor: [number, number, number, number],
  options: {
    tolerance?: number;
    gridSize?: number;
  } = {},
): Promise<FloodFillResponse> => {
  const service = getWorkerService();
  return service.floodFill({
    imageData,
    startX,
    startY,
    targetColor,
    fillColor,
    tolerance: options.tolerance || 0,
    gridSize: options.gridSize || 1,
  });
};

/**
 * 快速颜色转换
 */
export const quickColorConvert = async (
  colors: string[],
  targetFormat: 'rgb' | 'rgba' | 'hex' | 'hsl' = 'rgba',
): Promise<ColorProcessResponse> => {
  const service = getWorkerService();
  return service.convertColors({
    colors,
    operation: 'convert',
    options: { format: targetFormat },
  });
};

/**
 * 快速图像缩放
 */
export const quickImageResize = async (
  imageData: ImageData,
  newWidth: number,
  newHeight: number,
): Promise<ImageProcessResponse> => {
  const service = getWorkerService();
  return service.resizeImage({
    imageData,
    operation: 'resize',
    options: {
      width: newWidth,
      height: newHeight,
    },
  });
};

/**
 * 快速距离计算
 */
export const quickDistanceCalculation = async (
  points: Array<{ x: number; y: number }>,
  precision: number = 2,
): Promise<GeometryCalculationResponse> => {
  const service = getWorkerService();
  return service.calculateGeometry({
    operation: 'distance',
    points,
    options: { precision },
  });
};

/**
 * 快速路径简化
 */
export const quickPathSimplify = async (
  points: Array<{ x: number; y: number }>,
  tolerance: number = 1.0,
): Promise<any> => {
  const service = getWorkerService();
  return service.optimizePath({
    points,
    options: {
      algorithm: 'douglas-peucker',
      tolerance,
    },
  });
};

// ==================== 错误处理和重试机制 ====================

/**
 * 带重试机制的 Worker 任务执行
 */
export const executeWithRetry = async <T>(
  taskFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await taskFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxRetries) {
        throw lastError;
      }

      // 指数退避
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
};

/**
 * 批量处理任务
 */
export const batchProcess = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  concurrency: number = 3,
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // 限制并发数
    const chunks: T[][] = [];
    for (let j = 0; j < batch.length; j += concurrency) {
      chunks.push(batch.slice(j, j + concurrency));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item) => processor(item)),
      );
      results.push(...chunkResults);
    }
  }

  return results;
};

// ==================== 类型导出 ====================

export type {
  FloodFillRequest,
  FloodFillResponse,
  ColorProcessRequest,
  ColorProcessResponse,
  ImageProcessRequest,
  ImageProcessResponse,
  GeometryCalculationRequest,
  GeometryCalculationResponse,
  WorkerPerformanceMetrics,
  WorkerInfo,
  WorkerMessage,
  WorkerResponse,
  WorkerTask,
  WorkerStatus,
  WorkerPoolConfig,
} from './types';

// 默认导出 Worker 服务
export default WorkerService;
