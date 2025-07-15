# Web Workers 实施文档

## 概述

本项目实施了 Web Workers 来优化画布编辑器的性能，将计算密集型操作从主线程移到后台线程，避免 UI 阻塞，提升用户体验。

## 架构设计

### 核心组件

1. **WorkerManager** - Worker 池管理器
2. **WorkerService** - 主线程调用接口
3. **专用 Workers**：
   - `fillWorker.ts` - 填充算法处理
   - `colorWorker.ts` - 颜色处理
   - `imageWorker.ts` - 图像处理
   - `geometryWorker.ts` - 几何计算

### 文件结构

```
workers/
├── types.ts              # 类型定义
├── WorkerManager.ts       # Worker 池管理
├── fillWorker.ts         # 填充算法 Worker
├── colorWorker.ts        # 颜色处理 Worker
├── imageWorker.ts        # 图像处理 Worker
├── geometryWorker.ts     # 几何计算 Worker
├── index.ts              # 统一导出接口
└── README.md             # 本文档
```

## 功能特性

### 1. 填充算法优化

- **洪水填充 (Flood Fill)**: 基于种子点的区域填充
- **桶填充 (Bucket Fill)**: 批量区域填充
- **性能优化**: 分批处理，避免长时间阻塞

```typescript
// 使用示例
const result = await workerService.floodFill({
  imageData: canvasImageData.data,
  width: canvas.width,
  height: canvas.height,
  startX: clickX,
  startY: clickY,
  fillColor: { r: 255, g: 0, b: 0, a: 255 },
  cellWidth: 10,
  cellHeight: 10,
  tolerance: 0
});
```

### 2. 颜色处理

- **颜色转换**: RGB ↔ RGBA ↔ Hex ↔ HSL
- **颜色混合**: 正片叠底、滤色、正常模式等
- **颜色分析**: 统计、主导色、平均色计算

```typescript
// 颜色转换示例
const result = await workerService.convertColor({
  color: '#FF5733',
  fromFormat: 'hex',
  toFormat: 'rgba'
});

// 颜色混合示例
const blended = await workerService.blendColors({
  baseColor: { r: 255, g: 0, b: 0, a: 255 },
  overlayColor: { r: 0, g: 255, b: 0, a: 128 },
  blendMode: 'multiply'
});
```

### 3. 图像处理

- **图像缩放**: 双线性插值算法
- **滤镜效果**: 模糊、锐化、边缘检测
- **图像变换**: 旋转、翻转、缩放

```typescript
// 图像缩放示例
const scaled = await workerService.resizeImage({
  imageData: originalImageData,
  originalWidth: 800,
  originalHeight: 600,
  targetWidth: 400,
  targetHeight: 300,
  algorithm: 'bilinear'
});
```

### 4. 几何计算

- **基础计算**: 距离、交点、边界
- **路径规划**: 最短路径、TSP、凸包
- **路径优化**: Douglas-Peucker 简化、平滑

```typescript
// 路径优化示例
const optimized = await workerService.optimizePath({
  points: pathPoints,
  algorithm: 'douglas-peucker',
  tolerance: 2.0
});
```

## 性能监控

### 内置监控指标

- **任务执行时间**: 每个操作的耗时统计
- **Worker 利用率**: Worker 池的使用情况
- **内存使用**: 数据传输量监控
- **错误率**: 操作失败率统计

```typescript
// 获取性能统计
const stats = await workerService.getPerformanceStats();
console.log('平均执行时间:', stats.averageExecutionTime);
console.log('Worker 利用率:', stats.workerUtilization);

// 获取 Worker 状态
const status = await workerService.getWorkerStatus();
console.log('活跃 Workers:', status.activeWorkers);
console.log('队列长度:', status.queueLength);
```

## 集成方式

### 1. 在 useCanvas.ts 中的集成

```typescript
import { WorkerService } from '../workers/index';

export function useCanvas() {
  // 初始化 Worker 服务
  const workerService = new WorkerService();
  
  // 修改填充函数使用 Worker
  const performFloodFill = async (x: number, y: number) => {
    // Worker 实现
    const result = await workerService.floodFill({
      // 参数配置
    });
    
    // 处理结果
    if (result.success) {
      // 应用到画布
    }
  };
  
  // 组件销毁时清理
  onUnmounted(() => {
    workerService.destroy();
  });
}
```

### 2. 错误处理和回退机制

```typescript
try {
  // 尝试使用 Worker
  const result = await workerService.floodFill(params);
  // 处理成功结果
} catch (error) {
  console.error('Worker 操作失败:', error);
  // 回退到主线程实现
  performFloodFillFallback(x, y);
}
```

## 配置选项

### Worker 池配置

```typescript
const workerService = new WorkerService({
  maxWorkers: 4,           // 最大 Worker 数量
  idleTimeout: 30000,      // 空闲超时时间 (ms)
  taskTimeout: 10000,      // 任务超时时间 (ms)
  enablePerformanceMonitoring: true  // 启用性能监控
});
```

### 算法参数调优

```typescript
// 填充算法参数
const fillParams = {
  batchSize: 1000,         // 批处理大小
  tolerance: 0,            // 颜色容差
  maxIterations: 10000     // 最大迭代次数
};

// 图像处理参数
const imageParams = {
  quality: 'high',         // 处理质量
  preserveAspectRatio: true // 保持宽高比
};
```

## 测试和调试

### 1. 单元测试

运行 Worker 单元测试：

```bash
npm run test:workers
```

### 2. 性能测试

使用测试页面进行性能测试：

```bash
# 打开测试页面
open test/worker-test.html
```

### 3. 调试工具

- **浏览器开发者工具**: 查看 Worker 线程
- **性能面板**: 分析 Worker 性能
- **控制台日志**: Worker 执行日志

## 兼容性

### 浏览器支持

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+
- IE 10+

### 功能检测

```typescript
if (typeof Worker !== 'undefined') {
  // 支持 Web Workers
  const workerService = new WorkerService();
} else {
  // 回退到主线程实现
  console.warn('浏览器不支持 Web Workers，使用主线程实现');
}
```

## 最佳实践

### 1. 数据传输优化

- 使用 `Transferable Objects` 减少数据复制
- 避免传输大型对象
- 合理使用数据压缩

### 2. Worker 生命周期管理

- 及时销毁不需要的 Worker
- 合理设置 Worker 池大小
- 监控 Worker 内存使用

### 3. 错误处理

- 实现完整的错误处理机制
- 提供回退方案
- 记录详细的错误日志

### 4. 性能优化

- 根据设备性能调整 Worker 数量
- 使用批处理减少通信开销
- 实施智能任务调度

## 故障排除

### 常见问题

1. **Worker 初始化失败**
   - 检查 Worker 文件路径
   - 确认浏览器支持
   - 查看控制台错误信息

2. **性能不如预期**
   - 调整 Worker 池大小
   - 优化数据传输
   - 检查算法实现

3. **内存泄漏**
   - 确保正确销毁 Worker
   - 检查事件监听器清理
   - 监控内存使用情况

### 调试技巧

```typescript
// 启用详细日志
const workerService = new WorkerService({
  debug: true,
  logLevel: 'verbose'
});

// 监听 Worker 事件
workerService.on('workerCreated', (workerId) => {
  console.log('Worker 创建:', workerId);
});

workerService.on('taskCompleted', (taskId, duration) => {
  console.log('任务完成:', taskId, '耗时:', duration);
});
```

## 未来规划

### 短期目标

- [ ] 实施 OffscreenCanvas 支持
- [ ] 添加更多图像滤镜
- [ ] 优化内存使用

### 长期目标

- [ ] WebAssembly 集成
- [ ] GPU 加速支持
- [ ] 分布式计算

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。