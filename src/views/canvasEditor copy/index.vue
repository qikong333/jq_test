<template>
  <div class="canvas-editor">
    <!-- 工具栏 -->
    <div class="toolbar mb-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">工具:</label>
        <select v-model="currentTool" class="px-2 py-1 border rounded">
          <option value="pixel">像素画笔</option>
          <option value="fill">填充</option>
          <option value="eyedropper">吸色器</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">画笔大小:</label>
        <input v-model="brushSize" type="range" min="1" max="10" class="w-20" />
        <span class="text-sm text-gray-600">{{ brushSize }}px</span>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">颜色:</label>
        <input v-model="brushColor" type="color" class="w-8 h-8 rounded border" />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">缩放:</label>
        <button
          @click="zoomOut"
          :disabled="viewport.zoom <= minZoom"
          class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          -
        </button>
        <span
          class="text-sm text-gray-600 bg-white px-2 py-1 rounded border min-w-[60px] text-center"
        >
          {{ Math.round(viewport.zoom * 100) }}%
        </span>
        <button
          @click="zoomIn"
          :disabled="viewport.zoom >= maxZoom"
          class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      <button
        @click="resetView"
        class="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        重置视图
      </button>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">画布尺寸:</label>
        <span class="text-sm text-gray-600 bg-white px-2 py-1 rounded border">
          {{ canvasWidth }} × {{ canvasHeight }} px
        </span>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">显示网格:</label>
        <input v-model="showGrid" type="checkbox" class="w-4 h-4" />
      </div>

      <button
        @click="clearCanvas"
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        清空画布
      </button>
    </div>

    <!-- 分层画布容器 -->
    <div
      class="canvas-container"
      @wheel.prevent="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @contextmenu.prevent
    >
      <!-- 背景层：透明棋盘格 -->
      <div
        class="background-layer"
        :style="{
          width: containerSize.width + 'px',
          height: containerSize.height + 'px',
        }"
      ></div>

      <!-- 网格层 -->
      <canvas
        ref="gridCanvasRef"
        class="canvas-layer"
        :width="containerSize.width"
        :height="containerSize.height"
        :style="{ zIndex: 1 }"
      ></canvas>

      <!-- 像素数据层 -->
      <canvas
        ref="dataCanvasRef"
        class="canvas-layer"
        :width="containerSize.width"
        :height="containerSize.height"
        :style="{ zIndex: 2 }"
      ></canvas>

      <!-- UI层：光标预览等 -->
      <canvas
        ref="uiCanvasRef"
        class="canvas-layer"
        :width="containerSize.width"
        :height="containerSize.height"
        :style="{ zIndex: 3, pointerEvents: 'none' }"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { cmToPx } from '@/utils/conversion'

// 定义组件名称
defineOptions({
  name: 'PixelEditor',
})

interface Props {
  width?: number // 画布宽度（厘米）
  height?: number // 画布高度（厘米）
}

const props = withDefaults(defineProps<Props>(), {
  width: 10, // 默认10cm
  height: 10, // 默认10cm
})

// Canvas 引用
const gridCanvasRef = ref<HTMLCanvasElement | null>(null)
const dataCanvasRef = ref<HTMLCanvasElement | null>(null)
const uiCanvasRef = ref<HTMLCanvasElement | null>(null)

// 优化：为高性能渲染创建离屏Canvas
let offscreenCanvas: HTMLCanvasElement
let offscreenCtx: CanvasRenderingContext2D

// 画布尺寸
const canvasWidth = ref(cmToPx(props.width))
const canvasHeight = ref(cmToPx(props.height))

// 容器尺寸（屏幕像素）
const containerSize = reactive({
  width: 800,
  height: 600,
})

// 视口状态 - 从 ref 改为 reactive 以简化访问
const viewport = reactive({
  x: 0, // 视口左上角在画布坐标系中的 X 位置
  y: 0, // 视口左上角在画布坐标系中的 Y 位置
  zoom: 8, // 缩放级别
})

// 缩放限制
const minZoom = 1
const maxZoom = 32
const zoomStep = 2

// 像素数据模型（使用Uint32Array存储RGBA）
const pixelData = ref<Uint32Array>(new Uint32Array(canvasWidth.value * canvasHeight.value))

// 工具和设置
const currentTool = ref('pixel')
const brushSize = ref(1)
const brushColor = ref('#000000')
const showGrid = ref(true)

// 交互状态
const isDrawing = ref(false)
const isPanning = ref(false)
const lastMousePos = reactive({ x: 0, y: 0 })
const currentMousePos = reactive({ x: 0, y: 0 })

// 优化：渲染状态
const needsRender = ref(false) // 是否需要调度一个新的渲染帧
const isDataDirty = ref(true) // 像素数据是否已更改，需要更新离屏Canvas

// 坐标转换函数
const worldToScreen = (worldX: number, worldY: number) => {
  return {
    x: (worldX - viewport.x) * viewport.zoom,
    y: (worldY - viewport.y) * viewport.zoom,
  }
}

const screenToWorld = (screenX: number, screenY: number) => {
  return {
    x: Math.floor(screenX / viewport.zoom + viewport.x),
    y: Math.floor(screenY / viewport.zoom + viewport.y),
  }
}

// 获取鼠标在容器中的位置
const getMousePos = (event: MouseEvent) => {
  const canvas = dataCanvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

// 颜色转换函数
const hexToRgba = (hex: string, alpha: number = 255) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (alpha << 24) | (b << 16) | (g << 8) | r
}

const rgbaToHex = (rgba: number) => {
  const r = rgba & 0xff
  const g = (rgba >> 8) & 0xff
  const b = (rgba >> 16) & 0xff
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// 像素操作函数
const setPixel = (x: number, y: number, color: number) => {
  if (x >= 0 && x < canvasWidth.value && y >= 0 && y < canvasHeight.value) {
    const index = y * canvasWidth.value + x
    // 优化：仅当颜色变化时才更新数据并标记为"脏"
    if (pixelData.value[index] !== color) {
      pixelData.value[index] = color
    }
  }
}

const getPixel = (x: number, y: number): number => {
  if (x >= 0 && x < canvasWidth.value && y >= 0 && y < canvasHeight.value) {
    const index = y * canvasWidth.value + x
    return pixelData.value[index]
  }
  return 0
}

// 优化：将像素数据绘制到离屏Canvas
const updateOffscreenCanvas = () => {
  if (!offscreenCtx) return
  // 创建一个ImageData对象，其大小与画布的像素数据相同
  const imageData = offscreenCtx.createImageData(canvasWidth.value, canvasHeight.value)
  // 使用Uint32Array视图可以快速将颜色数据复制到ImageData的缓冲区中
  const buffer = new Uint32Array(imageData.data.buffer)
  buffer.set(pixelData.value)
  // 将更新后的图像数据放回离屏Canvas
  offscreenCtx.putImageData(imageData, 0, 0)
  // 数据已同步，重置脏标记
  isDataDirty.value = false
}

// 渲染函数
const renderGrid = () => {
  if (!gridCanvasRef.value || !showGrid.value || viewport.zoom < 4) {
    const ctx = gridCanvasRef.value?.getContext('2d')
    ctx?.clearRect(0, 0, containerSize.width, containerSize.height)
    return
  }

  const ctx = gridCanvasRef.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, containerSize.width, containerSize.height)
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1

  // 计算可见区域
  const startX = Math.max(0, Math.floor(viewport.x))
  const startY = Math.max(0, Math.floor(viewport.y))
  const endX = Math.min(
    canvasWidth.value,
    Math.ceil(viewport.x + containerSize.width / viewport.zoom),
  )
  const endY = Math.min(
    canvasHeight.value,
    Math.ceil(viewport.y + containerSize.height / viewport.zoom),
  )

  ctx.beginPath()
  // 绘制垂直线
  for (let x = startX; x <= endX; x++) {
    const screenX = (x - viewport.x) * viewport.zoom
    ctx.moveTo(screenX, 0)
    ctx.lineTo(screenX, containerSize.height)
  }
  // 绘制水平线
  for (let y = startY; y <= endY; y++) {
    const screenY = (y - viewport.y) * viewport.zoom
    ctx.moveTo(0, screenY)
    ctx.lineTo(containerSize.width, screenY)
  }
  ctx.stroke()
}

// 优化：renderPixels现在使用高性能的drawImage
const renderPixels = () => {
  if (!dataCanvasRef.value) return

  const ctx = dataCanvasRef.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, containerSize.width, containerSize.height)

  // 从离屏Canvas中截取视口对应的区域，并将其缩放到整个可见Canvas上
  ctx.drawImage(
    offscreenCanvas,
    viewport.x,
    viewport.y,
    containerSize.width / viewport.zoom,
    containerSize.height / viewport.zoom,
    0,
    0,
    containerSize.width,
    containerSize.height,
  )
}

const renderUI = () => {
  if (!uiCanvasRef.value) return

  const ctx = uiCanvasRef.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, containerSize.width, containerSize.height)

  // 绘制光标预览
  if (currentMousePos.x >= 0 && currentMousePos.y >= 0) {
    const worldPos = screenToWorld(currentMousePos.x, currentMousePos.y)
    if (
      worldPos.x >= 0 &&
      worldPos.x < canvasWidth.value &&
      worldPos.y >= 0 &&
      worldPos.y < canvasHeight.value
    ) {
      const screenPos = worldToScreen(worldPos.x, worldPos.y)

      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.strokeRect(screenPos.x, screenPos.y, viewport.zoom, viewport.zoom)
    }
  }
}

// 优化：主渲染循环，由requestAnimationFrame驱动
const renderLoop = () => {
  if (!needsRender.value) return
  needsRender.value = false

  // 如果数据已更改（例如，通过填充或清除），则在渲染前更新离屏Canvas
  if (isDataDirty.value) {
    updateOffscreenCanvas()
  }

  renderGrid()
  renderPixels()
  renderUI()
}

// 优化：请求一个新的渲染帧
const requestRender = () => {
  if (!needsRender.value) {
    needsRender.value = true
    requestAnimationFrame(renderLoop)
  }
}

// 绘制像素
const drawPixel = (x: number, y: number) => {
  const colorHex = brushColor.value
  const colorRgba = hexToRgba(colorHex)

  if (offscreenCtx) {
    offscreenCtx.fillStyle = colorHex
  }

  const drawOnCanvas = (px: number, py: number) => {
    setPixel(px, py, colorRgba)
    // 优化：直接在离屏画布上绘制，避免全局重绘
    offscreenCtx?.fillRect(px, py, 1, 1)
  }

  if (brushSize.value === 1) {
    drawOnCanvas(x, y)
  } else {
    // 处理画笔大小
    const halfSize = Math.floor(brushSize.value / 2)
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        drawOnCanvas(x + dx, y + dy)
      }
    }
  }
}

// 填充工具
const floodFill = (startX: number, startY: number, newColor: number) => {
  const targetColor = getPixel(startX, startY)
  if (targetColor === newColor) return

  const stack = [{ x: startX, y: startY }]

  while (stack.length > 0) {
    const { x, y } = stack.pop()!

    if (x < 0 || x >= canvasWidth.value || y < 0 || y >= canvasHeight.value) continue
    if (getPixel(x, y) !== targetColor) continue

    setPixel(x, y, newColor)

    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  // 优化：填充操作完成后，标记数据为脏以进行一次完整的重绘
  isDataDirty.value = true
}

// 事件处理函数
const handleMouseDown = (event: MouseEvent) => {
  const mousePos = getMousePos(event)
  const worldPos = screenToWorld(mousePos.x, mousePos.y)

  if (event.button === 1 || event.ctrlKey || event.metaKey) {
    // 中键或Ctrl+左键：开始平移
    isPanning.value = true
    lastMousePos.x = mousePos.x
    lastMousePos.y = mousePos.y
  } else if (event.button === 0) {
    // 左键：绘制
    isDrawing.value = true

    if (currentTool.value === 'pixel') {
      drawPixel(worldPos.x, worldPos.y)
    } else if (currentTool.value === 'fill') {
      floodFill(worldPos.x, worldPos.y, hexToRgba(brushColor.value))
    } else if (currentTool.value === 'eyedropper') {
      const color = getPixel(worldPos.x, worldPos.y)
      if (color !== 0) {
        brushColor.value = rgbaToHex(color)
      }
    }

    // 优化：用请求渲染代替直接调用
    requestRender()
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const mousePos = getMousePos(event)
  currentMousePos.x = mousePos.x
  currentMousePos.y = mousePos.y

  if (isPanning.value) {
    // 平移
    const deltaX = (mousePos.x - lastMousePos.x) / viewport.zoom
    const deltaY = (mousePos.y - lastMousePos.y) / viewport.zoom

    viewport.x -= deltaX
    viewport.y -= deltaY

    lastMousePos.x = mousePos.x
    lastMousePos.y = mousePos.y
  } else if (isDrawing.value && currentTool.value === 'pixel') {
    // 继续绘制
    const worldPos = screenToWorld(mousePos.x, mousePos.y)
    drawPixel(worldPos.x, worldPos.y)
  }

  // 优化：为所有鼠标移动请求一次渲染（用于平移、绘制和UI更新）
  requestRender()
}

const handleMouseUp = () => {
  isDrawing.value = false
  isPanning.value = false
}

const handleMouseLeave = () => {
  isDrawing.value = false
  isPanning.value = false
  currentMousePos.x = -1
  currentMousePos.y = -1
  // 优化：请求渲染以清除光标
  requestRender()
}

// 缩放函数
const zoomIn = () => {
  if (viewport.zoom < maxZoom) {
    const mousePos = currentMousePos
    const worldPosBeforeZoom = screenToWorld(mousePos.x, mousePos.y)
    viewport.zoom = Math.min(maxZoom, viewport.zoom * zoomStep)
    const worldPosAfterZoom = screenToWorld(mousePos.x, mousePos.y)
    viewport.x += worldPosBeforeZoom.x - worldPosAfterZoom.x
    viewport.y += worldPosBeforeZoom.y - worldPosAfterZoom.y
    requestRender()
  }
}

const zoomOut = () => {
  if (viewport.zoom > minZoom) {
    const mousePos = currentMousePos
    const worldPosBeforeZoom = screenToWorld(mousePos.x, mousePos.y)
    viewport.zoom = Math.max(minZoom, viewport.zoom / zoomStep)
    const worldPosAfterZoom = screenToWorld(mousePos.x, mousePos.y)
    viewport.x += worldPosBeforeZoom.x - worldPosAfterZoom.x
    viewport.y += worldPosBeforeZoom.y - worldPosAfterZoom.y
    requestRender()
  }
}

const handleWheel = (event: WheelEvent) => {
  const mousePos = getMousePos(event)
  const worldPosBeforeZoom = screenToWorld(mousePos.x, mousePos.y)

  const oldZoom = viewport.zoom
  let newZoom: number
  if (event.deltaY < 0) {
    newZoom = Math.min(maxZoom, viewport.zoom * zoomStep)
  } else {
    newZoom = Math.max(minZoom, viewport.zoom / zoomStep)
  }

  if (newZoom !== oldZoom) {
    viewport.zoom = newZoom
    // 以鼠标位置为中心缩放
    const worldPosAfterZoom = screenToWorld(mousePos.x, mousePos.y)
    viewport.x += worldPosBeforeZoom.x - worldPosAfterZoom.x
    viewport.y += worldPosBeforeZoom.y - worldPosAfterZoom.y

    requestRender()
  }
}

const resetView = () => {
  viewport.zoom = 8
  viewport.x = -containerSize.width / 2 / viewport.zoom + canvasWidth.value / 2
  viewport.y = -containerSize.height / 2 / viewport.zoom + canvasHeight.value / 2
  requestRender()
}

const clearCanvas = () => {
  pixelData.value.fill(0)
  isDataDirty.value = true
  requestRender()
}

onMounted(() => {
  // 优化：初始化离屏Canvas
  offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = canvasWidth.value
  offscreenCanvas.height = canvasHeight.value
  const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    console.error('Failed to get offscreen canvas context')
    return
  }
  offscreenCtx = ctx
  // 初始时将画布标记为脏，以进行第一次绘制
  isDataDirty.value = true

  // 优化：在所有相关Canvas上禁用图像平滑以获得清晰的像素效果
  if (dataCanvasRef.value) {
    const dataCtx = dataCanvasRef.value.getContext('2d')
    if (dataCtx) dataCtx.imageSmoothingEnabled = false
  }

  // 初始化视口位置，使画布居中显示
  resetView()
})
</script>

<style scoped>
.canvas-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  max-width: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.toolbar {
  color: #000;
  width: 100%;
  max-width: 900px;
  margin-bottom: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.image-preview {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.canvas-container {
  position: relative;
  width: 800px;
  height: 600px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  margin: 20px auto;
  overflow: hidden;
  cursor: crosshair;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  background-image: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 25% 50%);
  background-size: 20px 20px;
  z-index: 0;
}

.canvas-layer {
  position: absolute;
  top: 0;
  left: 0;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .canvas-editor {
    padding: 10px;
  }

  .toolbar {
    max-width: 100%;
    margin-bottom: 1rem;
  }

  .canvas-container {
    max-width: 95vw;
    max-height: 60vh;
    padding: 15px;
    margin: 10px 0;
  }
}

@media (max-width: 480px) {
  .toolbar {
    flex-direction: column;
    gap: 1rem !important;
  }

  .toolbar > div {
    justify-content: center;
  }
}
</style>
