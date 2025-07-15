// Web Workers 类型定义

// Worker 消息类型
export interface WorkerMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
}

// Worker 响应类型
export interface WorkerResponse<T = any> {
  id: string;
  type: string;
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  executionTime?: number;
}

// 填充算法相关类型
export interface FloodFillRequest {
  imageData: ImageData;
  startX: number;
  startY: number;
  targetColor: [number, number, number, number];
  fillColor: [number, number, number, number];
  tolerance: number;
  gridSize: number;
}

export interface FloodFillResponse {
  modifiedPixels: Array<{ x: number; y: number }>;
  affectedCells: Array<{ x: number; y: number }>;
  processedPixels: number;
}

// 颜色处理相关类型
export interface ColorProcessRequest {
  colors: string[];
  operation: 'convert' | 'blend' | 'analyze';
  options?: {
    format?: 'rgb' | 'rgba' | 'hex' | 'hsl';
    blendMode?: 'normal' | 'multiply' | 'screen';
    tolerance?: number;
  };
}

export interface ColorProcessResponse {
  processedColors: any[];
  statistics?: {
    uniqueColors: number;
    dominantColor: string;
    averageColor: string;
  };
}

// 图像处理相关类型
export interface ImageProcessRequest {
  imageData: ImageData;
  operation: 'resize' | 'filter' | 'transform';
  options: {
    width?: number;
    height?: number;
    filter?: 'blur' | 'sharpen' | 'edge';
    transform?: 'rotate' | 'flip' | 'scale';
    angle?: number;
    scale?: number;
  };
}

export interface ImageProcessResponse {
  processedImageData: ImageData;
  metadata: {
    originalSize: { width: number; height: number };
    newSize: { width: number; height: number };
    processingTime: number;
  };
}

// 几何计算相关类型
export interface GeometryCalculationRequest {
  operation: 'distance' | 'intersection' | 'bounds' | 'path';
  points: Array<{ x: number; y: number }>;
  options?: {
    precision?: number;
    algorithm?: string;
  };
}

export interface GeometryCalculationResponse {
  result: any;
  computationComplexity: number;
}

// Worker 性能监控类型
export interface WorkerPerformanceMetrics {
  workerId: string;
  workerType: 'fill' | 'color' | 'image' | 'geometry';
  tasksCompleted: number;
  averageExecutionTime: number;
  memoryUsage: number;
  errorCount: number;
  lastActivity: number;
}

// Worker 池配置类型
export interface WorkerPoolConfig {
  maxWorkers: number;
  minWorkers: number;
  idleTimeout: number;
  taskTimeout: number;
  retryAttempts: number;
}

// Worker 任务类型
export interface WorkerTask<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: 'low' | 'normal' | 'high';
  timeout: number;
  retries: number;
  createdAt: number;
}

// Worker 状态类型
export type WorkerStatus = 'idle' | 'busy' | 'error' | 'terminated';

export interface WorkerInfo {
  id: string;
  type: string;
  status: WorkerStatus;
  currentTask?: string;
  startTime: number;
  lastActivity: number;
}
