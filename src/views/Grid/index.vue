<template>
  <div class="grid-container">
    <canvas
      ref="canvasRef"
      class="grid-canvas"
      :width="canvasSize.width"
      :height="canvasSize.height"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    />

    <!-- 网格控制面板 -->
    <div v-if="showControls" class="grid-controls">
      <div class="control-group">
        <label class="control-label">显示网格</label>
        <input v-model="gridSystem.showGrid.value" type="checkbox" class="control-checkbox" />
      </div>

      <div class="control-group">
        <label class="control-label">网格颜色</label>
        <input
          :value="gridSystem.gridRenderConfig.value.color"
          type="color"
          class="control-color"
          @input="updateGridColor"
        />
      </div>

      <div class="control-group">
        <label class="control-label">透明度</label>
        <input
          :value="gridSystem.gridRenderConfig.value.opacity"
          type="range"
          min="0"
          max="1"
          step="0.1"
          class="control-range"
          @input="updateGridOpacity"
        />
      </div>

      <div class="control-group">
        <label class="control-label"
          >缩放: {{ Math.round(viewportSystem.viewportState.zoom * 100) }}%</label
        >
        <input
          :value="viewportSystem.viewportState.zoom"
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          class="control-range"
          @input="updateZoom"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="GridComponent">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGridSystem } from './composables/useGridSystem'
import { useViewportSystem } from './composables/useViewportSystem'
import { useGridRenderer } from './composables/useGridRenderer'
import type { GridComponentProps, GridComponentEmits } from './types/grid'

// Props 和 Emits
const props = withDefaults(defineProps<GridComponentProps>(), {
  width: 400,
  height: 800,
  actualWidth: 10,
  actualHeight: 20,
  showControls: true,
  bgColor: '#ffffff',
  gridConfig: () => ({
    color: '#cccccc',
    subGridColor: '#eeeeee',
    opacity: 0.6,
    subGridOpacity: 0.3,
    lineWidth: 1,
    subGridLineWidth: 0.5,
  }),
})

defineEmits<GridComponentEmits>()

// 模板引用
const canvasRef = ref<HTMLCanvasElement>()

// 计算画布尺寸
const canvasSize = computed(() => {
  const dpr = window.devicePixelRatio || 1
  return {
    width: ((props.actualWidth * 96) / 2.54) * dpr,
    height: ((props.actualHeight * 96) / 2.54) * dpr,
  }
})

// 初始化系统
const gridSystem = useGridSystem(props)
const viewportSystem = useViewportSystem()
const renderer = useGridRenderer(canvasRef, gridSystem, viewportSystem)

// 事件处理
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(5, viewportSystem.viewportState.zoom * delta))
  viewportSystem.setZoom(newZoom)
  gridSystem.syncZoom(newZoom)
  renderer.render()
}

const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    // 左键拖拽
    viewportSystem.startPan(event.clientX, event.clientY)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (viewportSystem.isPanning.value) {
    viewportSystem.updatePan(event.clientX, event.clientY)
    renderer.render()
  }
}

const handleMouseUp = () => {
  viewportSystem.endPan()
}

const handleMouseLeave = () => {
  viewportSystem.endPan()
}

// 控制面板事件
const updateGridColor = (event: Event) => {
  const target = event.target as HTMLInputElement
  gridSystem.updateGridConfig({ color: target.value })
  renderer.render()
}

const updateGridOpacity = (event: Event) => {
  const target = event.target as HTMLInputElement
  gridSystem.updateGridConfig({ opacity: parseFloat(target.value) })
  renderer.render()
}

const updateZoom = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newZoom = parseFloat(target.value)
  viewportSystem.setZoom(newZoom)
  gridSystem.syncZoom(newZoom)
  renderer.render()
}

// 生命周期
onMounted(() => {
  renderer.init()
  renderer.render()

  // 监听窗口大小变化
  window.addEventListener('resize', renderer.handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', renderer.handleResize)
})

// 暴露方法给父组件
defineExpose({
  toggleGrid: gridSystem.toggleGrid,
  setZoom: (zoom: number) => {
    viewportSystem.setZoom(zoom)
    gridSystem.syncZoom(zoom)
    renderer.render()
  },
  resetView: () => {
    viewportSystem.reset()
    gridSystem.syncZoom(1)
    renderer.render()
  },
  exportImage: renderer.exportImage,
})

// 默认导出
export default {}
</script>

<style scoped>
.grid-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f5f5;
}

.grid-canvas {
  display: block;
  cursor: grab;
  background: v-bind('props.bgColor');
}

.grid-canvas:active {
  cursor: grabbing;
}

.grid-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.control-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-label {
  font-size: 14px;
  color: #333;
  margin-right: 8px;
}

.control-checkbox {
  width: 18px;
  height: 18px;
}

.control-color {
  width: 40px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.control-range {
  width: 100px;
}

/* 深色主题 */
@media (prefers-color-scheme: dark) {
  .grid-container {
    background: #1a1a1a;
  }

  .grid-controls {
    background: rgba(42, 42, 42, 0.95);
    border-color: #444;
  }

  .control-label {
    color: #ccc;
  }
}
</style>
