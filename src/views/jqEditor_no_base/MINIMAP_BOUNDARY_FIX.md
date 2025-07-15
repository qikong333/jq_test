# 🔧 缩略图拖拽回弹问题修复

## 📋 问题描述

**问题现象**：在缩略图中拖拽视口指示器（虚拟框）到底部后，松开鼠标时虚拟框会回弹到顶部。

**用户反馈**：缩略图里面的位置虚拟框，用鼠标拖拽到底部放开鼠标虚拟框会回弹到顶部。

## 🔍 问题分析

### 根本原因

问题出现在 `clampPan` 函数的边界计算逻辑中：

```typescript
// 修复前：错误的边界计算逻辑
const minX = Math.min(0, containerSize.width - scaledCanvasWidth);
const maxX = Math.max(0, containerSize.width - scaledCanvasWidth);
const minY = Math.min(0, containerSize.height - scaledCanvasHeight);
const maxY = Math.max(0, containerSize.height - scaledCanvasHeight);
```

### 问题分析

1. **当画布比容器大时**（正常情况）：

   - `containerSize.width - scaledCanvasWidth` < 0
   - `minX = Math.min(0, 负数) = 负数` ✅ 正确
   - `maxX = Math.max(0, 负数) = 0` ✅ 正确

2. **当画布比容器小时**（缩放很小或画布很小）：
   - `containerSize.width - scaledCanvasWidth` > 0
   - `minX = Math.min(0, 正数) = 0` ❌ **错误！**
   - `maxX = Math.max(0, 正数) = 正数` ❌ **错误！**

### 错误后果

当画布比容器小时，错误的边界计算导致：

- 平移范围被错误地限制在 `[0, 正数]`
- 当用户拖拽到底部时，`newPan.y` 变为负数
- `clampPan` 强制将其限制为 `Math.max(0, 负数) = 0`
- 结果：视口被强制拉回顶部，产生"回弹"效果

## ⚡ 修复方案

### 1. 修复边界计算逻辑

**正确的边界计算**：

```typescript
// 修复后：正确处理画布大于/小于容器的情况
let minX, maxX, minY, maxY;

if (scaledCanvasWidth > containerSize.width) {
  // 画布比容器宽：限制平移，确保画布不会完全移出容器
  minX = containerSize.width - scaledCanvasWidth; // 负数：画布右边界对齐容器右边界
  maxX = 0; // 画布左边界对齐容器左边界
} else {
  // 画布比容器窄：允许更大的平移范围，可以居中显示
  const extraSpace = containerSize.width - scaledCanvasWidth;
  minX = -extraSpace; // 允许画布右边界贴容器左边界
  maxX = extraSpace; // 允许画布左边界贴容器右边界
}

if (scaledCanvasHeight > containerSize.height) {
  // 画布比容器高：限制平移，确保画布不会完全移出容器
  minY = containerSize.height - scaledCanvasHeight; // 负数：画布底边界对齐容器底边界
  maxY = 0; // 画布顶边界对齐容器顶边界
} else {
  // 画布比容器矮：允许更大的平移范围，可以居中显示
  const extraSpace = containerSize.height - scaledCanvasHeight;
  minY = -extraSpace; // 允许画布底边界贴容器顶边界
  maxY = extraSpace; // 允许画布顶边界贴容器底边界
}
```

### 2. 统一边界计算基准

**在缩略图组件中**：

```typescript
// 使用与缩略图一致的尺寸基准计算边界
let actualCanvasWidth, actualCanvasHeight;
if (props.gridData && props.gridData.physicalSize) {
  actualCanvasWidth = props.gridData.physicalSize.width;
  actualCanvasHeight = props.gridData.physicalSize.height;
} else {
  actualCanvasWidth = props.canvasSize.width;
  actualCanvasHeight = props.canvasSize.height;
}

const minPanX =
  props.containerSize.width - actualCanvasWidth * props.viewportState.zoom;
const minPanY =
  props.containerSize.height - actualCanvasHeight * props.viewportState.zoom;
```

### 3. 增强调试信息

**添加详细的调试日志**：

```typescript
console.log('🖱️ 拖拽中', {
  totalDelta: { x: totalDeltaX, y: totalDeltaY },
  canvasDelta: { x: canvasDeltaX, y: canvasDeltaY },
  newPan: { x: newPanX, y: newPanY },
  boundaries: { minPanX, maxPanX, minPanY, maxPanY },
  actualCanvasSize: { width: actualCanvasWidth, height: actualCanvasHeight },
  containerSize: props.containerSize,
  zoom: props.viewportState.zoom,
  scale: scale.value,
});
```

## 🎯 修复效果

### 修复前：

- ❌ 拖拽到底部时视口回弹到顶部
- ❌ 小尺寸画布时边界计算错误
- ❌ 平移范围被错误限制

### 修复后：

- ✅ 拖拽流畅，无回弹现象
- ✅ 正确处理各种画布尺寸
- ✅ 合理的平移范围限制
- ✅ 支持画布在容器内居中显示

## 🔧 技术细节

### 边界计算原理

**画布大于容器时**：

- 限制平移范围，确保画布不会完全移出视野
- `minPan = container - canvas`（负数）
- `maxPan = 0`

**画布小于容器时**：

- 允许画布在容器内自由移动，可以居中或偏移显示
- `extraSpace = container - canvas`（正数）
- `minPan = -extraSpace`，`maxPan = extraSpace`

### 坐标系统一

确保缩略图和主画布使用相同的尺寸基准：

- 优先使用 `gridData.physicalSize`
- 回退到 `canvasSize`（向后兼容）

## 📁 修改的文件

- `src/views/jqEditor2/utils/coordinateUtils.ts`
  - `clampPan` 函数的边界计算逻辑
- `src/views/jqEditor2/components/MinimapNavigator.vue`
  - 边界计算的尺寸基准统一
  - 增强调试信息
- `src/views/jqEditor2/index.vue`
  - `handleViewportChange` 调试信息

## 🧪 测试场景

1. **大画布测试**：
   - 画布尺寸大于容器
   - 拖拽到各个边界位置
2. **小画布测试**：
   - 画布尺寸小于容器
   - 拖拽到底部不应回弹
3. **不同缩放级别**：
   - 高缩放（画布变大）
   - 低缩放（画布变小）
4. **边界情况**：
   - 画布与容器尺寸相等
   - 极小/极大缩放比例

## 🎉 总结

这次修复解决了缩略图拖拽回弹的根本问题，通过正确的边界计算逻辑，确保了在各种画布尺寸和缩放级别下都能提供流畅的拖拽体验。修复后的边界限制更加智能和用户友好。
