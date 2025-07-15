/**
 * OffscreenCanvas 渲染系统
 * 管理 OffscreenCanvas 和 Worker 的协调工作
 */

import {
  detectOffscreenCanvasSupport,
  getRecommendedRenderingStrategy,
} from './browserCompatibility.js';

export class OffscreenCanvasRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      enableOffscreen: true,
      workerPath: '/src/views/jqEditor2/workers/offscreenRenderer.js',
      fallbackToTraditional: true,
      ...options,
    };

    this.worker = null;
    this.offscreenCanvas = null;
    this.ctx = null;
    this.isReady = false;
    this.renderingStrategy = 'unknown';

    // 事件系统
    this.eventListeners = new Map();

    this.initialize();
  }

  async initialize() {
    try {
      if (this.options.enableOffscreen && this.supportsOffscreenCanvas()) {
        await this.initializeOffscreenMode();
      } else {
        this.initializeTraditionalMode();
      }
    } catch (error) {
      console.warn('OffscreenCanvas 初始化失败，回退到传统模式:', error);
      if (this.options.fallbackToTraditional) {
        this.initializeTraditionalMode();
      } else {
        throw error;
      }
    }
  }

  supportsOffscreenCanvas() {
    return (
      typeof OffscreenCanvas !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      this.canvas.transferControlToOffscreen
    );
  }

  async initializeOffscreenMode() {
    return new Promise((resolve, reject) => {
      try {
        // 创建 Worker
        this.worker = new Worker(this.options.workerPath);

        // 转移 Canvas 控制权
        this.offscreenCanvas = this.canvas.transferControlToOffscreen();

        // 设置消息处理
        this.worker.onmessage = (event) => {
          this.handleWorkerMessage(event);
        };

        this.worker.onerror = (error) => {
          reject(new Error(`Worker 错误: ${error.message}`));
        };

        // 监听初始化完成
        this.once('worker-ready', () => {
          this.renderingStrategy = 'offscreen-canvas';
          this.isReady = true;
          resolve();
        });

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
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.renderingStrategy = 'traditional-canvas';
    this.isReady = true;

    // 触发初始化事件
    this.emit('init', { strategy: this.renderingStrategy });
  }

  /**
   * 处理 Worker 消息
   */
  handleWorkerMessage(event) {
    const { type, requestId, payload, error } = event.data;

    switch (type) {
      case 'worker-ready':
        this.emit('worker-ready');
        break;

      case 'init-success':
        this.emit('init-success');
        break;

      case 'render-complete':
        this.emit('render-complete', payload);
        if (requestId && this.pendingRequests.has(requestId)) {
          const { resolve } = this.pendingRequests.get(requestId);
          resolve(payload);
          this.pendingRequests.delete(requestId);
        }
        break;

      case 'imageData':
        if (requestId && this.pendingRequests.has(requestId)) {
          const { resolve } = this.pendingRequests.get(requestId);
          resolve(payload);
          this.pendingRequests.delete(requestId);
        }
        break;

      case 'putImageData-complete':
        if (requestId && this.pendingRequests.has(requestId)) {
          const { resolve } = this.pendingRequests.get(requestId);
          resolve();
          this.pendingRequests.delete(requestId);
        }
        break;

      case 'error':
        console.error('Worker 错误:', error);
        this.emit('error', error);
        if (requestId && this.pendingRequests.has(requestId)) {
          const { reject } = this.pendingRequests.get(requestId);
          reject(new Error(error));
          this.pendingRequests.delete(requestId);
        }
        break;
    }
  }

  /**
   * 填充网格
   */
  fillCell(x, y, color) {
    if (!this.isReady) {
      console.warn('渲染器未初始化');
      return;
    }

    if (this.renderingStrategy === 'offscreen-canvas') {
      this.worker.postMessage({
        type: 'fillCell',
        x,
        y,
        color,
      });
    } else {
      // 传统模式
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x * 10, y * 10, 10, 10);
    }
  }

  /**
   * 擦除网格
   */
  eraseCell(x, y) {
    if (!this.isReady) {
      console.warn('渲染器未初始化');
      return;
    }

    if (this.renderingStrategy === 'offscreen-canvas') {
      this.worker.postMessage({
        type: 'eraseCell',
        x,
        y,
      });
    } else {
      // 传统模式
      this.ctx.clearRect(x * 10, y * 10, 10, 10);
    }
  }

  /**
   * 绘制线条
   */
  drawLine(points, color) {
    if (!this.isReady) {
      console.warn('渲染器未初始化');
      return;
    }

    if (this.renderingStrategy === 'offscreen-canvas') {
      this.worker.postMessage({
        type: 'drawLine',
        points,
        color,
      });
    } else {
      // 传统模式
      this.ctx.fillStyle = color;
      for (const point of points) {
        this.ctx.fillRect(point.x * 10, point.y * 10, 10, 10);
      }
    }
  }

  /**
   * 清空画布
   */
  clear() {
    if (!this.isReady) {
      console.warn('渲染器未初始化');
      return;
    }

    if (this.renderingStrategy === 'offscreen-canvas') {
      this.worker.postMessage({
        type: 'clear',
      });
    } else {
      // 传统模式
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 强制刷新渲染队列
   */
  flush() {
    if (this.renderingStrategy === 'offscreen-canvas' && this.worker) {
      this.worker.postMessage({
        type: 'flush',
      });
    }
  }

  /**
   * 获取 ImageData
   */
  async getImageData(x = 0, y = 0, width = null, height = null) {
    if (!this.isReady) {
      throw new Error('渲染器未初始化');
    }

    if (this.renderingStrategy === 'offscreen-canvas') {
      return new Promise((resolve, reject) => {
        const requestId = ++this.requestId;
        this.pendingRequests.set(requestId, { resolve, reject });

        this.worker.postMessage({
          type: 'getImageData',
          requestId,
          x,
          y,
          width: width || this.canvas.width,
          height: height || this.canvas.height,
        });
      });
    } else {
      // 传统模式
      const w = width || this.canvas.width;
      const h = height || this.canvas.height;
      return this.ctx.getImageData(x, y, w, h);
    }
  }

  /**
   * 设置 ImageData
   */
  async putImageData(imageData, x = 0, y = 0) {
    if (!this.isReady) {
      throw new Error('渲染器未初始化');
    }

    if (this.renderingStrategy === 'offscreen-canvas') {
      return new Promise((resolve, reject) => {
        const requestId = ++this.requestId;
        this.pendingRequests.set(requestId, { resolve, reject });

        this.worker.postMessage({
          type: 'putImageData',
          requestId,
          imageData,
          x,
          y,
        });
      });
    } else {
      // 传统模式
      this.ctx.putImageData(imageData, x, y);
    }
  }

  /**
   * 事件监听
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 一次性事件监听
   */
  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;

    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  emit(event, ...args) {
    if (!this.eventListeners.has(event)) return;

    for (const callback of this.eventListeners.get(event)) {
      try {
        callback(...args);
      } catch (error) {
        console.error(`事件处理器错误 (${event}):`, error);
      }
    }
  }

  /**
   * 获取渲染器状态
   */
  getStatus() {
    return {
      isSupported: this.supportsOffscreenCanvas(),
      isReady: this.isReady,
      renderingStrategy: this.renderingStrategy,
      pendingRequests: this.pendingRequests ? this.pendingRequests.size : 0,
    };
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.pendingRequests) {
      this.pendingRequests.clear();
    }
    this.eventListeners.clear();
    this.isReady = false;

    console.log('🗑️ OffscreenCanvas 渲染器已销毁');
  }
}
