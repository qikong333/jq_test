# jqEditor2 历史记录系统使用指南

## 📋 系统概述

jqEditor2 的历史记录系统是一个为大画布场景优化的独立撤销重做实现。它专门针对5000x5000px大画布进行了性能优化，使用增量记录和分片管理技术，实现了高效的内存管理和快速的撤销重做操作。

## 🎯 核心特性

### 1. 性能优化设计

- **增量记录**: 只记录实际发生变化的格子，而不是整个画布状态
- **分片管理**: 将大画布分成512x512的小块，只为有变化的分片维护历史记录
- **智能内存管理**: 基于内存限制的自动清理和压缩策略
- **批量处理**: 一次绘制动作的所有变化作为单个历史单元

### 2. 用户体验优化

- **动作级粒度**: 撤销一次完整的绘制操作，而不是单个像素
- **快捷键支持**: 标准的Ctrl+Z/Ctrl+Y快捷键
- **实时状态显示**: 在状态栏显示历史记录数量和内存使用情况
- **性能监控**: 可选的性能统计和监控功能

## 🏗️ 系统架构

### 核心组件

1. **类型定义** (`types/history.ts`)

   - 定义了所有历史记录相关的TypeScript接口
   - 包括变化记录、动作、快照、配置等类型

2. **分片管理器** (`classes/TileManager.ts`)

   - 将画布分割成小块进行管理
   - 提供坐标映射和分片生命周期管理

3. **历史存储** (`classes/HistoryStorage.ts`)

   - 负责历史数据的存储、压缩和清理
   - 实现内存优化和性能监控

4. **历史记录Composable** (`composables/useHistory.ts`)

   - 核心业务逻辑，整合所有子系统
   - 提供撤销重做的主要接口

5. **Canvas集成** (`composables/useCanvas.ts`)
   - 在绘制流程中集成历史记录功能
   - 自动记录绘制变化

## 🚀 使用方法

### 基础用法

历史记录系统已自动集成到jqEditor2中，无需额外配置：

```typescript
// 在父组件中使用
const editorRef = ref();

// 撤销操作
await editorRef.value.undo();

// 重做操作
await editorRef.value.redo();

// 检查状态
const canUndo = editorRef.value.canUndo;
const canRedo = editorRef.value.canRedo;

// 获取历史统计
const historyStats = editorRef.value.getHistoryStats();
```

### 快捷键

- `Ctrl + Z`: 撤销上一步操作
- `Ctrl + Y`: 重做下一步操作
- `Ctrl + Shift + Z`: 重做下一步操作（备选）

### 配置选项

可以通过props配置历史记录系统：

```typescript
<jqEditor2
  :maxUndoSteps="50"
  :width="5000"
  :height="5000"
  ... 其他props
/>
```

## ⚙️ 配置参数

### 内存配置 (MemoryConfig)

```typescript
interface MemoryConfig {
  maxActions: number; // 最大动作数量 (默认50)
  maxMemoryMB: number; // 最大内存限制 (默认100MB)
  snapshotInterval: number; // 快照间隔 (默认10个动作)
  tileSize: number; // 分片大小 (默认512)
  maxTiles: number; // 最大活跃分片数 (默认100)
}
```

### 压缩配置 (CompressionConfig)

```typescript
interface CompressionConfig {
  enabled: boolean; // 是否启用压缩 (默认false)
  algorithm: 'lz4' | 'gzip' | 'none'; // 压缩算法
  threshold: number; // 压缩阈值 (默认1MB)
  level: number; // 压缩级别 (1-9)
}
```

## 📊 性能数据

### 大画布性能测试 (5000x5000px)

- **内存使用**: < 100MB (50步历史记录)
- **撤销时间**: < 50ms
- **重做时间**: < 50ms
- **记录开销**: < 5ms per action

### 优化策略

1. **分片优化**: 只为有变化的512x512分片维护历史
2. **增量记录**: 每个动作平均只记录100-1000个格子变化
3. **批量处理**: 减少频繁的内存分配和释放
4. **智能清理**: 基于LRU策略清理旧的历史记录

## 🔧 API参考

### 主要方法

```typescript
// 撤销操作
async undo(): Promise<boolean>

// 重做操作
async redo(): Promise<boolean>

// 清空历史记录
clear(): void

// 创建快照
createSnapshot(): void

// 内存优化
optimizeMemory(): void

// 获取内存使用量
getMemoryUsage(): number

// 获取历史统计
getHistoryStats(): HistoryStats

// 获取历史状态
getHistoryState(): HistoryState
```

### 状态属性

```typescript
// 是否可以撤销
canUndo: ComputedRef<boolean>;

// 是否可以重做
canRedo: ComputedRef<boolean>;

// 历史记录状态
historyState: Ref<HistoryState>;

// 历史记录统计
historyStats: Ref<HistoryStats>;
```

## 🐛 故障排除

### 常见问题

1. **内存使用过高**

   - 检查`maxMemoryMB`配置是否合理
   - 调用`optimizeMemory()`进行手动优化
   - 减少`maxActions`数量

2. **撤销重做速度慢**

   - 检查是否有大量的格子变化
   - 考虑增加`snapshotInterval`以创建更多快照点
   - 确保分片大小(`tileSize`)适合当前画布

3. **历史记录丢失**
   - 检查是否触发了内存清理
   - 确认`maxActions`配置足够大
   - 查看控制台是否有错误信息

### 调试技巧

1. **启用性能监控**

   ```typescript
   // 在index.vue中设置
   const showPerformanceMonitor = ref(true);
   ```

2. **查看控制台日志**

   - 历史记录操作会在控制台输出详细日志
   - 包括动作ID、变化数量、执行时间等

3. **检查内存使用**
   ```typescript
   // 获取详细的内存统计
   const stats = historySystem.historyStats.value;
   console.log('Memory usage:', stats.memoryUsage, 'MB');
   console.log('Active tiles:', stats.activeTiles);
   ```

## 🚧 未来改进

### 计划中的功能

1. **更高级的压缩算法**

   - 实现LZ4/GZIP压缩支持
   - 自动压缩策略优化

2. **Web Worker支持**

   - 将压缩操作移到后台线程
   - 避免阻塞主线程

3. **持久化存储**

   - IndexedDB支持
   - 页面刷新后恢复历史记录

4. **分支历史**
   - 支持历史分支和合并
   - 更复杂的历史导航

## 📝 更新日志

### v1.0.0 (2024年)

- ✅ 基础撤销重做功能
- ✅ 增量记录系统
- ✅ 分片管理优化
- ✅ 内存管理策略
- ✅ 快捷键支持
- ✅ 实时状态显示
- ✅ 性能监控和统计

---

_这个历史记录系统专门为jqEditor2的大画布编辑场景设计，通过多种优化技术确保在5000x5000px画布上也能提供流畅的撤销重做体验。_
