<template>
  <div class="">
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
          max="5"
          step="0.01"
          class="scale-slider"
          @input="handleScaleChange"
        />
      </div>

      <div class="control-group">
        <label>分块大小:</label>
        <select v-model="chunkSize" @change="handleChunkSizeChange" class="chunk-select">
          <option :value="128">128px</option>
          <option :value="256">256px</option>
          <option :value="512">512px</option>
        </select>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showGrid" @change="handleGridToggle" />
          显示网格
        </label>
      </div>
      <div class="control-group" v-if="showGrid">
        <label>网格颜色:</label>
        <input type="color" v-model="gridColor" @change="handleGridColorChange" />
      </div>
      <div class="control-group" v-if="showGrid">
        <label>网格宽度:</label>
        <input
          type="number"
          v-model="gridWidth"
          min="1"
          max="20"
          @change="handleGridSizeChange"
          class="grid-size-input"
        />
        <span>px</span>
      </div>
      <div class="control-group" v-if="showGrid">
        <label>网格高度:</label>
        <input
          type="number"
          v-model="gridHeight"
          min="1"
          max="20"
          @change="handleGridSizeChange"
          class="grid-size-input"
        />
        <span>px</span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="brushMode" @change="handleBrushModeToggle" />
          画笔模式
        </label>
      </div>
      <div class="control-group" v-if="brushMode">
        <label>画笔颜色:</label>
        <input type="color" v-model="brushColor" />
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
        :class="['main-canvas', { 'brush-mode': brushMode }]"
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

// 网格相关
const showGrid = ref(true)
const gridColor = ref('#e0e0e0')
const gridChunkCache = new Map<string, HTMLCanvasElement>()
const gridWidth = ref(2) // 网格宽度，默认2px
const gridHeight = ref(3) // 网格高度，默认3px

// 画笔相关
const brushMode = ref(false)
const brushColor = ref('#ff0000')
const drawnRects = ref(new Set<string>()) // 存储已绘制的矩形位置
const drawnRectsCache = new Map<string, { x: number; y: number }>()
let brushDebounceTimer: ReturnType<typeof setTimeout> | null = null
const BRUSH_DEBOUNCE_DELAY = 8 // 约120fps，更流畅的绘制体验

// 画布相关
let ctx: CanvasRenderingContext2D | null = null
let originalImage: HTMLImageElement | null = null
let isDragging = false
let lastMousePos = { x: 0, y: 0 }
const canvasOffset = { x: 0, y: 0 }

// 分块缓存
const chunkCache = new Map<string, HTMLCanvasElement>()
const intersectionObserver = ref<IntersectionObserver>()

// 网格分块缓存
let gridDebounceTimer: ReturnType<typeof setTimeout> | null = null
const GRID_DEBOUNCE_DELAY = 100
let dragDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DRAG_DEBOUNCE_DELAY = 16 // 约60fps

// 防抖控制
let scaleDebounceTimer: ReturnType<typeof setTimeout> | null = null
const SCALE_DEBOUNCE_DELAY = 150 // 防抖延迟时间（毫秒）

// 初始化
onMounted(() => {
  initCanvas()
  setupIntersectionObserver()
  loadImage()
})

// 监听缩放变化（带防抖）
watch(scale, () => {
  if (originalImage) {
    // 立即更新虚拟分块位置，保持视觉连续性
    updateVirtualChunksPosition()

    // 清除之前的防抖定时器
    if (scaleDebounceTimer) {
      clearTimeout(scaleDebounceTimer)
    }

    // 设置新的防抖定时器，延迟执行分片加载
    scaleDebounceTimer = setTimeout(() => {
      renderVisibleChunks()
      scaleDebounceTimer = null
    }, SCALE_DEBOUNCE_DELAY)
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
    gridChunkCache.clear()
    drawnRects.value.clear()
    drawnRectsCache.clear()
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

  // 设置渲染选项以避免白线
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 渲染每个可见分块
  visibleChunks.value.forEach((chunkKey) => {
    renderChunk(chunkKey)
  })

  // 渲染网格层
  if (showGrid.value) {
    renderGridLayer()
  }

  // 渲染已绘制的矩形
  renderDrawnRects()
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

  // 绘制到主画布 - 使用像素完美对齐避免白线
  const scaledChunkWidth = chunkCanvas.width * scale.value
  const scaledChunkHeight = chunkCanvas.height * scale.value
  const drawX = Math.round(x * chunkSize.value * scale.value + canvasOffset.x)
  const drawY = Math.round(y * chunkSize.value * scale.value + canvasOffset.y)

  // 添加微小重叠以消除可能的间隙
  const overlap = 0.5
  const adjustedWidth = Math.ceil(scaledChunkWidth + overlap)
  const adjustedHeight = Math.ceil(scaledChunkHeight + overlap)

  ctx.drawImage(chunkCanvas, drawX, drawY, adjustedWidth, adjustedHeight)
}

// 处理缩放变化（滑块拖拽时的防抖）
function handleScaleChange() {
  // 立即更新虚拟分块位置
  updateVirtualChunksPosition()

  // 清除之前的防抖定时器
  if (scaleDebounceTimer) {
    clearTimeout(scaleDebounceTimer)
  }

  // 设置防抖定时器，延迟执行分片加载
  scaleDebounceTimer = setTimeout(() => {
    renderVisibleChunks()
    scaleDebounceTimer = null
  }, SCALE_DEBOUNCE_DELAY)
}

// 处理分块大小变化
function handleChunkSizeChange() {
  chunkCache.clear()
  gridChunkCache.clear()
  loadedChunks.value.clear()
  createVirtualChunks()
}

// 处理网格显示切换
function handleGridToggle() {
  if (showGrid.value) {
    renderVisibleChunks()
  } else {
    // 重新渲染以移除网格
    renderVisibleChunks()
  }
}

// 处理网格颜色变化
function handleGridColorChange() {
  if (showGrid.value) {
    // 清除网格缓存并重新渲染
    gridChunkCache.clear()

    // 防抖处理
    if (gridDebounceTimer) {
      clearTimeout(gridDebounceTimer)
    }

    gridDebounceTimer = setTimeout(() => {
      renderVisibleChunks()
      gridDebounceTimer = null
    }, GRID_DEBOUNCE_DELAY)
  }
}

// 处理网格大小变化
function handleGridSizeChange() {
  if (showGrid.value) {
    // 清除网格缓存并重新渲染
    gridChunkCache.clear()

    // 防抖处理
    if (gridDebounceTimer) {
      clearTimeout(gridDebounceTimer)
    }

    gridDebounceTimer = setTimeout(() => {
      renderVisibleChunks()
      gridDebounceTimer = null
    }, GRID_DEBOUNCE_DELAY)
  }
}

// 渲染网格层
function renderGridLayer() {
  if (!ctx || !canvas.value) return

  // 获取画布可视区域
  const canvasWidth = canvas.value.width
  const canvasHeight = canvas.value.height

  // 计算网格在当前缩放下的间距
  const gridSpacingX = gridWidth.value * scale.value
  const gridSpacingY = gridHeight.value * scale.value

  // 如果网格太小或太密集，跳过渲染
  if (gridSpacingX < 1 || gridSpacingY < 1) return

  // 优化：当缩放很小时，降低网格密度
  let actualGridSpacingX = gridSpacingX
  let actualGridSpacingY = gridSpacingY
  if (gridSpacingX < 5) {
    // 当网格间距小于5px时，使用更大的间距
    const factor = Math.ceil(5 / gridSpacingX)
    actualGridSpacingX = gridSpacingX * factor
  }
  if (gridSpacingY < 5) {
    // 当网格间距小于5px时，使用更大的间距
    const factor = Math.ceil(5 / gridSpacingY)
    actualGridSpacingY = gridSpacingY * factor
  }

  // 计算可视区域内的网格范围
  const startX =
    Math.floor(-canvasOffset.x / actualGridSpacingX) * actualGridSpacingX + canvasOffset.x
  const startY =
    Math.floor(-canvasOffset.y / actualGridSpacingY) * actualGridSpacingY + canvasOffset.y

  // 优化缓存键，减少精度以提高缓存命中率
  const scaleKey = Math.round(scale.value * 100) / 100
  const offsetXKey = Math.round(canvasOffset.x / 10) * 10
  const offsetYKey = Math.round(canvasOffset.y / 10) * 10

  // 使用更大的分块以减少分块数量
  const gridChunkSize = 512 // 增大网格分块大小
  const chunksX = Math.ceil(canvasWidth / gridChunkSize)
  const chunksY = Math.ceil(canvasHeight / gridChunkSize)

  for (let cy = 0; cy < chunksY; cy++) {
    for (let cx = 0; cx < chunksX; cx++) {
      const chunkKey = `grid_${cx}_${cy}_${scaleKey}_${offsetXKey}_${offsetYKey}_${gridWidth.value}_${gridHeight.value}`

      // 检查缓存
      let gridChunk = gridChunkCache.get(chunkKey)

      if (!gridChunk) {
        // 创建网格分块
        gridChunk = createGridChunk(
          cx,
          cy,
          gridChunkSize,
          actualGridSpacingX,
          actualGridSpacingY,
          startX,
          startY,
        )
        if (gridChunk) {
          gridChunkCache.set(chunkKey, gridChunk)

          // 限制缓存大小
          if (gridChunkCache.size > 30) {
            const firstKey = gridChunkCache.keys().next().value
            if (firstKey) {
              gridChunkCache.delete(firstKey)
            }
          }
        }
      }

      // 绘制网格分块到主画布
      if (gridChunk) {
        const drawX = cx * gridChunkSize
        const drawY = cy * gridChunkSize
        ctx.drawImage(gridChunk, drawX, drawY)
      }
    }
  }
}

// 创建网格分块
function createGridChunk(
  chunkX: number,
  chunkY: number,
  chunkSize: number,
  gridSpacingX: number,
  gridSpacingY: number,
  startX: number,
  startY: number,
): HTMLCanvasElement | null {
  if (!canvas.value) return null

  const gridChunk = document.createElement('canvas')
  const gridCtx = gridChunk.getContext('2d')
  if (!gridCtx) return null

  gridChunk.width = chunkSize
  gridChunk.height = chunkSize

  // 设置网格样式
  gridCtx.strokeStyle = gridColor.value
  gridCtx.lineWidth = 1
  gridCtx.globalAlpha = 0.2 // 降低透明度，减少视觉干扰

  // 计算分块区域
  const chunkStartX = chunkX * chunkSize
  const chunkStartY = chunkY * chunkSize
  const chunkEndX = Math.min(chunkStartX + chunkSize, canvas.value.width)
  const chunkEndY = Math.min(chunkStartY + chunkSize, canvas.value.height)

  // 优化：批量绘制线条，减少beginPath调用
  gridCtx.beginPath()

  // 绘制垂直线
  for (let x = startX; x <= canvas.value.width; x += gridSpacingX) {
    if (x >= chunkStartX && x <= chunkEndX) {
      const localX = x - chunkStartX
      gridCtx.moveTo(localX, 0)
      gridCtx.lineTo(localX, Math.min(chunkSize, chunkEndY - chunkStartY))
    }
  }

  // 绘制水平线
  for (let y = startY; y <= canvas.value.height; y += gridSpacingY) {
    if (y >= chunkStartY && y <= chunkEndY) {
      const localY = y - chunkStartY
      gridCtx.moveTo(0, localY)
      gridCtx.lineTo(Math.min(chunkSize, chunkEndX - chunkStartX), localY)
    }
  }

  // 一次性绘制所有线条
  gridCtx.stroke()

  return gridChunk
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

// 鼠标滚轮缩放（以鼠标位置为中心）
function handleWheel(event: WheelEvent) {
  event.preventDefault()

  if (!canvas.value) return

  // 获取鼠标相对于画布的位置
  const rect = canvas.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  // 计算缩放增量
  const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(5, scale.value * zoomDelta))

  if (newScale !== scale.value) {
    // 计算缩放比例
    const zoomRatio = newScale / scale.value

    // 调整偏移量以保持鼠标位置不变
    canvasOffset.x = mouseX - (mouseX - canvasOffset.x) * zoomRatio
    canvasOffset.y = mouseY - (mouseY - canvasOffset.y) * zoomRatio

    // 更新缩放值
    scale.value = newScale
    // 缩放变化会触发watch监听器，自动处理防抖
  }
}

// 处理画笔模式切换
function handleBrushModeToggle() {
  if (brushMode.value) {
    // 进入画笔模式时清除拖拽状态
    isDragging = false
  }
}

// 计算网格对齐的位置
function getGridAlignedPosition(mouseX: number, mouseY: number) {
  // 将鼠标位置转换为图像坐标
  const imageX = (mouseX - canvasOffset.x) / scale.value
  const imageY = (mouseY - canvasOffset.y) / scale.value

  // 计算对齐到网格的位置
  const gridX = Math.floor(imageX / gridWidth.value) * gridWidth.value
  const gridY = Math.floor(imageY / gridHeight.value) * gridHeight.value

  return { gridX, gridY }
}

// 绘制矩形到画布
function drawRect(gridX: number, gridY: number) {
  if (!ctx) return

  const rectKey = `${gridX},${gridY}`

  // 如果已经绘制过，则移除
  if (drawnRects.value.has(rectKey)) {
    drawnRects.value.delete(rectKey)
    drawnRectsCache.delete(rectKey)
  } else {
    // 否则添加新矩形
    drawnRects.value.add(rectKey)
    drawnRectsCache.set(rectKey, { x: gridX, y: gridY })
  }

  // 防抖处理渲染，避免频繁重绘
  if (brushDebounceTimer) {
    clearTimeout(brushDebounceTimer)
  }

  brushDebounceTimer = setTimeout(() => {
    renderVisibleChunks()
    brushDebounceTimer = null
  }, BRUSH_DEBOUNCE_DELAY)
}

// 渲染已绘制的矩形
function renderDrawnRects() {
  if (!ctx || !canvas.value) return

  // 如果没有矩形需要绘制，直接返回
  if (drawnRects.value.size === 0) return

  ctx.fillStyle = brushColor.value
  ctx.globalAlpha = 0.7

  // 预计算画布尺寸和缩放相关值
  const canvasWidth = canvas.value.width
  const canvasHeight = canvas.value.height
  const scaleValue = scale.value
  const rectWidth = gridWidth.value * scaleValue
  const rectHeight = gridHeight.value * scaleValue
  const offsetX = canvasOffset.x
  const offsetY = canvasOffset.y

  // 使用缓存避免重复的字符串分割和数值转换
  drawnRectsCache.forEach(({ x: gridX, y: gridY }) => {
    // 转换为画布坐标
    const canvasX = gridX * scaleValue + offsetX
    const canvasY = gridY * scaleValue + offsetY

    // 只绘制在可视区域内的矩形（优化边界检查）
    if (
      canvasX + rectWidth >= 0 &&
      canvasX <= canvasWidth &&
      canvasY + rectHeight >= 0 &&
      canvasY <= canvasHeight
    ) {
      ctx.fillRect(canvasX, canvasY, rectWidth, rectHeight)
    }
  })

  ctx.globalAlpha = 1.0
}

// 鼠标拖拽
function handleMouseDown(event: MouseEvent) {
  if (brushMode.value) {
    // 画笔模式：绘制矩形
    if (!canvas.value) return

    const rect = canvas.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const { gridX, gridY } = getGridAlignedPosition(mouseX, mouseY)
    drawRect(gridX, gridY)
  } else {
    // 拖拽模式
    isDragging = true
    lastMousePos = { x: event.clientX, y: event.clientY }
  }
}

function handleMouseMove(event: MouseEvent) {
  if (brushMode.value) {
    // 画笔模式：如果按住鼠标，继续绘制
    if (event.buttons === 1) {
      // 左键按下
      if (!canvas.value) return

      const rect = canvas.value.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      const { gridX, gridY } = getGridAlignedPosition(mouseX, mouseY)
      const rectKey = `${gridX},${gridY}`

      // 只有当位置不同时才绘制
      if (!drawnRects.value.has(rectKey)) {
        drawnRects.value.add(rectKey)
        drawnRectsCache.set(rectKey, { x: gridX, y: gridY })

        // 使用防抖优化连续绘制性能
        if (brushDebounceTimer) {
          clearTimeout(brushDebounceTimer)
        }

        brushDebounceTimer = setTimeout(() => {
          renderVisibleChunks()
          brushDebounceTimer = null
        }, BRUSH_DEBOUNCE_DELAY)
      }
    }
    return
  }

  // 拖拽模式
  if (!isDragging) return

  const deltaX = event.clientX - lastMousePos.x
  const deltaY = event.clientY - lastMousePos.y

  canvasOffset.x += deltaX
  canvasOffset.y += deltaY

  lastMousePos = { x: event.clientX, y: event.clientY }

  // 立即更新虚拟分块位置，保持视觉连续性
  updateVirtualChunksPosition()

  // 防抖处理渲染，避免拖动时频繁重绘
  if (dragDebounceTimer) {
    clearTimeout(dragDebounceTimer)
  }

  dragDebounceTimer = setTimeout(() => {
    renderVisibleChunks()
    dragDebounceTimer = null
  }, DRAG_DEBOUNCE_DELAY)
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

.grid-size-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.status {
  display: flex;
  gap: 16px;
  margin-left: auto;
  font-size: 14px;
  color: #666;
}

.canvas-wrapper {
  width: 600px;
  height: 600px;
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

.main-canvas.brush-mode {
  cursor: crosshair;
}

.main-canvas.brush-mode:active {
  cursor: crosshair;
}

.virtual-chunk {
  /* 隐藏分块分割线 */
  border: none;
  background: transparent;
}
</style>
