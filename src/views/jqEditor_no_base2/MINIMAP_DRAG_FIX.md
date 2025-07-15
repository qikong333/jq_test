# 🔧 缩略图拖拽修复

## 📋 问题描述

**问题现象**：在缩略图导航器中拖拽视口方格后，松开鼠标时方格会弹跳到其他位置。

## 🔍 问题分析

### 主要原因：

1. **频繁重渲染冲突** - 拖拽过程中每次视口变化都触发完整画布重绘
2. **事件传播干扰** - 缺少事件阻止传播，可能与其他鼠标事件冲突
3. **边界检查缺失** - 没有限制视口拖拽的边界范围
4. **状态管理不当** - 拖拽结束后没有正确重置状态

## ⚡ 修复方案

### 1. 优化渲染频率控制

**问题**：每次视口变化都调用`canvas.render()`
**解决**：使用`requestRender()`进行节流

```typescript
// 修复前
const handleViewportChange = (pan: { x: number; y: number }) => {
  if (canvas.viewportSystem) {
    canvas.viewportSystem.viewportState.pan = pan;
    canvas.render(); // 频繁重绘
  }
};

// 修复后
const handleViewportChange = (pan: { x: number; y: number }) => {
  if (canvas.viewportSystem) {
    canvas.viewportSystem.viewportState.pan = pan;
    canvas.requestRender(); // 节流重绘
  }
};
```

### 2. 改进事件处理

**问题**：缺少事件传播控制
**解决**：添加事件阻止和passive控制

```typescript
const startViewportDrag = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation(); // 阻止事件传播
  isViewportDragging.value = true;

  viewportDragStart.value = { x: event.clientX, y: event.clientY };

  // 添加passive: false确保preventDefault生效
  document.addEventListener('mousemove', onViewportDrag, { passive: false });
  document.addEventListener('mouseup', stopViewportDrag);
};
```

### 3. 添加边界限制

**问题**：视口可以拖拽到无效位置
**解决**：计算并限制拖拽边界

```typescript
const onViewportDrag = (event: MouseEvent) => {
  // ... 计算deltaX, deltaY ...

  // 计算新的平移位置
  let newPanX =
    props.viewportState.pan.x - canvasDeltaX * props.viewportState.zoom;
  let newPanY =
    props.viewportState.pan.y - canvasDeltaY * props.viewportState.zoom;

  // 添加边界限制
  const maxPanX = 0;
  const minPanX =
    props.containerSize.width -
    props.canvasSize.width * props.viewportState.zoom;
  const maxPanY = 0;
  const minPanY =
    props.containerSize.height -
    props.canvasSize.height * props.viewportState.zoom;

  newPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
  newPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));

  emit('viewport-change', { x: newPanX, y: newPanY });
};
```

### 4. 完善状态重置

**问题**：拖拽结束后状态没有完全重置
**解决**：在stopViewportDrag中重置所有状态

```typescript
const stopViewportDrag = (event?: MouseEvent) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  isViewportDragging.value = false;

  document.removeEventListener('mousemove', onViewportDrag);
  document.removeEventListener('mouseup', stopViewportDrag);

  // 重置拖拽起始位置
  viewportDragStart.value = { x: 0, y: 0 };
};
```

## 📁 修改文件

- `464:464:src/views/jqEditor2/index.vue` - 视口变化处理优化
- `500:500:src/views/jqEditor2/composables/useCanvas.ts` - 暴露requestRender方法
- `270:285:src/views/jqEditor2/components/MinimapNavigator.vue` - 拖拽事件处理改进
- `290:320:src/views/jqEditor2/components/MinimapNavigator.vue` - 边界限制和状态重置

## 🎯 修复效果

✅ **消除方格弹跳** - 拖拽结束后方格保持在正确位置  
✅ **流畅拖拽体验** - 减少卡顿，提升响应性  
✅ **边界保护** - 防止拖拽到无效区域  
✅ **状态同步** - 确保拖拽状态正确同步

## 🔧 测试建议

1. **基础拖拽测试**：拖拽视口方格到不同位置，检查是否弹跳
2. **边界测试**：尝试拖拽到画布边缘，确认是否正确限制
3. **连续拖拽测试**：多次连续拖拽，检查状态是否正确
4. **缩放状态测试**：在不同缩放级别下测试拖拽功能

## 📝 技术细节

### 坐标转换公式

```typescript
// 鼠标移动距离转换为画布坐标
const canvasDeltaX = deltaX / scale.value;
const canvasDeltaY = deltaY / scale.value;

// 画布坐标转换为视口平移
const newPanX = currentPan.x - canvasDeltaX * zoom;
const newPanY = currentPan.y - canvasDeltaY * zoom;
```

### 边界计算公式

```typescript
// 最大平移值（画布左上角对齐容器左上角）
const maxPan = 0;

// 最小平移值（画布右下角对齐容器右下角）
const minPan = containerSize - canvasSize * zoom;
```

---

_修复完成时间：2024年_  
_修复版本：jqEditor2 缩略图导航器_
