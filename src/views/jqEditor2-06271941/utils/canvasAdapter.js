/**
 * Canvas 适配器
 * 为现有代码提供统一的绘图接口，自动选择最佳渲染策略
 */

import { OffscreenCanvasRenderer } from './offscreenCanvasRenderer.js';
import { logCompatibilityInfo } from './browserCompatibility.js';

export class CanvasAdapter {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      enableBatching: true,
      batchSize: 100,
      enablePerformanceTracking: true,
      ...options,
    };

    this.mode = 'traditional'; // 'traditional' 或 'offscreen'
    this.worker = null;
    this.offscreenCanvas = null;
    this.ctx = null;
    this.isReady = false;

    // 批处理相关
    this.batchQueue = [];
    this.batchTimer = null;

    // 性能指标
    this.performanceMetrics = {
      operationCount: 0,
      totalTime: 0,
      averageTime: 0,
      lastOperationTime: 0,
      batchCount: 0,
      errorCount: 0,
    };

    this.initialize();
  }

  async initialize() {
    try {
      // 检测 OffscreenCanvas 支持
      if (
        this.canvas.transferControlToOffscreen &&
        typeof Worker !== 'undefined'
      ) {
        await this.initializeOffscreenMode();
      } else {
        this.initializeTraditionalMode();
      }
    } catch (error) {
      console.warn('OffscreenCanvas 初始化失败，回退到传统模式:', error);
      this.initializeTraditionalMode();
    }
  }

  async initializeOffscreenMode() {
    return new Promise((resolve, reject) => {
      try {
        // 创建 Worker
        this.worker = new Worker(
          '/src/views/jqEditor2/workers/offscreenRenderer.js',
        );

        // 转移 Canvas 控制权
        this.offscreenCanvas = this.canvas.transferControlToOffscreen();

        // 监听 Worker 消息
        this.worker.onmessage = (event) => {
          const { type, data } = event.data;

          if (type === 'worker-ready') {
            this.mode = 'offscreen';
            this.isReady = true;
            resolve();
          } else if (type === 'error') {
            this.performanceMetrics.errorCount++;
            console.error('OffscreenCanvas Worker 错误:', data);
          }
        };

        this.worker.onerror = (error) => {
          reject(error);
        };

        // 初始化 Worker
        this.worker.postMessage(
          {
            type: 'init',
            canvas: this.offscreenCanvas,
            options: this.options,
          },
          [this.offscreenCanvas],
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  initializeTraditionalMode() {
    this.mode = 'traditional';
    this.ctx = this.canvas.getContext('2d');
    this.isReady = true;
  }

  /**
   * 启动批处理定时器
   */
  startBatchTimer() {
    if (this.options.enableBatching && this.options.flushInterval) {
      this.batchTimer = setInterval(() => {
        this.flushBatch();
      }, this.options.flushInterval);
    }
  }

  /**
   * 等待渲染器就绪
   */
  async waitForReady() {
    if (this.isReady) return;

    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isReady) {
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
  }

  /**
   * 填充网格（批处理版本）
   */
  async fillCell(x, y, color) {
    await this.waitForReady();

    if (this.options.enableBatching) {
      this.addToBatch('fillCell', { x, y, color });
    } else {
      this.executeOperation({ type: 'fillCell', x, y, color });
    }
  }

  /**
   * 擦除网格（批处理版本）
   */
  async eraseCell(x, y) {
    await this.waitForReady();

    if (this.options.enableBatching) {
      this.addToBatch('eraseCell', { x, y });
    } else {
      this.executeOperation({ type: 'eraseCell', x, y });
    }
  }

  /**
   * 绘制线条（批处理版本）
   */
  async drawLine(points, color) {
    await this.waitForReady();

    if (this.options.enableBatching) {
      this.addToBatch('drawLine', { points, color });
    } else {
      this.executeOperation({ type: 'drawLine', points, color });
    }
  }

  /**
   * 清空画布
   */
  async clear() {
    await this.waitForReady();

    // 清空操作立即执行，不进入批处理
    this.batchQueue = []; // 清空批处理队列
    this.executeOperation({ type: 'clear' });
  }

  executeOperation(operation) {
    const startTime = performance.now();

    try {
      if (this.mode === 'offscreen' && this.worker) {
        this.worker.postMessage(operation);
      } else if (this.ctx) {
        this.executeTraditionalOperation(operation);
      }

      this.updatePerformanceMetrics(startTime);
    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('操作执行失败:', error);
    }
  }

  executeTraditionalOperation(operation) {
    const { type, x, y, color, points } = operation;

    switch (type) {
      case 'fillCell':
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * 10, y * 10, 10, 10); // 假设网格大小为 10x10
        break;

      case 'eraseCell':
        this.ctx.clearRect(x * 10, y * 10, 10, 10);
        break;

      case 'drawLine':
        this.ctx.fillStyle = color;
        for (const point of points) {
          this.ctx.fillRect(point.x * 10, point.y * 10, 10, 10);
        }
        break;

      case 'clear':
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        break;
    }
  }

  updatePerformanceMetrics(startTime) {
    const endTime = performance.now();
    const operationTime = endTime - startTime;

    this.performanceMetrics.operationCount++;
    this.performanceMetrics.totalTime += operationTime;
    this.performanceMetrics.averageTime =
      this.performanceMetrics.totalTime /
      this.performanceMetrics.operationCount;
    this.performanceMetrics.lastOperationTime = operationTime;
  }

  /**
   * 添加到批处理队列
   */
  addToBatch(operation, data) {
    this.batchQueue.push({ operation, data, timestamp: Date.now() });

    // 如果队列达到批处理大小，立即处理
    if (this.batchQueue.length >= this.options.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * 刷新批处理队列
   */
  flushBatch() {
    if (this.batchQueue.length === 0) return;

    const startTime = performance.now();

    // 优化：合并相同位置的操作
    const optimizedQueue = this.optimizeBatch(this.batchQueue);

    // 执行批处理操作
    for (const { operation, data } of optimizedQueue) {
      switch (operation) {
        case 'fillCell':
          this.executeOperation({
            type: 'fillCell',
            x: data.x,
            y: data.y,
            color: data.color,
          });
          break;
        case 'eraseCell':
          this.executeOperation({ type: 'eraseCell', x: data.x, y: data.y });
          break;
        case 'drawLine':
          this.executeOperation({
            type: 'drawLine',
            points: data.points,
            color: data.color,
          });
          break;
      }
    }

    // 更新性能指标
    const endTime = performance.now();
    this.performanceMetrics.batchCount++;

    // 清空队列
    this.batchQueue = [];
  }

  /**
   * 优化批处理队列
   */
  optimizeBatch(queue) {
    const cellMap = new Map();
    const lineOperations = [];

    // 处理单元格操作，后面的操作覆盖前面的
    for (const item of queue) {
      if (item.operation === 'fillCell' || item.operation === 'eraseCell') {
        const key = `${item.data.x},${item.data.y}`;
        cellMap.set(key, item);
      } else if (item.operation === 'drawLine') {
        lineOperations.push(item);
      }
    }

    // 合并结果
    return [...cellMap.values(), ...lineOperations];
  }

  /**
   * 强制刷新
   */
  async flush() {
    await this.waitForReady();
    this.flushBatch();
  }

  /**
   * 获取 ImageData
   */
  async getImageData(x = 0, y = 0, width, height) {
    await this.waitForReady();
    await this.flush(); // 确保所有操作都已完成

    if (this.mode === 'offscreen' && this.worker) {
      return new Promise((resolve) => {
        const messageHandler = (event) => {
          if (event.data.type === 'imageData') {
            this.worker.removeEventListener('message', messageHandler);
            resolve(event.data.data);
          }
        };

        this.worker.addEventListener('message', messageHandler);
        this.worker.postMessage({
          type: 'getImageData',
          x,
          y,
          width: width || this.canvas.width,
          height: height || this.canvas.height,
        });
      });
    } else {
      return this.ctx.getImageData(
        x,
        y,
        width || this.canvas.width,
        height || this.canvas.height,
      );
    }
  }

  /**
   * 设置 ImageData
   */
  async putImageData(imageData, x = 0, y = 0) {
    await this.waitForReady();

    if (this.mode === 'offscreen' && this.worker) {
      this.worker.postMessage({
        type: 'putImageData',
        imageData,
        x,
        y,
      });
    } else {
      this.ctx.putImageData(imageData, x, y);
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      batchQueueSize: this.batchQueue.length,
      mode: this.mode,
    };
  }

  /**
   * 重置性能指标
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      operationCount: 0,
      totalTime: 0,
      averageTime: 0,
      lastOperationTime: 0,
      batchCount: 0,
      errorCount: 0,
    };
  }

  /**
   * 获取渲染器状态
   */
  getStatus() {
    return {
      mode: this.mode,
      isReady: this.isReady,
      batchQueueLength: this.batchQueue.length,
      performanceMetrics: this.getPerformanceMetrics(),
    };
  }

  /**
   * 销毁适配器
   */
  destroy() {
    // 清理定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // 刷新剩余的批处理
    this.flushBatch();

    // 终止 Worker
    if (this.worker) {
      this.worker.terminate();
    }

    this.isReady = false;
    this.batchQueue = [];

    console.log('🗑️ Canvas 适配器已销毁');
  }
}
