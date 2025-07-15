<template>
  <div class="pixi-editor-demo">
    <div class="demo-header">
      <h1>PixiJS 编辑器演示</h1>
      <div class="demo-controls">
        <button @click="initializeDemo" :disabled="isInitialized">初始化编辑器</button>
        <button @click="destroyDemo" :disabled="!isInitialized">销毁编辑器</button>
        <button @click="clearCanvas" :disabled="!isInitialized">清空画布</button>
      </div>
    </div>

    <div class="demo-content">
      <!-- 工具栏 -->
      <div class="toolbar" v-if="isInitialized">
        <div class="tool-group">
          <h3>工具</h3>
          <button
            v-for="tool in availableTools"
            :key="tool.name"
            :class="{ active: currentTool === tool.name }"
            @click="setTool(tool.name)"
            :title="tool.description"
          >
            {{ tool.icon }} {{ tool.displayName }}
          </button>
        </div>

        <div class="tool-group">
          <h3>颜色</h3>
          <input type="color" v-model="currentColor" class="color-picker" />
          <span class="color-display">{{ currentColor }}</span>
        </div>

        <div class="tool-group">
          <h3>视图</h3>
          <button @click="resetViewport">重置视图</button>
          <button @click="fitToScreen">适应屏幕</button>
          <button @click="toggleGrid">{{ showGrid ? '隐藏' : '显示' }}网格</button>
        </div>

        <div class="tool-group">
          <h3>历史</h3>
          <button @click="undo" :disabled="!canUndo">撤销</button>
          <button @click="redo" :disabled="!canRedo">重做</button>
          <span class="history-info">{{ historyInfo }}</span>
        </div>

        <div class="tool-group">
          <h3>文件</h3>
          <button @click="exportImage">导出图片</button>
          <input
            type="file"
            ref="fileInput"
            @change="importImage"
            accept="image/*"
            style="display: none"
          />
          <button @click="$refs.fileInput?.click()">导入图片</button>
        </div>
      </div>

      <!-- 画布容器 -->
      <div class="canvas-container">
        <div ref="canvasContainer" class="canvas-wrapper" :class="{ initialized: isInitialized }">
          <div v-if="!isInitialized" class="placeholder">
            <p>点击"初始化编辑器"开始使用</p>
          </div>
        </div>

        <!-- 状态信息 -->
        <div class="status-bar" v-if="isInitialized">
          <span>工具: {{ currentToolDisplay }}</span>
          <span>缩放: {{ Math.round(zoomLevel * 100) }}%</span>
          <span>位置: ({{ Math.round(viewportX) }}, {{ Math.round(viewportY) }})</span>
          <span>像素数: {{ pixelCount }}</span>
          <span v-if="performanceStats">FPS: {{ performanceStats.fps }}</span>
        </div>
      </div>
    </div>

    <!-- 调试信息 -->
    <div class="debug-panel" v-if="showDebug">
      <h3>调试信息</h3>
      <pre>{{ debugInfo }}</pre>
    </div>

    <!-- 错误信息 -->
    <div class="error-panel" v-if="error">
      <h3>错误</h3>
      <p>{{ error }}</p>
      <button @click="clearError">清除错误</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePixiEditorComplete, usePixiPerformance, usePixiShortcuts } from './composables'
import { toolMetadata, ToolNames } from './tools'
import { presets } from './index'

// 响应式状态
const canvasContainer = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const showDebug = ref(false)
const error = ref<string | null>(null)

// 初始化编辑器
const editor = usePixiEditorComplete({
  ...presets.pixelArt,
  width: 800,
  height: 600,
})

// 性能监控
const performance = usePixiPerformance(editor.app)

// 快捷键
const shortcuts = usePixiShortcuts(editor, editor, editor)

// 计算属性
const availableTools = computed(() => {
  return Object.values(ToolNames).map((name) => toolMetadata[name])
})

const currentToolDisplay = computed(() => {
  const tool = toolMetadata[editor.currentTool.value as ToolNames]
  return tool ? tool.displayName : editor.currentTool.value
})

const historyInfo = computed(() => {
  const summary = editor.getHistorySummary()
  return `${summary.current + 1}/${summary.total}`
})

const performanceStats = computed(() => {
  return performance.getPerformanceStats()
})

const debugInfo = computed(() => {
  if (!editor.isInitialized.value) return null

  return {
    editor: {
      initialized: editor.isInitialized.value,
      canvasSize: {
        width: editor.canvasWidth.value,
        height: editor.canvasHeight.value,
      },
    },
    viewport: {
      x: editor.viewportX.value,
      y: editor.viewportY.value,
      scale: editor.zoomLevel.value,
    },
    tools: {
      current: editor.currentTool.value,
      color: editor.currentColor.value,
    },
    performance: performanceStats.value,
  }
})

// 方法
const initializeDemo = async () => {
  try {
    if (!canvasContainer.value) {
      throw new Error('Canvas container not found')
    }

    await editor.initialize(canvasContainer.value)
    console.log('PixiJS 编辑器初始化成功')
  } catch (err) {
    error.value = `初始化失败: ${err.message}`
    console.error('初始化失败:', err)
  }
}

const destroyDemo = () => {
  try {
    editor.destroy()
    console.log('PixiJS 编辑器已销毁')
  } catch (err) {
    error.value = `销毁失败: ${err.message}`
    console.error('销毁失败:', err)
  }
}

const clearError = () => {
  error.value = null
}

const exportImage = () => {
  try {
    const dataUrl = editor.exportCanvas()
    const link = document.createElement('a')
    link.download = 'pixi-editor-export.png'
    link.href = dataUrl
    link.click()
  } catch (err) {
    error.value = `导出失败: ${err.message}`
  }
}

const importImage = async (event: Event) => {
  try {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    const img = new Image()
    img.onload = () => {
      editor.importCanvas(img)
    }
    img.src = URL.createObjectURL(file)
  } catch (err) {
    error.value = `导入失败: ${err.message}`
  }
}

// 生命周期
onMounted(() => {
  // 可以在这里自动初始化
  // initializeDemo()
})

onUnmounted(() => {
  if (editor.isInitialized.value) {
    editor.destroy()
  }
})

// 监听错误
watch(
  () => editor.app.value,
  (app) => {
    if (app && app.renderer) {
      app.renderer.on('error', (err: Error) => {
        error.value = `渲染错误: ${err.message}`
      })
    }
  },
)

// 键盘快捷键
shortcuts.addShortcut('F12', () => {
  showDebug.value = !showDebug.value
})
</script>

<style scoped>
.pixi-editor-demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
}

.demo-header {
  padding: 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-header h1 {
  margin: 0;
  color: #333;
}

.demo-controls {
  display: flex;
  gap: 0.5rem;
}

.demo-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.toolbar {
  width: 250px;
  background: #fafafa;
  border-right: 1px solid #ddd;
  padding: 1rem;
  overflow-y: auto;
}

.tool-group {
  margin-bottom: 1.5rem;
}

.tool-group h3 {
  margin: 0 0 0.5rem 0;
  color: #555;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.tool-group button {
  display: block;
  width: 100%;
  margin-bottom: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tool-group button:hover {
  background: #f0f0f0;
}

.tool-group button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.tool-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.color-picker {
  width: 100%;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.color-display {
  display: block;
  margin-top: 0.25rem;
  font-family: monospace;
  font-size: 0.8rem;
  color: #666;
}

.history-info {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #666;
}

.canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-wrapper.initialized {
  background: transparent;
}

.placeholder {
  text-align: center;
  color: #999;
}

.placeholder p {
  margin: 0;
  font-size: 1.1rem;
}

.status-bar {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #666;
}

.debug-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 300px;
  max-height: 400px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 1rem;
  border-radius: 4px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.7rem;
  z-index: 1000;
}

.debug-panel h3 {
  margin: 0 0 0.5rem 0;
  color: #fff;
}

.debug-panel pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-panel {
  position: fixed;
  bottom: 10px;
  left: 10px;
  right: 10px;
  background: #ff4444;
  color: white;
  padding: 1rem;
  border-radius: 4px;
  z-index: 1000;
}

.error-panel h3 {
  margin: 0 0 0.5rem 0;
}

.error-panel p {
  margin: 0 0 0.5rem 0;
}

.error-panel button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.error-panel button:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
