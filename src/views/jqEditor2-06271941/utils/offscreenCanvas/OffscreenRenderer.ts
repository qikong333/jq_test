/**
 * OffscreenCanvas 渲染器
 * 在 Worker 线程中执行实际的渲染操作
 */

import { OffscreenCanvasConfig } from './OffscreenCanvasManager';

export interface DrawData {
  type: 'line' | 'rect' | 'circle' | 'path';
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  fillStyle?: string;
}

export interface FillData {
  x: number;
  y: number;
  color: string;
  tolerance: number;
  imageData: ImageData;
}

export interface FilterData {
  type: 'blur' | 'brightness' | 'contrast' | 'saturation';
  value: number;
  imageData: ImageData;
}

export interface TransformData {
  type: 'scale' | 'rotate' | 'translate';
  value: number | { x: number; y: number };
  imageData: ImageData;
}

export class OffscreenRenderer {
  private worker: Worker | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private config: OffscreenCanvasConfig;
  private pendingTasks = new Map<
    string,
    { resolve: Function; reject: Function }
  >();

  private taskCounter = 0;

  constructor(config: OffscreenCanvasConfig) {
    this.config = config;
  }

  /**
   * 初始化 OffscreenRenderer
   */
  async initialize(offscreenCanvas: OffscreenCanvas): Promise<void> {
    this.offscreenCanvas = offscreenCanvas;
    this.ctx = offscreenCanvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('无法获取 OffscreenCanvas 2D 上下文');
    }

    // 创建 Worker
    await this.createWorker();

    // 传输 OffscreenCanvas 到 Worker
    if (this.worker) {
      this.worker.postMessage(
        {
          type: 'init',
          canvas: offscreenCanvas,
          config: this.config,
        },
        [offscreenCanvas],
      );
    }
  }

  /**
   * 创建 Worker
   */
  private async createWorker(): Promise<void> {
    try {
      // 创建内联 Worker 代码
      const workerCode = this.generateWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      this.worker = new Worker(workerUrl);

      // 设置消息处理
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // 清理 URL
      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.error('创建 OffscreenCanvas Worker 失败:', error);
      throw error;
    }
  }

  /**
   * 生成 Worker 代码
   */
  private generateWorkerCode(): string {
    return `
      let canvas = null;
      let ctx = null;
      let config = null;

      // 处理消息
      self.onmessage = function(e) {
        const { type, taskId, data } = e.data;

        try {
          switch (type) {
            case 'init':
              canvas = e.data.canvas;
              ctx = canvas.getContext('2d');
              config = e.data.config;
              self.postMessage({ type: 'init-complete', success: true });
              break;

            case 'draw':
              const drawResult = performDraw(data);
              self.postMessage({ 
                type: 'task-complete', 
                taskId, 
                success: true, 
                result: drawResult 
              });
              break;

            case 'fill':
              const fillResult = performFill(data);
              self.postMessage({ 
                type: 'task-complete', 
                taskId, 
                success: true, 
                result: fillResult 
              });
              break;

            case 'filter':
              const filterResult = performFilter(data);
              self.postMessage({ 
                type: 'task-complete', 
                taskId, 
                success: true, 
                result: filterResult 
              });
              break;

            case 'transform':
              const transformResult = performTransform(data);
              self.postMessage({ 
                type: 'task-complete', 
                taskId, 
                success: true, 
                result: transformResult 
              });
              break;

            default:
              throw new Error('未知的任务类型: ' + type);
          }
        } catch (error) {
          self.postMessage({ 
            type: 'task-error', 
            taskId, 
            error: error.message 
          });
        }
      };

      // 绘制函数
      function performDraw(data) {
        if (!ctx) throw new Error('Canvas 上下文未初始化');

        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
        
        if (data.fillStyle) {
          ctx.fillStyle = data.fillStyle;
        }

        ctx.beginPath();

        switch (data.type) {
          case 'line':
            if (data.points.length >= 2) {
              ctx.moveTo(data.points[0].x, data.points[0].y);
              for (let i = 1; i < data.points.length; i++) {
                ctx.lineTo(data.points[i].x, data.points[i].y);
              }
            }
            break;

          case 'rect':
            if (data.points.length >= 2) {
              const width = data.points[1].x - data.points[0].x;
              const height = data.points[1].y - data.points[0].y;
              ctx.rect(data.points[0].x, data.points[0].y, width, height);
            }
            break;

          case 'circle':
            if (data.points.length >= 2) {
              const centerX = data.points[0].x;
              const centerY = data.points[0].y;
              const radius = Math.sqrt(
                Math.pow(data.points[1].x - centerX, 2) + 
                Math.pow(data.points[1].y - centerY, 2)
              );
              ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            }
            break;

          case 'path':
            if (data.points.length > 0) {
              ctx.moveTo(data.points[0].x, data.points[0].y);
              for (let i = 1; i < data.points.length; i++) {
                ctx.lineTo(data.points[i].x, data.points[i].y);
              }
            }
            break;
        }

        if (data.fillStyle) {
          ctx.fill();
        }
        ctx.stroke();

        return canvas.transferToImageBitmap();
      }

      // 填充函数
      function performFill(data) {
        if (!ctx) throw new Error('Canvas 上下文未初始化');

        // 将 ImageData 绘制到画布
        ctx.putImageData(data.imageData, 0, 0);

        // 执行洪水填充算法
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const filledData = floodFill(imageData, data.x, data.y, data.color, data.tolerance);
        
        ctx.putImageData(filledData, 0, 0);
        return canvas.transferToImageBitmap();
      }

      // 滤镜函数
      function performFilter(data) {
        if (!ctx) throw new Error('Canvas 上下文未初始化');

        ctx.putImageData(data.imageData, 0, 0);
        
        switch (data.type) {
          case 'blur':
            ctx.filter = \`blur(\${data.value}px)\`;
            break;
          case 'brightness':
            ctx.filter = \`brightness(\${data.value}%)\`;
            break;
          case 'contrast':
            ctx.filter = \`contrast(\${data.value}%)\`;
            break;
          case 'saturation':
            ctx.filter = \`saturate(\${data.value}%)\`;
            break;
        }

        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
        
        return canvas.transferToImageBitmap();
      }

      // 变换函数
      function performTransform(data) {
        if (!ctx) throw new Error('Canvas 上下文未初始化');

        ctx.putImageData(data.imageData, 0, 0);
        
        ctx.save();
        
        switch (data.type) {
          case 'scale':
            ctx.scale(data.value, data.value);
            break;
          case 'rotate':
            ctx.rotate(data.value * Math.PI / 180);
            break;
          case 'translate':
            ctx.translate(data.value.x, data.value.y);
            break;
        }

        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
        
        return canvas.transferToImageBitmap();
      }

      // 洪水填充算法
      function floodFill(imageData, startX, startY, fillColor, tolerance) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 解析填充颜色
        const fillRgb = hexToRgb(fillColor);
        if (!fillRgb) return imageData;
        
        // 获取起始点颜色
        const startIndex = (startY * width + startX) * 4;
        const startR = data[startIndex];
        const startG = data[startIndex + 1];
        const startB = data[startIndex + 2];
        
        // 如果起始颜色与填充颜色相同，直接返回
        if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b) {
          return imageData;
        }
        
        const stack = [[startX, startY]];
        const visited = new Set();
        
        while (stack.length > 0) {
          const [x, y] = stack.pop();
          
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          
          const key = y * width + x;
          if (visited.has(key)) continue;
          
          const index = key * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // 检查颜色差异是否在容差范围内
          const colorDiff = Math.sqrt(
            Math.pow(r - startR, 2) + 
            Math.pow(g - startG, 2) + 
            Math.pow(b - startB, 2)
          );
          
          if (colorDiff <= tolerance) {
            visited.add(key);
            
            // 填充像素
            data[index] = fillRgb.r;
            data[index + 1] = fillRgb.g;
            data[index + 2] = fillRgb.b;
            
            // 添加相邻像素到栈
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
          }
        }
        
        return imageData;
      }
      
      // 颜色转换工具
      function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      }
    `;
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, taskId, success, result, error } = event.data;

    switch (type) {
      case 'init-complete':
        // console.log('OffscreenCanvas Worker 初始化完成');
        break;

      case 'task-complete':
        if (this.pendingTasks.has(taskId)) {
          const { resolve } = this.pendingTasks.get(taskId)!;
          resolve(result);
          this.pendingTasks.delete(taskId);
        }
        break;

      case 'task-error':
        if (this.pendingTasks.has(taskId)) {
          const { reject } = this.pendingTasks.get(taskId)!;
          reject(new Error(error));
          this.pendingTasks.delete(taskId);
        }
        break;
    }
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('OffscreenCanvas Worker 错误:', error);

    // 拒绝所有待处理的任务
    this.pendingTasks.forEach(({ reject }) => {
      reject(new Error('Worker 执行错误'));
    });
    this.pendingTasks.clear();
  }

  /**
   * 执行绘制操作
   */
  async draw(data: DrawData): Promise<ImageBitmap> {
    return this.executeTask('draw', data);
  }

  /**
   * 执行填充操作
   */
  async fill(data: FillData): Promise<ImageBitmap> {
    return this.executeTask('fill', data);
  }

  /**
   * 应用滤镜
   */
  async applyFilter(data: FilterData): Promise<ImageBitmap> {
    return this.executeTask('filter', data);
  }

  /**
   * 执行变换
   */
  async transform(data: TransformData): Promise<ImageBitmap> {
    return this.executeTask('transform', data);
  }

  /**
   * 执行任务
   */
  private async executeTask(type: string, data: any): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker 未初始化');
    }

    const taskId = `task_${++this.taskCounter}`;

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });

      this.worker!.postMessage({
        type,
        taskId,
        data,
      });

      // 设置超时
      setTimeout(() => {
        if (this.pendingTasks.has(taskId)) {
          this.pendingTasks.delete(taskId);
          reject(new Error('任务执行超时'));
        }
      }, 10000); // 10秒超时
    });
  }

  /**
   * 销毁渲染器
   */
  async destroy(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // 拒绝所有待处理的任务
    this.pendingTasks.forEach(({ reject }) => {
      reject(new Error('渲染器已销毁'));
    });
    this.pendingTasks.clear();

    this.offscreenCanvas = null;
    this.ctx = null;
  }
}
