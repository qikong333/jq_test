# OffscreenCanvas 工具库

这是一个用于优化 Canvas 渲染性能的 TypeScript 工具库，提供了 OffscreenCanvas 支持、自动降级渲染、性能监控等功能。

## 功能特性

- ✅ OffscreenCanvas 兼容性检测
- ✅ 自动降级渲染（当不支持 OffscreenCanvas 时）
- ✅ 性能监控和优化
- ✅ 多线程渲染支持
- ✅ 智能任务调度
- ✅ 完整的 TypeScript 类型支持

## 快速开始

### 基本使用

```typescript
import { 
  createOffscreenCanvasManager, 
  checkOffscreenCanvasSupport,
  getRecommendedConfig 
} from './utils/offscreenCanvas';

// 检查浏览器兼容性
const compatibility = checkOffscreenCanvasSupport();
console.log('OffscreenCanvas 支持:', compatibility.isSupported);

// 获取推荐配置
const config = getRecommendedConfig(
  { width: 800, height: 600 }, 
  'medium' // 性能级别: 'low' | 'medium' | 'high'
);

// 创建管理器
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const manager = createOffscreenCanvasManager(canvas, config);

// 初始化
await manager.initialize();

// 执行渲染任务
const result = await manager.addRenderTask({
  type: 'draw',
  data: {
    type: 'line',
    startX: 0,
    startY: 0,
    endX: 100,
    endY: 100,
    color: '#ff0000',
    lineWidth: 2
  },
  priority: 'normal'
});
```

### 高级使用

```typescript
import { 
  OffscreenCanvasManager,
  PerformanceMonitor,
  offscreenDebugger 
} from './utils/offscreenCanvas';

// 创建自定义配置
const customConfig = {
  width: 1920,
  height: 1080,
  enablePerformanceMonitoring: true,
  fallbackThreshold: 85 // CPU 使用率超过 85% 时启用降级
};

const manager = new OffscreenCanvasManager(canvas, customConfig);

// 监听性能警报
manager.performanceMonitor.onPerformanceAlert = (alert) => {
  console.warn('性能警报:', alert.message);
  
  if (alert.severity === 'critical') {
    // 执行紧急优化措施
    manager.clearQueue();
  }
};

// 监听渲染完成
manager.onRenderComplete = (result) => {
  console.log('渲染完成:', result.taskId);
};

// 监听渲染错误
manager.onRenderError = (result) => {
  console.error('渲染错误:', result.error);
  offscreenDebugger.log('error', '渲染失败', result);
};
```

## API 文档

### 主要类

#### OffscreenCanvasManager

主要的管理器类，负责协调所有渲染操作。

**方法:**
- `initialize(): Promise<void>` - 初始化管理器
- `addRenderTask(task): Promise<RenderResult>` - 添加渲染任务
- `getStatus()` - 获取当前状态
- `clearQueue()` - 清空渲染队列
- `destroy()` - 销毁管理器

#### PerformanceMonitor

性能监控器，监控 CPU、内存、渲染时间等指标。

**方法:**
- `start()` - 开始监控
- `stop()` - 停止监控
- `getCurrentMetrics()` - 获取当前性能指标
- `getPerformanceStats()` - 获取性能统计

### 工具函数

- `createOffscreenCanvasManager(canvas, config?)` - 创建管理器的工厂函数
- `checkOffscreenCanvasSupport()` - 检查浏览器兼容性
- `getRecommendedConfig(canvasSize, performanceLevel?)` - 获取推荐配置

### 类型定义

```typescript
interface OffscreenCanvasConfig {
  width: number;
  height: number;
  enablePerformanceMonitoring: boolean;
  fallbackThreshold: number;
  workerPath?: string;
}

interface RenderTask {
  id?: string;
  type: 'draw' | 'fill' | 'filter' | 'transform';
  data: any;
  priority: 'low' | 'normal' | 'high';
}

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  renderTime: number;
  frameRate: number;
  queueLength: number;
  timestamp: number;
}
```

## 渲染任务类型

### 绘制任务 (draw)

```typescript
const drawTask = {
  type: 'draw',
  data: {
    type: 'line' | 'rect' | 'circle' | 'path',
    // 具体参数根据绘制类型而定
    startX: 0,
    startY: 0,
    endX: 100,
    endY: 100,
    color: '#ff0000',
    lineWidth: 2
  }
};
```

### 填充任务 (fill)

```typescript
const fillTask = {
  type: 'fill',
  data: {
    x: 50,
    y: 50,
    color: '#00ff00',
    tolerance: 10
  }
};
```

### 滤镜任务 (filter)

```typescript
const filterTask = {
  type: 'filter',
  data: {
    type: 'blur' | 'brightness' | 'contrast' | 'saturate',
    value: 5 // 具体数值根据滤镜类型而定
  }
};
```

### 变换任务 (transform)

```typescript
const transformTask = {
  type: 'transform',
  data: {
    type: 'scale' | 'rotate' | 'translate',
    // 具体参数根据变换类型而定
    scaleX: 1.5,
    scaleY: 1.5,
    angle: 45,
    translateX: 10,
    translateY: 10
  }
};
```

## 性能优化建议

1. **合理设置性能阈值**: 根据目标设备性能调整 `fallbackThreshold`
2. **批量处理任务**: 避免频繁的单个任务提交
3. **监控性能指标**: 及时响应性能警报
4. **使用适当的优先级**: 重要任务使用 'high' 优先级
5. **定期清理队列**: 在适当时机清空不必要的任务

## 浏览器兼容性

- ✅ Chrome 69+
- ✅ Firefox 105+
- ✅ Safari 16.4+
- ✅ Edge 79+

不支持 OffscreenCanvas 的浏览器会自动降级到主线程渲染。

## 调试

```typescript
import { offscreenDebugger } from './utils/offscreenCanvas';

// 查看调试日志
const logs = offscreenDebugger.getLogs();
console.log(logs);

// 导出日志
const logData = offscreenDebugger.exportLogs();

// 清空日志
offscreenDebugger.clearLogs();
```

## 版本信息

当前版本: 1.0.0

## 许可证

MIT License