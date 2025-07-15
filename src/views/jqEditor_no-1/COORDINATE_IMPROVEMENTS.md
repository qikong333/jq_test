# 坐标计算和格子绘制改进

基于 `jqEditor2_now` 的实现，对 `jqEditor2` 进行了以下关键改进：

## 1. 高精度坐标转换 (useCanvas.ts)

### 改进前

- 使用复杂的视口变换计算
- 依赖缩放和平移状态的反向变换
- 坐标计算不够精确

### 改进后

- 使用相对位置比例映射算法
- 直接从鼠标位置计算相对比例 (0-1)
- 映射到原始逻辑坐标系，提高精度

```typescript
// 新的高精度坐标计算
const relativeX = rawX / rect.width;
const relativeY = rawY / rect.height;
let canvasX = relativeX * originalLogicalWidth;
let canvasY = relativeY * originalLogicalHeight;
const gridX = Math.floor(canvasX / cellWidth);
const gridY = Math.floor(canvasY / cellHeight);
```

## 2. 优化格子填充逻辑 (useCanvas.ts)

### 改进前

- 依赖画笔系统的复杂计算
- 可能出现重复绘制
- 缺乏精确的边界检查

### 改进后

- 直接的格子级别填充
- 防重复绘制机制
- 高精度边界检查
- 像素完美的绘制设置

```typescript
// 高精度边界检查
if (gridX < 0 || gridY < 0 || gridX >= props.width || gridY >= props.height) {
  console.warn(`格子坐标超出边界: (${gridX}, ${gridY})`);
  return;
}

// 防重复绘制
const cellKey = `${gridX},${gridY}`;
if (lastDrawnCells.has(cellKey)) return;
lastDrawnCells.add(cellKey);

// 像素完美绘制
ctx.value.imageSmoothingEnabled = false;
ctx.value.fillRect(
  Math.round(cellPixelX),
  Math.round(cellPixelY),
  Math.round(cellWidth),
  Math.round(cellHeight),
);
```

## 3. 连续绘制优化 (useCanvas.ts)

### 改进前

- 使用 Bresenham 算法的路径计算
- 性能开销较大
- 可能遗漏格子

### 改进后

- 线性插值算法
- 基于距离的自适应步长
- 去重优化，避免重复计算

```typescript
// 线性插值填充中间格子
const distance = Math.sqrt(dx * dx + dy * dy);
const steps = Math.max(1, Math.ceil(distance * 2));
const actualSteps = Math.min(steps, 100); // 性能限制

for (let i = 1; i < actualSteps; i++) {
  const ratio = i / actualSteps;
  const midGridX = Math.round(lastCell.x + dx * ratio);
  const midGridY = Math.round(lastCell.y + dy * ratio);
  // 去重和填充逻辑
}
```

## 4. 网格绘制性能优化 (useGrid.ts)

### 改进前

- 基础的网格线绘制
- 没有抗锯齿控制
- 性能优化不足

### 改进后

- 高性能批量绘制
- 像素完美的网格线
- 精确的可见范围计算
- 禁用抗锯齿确保清晰度

```typescript
// 高性能设置
ctx.imageSmoothingEnabled = false;

// 精确可见范围
const endX = Math.min(
  props.width,
  Math.ceil((canvasWidth - viewportX) / cellWidth) + 1,
);

// 像素完美坐标
const pixelX = Math.round(x * cellWidth + viewportX);
```

## 5. 坐标工具函数优化 (coordinateUtils.ts)

### 改进前

- 基础的数学运算
- 没有舍入处理

### 改进后

- 高精度格子坐标计算
- 精确的像素坐标转换
- 更好的边界处理

```typescript
// 高精度实现
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  cellWidth: number,
  cellHeight: number,
): GridCoordinate {
  const gridX = Math.floor(pixelX / cellWidth);
  const gridY = Math.floor(pixelY / cellHeight);
  return { x: gridX, y: gridY };
}

export function gridToPixel(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
): PixelCoordinate {
  return {
    x: Math.round(gridX * cellWidth),
    y: Math.round(gridY * cellHeight),
  };
}
```

## 主要收益

1. **精度提升**: 坐标计算更加精确，减少误差累积
2. **性能优化**: 减少重复计算，提高绘制效率
3. **视觉改进**: 像素完美的网格和绘制效果
4. **稳定性**: 更好的边界处理和错误防护
5. **可维护性**: 简化的算法逻辑，更易理解和维护

## 调试支持

新实现包含详细的调试日志，便于问题排查：

- 坐标转换过程追踪
- 格子填充状态记录
- 性能指标监控

这些改进使 `jqEditor2` 的画布绘制系统更加精确、高效和稳定。
