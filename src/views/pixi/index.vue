<template>
  <div class="pixi-editor-container">
    <!-- 工具栏 -->
    <ToolBar
      v-model:current-tool="currentTool"
      v-model:current-color="currentColor"
      v-model:brush-size="brushSize"
      @clear="handleClear"
      @undo="handleUndo"
      @redo="handleRedo"
      @export="handleExport"
      @import="handleImport"
    />

    <!-- 主画布容器 -->
    <div
      ref="canvasContainer"
      class="canvas-container"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    >
      <!-- PixiJS 应用将挂载到这里 -->
    </div>

    <!-- 小地图导航器 -->
    <MinimapNavigator
      v-if="showMinimap"
      :viewport="viewport"
      :canvas-size="canvasSize"
      @navigate="handleMinimapNavigate"
    />

    <!-- 状态栏 -->
    <div class="status-bar">
      <span>缩放: {{ Math.round(viewport.scale * 100) }}%</span>
      <span>位置: ({{ Math.round(viewport.x) }}, {{ Math.round(viewport.y) }})</span>
      <span>工具: {{ currentTool }}</span>
      <span>颜色: {{ currentColor }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePixiEditor } from './composables/usePixiEditor'
import { usePixiTools } from './composables/usePixiTools'
import { usePixiViewport } from './composables/usePixiViewport'
import { usePixiHistory } from './composables/usePixiHistory'
import ToolBar from './components/ToolBar.vue'
import MinimapNavigator from './components/MinimapNavigator.vue'
import type { Tool, PixiEditorConfig } from './types'

// 响应式数据
const canvasContainer = ref<HTMLDivElement>()
const currentTool = ref<Tool>('brush')
const currentColor = ref('#000000')
const brushSize = ref(1)
const showMinimap = ref(true)

// 编辑器配置
const config: PixiEditorConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0xffffff,
  gridSize: 20,
  showGrid: true,
  maxZoom: 50,
  minZoom: 0.1,
}

// 使用 PixiJS 编辑器核心功能
const {
  app,
  canvasSize,
  initializeEditor,
  destroyEditor,
  exportCanvas,
  importCanvas,
  clearCanvas,
} = usePixiEditor(config)

// 使用工具系统
const { activeTool, setTool, handleToolAction } = usePixiTools(
  app,
  currentTool,
  currentColor,
  brushSize,
)

// 使用视口系统
const { viewport, zoomToPoint, panViewport, resetViewport } = usePixiViewport(app)

// 使用历史记录系统
const { canUndo, canRedo, undo, redo, saveState } = usePixiHistory(app)

// 事件处理
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return

  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1

  zoomToPoint(mouseX, mouseY, zoomDelta)
}

const handleMouseDown = (event: MouseEvent) => {
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  handleToolAction('start', { x, y })
}

const handleMouseMove = (event: MouseEvent) => {
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  handleToolAction('move', { x, y })
}

const handleMouseUp = (event: MouseEvent) => {
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  handleToolAction('end', { x, y })
  saveState() // 保存历史状态
}

const handleMouseLeave = () => {
  handleToolAction('cancel', { x: 0, y: 0 })
}

// 工具栏事件处理
const handleClear = () => {
  clearCanvas()
  saveState()
}

const handleUndo = () => {
  if (canUndo.value) {
    undo()
  }
}

const handleRedo = () => {
  if (canRedo.value) {
    redo()
  }
}

const handleExport = () => {
  const dataUrl = exportCanvas()
  // 创建下载链接
  const link = document.createElement('a')
  link.download = 'pixi-editor-export.png'
  link.href = dataUrl
  link.click()
}

const handleImport = (file: File) => {
  importCanvas(file)
  saveState()
}

// 小地图导航
const handleMinimapNavigate = (x: number, y: number) => {
  panViewport(x, y)
}

// 生命周期
onMounted(async () => {
  if (canvasContainer.value) {
    await initializeEditor(canvasContainer.value)
    saveState() // 保存初始状态
  }
})

onUnmounted(() => {
  destroyEditor()
})
</script>

<style scoped>
.pixi-editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f0f0;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
}

.canvas-container:global(canvas) {
  display: block;
}

.status-bar {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #e0e0e0;
  border-top: 1px solid #ccc;
  font-size: 0.875rem;
  color: #666;
}

.status-bar span {
  white-space: nowrap;
}
</style>
