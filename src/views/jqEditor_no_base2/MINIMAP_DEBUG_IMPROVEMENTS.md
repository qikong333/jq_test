# 🔍 缩略图拖拽调试改进

## 📋 问题持续反馈

用户反馈：**缩略图虚拟框拖动时还是存在bug**

## 🛠️ 新增调试功能

### 1. 调试日志系统

添加了详细的调试信息输出：

```typescript
// 开始拖拽时
console.log('🎯 开始拖拽视口', {
  mouse: viewportDragStart.value,
  initialPan: initialViewportState.value.pan,
  currentZoom: initialViewportState.value.zoom,
  scale: scale.value,
});

// 拖拽过程中
console.log('🖱️ 拖拽中', {
  totalDelta: { x: totalDeltaX, y: totalDeltaY },
  canvasDelta: { x: canvasDeltaX, y: canvasDeltaY },
  newPan: { x: newPanX, y: newPanY },
  boundaries: { minPanX, maxPanX, minPanY, maxPanY },
});

// 停止拖拽时
console.log('🛑 停止拖拽视口', {
  finalPan: props.viewportState.pan,
  initialPan: initialViewportState.value.pan,
});
```

### 2. 算法改进

**问题**：累积误差导致拖拽偏移
**解决**：基于初始状态计算，避免累积误差

```typescript
// 修复前：基于当前状态增量计算（易累积误差）
const newPanX =
  props.viewportState.pan.x - canvasDeltaX * props.viewportState.zoom;

// 修复后：基于初始状态绝对计算（避免累积误差）
const newPanX =
  initialViewportState.value.pan.x -
  canvasDeltaX * initialViewportState.value.zoom;
```

### 3. 状态管理优化

**新增初始状态记录**：

```typescript
const initialViewportState = ref({ pan: { x: 0, y: 0 }, zoom: 1 });

// 拖拽开始时保存状态
initialViewportState.value = {
  pan: { ...props.viewportState.pan },
  zoom: props.viewportState.zoom,
};
```

### 4. 视口指示器计算改进

**优化边界计算**：

```typescript
const result = {
  x: Math.max(0, Math.min(minimapSize.value.width - rectWidth, rectX)),
  y: Math.max(0, Math.min(minimapSize.value.height - rectHeight, rectY)),
  width: Math.min(minimapSize.value.width, rectWidth),
  height: Math.min(minimapSize.value.height, rectHeight),
};
```

## 🔧 使用调试模式

### 启用控制台调试

1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 面板
3. 执行拖拽操作，观察日志输出

### 调试步骤

1. **开始拖拽** - 查看初始状态是否正确
2. **拖拽过程** - 观察坐标转换是否合理
3. **停止拖拽** - 确认最终状态

### 预期日志示例

```
🎯 开始拖拽视口 {mouse: {x: 100, y: 200}, initialPan: {x: 50, y: 80}, ...}
🖱️ 拖拽中 {totalDelta: {x: 10, y: 15}, canvasDelta: {x: 20, y: 30}, ...}
🖱️ 拖拽中 {totalDelta: {x: 20, y: 25}, canvasDelta: {x: 40, y: 50}, ...}
🛑 停止拖拽视口 {finalPan: {x: 30, y: 50}, initialPan: {x: 50, y: 80}}
```

## 🎯 可能的问题点

### 1. 坐标系不一致

- **问题**：缩略图坐标系与画布坐标系转换
- **检查**：scale计算是否正确
- **调试**：观察canvasDelta是否合理

### 2. 边界限制问题

- **问题**：边界计算可能不准确
- **检查**：minPan/maxPan值是否正确
- **调试**：观察boundaries数值

### 3. 状态同步延迟

- **问题**：props.viewportState更新可能有延迟
- **检查**：emit事件是否及时响应
- **调试**：对比initialPan和finalPan

### 4. 缩放状态影响

- **问题**：不同缩放级别下计算可能不准确
- **检查**：zoom值是否正确传递
- **调试**：在不同缩放下测试

## 📝 下一步调试建议

### 如果问题持续：

1. **启用详细调试**：

   ```typescript
   // 取消注释视口指示器计算的调试信息
   console.log('📐 视口指示器计算', {...});
   ```

2. **记录具体现象**：

   - 拖拽的起始位置
   - 拖拽的结束位置
   - 期望的结果位置
   - 实际的结果位置

3. **测试不同场景**：

   - 不同缩放级别
   - 不同画布尺寸
   - 不同容器尺寸

4. **检查父组件**：
   - handleViewportChange函数
   - 视口状态更新逻辑
   - 渲染时机

## 📁 相关文件

- `src/views/jqEditor2/components/MinimapNavigator.vue` - 主要修改
- `src/views/jqEditor2/index.vue` - 事件处理
- `src/views/jqEditor2/composables/useViewport.ts` - 视口逻辑

---

_调试版本：2024年_  
_请在控制台中观察详细日志，帮助定位具体问题_
