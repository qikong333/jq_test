// Worker 管理器 - 负责 Worker 池管理和任务分发

import type {
  WorkerMessage,
  WorkerResponse,
  WorkerTask,
  WorkerInfo,
  WorkerStatus,
  WorkerPoolConfig,
  WorkerPerformanceMetrics,
} from './types';

export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private workerInfo: Map<string, WorkerInfo> = new Map();
  private taskQueue: WorkerTask[] = [];
  private pendingTasks: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  private config: WorkerPoolConfig;
  private performanceMetrics: Map<string, WorkerPerformanceMetrics> = new Map();

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = {
      maxWorkers: 4,
      minWorkers: 1,
      idleTimeout: 30000, // 30秒
      taskTimeout: 10000, // 10秒
      retryAttempts: 3,
      ...config,
    };

    this.initializeWorkers();
    this.startPerformanceMonitoring();
  }

  private initializeWorkers(): void {
    // 创建最小数量的 Worker
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker('fill');
    }
  }

  private createWorker(type: string): string {
    const workerId = `${type}-worker-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    let workerScript: string;
    switch (type) {
      case 'fill':
        workerScript = '/src/views/jqEditor2/workers/fillWorker.js';
        break;
      case 'color':
        workerScript = '/src/views/jqEditor2/workers/colorWorker.js';
        break;
      case 'image':
        workerScript = '/src/views/jqEditor2/workers/imageWorker.js';
        break;
      case 'geometry':
        workerScript = '/src/views/jqEditor2/workers/geometryWorker.js';
        break;
      default:
        throw new Error(`Unknown worker type: ${type}`);
    }

    const worker = new Worker(workerScript);

    worker.onmessage = (event) => {
      this.handleWorkerMessage(workerId, event.data);
    };

    worker.onerror = (error) => {
      this.handleWorkerError(workerId, error);
    };

    this.workers.set(workerId, worker);
    this.workerInfo.set(workerId, {
      id: workerId,
      type,
      status: 'idle',
      startTime: Date.now(),
      lastActivity: Date.now(),
    });

    this.performanceMetrics.set(workerId, {
      workerId,
      workerType: type as any,
      tasksCompleted: 0,
      averageExecutionTime: 0,
      memoryUsage: 0,
      errorCount: 0,
      lastActivity: Date.now(),
    });

    // console.log(`Worker created: ${workerId} (${type})`);
    return workerId;
  }

  private handleWorkerMessage(
    workerId: string,
    response: WorkerResponse,
  ): void {
    const workerInfo = this.workerInfo.get(workerId);
    const metrics = this.performanceMetrics.get(workerId);

    if (workerInfo) {
      workerInfo.status = 'idle';
      workerInfo.currentTask = undefined;
      workerInfo.lastActivity = Date.now();
    }

    if (metrics && response.executionTime) {
      metrics.tasksCompleted++;
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.tasksCompleted - 1) +
          response.executionTime) /
        metrics.tasksCompleted;
      metrics.lastActivity = Date.now();

      if (!response.success) {
        metrics.errorCount++;
      }
    }

    const pendingTask = this.pendingTasks.get(response.id);
    if (pendingTask) {
      clearTimeout(pendingTask.timeout);
      this.pendingTasks.delete(response.id);

      if (response.success) {
        pendingTask.resolve(response.data);
      } else {
        pendingTask.reject(new Error(response.error || 'Worker task failed'));
      }
    }

    // 处理队列中的下一个任务
    this.processNextTask();
  }

  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    console.error(`Worker error (${workerId}):`, error);

    const workerInfo = this.workerInfo.get(workerId);
    const metrics = this.performanceMetrics.get(workerId);

    if (workerInfo) {
      workerInfo.status = 'error';
    }

    if (metrics) {
      metrics.errorCount++;
    }

    // 重启 Worker
    this.restartWorker(workerId);
  }

  private restartWorker(workerId: string): void {
    const workerInfo = this.workerInfo.get(workerId);
    if (!workerInfo) return;

    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
    }

    // 创建新的 Worker
    this.createWorker(workerInfo.type);

    // 清理旧的信息
    this.workerInfo.delete(workerId);
    this.performanceMetrics.delete(workerId);
  }

  private findAvailableWorker(taskType: string): string | null {
    for (const [workerId, info] of this.workerInfo.entries()) {
      if (
        info.status === 'idle' &&
        this.isWorkerCompatible(info.type, taskType)
      ) {
        return workerId;
      }
    }
    return null;
  }

  private isWorkerCompatible(workerType: string, taskType: string): boolean {
    const compatibility: Record<string, string[]> = {
      fill: ['floodFill', 'bucketFill'],
      color: ['colorConvert', 'colorBlend', 'colorAnalyze'],
      image: ['imageResize', 'imageFilter', 'imageTransform'],
      geometry: ['geometryCalculate', 'pathOptimize'],
    };

    return compatibility[workerType]?.includes(taskType) || false;
  }

  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    // 按优先级排序
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const task = this.taskQueue.shift();
    if (!task) return;

    const availableWorker = this.findAvailableWorker(task.type);
    if (availableWorker) {
      this.executeTask(availableWorker, task);
    } else if (this.workers.size < this.config.maxWorkers) {
      // 创建新的 Worker
      const workerType = this.getWorkerTypeForTask(task.type);
      const newWorkerId = this.createWorker(workerType);
      this.executeTask(newWorkerId, task);
    } else {
      // 重新加入队列
      this.taskQueue.unshift(task);
    }
  }

  private getWorkerTypeForTask(taskType: string): string {
    if (taskType.includes('flood') || taskType.includes('fill')) return 'fill';
    if (taskType.includes('color')) return 'color';
    if (taskType.includes('image')) return 'image';
    if (taskType.includes('geometry')) return 'geometry';
    return 'fill'; // 默认
  }

  private executeTask(workerId: string, task: WorkerTask): void {
    const worker = this.workers.get(workerId);
    const workerInfo = this.workerInfo.get(workerId);

    if (!worker || !workerInfo) {
      console.error(`Worker not found: ${workerId}`);
      return;
    }

    workerInfo.status = 'busy';
    workerInfo.currentTask = task.id;
    workerInfo.lastActivity = Date.now();

    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      payload: task.payload,
      timestamp: Date.now(),
    };

    worker.postMessage(message);
  }

  public async executeTask<T>(
    taskType: string,
    payload: any,
    options: {
      priority?: 'low' | 'normal' | 'high';
      timeout?: number;
    } = {},
  ): Promise<T> {
    const taskId = `task-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const task: WorkerTask = {
      id: taskId,
      type: taskType,
      payload,
      priority: options.priority || 'normal',
      timeout: options.timeout || this.config.taskTimeout,
      retries: 0,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingTasks.delete(taskId);
        reject(new Error(`Task timeout: ${taskId}`));
      }, task.timeout);

      this.pendingTasks.set(taskId, { resolve, reject, timeout });
      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.cleanupIdleWorkers();
      this.logPerformanceMetrics();
    }, 10000); // 每10秒检查一次
  }

  private cleanupIdleWorkers(): void {
    const now = Date.now();
    const workersToRemove: string[] = [];

    for (const [workerId, info] of this.workerInfo.entries()) {
      if (
        info.status === 'idle' &&
        now - info.lastActivity > this.config.idleTimeout &&
        this.workers.size > this.config.minWorkers
      ) {
        workersToRemove.push(workerId);
      }
    }

    workersToRemove.forEach((workerId) => {
      const worker = this.workers.get(workerId);
      if (worker) {
        worker.terminate();
        this.workers.delete(workerId);
        this.workerInfo.delete(workerId);
        this.performanceMetrics.delete(workerId);
        // console.log(`Idle worker terminated: ${workerId}`);
      }
    });
  }

  private logPerformanceMetrics(): void {
    const metrics = Array.from(this.performanceMetrics.values());
    const summary = {
      totalWorkers: this.workers.size,
      activeWorkers: Array.from(this.workerInfo.values()).filter(
        (w) => w.status === 'busy',
      ).length,
      queueLength: this.taskQueue.length,
      totalTasksCompleted: metrics.reduce(
        (sum, m) => sum + m.tasksCompleted,
        0,
      ),
      averageExecutionTime:
        metrics.reduce((sum, m) => sum + m.averageExecutionTime, 0) /
          metrics.length || 0,
      totalErrors: metrics.reduce((sum, m) => sum + m.errorCount, 0),
    };

    // console.log('Worker Pool Performance:', summary);
  }

  public getPerformanceMetrics(): WorkerPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  public getWorkerStatus(): WorkerInfo[] {
    return Array.from(this.workerInfo.values());
  }

  public destroy(): void {
    // 终止所有 Worker
    this.workers.forEach((worker) => worker.terminate());
    this.workers.clear();
    this.workerInfo.clear();
    this.performanceMetrics.clear();

    // 清理待处理任务
    this.pendingTasks.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(new Error('Worker manager destroyed'));
    });
    this.pendingTasks.clear();
    this.taskQueue.length = 0;
  }
}

// 单例模式
export const workerManager = new WorkerManager();
