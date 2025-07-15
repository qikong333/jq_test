# 网格组件 (Grid Component)

一个高性能、可定制的Vue 3网格组件，支持缩放、平移、高DPI显示等功能。

## 功能特性

- 🎯 **高性能渲染** - 基于Canvas 2D API，支持大规模网格显示
- 🔍 **缩放和平移** - 流畅的鼠标滚轮缩放和拖拽平移
- 📱 **高DPI支持** - 在高分辨率屏幕上显示清晰
- 🎨 **可定制外观** - 支持自定义网格颜色、透明度、线宽等
- 📐 **智能显示** - 根据缩放级别自动显示/隐藏网格线
- 🔄 **响应式设计** - 支持动态调整网格尺寸和配置
- 📤 **图片导出** - 支持导出当前网格为PNG图片
- 🎛️ **丰富的API** - 提供完整的编程接口

## 快速开始

### 基本使用

```vue
<template>
  <GridComponent
    :width="400"
    :height="800"
    :actual-width="10"
    :actual-height="20"
    @grid-click="handleGridClick"
  />
</template>

<script setup>
import GridComponent from '@/views/Grid/index.vue'

const handleGridClick = (coord) => {
  console.log('点击的网格坐标:', coord)
}
</script>
```

### 高级配置

```vue
<template>
  <GridComponent
    ref="gridRef"
    :width="1000"
    :height="2000"
    :actual-width="50"
    :actual-height="100"
    :grid-config="{
      color: '#0066cc',
      subGridColor: '#ccddff',
      opacity: 0.8,
      subGridOpacity: 0.4,
      lineWidth: 1.5,
      subGridLineWidth: 0.8,
    }"
    @grid-click="handleGridClick"
    @grid-hover="handleGridHover"
    @zoom-change="handleZoomChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import GridComponent from '@/views/Grid/index.vue'

const gridRef = ref()

// 编程控制
const zoomIn = () => gridRef.value?.setZoom(2)
const resetView = () => gridRef.value?.resetView()
const exportImage = () => {
  const imageData = gridRef.value?.exportImage()
  // 处理导出的图片数据
}
</script>
```

## API 参考

### Props

| 属性           | 类型               | 默认值 | 说明                 |
| -------------- | ------------------ | ------ | -------------------- |
| `width`        | `number`           | `400`  | 网格宽度（格子数量） |
| `height`       | `number`           | `800`  | 网格高度（格子数量） |
| `actualWidth`  | `number`           | `10`   | 实际宽度（厘米）     |
| `actualHeight` | `number`           | `20`   | 实际高度（厘米）     |
| `gridConfig`   | `GridRenderConfig` | 见下方 | 网格渲染配置         |

#### GridRenderConfig

```typescript
interface GridRenderConfig {
  color: string // 主网格线颜色，默认 '#cccccc'
  subGridColor: string // 子网格线颜色，默认 '#eeeeee'
  opacity: number // 主网格线透明度，默认 0.6
  subGridOpacity: number // 子网格线透明度，默认 0.3
  lineWidth: number // 主网格线宽度，默认 1
  subGridLineWidth: number // 子网格线宽度，默认 0.5
}
```

### Events

| 事件          | 参数                     | 说明               |
| ------------- | ------------------------ | ------------------ |
| `grid-click`  | `GridCoordinate`         | 点击网格时触发     |
| `grid-hover`  | `GridCoordinate \| null` | 鼠标悬停网格时触发 |
| `zoom-change` | `number`                 | 缩放级别改变时触发 |

#### GridCoordinate

```typescript
interface GridCoordinate {
  x: number // 网格X坐标
  y: number // 网格Y坐标
}
```

### 暴露的方法

| 方法          | 参数           | 返回值   | 说明                      |
| ------------- | -------------- | -------- | ------------------------- |
| `toggleGrid`  | -              | `void`   | 切换网格显示/隐藏         |
| `setZoom`     | `zoom: number` | `void`   | 设置缩放级别              |
| `resetView`   | -              | `void`   | 重置视图到初始状态        |
| `exportImage` | -              | `string` | 导出当前网格为图片数据URL |

## 组件架构

### 目录结构

```
src/views/Grid/
├── index.vue                    # 主组件
├── GridExample.vue              # 示例页面
├── README.md                    # 文档
├── types/
│   └── grid.ts                  # 类型定义
├── composables/
│   ├── useGridSystem.ts         # 网格系统逻辑
│   ├── useViewportSystem.ts     # 视口系统逻辑
│   └── useGridRenderer.ts       # 渲染系统逻辑
└── utils/
    └── coordinateUtils.ts       # 坐标转换工具
```

### 核心 Composables

#### useGridSystem

负责网格数据计算、显示控制和基础渲染逻辑。

#### useViewportSystem

负责缩放、平移、视口状态管理和坐标转换。

#### useGridRenderer

负责高性能的Canvas渲染、缓存管理和性能监控。

## 性能优化

### 渲染优化

- **视口裁剪**: 只渲染可见区域的网格线
- **批量绘制**: 使用单次`stroke()`调用绘制所有线条
- **智能显示**: 根据缩放级别自动隐藏过密的网格
- **高DPI支持**: 自动适配高分辨率屏幕

### 内存优化

- **坐标缓存**: 缓存频繁的坐标转换计算
- **渲染缓存**: 缓存渲染结果避免重复计算
- **缓存限制**: 自动清理过期缓存防止内存泄漏

### 交互优化

- **防抖处理**: 避免频繁的重绘操作
- **平滑动画**: 支持平滑的缩放动画
- **响应式更新**: 只在必要时重新渲染

## 使用示例

### 基础网格

```vue
<template>
  <GridComponent :width="100" :height="200" :actual-width="10" :actual-height="20" />
</template>
```

### 自定义样式

```vue
<template>
  <GridComponent
    :width="500"
    :height="1000"
    :actual-width="25"
    :actual-height="50"
    :grid-config="{
      color: '#ff6b6b',
      subGridColor: '#ffe0e0',
      opacity: 0.7,
      subGridOpacity: 0.3,
    }"
  />
</template>
```

### 事件处理

```vue
<template>
  <GridComponent @grid-click="onGridClick" @grid-hover="onGridHover" @zoom-change="onZoomChange" />
</template>

<script setup>
const onGridClick = (coord) => {
  console.log(`点击了格子 (${coord.x}, ${coord.y})`)
}

const onGridHover = (coord) => {
  if (coord) {
    console.log(`悬停在格子 (${coord.x}, ${coord.y})`)
  }
}

const onZoomChange = (zoom) => {
  console.log(`缩放级别: ${(zoom * 100).toFixed(0)}%`)
}
</script>
```

### 编程控制

```vue
<template>
  <div>
    <div class="controls">
      <button @click="zoomIn">放大</button>
      <button @click="zoomOut">缩小</button>
      <button @click="reset">重置</button>
      <button @click="toggle">切换网格</button>
      <button @click="export">导出</button>
    </div>

    <GridComponent ref="gridRef" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const gridRef = ref()

const zoomIn = () => {
  // 获取当前缩放级别并放大
  gridRef.value?.setZoom(2)
}

const zoomOut = () => {
  gridRef.value?.setZoom(0.5)
}

const reset = () => {
  gridRef.value?.resetView()
}

const toggle = () => {
  gridRef.value?.toggleGrid()
}

const export = () => {
  const imageData = gridRef.value?.exportImage()
  if (imageData) {
    const link = document.createElement('a')
    link.download = 'grid.png'
    link.href = imageData
    link.click()
  }
}
</script>
```

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

1. **性能考虑**: 对于超大网格（>10000格子），建议启用视口裁剪
2. **内存管理**: 长时间使用后建议清理缓存
3. **移动端**: 在移动设备上可能需要调整触摸事件处理
4. **主题适配**: 组件支持深色主题自动适配

## 更新日志

### v1.0.0

- 初始版本发布
- 支持基础网格渲染
- 支持缩放和平移
- 支持自定义样式
- 支持图片导出

## 许可证

MIT License
