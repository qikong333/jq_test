/**
 * 降级渲染器
 * 为不支持 OffscreenCanvas 的浏览器提供兼容性渲染
 */

import { OffscreenCanvasConfig } from './OffscreenCanvasManager';
import {
  DrawData,
  FillData,
  FilterData,
  TransformData,
} from './OffscreenRenderer';

export class FallbackRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: OffscreenCanvasConfig;
  private renderQueue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private frameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: OffscreenCanvasConfig) {
    this.canvas = canvas;
    this.config = config;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = context;
  }

  /**
   * 初始化降级渲染器
   */
  async initialize(): Promise<void> {
    // 设置画布属性
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;

    // 启用图像平滑
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // 启动渲染循环
    this.startRenderLoop();

    // console.log('降级渲染器初始化完成');
  }

  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    const renderLoop = async () => {
      if (this.renderQueue.length > 0 && !this.isProcessing) {
        this.isProcessing = true;

        try {
          // 批量处理渲染任务（最多3个）
          const batchSize = Math.min(3, this.renderQueue.length);
          const batch = this.renderQueue.splice(0, batchSize);

          for (const task of batch) {
            await task();
          }
        } catch (error) {
          console.error('降级渲染任务执行失败:', error);
        } finally {
          this.isProcessing = false;
        }
      }

      this.frameId = requestAnimationFrame(renderLoop);
    };

    this.frameId = requestAnimationFrame(renderLoop);
  }

  /**
   * 执行绘制操作
   */
  async draw(data: DrawData): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.ctx.save();

          // 设置绘制样式
          this.ctx.strokeStyle = data.color;
          this.ctx.lineWidth = data.lineWidth;

          if (data.fillStyle) {
            this.ctx.fillStyle = data.fillStyle;
          }

          this.ctx.beginPath();

          // 根据绘制类型执行相应操作
          switch (data.type) {
            case 'line':
              this.drawLine(data.points);
              break;
            case 'rect':
              this.drawRect(data.points);
              break;
            case 'circle':
              this.drawCircle(data.points);
              break;
            case 'path':
              this.drawPath(data.points);
              break;
            default:
              throw new Error(`未知的绘制类型: ${data.type}`);
          }

          // 执行绘制
          if (data.fillStyle) {
            this.ctx.fill();
          }
          this.ctx.stroke();

          this.ctx.restore();

          // 返回 ImageData
          const imageData = this.ctx.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
          );
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };

      this.renderQueue.push(task);
    });
  }

  /**
   * 绘制线条
   */
  private drawLine(points: { x: number; y: number }[]): void {
    if (points.length >= 2) {
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
    }
  }

  /**
   * 绘制矩形
   */
  private drawRect(points: { x: number; y: number }[]): void {
    if (points.length >= 2) {
      const width = points[1].x - points[0].x;
      const height = points[1].y - points[0].y;
      this.ctx.rect(points[0].x, points[0].y, width, height);
    }
  }

  /**
   * 绘制圆形
   */
  private drawCircle(points: { x: number; y: number }[]): void {
    if (points.length >= 2) {
      const centerX = points[0].x;
      const centerY = points[0].y;
      const radius = Math.sqrt(
        Math.pow(points[1].x - centerX, 2) + Math.pow(points[1].y - centerY, 2),
      );
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    }
  }

  /**
   * 绘制路径
   */
  private drawPath(points: { x: number; y: number }[]): void {
    if (points.length > 0) {
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
    }
  }

  /**
   * 执行填充操作
   */
  async fill(data: FillData): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          // 将 ImageData 绘制到画布
          this.ctx.putImageData(data.imageData, 0, 0);

          // 执行洪水填充
          const imageData = this.ctx.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
          );
          const filledData = this.floodFill(
            imageData,
            data.x,
            data.y,
            data.color,
            data.tolerance,
          );

          this.ctx.putImageData(filledData, 0, 0);
          resolve(filledData);
        } catch (error) {
          reject(error);
        }
      };

      this.renderQueue.push(task);
    });
  }

  /**
   * 洪水填充算法
   */
  private floodFill(
    imageData: ImageData,
    startX: number,
    startY: number,
    fillColor: string,
    tolerance: number,
  ): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // 解析填充颜色
    const fillRgb = this.hexToRgb(fillColor);
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

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;

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
          Math.pow(b - startB, 2),
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

  /**
   * 应用滤镜
   */
  async applyFilter(data: FilterData): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.ctx.putImageData(data.imageData, 0, 0);

          // 创建临时画布用于滤镜处理
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = this.canvas.width;
          tempCanvas.height = this.canvas.height;
          const tempCtx = tempCanvas.getContext('2d')!;

          // 应用滤镜
          switch (data.type) {
            case 'blur':
              tempCtx.filter = `blur(${data.value}px)`;
              break;
            case 'brightness':
              tempCtx.filter = `brightness(${data.value}%)`;
              break;
            case 'contrast':
              tempCtx.filter = `contrast(${data.value}%)`;
              break;
            case 'saturation':
              tempCtx.filter = `saturate(${data.value}%)`;
              break;
            default:
              throw new Error(`未知的滤镜类型: ${data.type}`);
          }

          tempCtx.drawImage(this.canvas, 0, 0);
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.drawImage(tempCanvas, 0, 0);

          const result = this.ctx.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.renderQueue.push(task);
    });
  }

  /**
   * 执行变换
   */
  async transform(data: TransformData): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.ctx.putImageData(data.imageData, 0, 0);

          // 创建临时画布用于变换处理
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = this.canvas.width;
          tempCanvas.height = this.canvas.height;
          const tempCtx = tempCanvas.getContext('2d')!;

          tempCtx.drawImage(this.canvas, 0, 0);

          this.ctx.save();
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

          // 应用变换
          switch (data.type) {
            case 'scale':
              this.ctx.scale(data.value as number, data.value as number);
              break;
            case 'rotate':
              this.ctx.rotate(((data.value as number) * Math.PI) / 180);
              break;
            case 'translate':
              const translateValue = data.value as { x: number; y: number };
              this.ctx.translate(translateValue.x, translateValue.y);
              break;
            default:
              throw new Error(`未知的变换类型: ${data.type}`);
          }

          this.ctx.drawImage(tempCanvas, 0, 0);
          this.ctx.restore();

          const result = this.ctx.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.renderQueue.push(task);
    });
  }

  /**
   * 颜色转换工具
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * 获取渲染器状态
   */
  getStatus() {
    return {
      queueLength: this.renderQueue.length,
      isProcessing: this.isProcessing,
      canvasSize: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
    };
  }

  /**
   * 清空渲染队列
   */
  clearQueue(): void {
    this.renderQueue = [];
  }

  /**
   * 销毁渲染器
   */
  async destroy(): Promise<void> {
    this.clearQueue();

    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
