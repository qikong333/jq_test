<template>
  <div class="harmony-container">
    <!-- 头部工具栏 -->
    <div class="toolbar">
      <h1 class="title">Harmony 画布</h1>
      <div class="tools">
        <button 
          :class="['tool-btn', { active: currentTool === 'rectangle' }]"
          @click="setTool('rectangle')"
        >
          矩形
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'move' }]"
          @click="setTool('move')"
        >
          移动
        </button>
        <input 
          ref="fileInput"
          type="file" 
          accept="image/*" 
          @change="handleImageUpload"
          style="display: none;"
        >
        <button class="tool-btn" @click="triggerImageUpload">
          上传图片
        </button>
        <button class="tool-btn" @click="clearCanvas">
          清空
        </button>
      </div>
    </div>

    <!-- 画布容器 -->
    <div class="canvas-container" ref="canvasContainer">
      <canvas 
        ref="canvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        class="drawing-canvas"
      ></canvas>
      

    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <span>当前工具: {{ toolNames[currentTool] }}</span>
      <span>画布尺寸: {{ canvasWidth }} × {{ canvasHeight }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineOptions } from 'vue'

// 定义组件名称为多词形式
defineOptions({
  name: 'HarmonyCanvas'
})

// 类型定义
interface Point {
  x: number
  y: number
}

interface Rectangle {
  id: string
  startX: number
  startY: number
  width: number
  height: number
  color: string
}

type Tool = 'rectangle' | 'move'

// 响应式数据
const canvas = ref<HTMLCanvasElement>()
const canvasContainer = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>()
const ctx = ref<CanvasRenderingContext2D | null>(null)

const canvasWidth = ref(800)
const canvasHeight = ref(600)
const currentTool = ref<Tool>('rectangle')
const isDrawing = ref(false)
const startPoint = ref<Point>({ x: 0, y: 0 })
const rectangles = ref<Rectangle[]>([])  
const backgroundImage = ref<HTMLImageElement | null>(null)
const imageDrawInfo = ref<{x: number, y: number, width: number, height: number} | null>(null)
const selectedRectangle = ref<Rectangle | null>(null)
const dragOffset = ref<Point>({ x: 0, y: 0 })

// 工具名称映射
const toolNames = {
  rectangle: '绘制矩形',
  move: '移动模式'
}



// 初始化画布
const initCanvas = () => {
  if (!canvas.value) return
  
  ctx.value = canvas.value.getContext('2d')
  if (!ctx.value) return
  
  // 设置画布样式
  ctx.value.lineCap = 'round'
  ctx.value.lineJoin = 'round'
  ctx.value.strokeStyle = '#007bff'
  ctx.value.fillStyle = 'rgba(0, 123, 255, 0.1)'
  ctx.value.lineWidth = 2
  
  // 响应式调整画布大小
  resizeCanvas()
}

// 调整画布大小
const resizeCanvas = () => {
  if (!canvasContainer.value) return
  
  const container = canvasContainer.value
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  // 移动端适配
  if (window.innerWidth <= 768) {
    canvasWidth.value = Math.min(containerWidth - 20, 400)
    canvasHeight.value = Math.min(containerHeight - 20, 300)
  } else {
    canvasWidth.value = Math.min(containerWidth - 40, 800)
    canvasHeight.value = Math.min(containerHeight - 40, 600)
  }
  
  // 重新绘制
  redrawCanvas()
}

// 获取鼠标/触摸位置
const getEventPosition = (event: MouseEvent | TouchEvent): Point => {
  if (!canvas.value) return { x: 0, y: 0 }
  
  const rect = canvas.value.getBoundingClientRect()
  let clientX: number, clientY: number
  
  if (event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0]
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }
  
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
}

// 鼠标事件处理
const handleMouseDown = (event: MouseEvent) => {
  event.preventDefault()
  const point = getEventPosition(event)
  handlePointerDown(point)
}

const handleMouseMove = (event: MouseEvent) => {
  event.preventDefault()
  const point = getEventPosition(event)
  handlePointerMove(point)
}

const handleMouseUp = (event: MouseEvent) => {
  event.preventDefault()
  const point = getEventPosition(event)
  handlePointerUp(point)
}

// 触摸事件处理
const handleTouchStart = (event: TouchEvent) => {
  event.preventDefault()
  const point = getEventPosition(event)
  handlePointerDown(point)
}

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault()
  const point = getEventPosition(event)
  handlePointerMove(point)
}

const handleTouchEnd = (event: TouchEvent) => {
  event.preventDefault()
  const point = getEventPosition(event)
  handlePointerUp(point)
}

// 统一的指针事件处理
const handlePointerDown = (point: Point) => {
  if (currentTool.value === 'rectangle') {
    isDrawing.value = true
    startPoint.value = point
  } else if (currentTool.value === 'move') {
    // 查找点击的矩形
    const clickedRect = findRectangleAt(point)
    if (clickedRect) {
      selectedRectangle.value = clickedRect
      dragOffset.value = {
        x: point.x - clickedRect.startX,
        y: point.y - clickedRect.startY
      }
      isDrawing.value = true
    }
  }
}

const handlePointerMove = (point: Point) => {
  if (!isDrawing.value) return
  
  if (currentTool.value === 'rectangle') {
    // 绘制矩形预览
    redrawCanvas()
    drawRectanglePreview(startPoint.value, point)
  } else if (currentTool.value === 'move' && selectedRectangle.value) {
    // 移动矩形
    selectedRectangle.value.startX = point.x - dragOffset.value.x
    selectedRectangle.value.startY = point.y - dragOffset.value.y
    redrawCanvas()
  }
}

const handlePointerUp = (point?: Point) => {
  if (!isDrawing.value) return
  
  if (currentTool.value === 'rectangle' && point) {
    // 完成矩形绘制
    addRectangle(startPoint.value, point)
  }
  
  isDrawing.value = false
  selectedRectangle.value = null
}

// 查找指定位置的矩形
const findRectangleAt = (point: Point): Rectangle | null => {
  for (let i = rectangles.value.length - 1; i >= 0; i--) {
    const rect = rectangles.value[i]
    if (point.x >= rect.startX && 
        point.x <= rect.startX + rect.width &&
        point.y >= rect.startY && 
        point.y <= rect.startY + rect.height) {
      return rect
    }
  }
  return null
}

// 绘制矩形预览
const drawRectanglePreview = (start: Point, end: Point) => {
  if (!ctx.value) return
  
  const width = end.x - start.x
  const height = end.y - start.y
  
  ctx.value.strokeRect(start.x, start.y, width, height)
  ctx.value.fillRect(start.x, start.y, width, height)
}

// 添加矩形
const addRectangle = (start: Point, end: Point) => {
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  
  if (width < 5 || height < 5) return // 忽略太小的矩形
  
  const rectangle: Rectangle = {
    id: Date.now().toString(),
    startX: Math.min(start.x, end.x),
    startY: Math.min(start.y, end.y),
    width,
    height,
    color: '#007bff'
  }
  
  rectangles.value.push(rectangle)
  redrawCanvas()
}

// 重新绘制画布
const redrawCanvas = () => {
  if (!ctx.value || !canvas.value) return
  
  // 清空画布
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // 先绘制背景图片（如果有）
  if (backgroundImage.value && imageDrawInfo.value) {
    ctx.value.drawImage(
      backgroundImage.value, 
      imageDrawInfo.value.x, 
      imageDrawInfo.value.y, 
      imageDrawInfo.value.width, 
      imageDrawInfo.value.height
    )
  }
  
  // 绘制所有矩形
  rectangles.value.forEach(rect => {
    ctx.value!.strokeStyle = rect.color
    ctx.value!.fillStyle = rect.color + '20' // 添加透明度
    ctx.value!.strokeRect(rect.startX, rect.startY, rect.width, rect.height)
    ctx.value!.fillRect(rect.startX, rect.startY, rect.width, rect.height)
  })
}

// 设置工具
const setTool = (tool: Tool) => {
  currentTool.value = tool
  selectedRectangle.value = null
}

// 触发图片上传
const triggerImageUpload = () => {
  fileInput.value?.click()
}

// 处理图片上传
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      drawImageToCanvas(img)
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 将图片绘制到画布上
const drawImageToCanvas = (img: HTMLImageElement) => {
  if (!ctx.value || !canvas.value) return
  
  // 保存图片引用
  backgroundImage.value = img
  
  // 计算图片在画布上的尺寸，保持宽高比
  const canvasAspect = canvasWidth.value / canvasHeight.value
  const imageAspect = img.width / img.height
  
  let drawWidth: number
  let drawHeight: number
  let drawX: number
  let drawY: number
  
  if (imageAspect > canvasAspect) {
    // 图片更宽，以画布宽度为准
    drawWidth = canvasWidth.value
    drawHeight = canvasWidth.value / imageAspect
    drawX = 0
    drawY = (canvasHeight.value - drawHeight) / 2
  } else {
    // 图片更高，以画布高度为准
    drawHeight = canvasHeight.value
    drawWidth = canvasHeight.value * imageAspect
    drawX = (canvasWidth.value - drawWidth) / 2
    drawY = 0
  }
  
  // 保存图片绘制信息
  imageDrawInfo.value = { x: drawX, y: drawY, width: drawWidth, height: drawHeight }
  
  // 使用统一的重绘函数
  redrawCanvas()
}

// 清空画布
const clearCanvas = () => {
  rectangles.value = []
  backgroundImage.value = null
  imageDrawInfo.value = null
  redrawCanvas()
}

// 窗口大小变化处理
const handleResize = () => {
  resizeCanvas()
}

// 生命周期
onMounted(() => {
  initCanvas()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.harmony-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.title {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.tools {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.tool-btn:hover {
  background-color: #f0f0f0;
}

.tool-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.canvas-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.drawing-canvas {
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: white;
  cursor: crosshair;
  touch-action: none;
  position: relative;
  z-index: 2;
}



.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  font-size: 0.8rem;
  color: #666;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
  }
  
  .title {
    font-size: 1.2rem;
  }
  
  .tools {
    justify-content: center;
  }
  
  .tool-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .canvas-container {
    padding: 0.5rem;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
  
  .drawing-canvas {
    max-width: 100%;
    max-height: 100%;
  }
}

@media (max-width: 480px) {
  .toolbar {
    padding: 0.25rem;
  }
  
  .title {
    font-size: 1rem;
  }
  
  .tool-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
  }
}
</style>