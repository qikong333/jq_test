// 填充算法 Worker - 处理油漆桶填充等计算密集型任务

import type {
  WorkerMessage,
  WorkerResponse,
  FloodFillRequest,
  FloodFillResponse,
} from './types';

// Worker 上下文类型声明
declare const self: DedicatedWorkerGlobalScope;

class FillWorker {
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
        case 'floodFill':
          result = await this.performFloodFill(
            message.payload as FloodFillRequest,
          );
          break;
        case 'bucketFill':
          result = await this.performBucketFill(message.payload);
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

  private async performFloodFill(
    request: FloodFillRequest,
  ): Promise<FloodFillResponse> {
    const {
      imageData,
      startX,
      startY,
      targetColor,
      fillColor,
      tolerance,
      gridSize,
    } = request;

    const { width, height, data } = imageData;
    const modifiedPixels: Array<{ x: number; y: number }> = [];
    const affectedCells: Array<{ x: number; y: number }> = [];
    const visited = new Set<string>();
    const stack: Array<{ x: number; y: number }> = [];

    let processedPixels = 0;
    const maxPixels = width * height;
    const batchSize = 1000; // 每批处理1000个像素

    // 检查起始点颜色
    const startIndex = (startY * width + startX) * 4;
    const startColor: [number, number, number, number] = [
      data[startIndex],
      data[startIndex + 1],
      data[startIndex + 2],
      data[startIndex + 3],
    ];

    // 如果起始颜色与目标颜色相同，直接返回
    if (this.colorsEqual(startColor, fillColor, tolerance)) {
      return { modifiedPixels, affectedCells, processedPixels: 0 };
    }

    stack.push({ x: startX, y: startY });

    while (stack.length > 0 && processedPixels < maxPixels) {
      const batchStart = performance.now();
      let batchCount = 0;

      // 批量处理
      while (stack.length > 0 && batchCount < batchSize) {
        const { x, y } = stack.pop()!;
        const key = `${x},${y}`;

        if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
          continue;
        }

        visited.add(key);
        const index = (y * width + x) * 4;
        const currentColor: [number, number, number, number] = [
          data[index],
          data[index + 1],
          data[index + 2],
          data[index + 3],
        ];

        // 检查颜色是否匹配
        if (!this.colorsEqual(currentColor, targetColor, tolerance)) {
          continue;
        }

        // 填充像素
        data[index] = fillColor[0];
        data[index + 1] = fillColor[1];
        data[index + 2] = fillColor[2];
        data[index + 3] = fillColor[3];

        modifiedPixels.push({ x, y });
        processedPixels++;
        batchCount++;

        // 计算受影响的网格单元
        const cellX = Math.floor(x / gridSize);
        const cellY = Math.floor(y / gridSize);
        const cellKey = `${cellX},${cellY}`;

        if (
          !affectedCells.some((cell) => cell.x === cellX && cell.y === cellY)
        ) {
          affectedCells.push({ x: cellX, y: cellY });
        }

        // 添加相邻像素到栈
        const neighbors = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
        ];

        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.x},${neighbor.y}`;
          if (!visited.has(neighborKey)) {
            stack.push(neighbor);
          }
        }
      }

      // 每批处理后让出控制权，避免阻塞
      if (performance.now() - batchStart > 16) {
        // 超过16ms
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      modifiedPixels,
      affectedCells,
      processedPixels,
    };
  }

  private async performBucketFill(request: any): Promise<any> {
    // 简化的桶填充算法
    const { imageData, startX, startY, fillColor, tolerance = 0 } = request;
    const { width, height, data } = imageData;

    const startIndex = (startY * width + startX) * 4;
    const targetColor: [number, number, number, number] = [
      data[startIndex],
      data[startIndex + 1],
      data[startIndex + 2],
      data[startIndex + 3],
    ];

    const modifiedPixels: Array<{ x: number; y: number }> = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }

      const index = (y * width + x) * 4;
      const currentColor: [number, number, number, number] = [
        data[index],
        data[index + 1],
        data[index + 2],
        data[index + 3],
      ];

      if (!this.colorsEqual(currentColor, targetColor, tolerance)) {
        continue;
      }

      visited.add(key);

      // 填充像素
      data[index] = fillColor[0];
      data[index + 1] = fillColor[1];
      data[index + 2] = fillColor[2];
      data[index + 3] = fillColor[3];

      modifiedPixels.push({ x, y });

      // 添加相邻像素
      queue.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      );

      // 每处理100个像素让出一次控制权
      if (modifiedPixels.length % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      modifiedPixels,
      processedPixels: modifiedPixels.length,
    };
  }

  private colorsEqual(
    color1: [number, number, number, number],
    color2: [number, number, number, number],
    tolerance: number,
  ): boolean {
    if (tolerance === 0) {
      return (
        color1[0] === color2[0] &&
        color1[1] === color2[1] &&
        color1[2] === color2[2] &&
        color1[3] === color2[3]
      );
    }

    const dr = Math.abs(color1[0] - color2[0]);
    const dg = Math.abs(color1[1] - color2[1]);
    const db = Math.abs(color1[2] - color2[2]);
    const da = Math.abs(color1[3] - color2[3]);

    return (
      dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance
    );
  }

  private calculateColorDistance(
    color1: [number, number, number, number],
    color2: [number, number, number, number],
  ): number {
    const dr = color1[0] - color2[0];
    const dg = color1[1] - color2[1];
    const db = color1[2] - color2[2];
    const da = color1[3] - color2[3];

    return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
  }
}

// 初始化 Worker
new FillWorker();

// 导出类型供 TypeScript 使用
export type { FillWorker };
