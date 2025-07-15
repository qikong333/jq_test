# Canvas 画布系统性能优化文档

## 📋 概述

本文档详细描述了除 Worker 线程渲染和智能 LOD 系统之外，可以提前实施的性能优化方案。这些优化可以在不改变核心架构的前提下显著提升性能，同时为后续的重大架构改造创造更好的基础条件。

## 🚀 立即可实施优化（高ROI，低风险）

### 1. 事件处理系统优化

#### 当前问题

- `handleMouseMove` 节流时间固定，未考虑设备性能差异
- 每次鼠标移动都触发完整的 `render()` 调用
- 存在双重绘制问题
- `fillInterpolatedCells` 性能较差

#### 优化方案

```typescript
// 动态节流调整
const adaptiveThrottle = {
  baseDelay: 16, // 60fps
  maxDelay: 100,
  performanceThreshold: 16.67, // 60fps threshold

  getDelay(lastFrameTime: number): number {
    if (lastFrameTime > this.performanceThreshold * 2) {
      return Math.min(this.maxDelay, this.baseDelay * 2)
    }
    return this.baseDelay
  },
}

// 事件批处理
class EventBatcher {
  private pendingEvents: MouseEvent[] = []
  private batchTimer: number | null = null

  addEvent(event: MouseEvent) {
    this.pendingEvents.push(event)
    if (!this.batchTimer) {
      this.batchTimer = requestAnimationFrame(() => {
        this.processBatch()
        this.batchTimer = null
      })
    }
  }

  private processBatch() {
    // 只处理最后一个事件，或合并连续事件
    const lastEvent = this.pendingEvents[this.pendingEvents.length - 1]
    // 处理逻辑...
    this.pendingEvents = []
  }
}

// 增量渲染
interface DirtyRegion {
  x: number
  y: number
  width: number
  height: number
}

class IncrementalRenderer {
  private dirtyRegions: DirtyRegion[] = []

  markDirty(region: DirtyRegion) {
    this.dirtyRegions.push(region)
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.dirtyRegions.length === 0) return

    // 合并重叠区域
    const mergedRegions = this.mergeRegions(this.dirtyRegions)

    // 只重绘脏区域
    mergedRegions.forEach((region) => {
      ctx.save()
      ctx.beginPath()
      ctx.rect(region.x, region.y, region.width, region.height)
      ctx.clip()
      // 渲染该区域
      ctx.restore()
    })

    this.dirtyRegions = []
  }
}
```

#### 预期收益

- 减少 50-70% 的不必要渲染调用
- 提升鼠标交互响应速度
- 降低 CPU 使用率

### 2. 坐标转换缓存系统

#### 当前问题

- `screenToCanvas`、`pixelToGrid` 等函数频繁调用但无缓存
- 每次鼠标事件都重新计算设备像素比
- 视口变换矩阵每次都重新计算
- 格子边界检查重复进行

#### 优化方案

```typescript
// LRU 缓存实现
class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // 移到最后（最近使用）
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的项
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
}

// 坐标转换缓存
class CoordinateCache {
  private screenToCanvasCache = new LRUCache<string, { x: number; y: number }>(500)
  private pixelToGridCache = new LRUCache<string, { x: number; y: number }>(500)
  private devicePixelRatio: number | null = null
  private lastViewportHash: string = ''
  private cachedTransformMatrix: DOMMatrix | null = null

  getDevicePixelRatio(): number {
    if (this.devicePixelRatio === null) {
      this.devicePixelRatio = window.devicePixelRatio || 1
    }
    return this.devicePixelRatio
  }

  screenToCanvas(x: number, y: number, viewport: ViewportState): { x: number; y: number } {
    const key = `${x},${y},${viewport.zoom},${viewport.panX},${viewport.panY}`
    let result = this.screenToCanvasCache.get(key)

    if (!result) {
      // 计算坐标转换
      result = {
        x: (x - viewport.panX) / viewport.zoom,
        y: (y - viewport.panY) / viewport.zoom,
      }
      this.screenToCanvasCache.set(key, result)
    }

    return result
  }

  getTransformMatrix(viewport: ViewportState): DOMMatrix {
    const currentHash = `${viewport.zoom},${viewport.panX},${viewport.panY}`

    if (this.lastViewportHash !== currentHash || !this.cachedTransformMatrix) {
      this.cachedTransformMatrix = new DOMMatrix()
        .translate(viewport.panX, viewport.panY)
        .scale(viewport.zoom)
      this.lastViewportHash = currentHash
    }

    return this.cachedTransformMatrix
  }

  invalidateCache() {
    this.screenToCanvasCache = new LRUCache(500)
    this.pixelToGridCache = new LRUCache(500)
    this.devicePixelRatio = null
    this.cachedTransformMatrix = null
  }
}
```

#### 预期收益

- 减少 60-80% 的重复坐标计算
- 提升鼠标事件处理性能
- 降低 CPU 计算负载

### 3. 内存管理优化

#### 当前问题

- `CompressedGridStorage` 中颜色字符串重复存储
- `Map` 频繁插入删除可能产生内存碎片
- 缺乏内存监控和自动清理机制
- `getAllPaintedCells()` 每次都重新构建数组

#### 优化方案

```typescript
// 颜色池系统
class ColorPool {
  private colorMap = new Map<string, number>()
  private colorArray: string[] = []
  private nextId = 0

  getColorId(color: string): number {
    let id = this.colorMap.get(color)
    if (id === undefined) {
      id = this.nextId++
      this.colorMap.set(color, id)
      this.colorArray[id] = color
    }
    return id
  }

  getColor(id: number): string {
    return this.colorArray[id]
  }

  getStats() {
    return {
      uniqueColors: this.colorArray.length,
      memoryUsage: this.colorArray.length * 20, // 估算
    }
  }
}

// 对象池
class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn
    this.resetFn = resetFn

    // 预填充池
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn())
    }
  }

  acquire(): T {
    return this.pool.pop() || this.createFn()
  }

  release(obj: T): void {
    this.resetFn(obj)
    this.pool.push(obj)
  }
}

// 内存监控
class MemoryMonitor {
  private lastMemoryUsage = 0
  private memoryThreshold = 100 * 1024 * 1024 // 100MB

  checkMemoryUsage(): MemoryStats {
    const memory = (performance as any).memory
    if (memory) {
      const current = memory.usedJSHeapSize
      const delta = current - this.lastMemoryUsage
      this.lastMemoryUsage = current

      return {
        used: current,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        delta,
        needsCleanup: current > this.memoryThreshold,
      }
    }
    return { used: 0, total: 0, limit: 0, delta: 0, needsCleanup: false }
  }

  shouldTriggerGC(): boolean {
    const stats = this.checkMemoryUsage()
    return stats.needsCleanup || stats.used > stats.total * 0.8
  }
}
```

#### 预期收益

- 减少 40-60% 的内存使用
- 降低垃圾回收频率
- 提升大画布操作性能

### 4. Canvas API 优化

#### 当前问题

- 每次 `render()` 都重新设置 context 属性
- 频繁的 `save()`/`restore()` 调用
- 单一的 `drawGridCells` 方法遍历所有格子
- 没有利用 Canvas 批量绘制 API

#### 优化方案

```typescript
// Canvas 状态缓存
class CanvasStateCache {
  private lastState: {
    fillStyle?: string
    strokeStyle?: string
    lineWidth?: number
    globalAlpha?: number
  } = {}

  setFillStyle(ctx: CanvasRenderingContext2D, style: string) {
    if (this.lastState.fillStyle !== style) {
      ctx.fillStyle = style
      this.lastState.fillStyle = style
    }
  }

  setStrokeStyle(ctx: CanvasRenderingContext2D, style: string) {
    if (this.lastState.strokeStyle !== style) {
      ctx.strokeStyle = style
      this.lastState.strokeStyle = style
    }
  }

  setLineWidth(ctx: CanvasRenderingContext2D, width: number) {
    if (this.lastState.lineWidth !== width) {
      ctx.lineWidth = width
      this.lastState.lineWidth = width
    }
  }

  invalidate() {
    this.lastState = {}
  }
}

// 批量绘制系统
class BatchRenderer {
  private batches = new Map<string, Path2D>()
  private stateCache = new CanvasStateCache()

  addRect(color: string, x: number, y: number, width: number, height: number) {
    let path = this.batches.get(color)
    if (!path) {
      path = new Path2D()
      this.batches.set(color, path)
    }
    path.rect(x, y, width, height)
  }

  flush(ctx: CanvasRenderingContext2D) {
    for (const [color, path] of this.batches) {
      this.stateCache.setFillStyle(ctx, color)
      ctx.fill(path)
    }
    this.batches.clear()
  }
}
```

#### 预期收益

- 减少 30-50% 的 Canvas API 调用
- 提升绘制性能
- 降低状态切换开销

### 5. Vue 响应式系统优化

#### 当前问题

- 大量 `ref` 变量导致不必要的响应式开销
- 频繁的响应式更新触发重新渲染
- 没有使用 `shallowRef` 优化大对象
- `computed` 依赖链可能过于复杂

#### 优化方案

```typescript
// 响应式优化
import { shallowRef, shallowReactive, triggerRef } from 'vue'

// 使用 shallowRef 优化大对象
const gridStorage = shallowRef(new CompressedGridStorage())
const tileManager = shallowRef(new TileManager())

// 批量更新机制
class ReactiveUpdater {
  private pendingUpdates = new Set<() => void>()
  private updateTimer: number | null = null

  scheduleUpdate(updateFn: () => void) {
    this.pendingUpdates.add(updateFn)

    if (!this.updateTimer) {
      this.updateTimer = requestAnimationFrame(() => {
        this.flushUpdates()
        this.updateTimer = null
      })
    }
  }

  private flushUpdates() {
    for (const updateFn of this.pendingUpdates) {
      updateFn()
    }
    this.pendingUpdates.clear()
  }
}

// 非响应式数据分离
class NonReactiveCache {
  // 纯计算数据，不需要响应式
  private coordinateCache = new Map<string, { x: number; y: number }>()
  private transformCache = new Map<string, DOMMatrix>()

  // 手动触发更新
  invalidateAndUpdate(reactiveRef: any) {
    this.coordinateCache.clear()
    this.transformCache.clear()
    triggerRef(reactiveRef)
  }
}
```

#### 预期收益

- 减少 20-40% 的响应式开销
- 提升大数据操作性能
- 降低内存使用

## 🔧 中期实施优化（中等复杂度）

### 6. 渲染管道优化

#### 分层 Canvas 系统

```typescript
class LayeredCanvas {
  private layers: {
    background: HTMLCanvasElement
    grid: HTMLCanvasElement
    ui: HTMLCanvasElement
    overlay: HTMLCanvasElement
  }

  constructor(container: HTMLElement) {
    this.layers = {
      background: this.createLayer(container, 0),
      grid: this.createLayer(container, 1),
      ui: this.createLayer(container, 2),
      overlay: this.createLayer(container, 3),
    }
  }

  private createLayer(container: HTMLElement, zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.zIndex = zIndex.toString()
    container.appendChild(canvas)
    return canvas
  }

  renderLayer(
    layerName: keyof typeof this.layers,
    renderFn: (ctx: CanvasRenderingContext2D) => void,
  ) {
    const canvas = this.layers[layerName]
    const ctx = canvas.getContext('2d')!
    renderFn(ctx)
  }
}
```

### 7. 历史记录系统优化

#### 动作合并和压缩

```typescript
class OptimizedHistoryStorage {
  private actionBatches: ActionBatch[] = []
  private compressionThreshold = 100

  addAction(action: GridAction) {
    const lastBatch = this.actionBatches[this.actionBatches.length - 1]

    if (lastBatch && this.canMerge(lastBatch, action)) {
      this.mergeAction(lastBatch, action)
    } else {
      this.actionBatches.push(new ActionBatch([action]))
    }

    if (this.actionBatches.length > this.compressionThreshold) {
      this.compressHistory()
    }
  }

  private canMerge(batch: ActionBatch, action: GridAction): boolean {
    return (
      batch.type === action.type &&
      Date.now() - batch.timestamp < 1000 && // 1秒内
      batch.actions.length < 50
    ) // 批次大小限制
  }

  private compressHistory() {
    // 压缩旧的历史记录
    const oldBatches = this.actionBatches.slice(0, -50)
    const compressedBatch = this.createSnapshot(oldBatches)
    this.actionBatches = [compressedBatch, ...this.actionBatches.slice(-50)]
  }
}
```

### 8. 算法优化

#### Bresenham 线段算法

```typescript
class BresenhamRenderer {
  static drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    callback: (x: number, y: number) => void,
  ) {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    let x = x0
    let y = y0

    while (true) {
      callback(x, y)

      if (x === x1 && y === y1) break

      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }
  }
}
```

### 9. 性能监控系统

#### 实时性能监控

```typescript
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    renderTime: 0,
    eventLatency: 0,
  }

  private frameCount = 0
  private lastTime = performance.now()
  private frameTimes: number[] = []

  startFrame() {
    return performance.now()
  }

  endFrame(startTime: number) {
    const frameTime = performance.now() - startTime
    this.frameTimes.push(frameTime)

    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }

    this.updateMetrics(frameTime)
  }

  private updateMetrics(frameTime: number) {
    this.frameCount++
    const now = performance.now()

    if (now - this.lastTime >= 1000) {
      this.metrics.fps = this.frameCount
      this.metrics.frameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length

      this.frameCount = 0
      this.lastTime = now

      this.checkPerformanceThresholds()
    }
  }

  private checkPerformanceThresholds() {
    if (this.metrics.fps < 30) {
      this.triggerPerformanceWarning('Low FPS detected')
    }

    if (this.metrics.frameTime > 33) {
      this.triggerPerformanceWarning('High frame time detected')
    }
  }
}
```

## 📋 实施计划

### 第一阶段（1-2周）- 基础优化

1. **事件节流优化**

   - 实现动态节流调整
   - 移除双重绘制问题
   - 添加事件批处理

2. **坐标转换缓存**

   - 实现 LRU 缓存系统
   - 缓存设备像素比
   - 缓存变换矩阵

3. **Canvas 属性缓存**

   - 实现状态缓存机制
   - 减少不必要的属性设置

4. **响应式优化**
   - 使用 `shallowRef` 优化大对象
   - 实现批量更新机制

### 第二阶段（2-3周）- 进阶优化

5. **颜色池和内存管理**

   - 实现颜色池系统
   - 添加对象池
   - 实现内存监控

6. **增量渲染**

   - 实现脏区域标记
   - 添加区域合并算法
   - 优化重绘逻辑

7. **性能监控基础**

   - 实现 FPS 监控
   - 添加内存使用监控
   - 实现性能警告系统

8. **算法优化**
   - 使用 Bresenham 算法替代线性插值
   - 优化碰撞检测

### 第三阶段（3-4周）- 高级优化

9. **批量绘制系统**

   - 实现 Path2D 批量绘制
   - 添加分层 Canvas
   - 优化绘制顺序

10. **历史记录优化**

    - 实现动作合并
    - 添加增量压缩
    - 实现异步处理

11. **完整性能监控**

    - 添加详细的性能指标
    - 实现自适应配置
    - 添加性能分析工具

12. **自适应配置系统**
    - 根据设备性能调整配置
    - 实现性能预算
    - 添加自动降级机制

## 🎯 预期收益

### 立即收益（第一阶段完成后）

- **渲染性能提升**: 20-40%
- **内存使用减少**: 15-25%
- **事件响应速度**: 提升 30-50%
- **CPU 使用率**: 降低 20-30%

### 中期收益（第二阶段完成后）

- **整体性能提升**: 40-60%
- **内存使用减少**: 30-50%
- **大画布操作**: 提升 50-80%
- **用户体验**: 显著改善

### 长期收益（第三阶段完成后）

- **整体性能提升**: 60-100%
- **内存使用减少**: 50-70%
- **系统稳定性**: 大幅提升
- **为后续架构改造奠定基础**: Worker 线程和 LOD 系统

## 🔍 性能测试指标

### 关键性能指标 (KPI)

1. **帧率 (FPS)**: 目标 ≥ 60fps
2. **帧时间**: 目标 ≤ 16.67ms
3. **内存使用**: 减少 50% 以上
4. **事件延迟**: 目标 ≤ 10ms
5. **渲染时间**: 减少 40% 以上

### 测试场景

1. **大画布操作** (10000x10000 格子)
2. **高频鼠标事件** (连续绘制)
3. **复杂历史记录** (1000+ 操作)
4. **内存压力测试** (长时间使用)
5. **多设备兼容性** (不同性能设备)

## 🚨 风险评估

### 低风险优化

- 事件节流优化
- 坐标转换缓存
- Canvas 属性缓存
- 响应式优化

### 中等风险优化

- 增量渲染
- 批量绘制
- 历史记录重构
- 内存管理系统

### 注意事项

1. **向后兼容性**: 确保所有优化不破坏现有功能
2. **渐进式实施**: 分阶段实施，每阶段充分测试
3. **性能监控**: 实时监控优化效果
4. **回滚机制**: 为每个优化准备回滚方案

## 📚 相关文档

- [Canvas API 最佳实践](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Vue 3 性能优化指南](https://vuejs.org/guide/best-practices/performance.html)
- [JavaScript 内存管理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [Web 性能监控](https://web.dev/performance/)

---

_最后更新: 2024年12月_
_版本: 1.0_
_作者: Canvas 性能优化团队_
