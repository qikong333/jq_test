<template>
  <div class="fullscreen-canvas-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button @click="goBack" class="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          返回
        </button>
        <h1>Canvas Pro - 全屏模式</h1>
      </div>
      
      <div class="toolbar-right">
        <div class="zoom-controls">
          <span class="zoom-label">缩放: {{ Math.round(scale * 100) }}%</span>
          <button @click="zoomOut" class="zoom-btn">-</button>
          <button @click="resetZoom" class="zoom-btn">重置</button>
          <button @click="zoomIn" class="zoom-btn">+</button>
        </div>
        
        <div class="mode-selector">
          <select v-model="renderMode" @change="switchRenderMode" class="mode-select">
            <option value="normal">普通渲染</option>
            <option value="chunked">分块渲染</option>
            <option value="progressive">渐进加载</option>
          </select>
        </div>
        
        <button @click="loadLargeImage" class="load-image-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          加载大图
        </button>
      </div>
    </div>
    
    <!-- 主画布区域 -->
    <div class="canvas-area" ref="canvasContainer">
      <canvas 
        ref="mainCanvas" 
        class="main-canvas"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        您的浏览器不支持Canvas
      </canvas>
      
      <!-- 加载进度指示器 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>{{ loadingText }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(loadingProgress) }}%</span>
        </div>
      </div>
      
      <!-- 性能信息面板 -->
      <div class="performance-panel" v-if="showPerformancePanel">
        <h3>性能监控</h3>
        <div class="perf-item">
          <span>FPS:</span>
          <span>{{ fps }}</span>
        </div>
        <div class="perf-item">
          <span>已加载分块:</span>
          <span>{{ loadedChunks }}/{{ totalChunks }}</span>
        </div>
        <div class="perf-item">
          <span>内存使用:</span>
          <span>{{ memoryUsage }}MB</span>
        </div>
        <div class="perf-item">
          <span>渲染时间:</span>
          <span>{{ renderTime }}ms</span>
        </div>
      </div>
    </div>
    
    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span>模式: {{ renderModeText }}</span>
        <span>|</span>
        <span>位置: ({{ Math.round(translateX) }}, {{ Math.round(translateY) }})</span>
      </div>
      
      <div class="status-right">
        <button @click="togglePerformancePanel" class="toggle-perf-btn">
          {{ showPerformancePanel ? '隐藏' : '显示' }}性能面板
        </button>
        <button @click="exportCanvas" class="export-btn">导出图像</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const mainCanvas = ref<HTMLCanvasElement>()
const canvasContainer = ref<HTMLDivElement>()

// 画布状态
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

// 交互状态
const isDragging = ref(false)
const lastX = ref(0)
const lastY = ref(0)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 渲染模式
const renderMode = ref('chunked')
const renderModeText = computed(() => {
  const modes: Record<string, string> = {
    normal: '普通渲染',
    chunked: '分块渲染',
    progressive: '渐进加载'
  }
  return modes[renderMode.value] || '未知模式'
})

// 加载状态
const isLoading = ref(false)
const loadingText = ref('')
const loadingProgress = ref(0)

// 性能监控
const showPerformancePanel = ref(true)
const fps = ref(60)
const loadedChunks = ref(0)
const totalChunks = ref(0)
const memoryUsage = ref(0)
const renderTime = ref(0)

// 分块渲染相关
const CHUNK_SIZE = 256
const chunks = ref<Map<string, ImageData>>(new Map())
const visibleChunks = ref<Set<string>>(new Set())

// 性能监控
let frameCount = 0
let lastFpsUpdate = 0

const goBack = () => {
  router.push('/canvas-pro')
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const rect = mainCanvas.value?.getBoundingClientRect()
  if (!rect) return
  
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(10, scale.value * delta))
  
  // 以鼠标位置为中心缩放
  const scaleFactor = newScale / scale.value
  translateX.value = mouseX - (mouseX - translateX.value) * scaleFactor
  translateY.value = mouseY - (mouseY - translateY.value) * scaleFactor
  
  scale.value = newScale
  requestRender()
}

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  lastX.value = e.clientX
  lastY.value = e.clientY
  
  if (mainCanvas.value) {
    mainCanvas.value.style.cursor = 'grabbing'
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - lastX.value
  const deltaY = e.clientY - lastY.value
  
  translateX.value += deltaX
  translateY.value += deltaY
  
  lastX.value = e.clientX
  lastY.value = e.clientY
  
  requestRender()
}

const handleMouseUp = () => {
  isDragging.value = false
  if (mainCanvas.value) {
    mainCanvas.value.style.cursor = 'grab'
  }
}

const zoomIn = () => {
  scale.value = Math.min(10, scale.value * 1.2)
  requestRender()
}

const zoomOut = () => {
  scale.value = Math.max(0.1, scale.value / 1.2)
  requestRender()
}

const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  requestRender()
}

const switchRenderMode = () => {
  requestRender()
}

const loadLargeImage = async () => {
  isLoading.value = true
  loadingProgress.value = 0
  loadingText.value = '正在生成大图数据...'
  
  try {
    await simulateLargeImageLoad()
  } catch (error) {
    console.error('加载大图失败:', error)
  } finally {
    isLoading.value = false
  }
}

const simulateLargeImageLoad = async () => {
  const imageWidth = 4000
  const imageHeight = 3000
  
  const chunksX = Math.ceil(imageWidth / CHUNK_SIZE)
  const chunksY = Math.ceil(imageHeight / CHUNK_SIZE)
  totalChunks.value = chunksX * chunksY
  loadedChunks.value = 0
  
  chunks.value.clear()
  
  // 模拟分块加载
  for (let y = 0; y < chunksY; y++) {
    for (let x = 0; x < chunksX; x++) {
      const chunkKey = `${x}-${y}`
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // 生成分块数据
      const chunkData = generateChunkData(x, y, CHUNK_SIZE, CHUNK_SIZE)
      chunks.value.set(chunkKey, chunkData)
      
      loadedChunks.value++
      loadingProgress.value = (loadedChunks.value / totalChunks.value) * 100
      loadingText.value = `正在加载分块 ${loadedChunks.value}/${totalChunks.value}...`
      
      // 实时更新显示
      if (loadedChunks.value % 5 === 0) {
        requestRender()
      }
    }
  }
  
  loadingText.value = '加载完成！'
  requestRender()
}

const generateChunkData = (chunkX: number, chunkY: number, width: number, height: number): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  // 生成渐变背景
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  const hue = (chunkX * 137.5 + chunkY * 222.5) % 360
  gradient.addColorStop(0, `hsl(${hue}, 70%, 80%)`)
  gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 60%)`)
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // 添加网格线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1
  
  for (let i = 0; i <= width; i += 32) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, height)
    ctx.stroke()
  }
  
  for (let i = 0; i <= height; i += 32) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(width, i)
    ctx.stroke()
  }
  
  // 添加分块标识
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.font = '16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(`${chunkX},${chunkY}`, width / 2, height / 2)
  
  return ctx.getImageData(0, 0, width, height)
}

const requestRender = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  animationId = requestAnimationFrame(render)
}

const render = (timestamp: number) => {
  if (!ctx || !mainCanvas.value) return
  
  const startTime = performance.now()
  
  // 更新FPS
  updateFPS(timestamp)
  
  // 清空画布
  ctx.clearRect(0, 0, mainCanvas.value.width, mainCanvas.value.height)
  
  ctx.save()
  ctx.translate(translateX.value, translateY.value)
  ctx.scale(scale.value, scale.value)
  
  if (renderMode.value === 'chunked' || renderMode.value === 'progressive') {
    renderChunked()
  } else {
    renderNormal()
  }
  
  ctx.restore()
  
  renderTime.value = Math.round(performance.now() - startTime)
  
  // 更新内存使用估算
  memoryUsage.value = Math.round((chunks.value.size * CHUNK_SIZE * CHUNK_SIZE * 4) / (1024 * 1024))
}

const renderChunked = () => {
  if (!ctx || !mainCanvas.value) return
  
  // 计算可视区域内的分块
  const viewLeft = -translateX.value / scale.value
  const viewTop = -translateY.value / scale.value
  const viewRight = viewLeft + mainCanvas.value.width / scale.value
  const viewBottom = viewTop + mainCanvas.value.height / scale.value
  
  const startChunkX = Math.floor(viewLeft / CHUNK_SIZE)
  const startChunkY = Math.floor(viewTop / CHUNK_SIZE)
  const endChunkX = Math.ceil(viewRight / CHUNK_SIZE)
  const endChunkY = Math.ceil(viewBottom / CHUNK_SIZE)
  
  visibleChunks.value.clear()
  
  for (let y = startChunkY; y <= endChunkY; y++) {
    for (let x = startChunkX; x <= endChunkX; x++) {
      const chunkKey = `${x}-${y}`
      visibleChunks.value.add(chunkKey)
      
      const chunkData = chunks.value.get(chunkKey)
      if (chunkData) {
        const canvas = document.createElement('canvas')
        canvas.width = CHUNK_SIZE
        canvas.height = CHUNK_SIZE
        const chunkCtx = canvas.getContext('2d')!
        chunkCtx.putImageData(chunkData, 0, 0)
        
        ctx.drawImage(canvas, x * CHUNK_SIZE, y * CHUNK_SIZE)
      } else {
        // 绘制占位符
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(x * CHUNK_SIZE, y * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE)
        
        ctx.strokeStyle = '#ddd'
        ctx.strokeRect(x * CHUNK_SIZE, y * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE)
      }
    }
  }
}

const renderNormal = () => {
  if (!ctx || !mainCanvas.value) return
  
  // 绘制简单的演示内容
  ctx.fillStyle = '#4f46e5'
  ctx.fillRect(100, 100, 300, 200)
  
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(500, 300, 200, 150)
  
  ctx.fillStyle = '#10b981'
  ctx.fillRect(200, 400, 250, 100)
  
  ctx.fillStyle = 'white'
  ctx.font = '24px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('普通渲染模式', 250, 200)
}

const updateFPS = (timestamp: number) => {
  frameCount++
  
  if (timestamp - lastFpsUpdate >= 1000) {
    fps.value = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate))
    frameCount = 0
    lastFpsUpdate = timestamp
  }
}

const togglePerformancePanel = () => {
  showPerformancePanel.value = !showPerformancePanel.value
}

const exportCanvas = () => {
  if (!mainCanvas.value) return
  
  const link = document.createElement('a')
  link.download = 'canvas-export.png'
  link.href = mainCanvas.value.toDataURL()
  link.click()
}

const resizeCanvas = () => {
  if (!mainCanvas.value || !canvasContainer.value) return
  
  const container = canvasContainer.value
  mainCanvas.value.width = container.clientWidth
  mainCanvas.value.height = container.clientHeight
  
  requestRender()
}

onMounted(async () => {
  await nextTick()
  
  if (mainCanvas.value) {
    ctx = mainCanvas.value.getContext('2d')
    resizeCanvas()
    
    // 自动加载演示数据
    setTimeout(() => {
      loadLargeImage()
    }, 1000)
  }
  
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.fullscreen-canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2d2d2d;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #404040;
  color: white;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #404040;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background: #525252;
}

.toolbar h1 {
  font-size: 1.25rem;
  margin: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-label {
  font-size: 0.875rem;
  color: #d1d5db;
}

.zoom-btn {
  background: #404040;
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: 2rem;
}

.zoom-btn:hover {
  background: #525252;
}

.mode-select {
  background: #404040;
  color: white;
  border: 1px solid #525252;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.load-image-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.load-image-btn:hover {
  background: #2563eb;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.main-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  background: #f9fafb;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #374151;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #374151;
  border-radius: 4px;
  margin: 1rem auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #d1d5db;
}

.performance-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 0.5rem;
  min-width: 200px;
  backdrop-filter: blur(10px);
}

.performance-panel h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
}

.perf-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2d2d2d;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid #404040;
  color: #d1d5db;
  font-size: 0.875rem;
}

.status-left {
  display: flex;
  gap: 1rem;
}

.status-right {
  display: flex;
  gap: 0.75rem;
}

.toggle-perf-btn, .export-btn {
  background: #404040;
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.875rem;
}

.toggle-perf-btn:hover, .export-btn:hover {
  background: #525252;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  .toolbar-left, .toolbar-right {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .performance-panel {
    position: relative;
    top: auto;
    right: auto;
    margin: 1rem;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>