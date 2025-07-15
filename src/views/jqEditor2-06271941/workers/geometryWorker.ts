// 几何计算 Worker - 处理复杂的几何计算和路径优化任务

import type {
  WorkerMessage,
  WorkerResponse,
  GeometryCalculationRequest,
  GeometryCalculationResponse,
} from './types';

// Worker 上下文类型声明
declare const self: DedicatedWorkerGlobalScope;

interface Point {
  x: number;
  y: number;
}

interface Line {
  start: Point;
  end: Point;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

class GeometryWorker {
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
        case 'geometryCalculate':
          result = await this.performGeometryCalculation(
            message.payload as GeometryCalculationRequest,
          );
          break;
        case 'pathOptimize':
          result = await this.optimizePath(message.payload);
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

  private async performGeometryCalculation(
    request: GeometryCalculationRequest,
  ): Promise<GeometryCalculationResponse> {
    const { operation, points, options } = request;
    const precision = options?.precision || 2;
    let result: any;
    let computationComplexity = 0;

    switch (operation) {
      case 'distance':
        result = await this.calculateDistances(points, precision);
        computationComplexity = (points.length * (points.length - 1)) / 2;
        break;
      case 'intersection':
        result = await this.findIntersections(points, precision);
        computationComplexity = Math.pow(points.length / 2, 2);
        break;
      case 'bounds':
        result = await this.calculateBounds(points, precision);
        computationComplexity = points.length;
        break;
      case 'path':
        result = await this.calculatePath(
          points,
          options?.algorithm || 'shortest',
        );
        computationComplexity = points.length * Math.log(points.length);
        break;
      default:
        throw new Error(`Unknown geometry operation: ${operation}`);
    }

    return {
      result,
      computationComplexity,
    };
  }

  private async calculateDistances(
    points: Point[],
    precision: number,
  ): Promise<any> {
    const distances: Array<{ from: number; to: number; distance: number }> = [];
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const distance = this.euclideanDistance(points[i], points[j]);
        distances.push({
          from: i,
          to: j,
          distance: Number(distance.toFixed(precision)),
        });

        processed++;

        // 每处理一批后让出控制权
        if (processed % batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    return {
      distances,
      totalPairs: distances.length,
      averageDistance:
        distances.reduce((sum, d) => sum + d.distance, 0) / distances.length,
      minDistance: Math.min(...distances.map((d) => d.distance)),
      maxDistance: Math.max(...distances.map((d) => d.distance)),
    };
  }

  private async findIntersections(
    points: Point[],
    precision: number,
  ): Promise<any> {
    if (points.length % 2 !== 0) {
      throw new Error(
        'Points array must have even length for intersection calculation',
      );
    }

    const lines: Line[] = [];
    for (let i = 0; i < points.length; i += 2) {
      lines.push({
        start: points[i],
        end: points[i + 1],
      });
    }

    const intersections: Array<{
      line1: number;
      line2: number;
      point: Point | null;
    }> = [];
    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const intersection = this.lineIntersection(
          lines[i],
          lines[j],
          precision,
        );
        intersections.push({
          line1: i,
          line2: j,
          point: intersection,
        });

        processed++;

        if (processed % batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    const validIntersections = intersections.filter((i) => i.point !== null);

    return {
      intersections: validIntersections,
      totalChecked: intersections.length,
      intersectionCount: validIntersections.length,
    };
  }

  private async calculateBounds(
    points: Point[],
    precision: number,
  ): Promise<any> {
    if (points.length === 0) {
      return null;
    }

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    const batchSize = 1000;

    for (let i = 1; i < points.length; i++) {
      const point = points[i];

      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;

      // 每处理一批后让出控制权
      if (i % batchSize === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const bounds: Rectangle = {
      x: Number(minX.toFixed(precision)),
      y: Number(minY.toFixed(precision)),
      width: Number((maxX - minX).toFixed(precision)),
      height: Number((maxY - minY).toFixed(precision)),
    };

    return {
      bounds,
      center: {
        x: Number(((minX + maxX) / 2).toFixed(precision)),
        y: Number(((minY + maxY) / 2).toFixed(precision)),
      },
      area: bounds.width * bounds.height,
      perimeter: 2 * (bounds.width + bounds.height),
    };
  }

  private async calculatePath(
    points: Point[],
    algorithm: string,
  ): Promise<any> {
    switch (algorithm) {
      case 'shortest':
        return await this.calculateShortestPath(points);
      case 'tsp':
        return await this.solveTSP(points);
      case 'convexHull':
        return await this.calculateConvexHull(points);
      default:
        throw new Error(`Unknown path algorithm: ${algorithm}`);
    }
  }

  private async calculateShortestPath(points: Point[]): Promise<any> {
    if (points.length < 2) {
      return { path: points, totalDistance: 0 };
    }

    // 使用贪心算法找最短路径
    const visited = new Set<number>();
    const path: Point[] = [];
    let totalDistance = 0;

    // 从第一个点开始
    let currentIndex = 0;
    visited.add(currentIndex);
    path.push(points[currentIndex]);

    while (visited.size < points.length) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;

      // 找到最近的未访问点
      for (let i = 0; i < points.length; i++) {
        if (!visited.has(i)) {
          const distance = this.euclideanDistance(
            points[currentIndex],
            points[i],
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }
      }

      if (nearestIndex !== -1) {
        visited.add(nearestIndex);
        path.push(points[nearestIndex]);
        totalDistance += nearestDistance;
        currentIndex = nearestIndex;
      }

      // 每处理10个点让出控制权
      if (visited.size % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      path,
      totalDistance: Number(totalDistance.toFixed(2)),
      pathLength: path.length,
    };
  }

  private async solveTSP(points: Point[]): Promise<any> {
    if (points.length <= 3) {
      return await this.calculateShortestPath(points);
    }

    // 简化的TSP求解 - 使用2-opt改进
    let bestPath = [...points];
    let bestDistance = this.calculateTotalDistance(bestPath);
    let improved = true;
    let iterations = 0;
    const maxIterations = Math.min(1000, points.length * 10);

    while (improved && iterations < maxIterations) {
      improved = false;

      for (let i = 1; i < points.length - 2; i++) {
        for (let j = i + 1; j < points.length; j++) {
          if (j - i === 1) continue; // 跳过相邻边

          const newPath = this.twoOptSwap(bestPath, i, j);
          const newDistance = this.calculateTotalDistance(newPath);

          if (newDistance < bestDistance) {
            bestPath = newPath;
            bestDistance = newDistance;
            improved = true;
          }
        }

        // 每处理一定数量的边让出控制权
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      iterations++;
    }

    return {
      path: bestPath,
      totalDistance: Number(bestDistance.toFixed(2)),
      iterations,
      pathLength: bestPath.length,
    };
  }

  private async calculateConvexHull(points: Point[]): Promise<any> {
    if (points.length < 3) {
      return { hull: points, area: 0 };
    }

    // Graham扫描算法
    const sortedPoints = [...points].sort((a, b) => {
      if (a.x === b.x) return a.y - b.y;
      return a.x - b.x;
    });

    const cross = (o: Point, a: Point, b: Point): number => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };

    // 构建下凸包
    const lower: Point[] = [];
    for (let i = 0; i < sortedPoints.length; i++) {
      while (
        lower.length >= 2 &&
        cross(
          lower[lower.length - 2],
          lower[lower.length - 1],
          sortedPoints[i],
        ) <= 0
      ) {
        lower.pop();
      }
      lower.push(sortedPoints[i]);

      if (i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 构建上凸包
    const upper: Point[] = [];
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
      while (
        upper.length >= 2 &&
        cross(
          upper[upper.length - 2],
          upper[upper.length - 1],
          sortedPoints[i],
        ) <= 0
      ) {
        upper.pop();
      }
      upper.push(sortedPoints[i]);

      if ((sortedPoints.length - i) % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 移除重复点
    lower.pop();
    upper.pop();

    const hull = lower.concat(upper);
    const area = this.calculatePolygonArea(hull);

    return {
      hull,
      area: Number(area.toFixed(2)),
      perimeter: Number(
        this.calculateTotalDistance(hull.concat([hull[0]])).toFixed(2),
      ),
      vertexCount: hull.length,
    };
  }

  private async optimizePath(request: any): Promise<any> {
    const { points, options } = request;
    const algorithm = options?.algorithm || 'douglas-peucker';
    const tolerance = options?.tolerance || 1.0;

    switch (algorithm) {
      case 'douglas-peucker':
        return await this.douglasPeuckerSimplify(points, tolerance);
      case 'smooth':
        return await this.smoothPath(points, options?.smoothingFactor || 0.5);
      default:
        throw new Error(`Unknown path optimization algorithm: ${algorithm}`);
    }
  }

  private async douglasPeuckerSimplify(
    points: Point[],
    tolerance: number,
  ): Promise<any> {
    if (points.length <= 2) {
      return { simplifiedPath: points, reductionRatio: 0 };
    }

    const simplify = async (
      pts: Point[],
      epsilon: number,
    ): Promise<Point[]> => {
      if (pts.length <= 2) return pts;

      let maxDistance = 0;
      let maxIndex = 0;

      // 找到距离起点和终点连线最远的点
      for (let i = 1; i < pts.length - 1; i++) {
        const distance = this.pointToLineDistance(
          pts[i],
          pts[0],
          pts[pts.length - 1],
        );
        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndex = i;
        }

        if (i % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (maxDistance > epsilon) {
        // 递归简化两段
        const left = await simplify(pts.slice(0, maxIndex + 1), epsilon);
        const right = await simplify(pts.slice(maxIndex), epsilon);

        // 合并结果，移除重复点
        return left.slice(0, -1).concat(right);
      } else {
        // 保留起点和终点
        return [pts[0], pts[pts.length - 1]];
      }
    };

    const simplifiedPath = await simplify(points, tolerance);
    const reductionRatio =
      (points.length - simplifiedPath.length) / points.length;

    return {
      simplifiedPath,
      originalLength: points.length,
      simplifiedLength: simplifiedPath.length,
      reductionRatio: Number(reductionRatio.toFixed(3)),
    };
  }

  private async smoothPath(
    points: Point[],
    smoothingFactor: number,
  ): Promise<any> {
    if (points.length < 3) {
      return { smoothedPath: points };
    }

    const smoothedPath: Point[] = [points[0]]; // 保留第一个点

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // 使用加权平均进行平滑
      const smoothedX =
        curr.x * (1 - smoothingFactor) +
        ((prev.x + next.x) * smoothingFactor) / 2;
      const smoothedY =
        curr.y * (1 - smoothingFactor) +
        ((prev.y + next.y) * smoothingFactor) / 2;

      smoothedPath.push({
        x: Number(smoothedX.toFixed(2)),
        y: Number(smoothedY.toFixed(2)),
      });

      if (i % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    smoothedPath.push(points[points.length - 1]); // 保留最后一个点

    return {
      smoothedPath,
      originalLength: points.length,
      smoothedLength: smoothedPath.length,
    };
  }

  // 辅助方法
  private euclideanDistance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private lineIntersection(
    line1: Line,
    line2: Line,
    precision: number,
  ): Point | null {
    const x1 = line1.start.x;
    const y1 = line1.start.y;
    const x2 = line1.end.x;
    const y2 = line1.end.y;
    const x3 = line2.start.x;
    const y3 = line2.start.y;
    const x4 = line2.end.x;
    const y4 = line2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denom) < 1e-10) {
      return null; // 平行线
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: Number((x1 + t * (x2 - x1)).toFixed(precision)),
        y: Number((y1 + t * (y2 - y1)).toFixed(precision)),
      };
    }

    return null;
  }

  private pointToLineDistance(
    point: Point,
    lineStart: Point,
    lineEnd: Point,
  ): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return this.euclideanDistance(point, lineStart);
    }

    const param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateTotalDistance(path: Point[]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += this.euclideanDistance(path[i], path[i + 1]);
    }
    return total;
  }

  private twoOptSwap(path: Point[], i: number, j: number): Point[] {
    const newPath = [...path];

    // 反转i到j之间的路径
    while (i < j) {
      [newPath[i], newPath[j]] = [newPath[j], newPath[i]];
      i++;
      j--;
    }

    return newPath;
  }

  private calculatePolygonArea(vertices: Point[]): number {
    if (vertices.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }

    return Math.abs(area) / 2;
  }
}

// 初始化 Worker
new GeometryWorker();

// 导出类型供 TypeScript 使用
export type { GeometryWorker };
