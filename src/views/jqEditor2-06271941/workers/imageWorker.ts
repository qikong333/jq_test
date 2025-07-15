// 图像处理 Worker - 处理图像缩放、滤镜和变换等任务

import type {
  WorkerMessage,
  WorkerResponse,
  ImageProcessRequest,
  ImageProcessResponse,
} from './types';

// Worker 上下文类型声明
declare const self: DedicatedWorkerGlobalScope;

class ImageWorker {
  private processingTasks = new Set<string>();

  constructor() {
    self.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.handleMessage(event.data);
    };
  }

  private async handleMessage(message: WorkerMessage): Promise<void> {
    const startTime = performance.now();

    try {
      this.processingTasks.add(message.id);

      let result: any;

      switch (message.type) {
        case 'imageResize':
          result = await this.resizeImage(
            message.payload as ImageProcessRequest,
          );
          break;
        case 'imageFilter':
          result = await this.applyFilter(
            message.payload as ImageProcessRequest,
          );
          break;
        case 'imageTransform':
          result = await this.transformImage(
            message.payload as ImageProcessRequest,
          );
          break;
        default:
          throw new Error(`Unknown task type: ${message.type}`);
      }

      const response: WorkerResponse = {
        id: message.id,
        type: message.type,
        success: true,
        data: result,
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        id: message.id,
        type: message.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      };

      self.postMessage(response);
    } finally {
      this.processingTasks.delete(message.id);
    }
  }

  private async resizeImage(
    request: ImageProcessRequest,
  ): Promise<ImageProcessResponse> {
    const { imageData, options } = request;
    const { width: newWidth, height: newHeight } = options;

    if (!newWidth || !newHeight) {
      throw new Error('Width and height are required for resize operation');
    }

    const { width: oldWidth, height: oldHeight, data: oldData } = imageData;
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

    const scaleX = oldWidth / newWidth;
    const scaleY = oldHeight / newHeight;

    // 使用双线性插值进行缩放
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = x * scaleX;
        const srcY = y * scaleY;

        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, oldWidth - 1);
        const y2 = Math.min(y1 + 1, oldHeight - 1);

        const fx = srcX - x1;
        const fy = srcY - y1;

        const destIndex = (y * newWidth + x) * 4;

        for (let c = 0; c < 4; c++) {
          const p1 = oldData[(y1 * oldWidth + x1) * 4 + c];
          const p2 = oldData[(y1 * oldWidth + x2) * 4 + c];
          const p3 = oldData[(y2 * oldWidth + x1) * 4 + c];
          const p4 = oldData[(y2 * oldWidth + x2) * 4 + c];

          const interpolated =
            p1 * (1 - fx) * (1 - fy) +
            p2 * fx * (1 - fy) +
            p3 * (1 - fx) * fy +
            p4 * fx * fy;

          newData[destIndex + c] = Math.round(interpolated);
        }
      }

      // 每处理10行让出控制权
      if (y % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const processedImageData = new ImageData(newData, newWidth, newHeight);

    return {
      processedImageData,
      metadata: {
        originalSize: { width: oldWidth, height: oldHeight },
        newSize: { width: newWidth, height: newHeight },
        processingTime: performance.now(),
      },
    };
  }

  private async applyFilter(
    request: ImageProcessRequest,
  ): Promise<ImageProcessResponse> {
    const { imageData, options } = request;
    const { filter } = options;

    if (!filter) {
      throw new Error('Filter type is required');
    }

    const { width, height, data } = imageData;
    const newData = new Uint8ClampedArray(data);

    switch (filter) {
      case 'blur':
        await this.applyBlurFilter(newData, width, height);
        break;
      case 'sharpen':
        await this.applySharpenFilter(newData, width, height);
        break;
      case 'edge':
        await this.applyEdgeFilter(newData, width, height);
        break;
      default:
        throw new Error(`Unknown filter: ${filter}`);
    }

    const processedImageData = new ImageData(newData, width, height);

    return {
      processedImageData,
      metadata: {
        originalSize: { width, height },
        newSize: { width, height },
        processingTime: performance.now(),
      },
    };
  }

  private async transformImage(
    request: ImageProcessRequest,
  ): Promise<ImageProcessResponse> {
    const { imageData, options } = request;
    const { transform, angle = 0, scale = 1 } = options;

    if (!transform) {
      throw new Error('Transform type is required');
    }

    const { width, height, data } = imageData;
    let newData: Uint8ClampedArray;
    let newWidth = width;
    let newHeight = height;

    switch (transform) {
      case 'rotate':
        ({
          data: newData,
          width: newWidth,
          height: newHeight,
        } = await this.rotateImage(data, width, height, angle));
        break;
      case 'flip':
        newData = await this.flipImage(
          data,
          width,
          height,
          angle > 0 ? 'horizontal' : 'vertical',
        );
        break;
      case 'scale':
        ({
          data: newData,
          width: newWidth,
          height: newHeight,
        } = await this.scaleImage(data, width, height, scale));
        break;
      default:
        throw new Error(`Unknown transform: ${transform}`);
    }

    const processedImageData = new ImageData(newData, newWidth, newHeight);

    return {
      processedImageData,
      metadata: {
        originalSize: { width, height },
        newSize: { width: newWidth, height: newHeight },
        processingTime: performance.now(),
      },
    };
  }

  // 滤镜实现
  private async applyBlurFilter(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ): Promise<void> {
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ];
    const kernelSum = 16;

    await this.applyConvolution(data, width, height, kernel, kernelSum);
  }

  private async applySharpenFilter(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ): Promise<void> {
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ];
    const kernelSum = 1;

    await this.applyConvolution(data, width, height, kernel, kernelSum);
  }

  private async applyEdgeFilter(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ): Promise<void> {
    const kernel = [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ];
    const kernelSum = 1;

    await this.applyConvolution(data, width, height, kernel, kernelSum);
  }

  private async applyConvolution(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    kernel: number[][],
    kernelSum: number,
  ): Promise<void> {
    const tempData = new Uint8ClampedArray(data);
    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);

    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        for (let c = 0; c < 3; c++) {
          // RGB channels only
          let sum = 0;

          for (let ky = 0; ky < kernelSize; ky++) {
            for (let kx = 0; kx < kernelSize; kx++) {
              const pixelY = y + ky - half;
              const pixelX = x + kx - half;
              const pixelIndex = (pixelY * width + pixelX) * 4 + c;

              sum += tempData[pixelIndex] * kernel[ky][kx];
            }
          }

          const resultIndex = (y * width + x) * 4 + c;
          data[resultIndex] = Math.max(0, Math.min(255, sum / kernelSum));
        }
      }

      // 每处理10行让出控制权
      if (y % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  // 变换实现
  private async rotateImage(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    angle: number,
  ): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // 计算新的图像尺寸
    const newWidth = Math.ceil(Math.abs(width * cos) + Math.abs(height * sin));
    const newHeight = Math.ceil(Math.abs(width * sin) + Math.abs(height * cos));

    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
    const centerX = width / 2;
    const centerY = height / 2;
    const newCenterX = newWidth / 2;
    const newCenterY = newHeight / 2;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // 反向变换
        const dx = x - newCenterX;
        const dy = y - newCenterY;

        const srcX = dx * cos + dy * sin + centerX;
        const srcY = -dx * sin + dy * cos + centerY;

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const x1 = Math.floor(srcX);
          const y1 = Math.floor(srcY);
          const x2 = Math.min(x1 + 1, width - 1);
          const y2 = Math.min(y1 + 1, height - 1);

          const fx = srcX - x1;
          const fy = srcY - y1;

          const destIndex = (y * newWidth + x) * 4;

          for (let c = 0; c < 4; c++) {
            const p1 = data[(y1 * width + x1) * 4 + c];
            const p2 = data[(y1 * width + x2) * 4 + c];
            const p3 = data[(y2 * width + x1) * 4 + c];
            const p4 = data[(y2 * width + x2) * 4 + c];

            const interpolated =
              p1 * (1 - fx) * (1 - fy) +
              p2 * fx * (1 - fy) +
              p3 * (1 - fx) * fy +
              p4 * fx * fy;

            newData[destIndex + c] = Math.round(interpolated);
          }
        }
      }

      // 每处理10行让出控制权
      if (y % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return { data: newData, width: newWidth, height: newHeight };
  }

  private async flipImage(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    direction: 'horizontal' | 'vertical',
  ): Promise<Uint8ClampedArray> {
    const newData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        let destIndex: number;

        if (direction === 'horizontal') {
          destIndex = (y * width + (width - 1 - x)) * 4;
        } else {
          destIndex = ((height - 1 - y) * width + x) * 4;
        }

        for (let c = 0; c < 4; c++) {
          newData[destIndex + c] = data[srcIndex + c];
        }
      }

      // 每处理20行让出控制权
      if (y % 20 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return newData;
  }

  private async scaleImage(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    scale: number,
  ): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

    const scaleX = width / newWidth;
    const scaleY = height / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = x * scaleX;
        const srcY = y * scaleY;

        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);

        const fx = srcX - x1;
        const fy = srcY - y1;

        const destIndex = (y * newWidth + x) * 4;

        for (let c = 0; c < 4; c++) {
          const p1 = data[(y1 * width + x1) * 4 + c];
          const p2 = data[(y1 * width + x2) * 4 + c];
          const p3 = data[(y2 * width + x1) * 4 + c];
          const p4 = data[(y2 * width + x2) * 4 + c];

          const interpolated =
            p1 * (1 - fx) * (1 - fy) +
            p2 * fx * (1 - fy) +
            p3 * (1 - fx) * fy +
            p4 * fx * fy;

          newData[destIndex + c] = Math.round(interpolated);
        }
      }

      // 每处理10行让出控制权
      if (y % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return { data: newData, width: newWidth, height: newHeight };
  }
}

// 初始化 Worker
new ImageWorker();

// 导出类型供 TypeScript 使用
export type { ImageWorker };
