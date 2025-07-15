# 🔧 缩略图视口指示器位置同步修复

## 📋 问题描述

**问题现象**：缩略图中的视口指示器（虚拟框）位置和实际画布显示的位置不匹配，存在明显的位置偏差。

**用户反馈**：通过图片可以看到缩略图的虚拟框的位置和对应大画布显示的位置对不上。

## 🔍 问题分析

### 根本原因

缩略图组件中存在**坐标系不一致**的问题：

1. **错误的尺寸基准**：

   - 缩略图使用 `canvasSize.width/height`（来自 useViewport）
   - 这个值是基于物理尺寸转换的像素值：`(actualWidth * 96) / 2.54`
   - 但实际画布渲染使用的是网格系统的 `gridData.physicalSize`

2. **scale 计算不准确**：

   ```typescript
   // 修复前：错误的基准
   const scale = computed(() => {
     return Math.min(
       minimapSize.value.width / props.canvasSize.width, // ❌ 错误基准
       minimapSize.value.height / props.canvasSize.height, // ❌ 错误基准
     );
   });
   ```

3. **缩略图尺寸计算不一致**：
   - 使用了不同的宽高比计算基准
   - 导致缩略图内容与视口指示器的比例失调

## ⚡ 修复方案

### 1. 统一尺寸基准

**修复scale计算**：

```typescript
// 修复后：使用网格系统的实际像素尺寸
const scale = computed(() => {
  if (!props.gridData) {
    return Math.min(
      minimapSize.value.width / props.canvasSize.width,
      minimapSize.value.height / props.canvasSize.height,
    );
  }

  // 使用网格系统的实际像素尺寸
  const actualCanvasWidth = props.gridData.physicalSize.width;
  const actualCanvasHeight = props.gridData.physicalSize.height;

  return Math.min(
    minimapSize.value.width / actualCanvasWidth,
    minimapSize.value.height / actualCanvasHeight,
  );
});
```

### 2. 统一缩略图尺寸计算

**修复minimapSize计算**：

```typescript
// 修复后：优先使用网格系统的实际像素尺寸
const minimapSize = computed(() => {
  const maxSize = minimapConfig.size.width;

  if (!minimapConfig.maintainAspectRatio) {
    return minimapConfig.size;
  }

  // 优先使用网格系统的实际像素尺寸
  let canvasWidth, canvasHeight;
  if (props.gridData && props.gridData.physicalSize) {
    canvasWidth = props.gridData.physicalSize.width;
    canvasHeight = props.gridData.physicalSize.height;
  } else {
    canvasWidth = props.canvasSize.width;
    canvasHeight = props.canvasSize.height;
  }

  const aspectRatio = canvasWidth / canvasHeight;
  // ... 宽高比计算逻辑
});
```

### 3. 精确的像素映射

**修复内容渲染**：

```typescript
// 修复后：使用精确的像素映射
if (props.gridStorage && props.gridData) {
  const allCells = props.gridStorage.getAllPaintedCells();
  const cellScaleX =
    minimapSize.value.width / props.gridData.physicalSize.width;
  const cellScaleY =
    minimapSize.value.height / props.gridData.physicalSize.height;

  allCells.forEach(({ x, y, color }) => {
    if (color && color !== 'transparent') {
      ctx.fillStyle = color;

      // 使用精确的像素映射
      const pixelX = x * props.gridData.cellWidth * cellScaleX;
      const pixelY = y * props.gridData.cellHeight * cellScaleY;
      const pixelWidth = Math.max(1, props.gridData.cellWidth * cellScaleX);
      const pixelHeight = Math.max(1, props.gridData.cellHeight * cellScaleY);

      ctx.fillRect(
        Math.round(pixelX),
        Math.round(pixelY),
        Math.round(pixelWidth),
        Math.round(pixelHeight),
      );
    }
  });
}
```

## 🎯 修复效果

### 修复前：

- ❌ 视口指示器位置偏移
- ❌ 缩略图内容与实际画布比例不匹配
- ❌ 拖拽时位置跳跃

### 修复后：

- ✅ 视口指示器位置精确对应
- ✅ 缩略图内容与实际画布比例一致
- ✅ 拖拽流畅，位置同步准确

## 🔧 技术细节

### 坐标系统一

所有计算现在都基于同一个尺寸基准：

```typescript
// 统一使用 gridData.physicalSize
const actualCanvasWidth = props.gridData.physicalSize.width;
const actualCanvasHeight = props.gridData.physicalSize.height;
```

### 像素对齐优化

使用 `Math.round()` 确保像素边界对齐：

```typescript
ctx.fillRect(
  Math.round(pixelX), // 像素对齐
  Math.round(pixelY), // 像素对齐
  Math.round(pixelWidth), // 像素对齐
  Math.round(pixelHeight), // 像素对齐
);
```

### 向后兼容

保持了对旧数据的兼容性：

```typescript
// 如果没有gridData，回退到原有逻辑
if (!props.gridData) {
  return Math.min(
    minimapSize.value.width / props.canvasSize.width,
    minimapSize.value.height / props.canvasSize.height,
  );
}
```

## 📁 修改的文件

- `src/views/jqEditor2/components/MinimapNavigator.vue`
  - `scale` 计算逻辑
  - `minimapSize` 计算逻辑
  - `renderMinimap` 内容渲染逻辑
  - 调试日志管理

## 🧪 测试建议

1. **基础功能测试**：
   - 缩略图显示是否正常
   - 视口指示器位置是否准确
2. **交互测试**：
   - 拖拽视口指示器是否流畅
   - 点击缩略图跳转是否准确
3. **不同场景测试**：
   - 不同画布尺寸
   - 不同缩放级别
   - 不同容器大小

## 🎉 总结

这次修复解决了缩略图视口指示器位置不同步的根本问题，通过统一坐标系基准和精确的像素映射，确保了缩略图与主画布的完美同步。修复后的缩略图功能更加可靠和精确。
