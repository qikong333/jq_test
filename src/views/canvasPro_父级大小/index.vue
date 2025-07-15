<template>
  <div class="canvas-pro-container">
    <div class="controls">
      <div class="control-group">
        <label>图片URL:</label>
        <input v-model="imageUrl" type="text" placeholder="输入图片URL" class="url-input" />
        <button @click="loadImage" class="load-btn">加载图片</button>
      </div>

      <div class="control-group">
        <label>缩放比例: {{ scale.toFixed(2) }}</label>
        <input
          v-model="scale"
          type="range"
          min="0.1"
          max="3"
          step="0.01"
          class="scale-slider"
          @input="handleScaleChange"
        />
      </div>

      <div class="control-group">
        <label>分块大小:</label>
        <select v-model="chunkSize" @change="handleChunkSizeChange" class="chunk-select">
          <option value="128">128px</option>
          <option value="256">256px</option>
          <option value="512">512px</option>
        </select>
      </div>

      <div class="status">
        <span>图片尺寸: {{ imageInfo.width }} × {{ imageInfo.height }}</span>
        <span>已加载分块: {{ loadedChunks.size }}</span>
        <span>可见分块: {{ visibleChunks.size }}</span>
      </div>
    </div>

    <div class="canvas-wrapper" ref="canvasWrapper">
      <canvas
        ref="canvas"
        class="main-canvas"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineOptions } from 'vue'

defineOptions({
  name: 'CanvasPro',
})
import { ref, onMounted, watch } from 'vue'

// 响应式数据
const canvas = ref<HTMLCanvasElement>()
const canvasWrapper = ref<HTMLDivElement>()
const imageUrl = ref('https://picsum.photos/4000/3000')
const scale = ref(1)
const chunkSize = ref(256)
const imageInfo = ref({ width: 0, height: 0 })
const loadedChunks = ref(new Set<string>())
const visibleChunks = ref(new Set<string>())

// 画布相关
let ctx: CanvasRenderingContext2D | null = null
let originalImage: HTMLImageElement | null = null
let isDragging = false
let lastMousePos = { x: 0, y: 0 }
const canvasOffset = { x: 0, y: 0 }

// 分块缓存
const chunkCache = new Map<string, HTMLCanvasElement>()
const intersectionObserver = ref<IntersectionObserver>()

// 初始化
onMounted(() => {
  initCanvas()
  setupIntersectionObserver()
  loadImage()
})

// 监听缩放变化
watch(scale, () => {
  if (originalImage) {
    renderVisibleChunks()
  }
})

// 初始化画布
function initCanvas() {
  if (!canvas.value || !canvasWrapper.value) return

  ctx = canvas.value.getContext('2d')
  if (!ctx) return

  // 设置画布大小为容器大小
  const rect = canvasWrapper.value.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height

  // 设置高质量渲染
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

// 设置视口检测
function setupIntersectionObserver() {
  intersectionObserver.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const chunkKey = (entry.target as HTMLElement).dataset.chunkKey
        if (chunkKey) {
          if (entry.isIntersecting) {
            visibleChunks.value.add(chunkKey)
          } else {
            visibleChunks.value.delete(chunkKey)
          }
        }
      })
      renderVisibleChunks()
    },
    { threshold: 0.1 },
  )
}

// 加载图片
async function loadImage() {
  if (!imageUrl.value) return

  try {
    // 获取图片信息
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageUrl.value
    })

    originalImage = img
    imageInfo.value = { width: img.width, height: img.height }

    // 重置状态
    loadedChunks.value.clear()
    visibleChunks.value.clear()
    chunkCache.clear()
    canvasOffset.x = 0
    canvasOffset.y = 0
    scale.value = 1

    // 初始化画布大小
    if (canvas.value) {
      canvas.value.width = Math.max(canvas.value.width, img.width)
      canvas.value.height = Math.max(canvas.value.height, img.height)
    }

    // 创建虚拟分块元素用于视口检测
    createVirtualChunks()

    // 渲染初始可见区域
    renderVisibleChunks()
  } catch (error) {
    console.error('图片加载失败:', error)
  }
}

// 创建虚拟分块元素
function createVirtualChunks() {
  if (!originalImage || !canvasWrapper.value) return

  const chunksX = Math.ceil(originalImage.width / chunkSize.value)
  const chunksY = Math.ceil(originalImage.height / chunkSize.value)

  // 清除现有的虚拟元素
  const existingChunks = canvasWrapper.value.querySelectorAll('.virtual-chunk')
  existingChunks.forEach((chunk) => chunk.remove())

  // 创建新的虚拟分块元素
  for (let y = 0; y < chunksY; y++) {
    for (let x = 0; x < chunksX; x++) {
      const chunkKey = `${x},${y}`
      const virtualChunk = document.createElement('div')
      virtualChunk.className = 'virtual-chunk'
      virtualChunk.dataset.chunkKey = chunkKey
      virtualChunk.style.position = 'absolute'
      virtualChunk.style.left = `${x * chunkSize.value * scale.value + canvasOffset.x}px`
      virtualChunk.style.top = `${y * chunkSize.value * scale.value + canvasOffset.y}px`
      virtualChunk.style.width = `${chunkSize.value * scale.value}px`
      virtualChunk.style.height = `${chunkSize.value * scale.value}px`
      virtualChunk.style.pointerEvents = 'none'
      virtualChunk.style.opacity = '0'

      canvasWrapper.value.appendChild(virtualChunk)
      intersectionObserver.value?.observe(virtualChunk)
    }
  }
}

// 渲染可见分块
function renderVisibleChunks() {
  if (!ctx || !originalImage) return

  // 清除画布
  ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

  // 渲染每个可见分块
  visibleChunks.value.forEach((chunkKey) => {
    renderChunk(chunkKey)
  })
}

// 渲染单个分块
function renderChunk(chunkKey: string) {
  if (!ctx || !originalImage) return

  const [x, y] = chunkKey.split(',').map(Number)

  // 检查缓存
  let chunkCanvas = chunkCache.get(chunkKey)

  if (!chunkCanvas) {
    // 创建分块画布
    chunkCanvas = document.createElement('canvas')
    const chunkCtx = chunkCanvas.getContext('2d')
    if (!chunkCtx) return

    // 计算分块尺寸
    const chunkWidth = Math.min(chunkSize.value, originalImage.width - x * chunkSize.value)
    const chunkHeight = Math.min(chunkSize.value, originalImage.height - y * chunkSize.value)

    chunkCanvas.width = chunkWidth
    chunkCanvas.height = chunkHeight

    // 设置高质量渲染
    chunkCtx.imageSmoothingEnabled = true
    chunkCtx.imageSmoothingQuality = 'high'

    // 绘制分块
    chunkCtx.drawImage(
      originalImage,
      x * chunkSize.value,
      y * chunkSize.value,
      chunkWidth,
      chunkHeight,
      0,
      0,
      chunkWidth,
      chunkHeight,
    )

    // 缓存分块
    chunkCache.set(chunkKey, chunkCanvas)
    loadedChunks.value.add(chunkKey)
  }

  // 绘制到主画布
  const scaledChunkWidth = chunkCanvas.width * scale.value
  const scaledChunkHeight = chunkCanvas.height * scale.value
  const drawX = x * chunkSize.value * scale.value + canvasOffset.x
  const drawY = y * chunkSize.value * scale.value + canvasOffset.y

  ctx.drawImage(chunkCanvas, drawX, drawY, scaledChunkWidth, scaledChunkHeight)
}

// 处理缩放变化
function handleScaleChange() {
  updateVirtualChunksPosition()
  renderVisibleChunks()
}

// 处理分块大小变化
function handleChunkSizeChange() {
  chunkCache.clear()
  loadedChunks.value.clear()
  createVirtualChunks()
}

// 更新虚拟分块位置
function updateVirtualChunksPosition() {
  if (!canvasWrapper.value) return

  const chunks = canvasWrapper.value.querySelectorAll('.virtual-chunk')
  chunks.forEach((chunk) => {
    const chunkKey = (chunk as HTMLElement).dataset.chunkKey
    if (chunkKey) {
      const [x, y] = chunkKey.split(',').map(Number)
      const element = chunk as HTMLElement
      element.style.left = `${x * chunkSize.value * scale.value + canvasOffset.x}px`
      element.style.top = `${y * chunkSize.value * scale.value + canvasOffset.y}px`
      element.style.width = `${chunkSize.value * scale.value}px`
      element.style.height = `${chunkSize.value * scale.value}px`
    }
  })
}

// 鼠标滚轮缩放
function handleWheel(event: WheelEvent) {
  event.preventDefault()

  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.1, Math.min(3, scale.value + delta))

  if (newScale !== scale.value) {
    scale.value = newScale
  }
}

// 鼠标拖拽
function handleMouseDown(event: MouseEvent) {
  isDragging = true
  lastMousePos = { x: event.clientX, y: event.clientY }
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return

  const deltaX = event.clientX - lastMousePos.x
  const deltaY = event.clientY - lastMousePos.y

  canvasOffset.x += deltaX
  canvasOffset.y += deltaY

  lastMousePos = { x: event.clientX, y: event.clientY }

  updateVirtualChunksPosition()
  renderVisibleChunks()
}

function handleMouseUp() {
  isDragging = false
}
</script>

<style scoped>
.canvas-pro-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.controls {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ddd;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-weight: 500;
  min-width: 80px;
}

.url-input {
  width: 300px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.load-btn {
  padding: 6px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.load-btn:hover {
  background: #0056b3;
}

.scale-slider {
  width: 200px;
}

.chunk-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.status {
  display: flex;
  gap: 16px;
  margin-left: auto;
  font-size: 14px;
  color: #666;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fff;
}

.main-canvas {
  display: block;
  cursor: grab;
  background: #f9f9f9;
}

.main-canvas:active {
  cursor: grabbing;
}

.virtual-chunk {
  /* 隐藏分块分割线 */
  border: none;
  background: transparent;
}
</style>
