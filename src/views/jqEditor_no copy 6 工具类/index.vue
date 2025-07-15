<template>
  <div class="jq-editor-container">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <div class="toolbar-left">
        <h3 class="editor-title">jqEditor2</h3>
      </div>

      <div class="toolbar-center">
        <!-- 撤销重做按钮组 -->
        <div class="undo-redo-group">
          <button
            class="undo-btn"
            :class="{ disabled: !canvas.canUndo }"
            :disabled="!canvas.canUndo"
            title="撤销 (Ctrl+Z)"
            @click="handleUndo"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
            </svg>
            <span class="btn-text">撤销</span>
          </button>

          <button
            class="redo-btn"
            :class="{ disabled: !canvas.canRedo }"
            :disabled="!canvas.canRedo"
            title="重做 (Ctrl+Y)"
            @click="handleRedo"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 7v6h-6"></path>
              <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3-2.3"></path>
            </svg>
            <span class="btn-text">重做</span>
          </button>
        </div>

        <!-- 历史记录状态 -->
        <div class="history-status">
          <span class="status-text">
            {{ canvas.historySystem.historyState.value.totalActions }} 步
          </span>
          <span class="memory-text">
            {{ canvas.historySystem.historyState.value.memoryUsage.toFixed(1) }}MB
          </span>
        </div>
      </div>

      <div class="toolbar-right">
        <button
          class="control-btn"
          :class="{ active: useNewToolManager }"
          :title="useNewToolManager ? '切换到传统工具系统' : '切换到新工具管理器'"
          @click="toggleToolManager"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            ></path>
          </svg>
        </button>

        <button
          class="control-btn"
          :title="showToolbar ? '隐藏工具栏' : '显示工具栏'"
          @click="showToolbar = !showToolbar"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M9 9h6v6H9z"></path>
          </svg>
        </button>

        <button
          class="control-btn"
          title="快捷键提示"
          @click="showShortcutsHint = !showShortcutsHint"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Canvas容器 -->
    <div
      ref="containerRef"
      class="canvas-wrapper"
      :style="{
        width: canvasStyle.width + 'px',
        height: canvasStyle.height + 'px',
        cursor: getToolCursor(),
      }"
      @wheel="handleWheel"
    >
      <canvas
        ref="canvasRef"
        class="main-canvas"
        :width="canvasStyle.width"
        :height="canvasStyle.height"
      ></canvas>

      <!-- 工具栏 -->
      <ToolBar
        v-if="canvas.canvasState.currentTool || useNewToolManager"
        :current-tool="canvas.canvasState.currentTool"
        :use-new-manager="useNewToolManager"
        :canvas-composable="canvas"
        position="left"
        @tool-change="handleToolChange"
      />

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在初始化画布...</div>
      </div>
    </div>

    <!-- 悬浮工具栏 -->
    <FloatingToolbar
      v-if="showToolbar"
      :props="$props"
      :color-system="canvas.colorSystem"
      :brush-system="canvas.brushSystem"
      :grid-system="canvas.gridSystem"
      :initial-position="{ x: 20, y: 20 }"
      @clear-canvas="handleClearCanvas"
      @export-image="handleExportImage"
      @image-upload="handleImageUpload"
      @color-change="handleColorChange"
      @brush-size-change="handleBrushSizeChange"
      @brush-hardness-change="handleBrushHardnessChange"
      @brush-shape-change="handleBrushShapeChange"
      @grid-toggle="handleGridToggle"
      @close="showToolbar = false"
    />

    <!-- 快捷键提示 -->
    <div v-if="showShortcutsHint" class="shortcuts-hint">
      <div class="hint-item">
        <kbd>Space</kbd>
        + 拖拽: 平移画布
      </div>
      <div class="hint-item">
        <kbd>G</kbd>
        : 切换网格显示
      </div>
      <div class="hint-item">
        <kbd>C</kbd>
        : 清空画布
      </div>
      <div class="hint-item">
        <kbd>T</kbd>
        : 切换工具栏
      </div>
      <div class="hint-item">
        <kbd>Ctrl</kbd>
        +
        <kbd>S</kbd>
        : 导出图片
      </div>
      <div class="hint-item">
        <kbd>Ctrl</kbd>
        +
        <kbd>Z</kbd>
        : 撤销
      </div>
      <div class="hint-item">
        <kbd>Ctrl</kbd>
        +
        <kbd>Y</kbd>
        : 重做
      </div>
    </div>

    <!-- 性能监控（调试模式） -->
    <div v-if="showPerformanceMonitor && performanceStats" class="performance-monitor">
      <div class="monitor-title">性能监控</div>
      <div class="monitor-stats">
        <div class="stat-item">
          <span class="stat-label">FPS:</span>
          <span class="stat-value" :class="getFpsClass(performanceStats.fps)">
            {{ performanceStats.fps.toFixed(1) }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">内存:</span>
          <span class="stat-value">
            {{ canvas.historySystem.historyState.value.memoryUsage.toFixed(1) }}MB
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">渲染:</span>
          <span class="stat-value"> {{ performanceStats.renderTime.toFixed(1) }}ms </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  withDefaults,
  defineProps,
  defineEmits,
  defineExpose,
  nextTick,
} from 'vue'
import type { BasicCanvasProps } from './types/canvas'
import type { PerformanceMetrics } from './types/performance'
import { useCanvas } from './composables/useCanvas'
import { useImageUpload } from './composables/useImageUpload'
import { useToolManager } from './classes/tools/ToolManager'
import FloatingToolbar from './components/FloatingToolbar.vue'
import ToolBar from './components/ToolBar.vue'
import { TOOLS, type ToolType } from './types/tools'
import type { ImageUploadOptions } from './types/canvas'
import { createToolAdapterList } from './classes/tools/adapters'

// Props定义
const props = withDefaults(defineProps<BasicCanvasProps>(), {
  width: 400,
  height: 800,
  actualWidth: 130,
  actualHeight: 150,
  bgColor: '#ffffff',
  sourceType: 1,
  readonly: false,
  maxUndoSteps: 50,
})

// Emits定义
const emit = defineEmits([
  'finish',
  'colors-updated',
  'size-changed',
  'performance-warning',
  'cell-painted',
  'selection-changed',
  'image-uploaded',
])

// 组件状态
const isLoading = ref(true)
const showToolbar = ref(true)
const showShortcutsHint = ref(false)

// 非响应式状态
const showPerformanceMonitor = false // 开发模式下可以设为true
let performanceStats: PerformanceMetrics | undefined

// Canvas DOM引用
const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

// 使用Canvas组合式函数
const canvas = useCanvas(props, canvasRef, containerRef)

// 使用图片上传组合式函数
const imageUpload = useImageUpload()

// 使用工具管理器（可选，用于演示新系统）
const toolManager = useToolManager(canvas)
const useNewToolManager = ref(false) // 控制是否使用新工具管理器

// Canvas样式计算
const canvasStyle = computed(() => {
  const { physicalSize } = canvas.gridSystem.gridData.value
  return {
    width: physicalSize.width,
    height: physicalSize.height,
  }
})

// Canvas统计信息
const canvasStats = computed(() => {
  return canvas.getCanvasStats()
})

/**
 * 初始化组件
 */
const initComponent = async () => {
  try {
    isLoading.value = true

    // 等待下一个tick确保DOM已经渲染
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 初始化Canvas
    canvas.initCanvas()

    // 初始化工具管理器（注册工具适配器）
    await initToolManager()

    // 绑定键盘事件
    bindKeyboardEvents()

    // 启动性能监控
    if (showPerformanceMonitor) {
      startPerformanceMonitoring()
    }

    isLoading.value = false

    console.log('BasicCanvas initialized successfully')
  } catch (error) {
    console.error('Failed to initialize BasicCanvas:', error)
    isLoading.value = false
  }
}

/**
 * 初始化工具管理器
 */
const initToolManager = async () => {
  try {
    // 创建工具适配器列表
    const toolAdapterList = createToolAdapterList(canvas)

    // 工具适配器已在ToolManager构造函数中自动注册

    // 设置默认工具（画笔）
    const brushTool = toolManager.availableTools.value.find((tool) => tool.id === 'brush')
    if (brushTool) {
      await toolManager.setActiveTool('brush')
    }

    console.log(
      '工具管理器初始化完成，已注册工具:',
      toolManager.availableTools.value.map((tool) => tool.id),
    )
  } catch (error) {
    console.error('工具管理器初始化失败:', error)
  }
}

/**
 * 绑定键盘快捷键
 */
const bindKeyboardEvents = () => {
  document.addEventListener('keydown', handleKeyDown)
}

/**
 * 解绑键盘事件
 */
const unbindKeyboardEvents = () => {
  document.removeEventListener('keydown', handleKeyDown)
}

/**
 * 键盘事件处理
 */
const handleKeyDown = (event: KeyboardEvent) => {
  // 如果是只读模式，只允许视图相关的快捷键
  if (props.readonly && !['g', 't', 'h'].includes(event.key.toLowerCase())) {
    return
  }

  // 工具快捷键
  const tool = TOOLS.find((t) => t.shortcut?.toLowerCase() === event.key.toLowerCase())
  if (tool && !event.ctrlKey && !event.metaKey) {
    handleToolChange(tool.id)
    event.preventDefault()
    return
  }

  switch (event.key.toLowerCase()) {
    case 'g':
      // 切换网格显示
      canvas.gridSystem.toggleGrid()
      event.preventDefault()
      break

    case 'c':
      // 清空画布
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+C 不处理（复制）
        return
      }
      handleClearCanvas()
      event.preventDefault()
      break

    case 't':
      // 切换工具栏显示
      showToolbar.value = !showToolbar.value
      event.preventDefault()
      break

    case 'h':
      // 切换快捷键提示
      showShortcutsHint.value = !showShortcutsHint.value
      event.preventDefault()
      break

    case 's':
      // Ctrl+S 导出图片
      if (event.ctrlKey || event.metaKey) {
        handleExportImage()
        event.preventDefault()
      }
      break

    case 'z':
      // Ctrl+Z 撤销
      if (event.ctrlKey || event.metaKey) {
        if (event.shiftKey) {
          // Ctrl+Shift+Z 重做
          handleRedo()
        } else {
          // Ctrl+Z 撤销
          handleUndo()
        }
        event.preventDefault()
      }
      break

    case 'y':
      // Ctrl+Y 重做
      if (event.ctrlKey || event.metaKey) {
        handleRedo()
        event.preventDefault()
      }
      break

    case ' ':
      // 空格键处理会在鼠标事件中处理
      break

    default: {
      // 数字键切换预设颜色
      const num = parseInt(event.key)
      if (num >= 1 && num <= 9) {
        // 简化处理，使用默认颜色
        const defaultColors = [
          '#000000',
          '#ff0000',
          '#00ff00',
          '#0000ff',
          '#ffff00',
          '#ff00ff',
          '#00ffff',
          '#ffffff',
          '#808080',
        ]
        if (defaultColors[num - 1]) {
          canvas.colorSystem.setCurrentColor(defaultColors[num - 1])
          event.preventDefault()
        }
      }
      break
    }
  }
}

/**
 * 清空画布
 */
const handleClearCanvas = () => {
  if (props.readonly) return

  // 直接清空画布，因为现在支持撤销功能
  canvas.clearCanvas()
  emit('colors-updated', [])
}

/**
 * 导出图片
 */
const handleExportImage = () => {
  try {
    const imageData = canvas.exportImage('png')

    // 创建下载链接
    const link = document.createElement('a')
    link.download = `canvas-${Date.now()}.png`
    link.href = imageData
    link.click()

    // 触发完成事件
    const exportData = {
      imageData: canvas.canvasRef.value
        ?.getContext('2d')
        ?.getImageData(0, 0, canvasStyle.value.width, canvasStyle.value.height),
      gridData: canvas.gridStorage.value?.exportData() || new Map(),
      metadata: {
        width: props.width,
        height: props.height,
        actualWidth: props.actualWidth,
        actualHeight: props.actualHeight,
        colors: canvas.gridStorage.value?.getUsedColors() || [],
        paintedCells: canvasStats.value?.paintedGrids || 0,
        exportTime: Date.now(),
      },
    }

    emit('finish', exportData)
  } catch (error) {
    console.error('Failed to export image:', error)
    alert('导出失败，请重试。')
  }
}

/**
 * 处理撤销操作
 */
const handleUndo = async () => {
  if (!canvas.canUndo) return

  try {
    const success = await canvas.undo()
    if (success) {
      // 重新渲染画布
      canvas.render()
      console.log('Undo operation completed')
    }
  } catch (error) {
    console.error('Undo operation failed:', error)
  }
}

/**
 * 处理重做操作
 */
const handleRedo = async () => {
  if (!canvas.canRedo) return

  try {
    const success = await canvas.redo()
    if (success) {
      // 重新渲染画布
      canvas.render()
      console.log('Redo operation completed')
    }
  } catch (error) {
    console.error('Redo operation failed:', error)
  }
}

/**
 * 处理颜色改变
 */
const handleColorChange = (color: string) => {
  canvas.colorSystem.setCurrentColor(color)
}

/**
 * 处理画笔大小改变
 */
const handleBrushSizeChange = (size: number) => {
  // canvas.brushSystem.setBrushSize(size) // Method may not be available
}

/**
 * 处理画笔硬度改变
 */
const handleBrushHardnessChange = (hardness: number) => {
  // canvas.brushSystem.setBrushHardness(hardness) // Method may not be available
}

/**
 * 处理画笔形状改变
 */
const handleBrushShapeChange = (shape: string) => {
  // canvas.brushSystem.setBrushShape(shape) // Method may not be available
}

/**
 * 处理网格显示切换
 */
const handleGridToggle = (show: boolean) => {
  canvas.gridSystem.showGrid.value = show
}

/**
 * 处理图片上传
 */
const handleImageUpload = async (file: File) => {
  if (props.readonly) {
    console.warn('只读模式下无法上传图片')
    return
  }

  try {
    // 创建文件选择事件
    const event = {
      target: {
        files: [file],
      },
    } as Event & { target: { files: File[] } }

    // 简化配置选项
    const options: ImageUploadOptions = {
      quality: 0.8,
    }

    // 获取当前可用颜色
    const availableColors = canvas.colorSystem.presetColors.value

    // 处理图片上传
    const result = await imageUpload.handleFileSelect(event, options, availableColors)

    if (result.success) {
      // 保存当前状态到历史记录
      canvas.historySystem.createSnapshot()

      // 记录原始尺寸
      const previousWidth = props.width || 400
      const previousHeight = props.height || 800

      // 清空当前画布
      canvas.clearCanvas(false) // 不保存到历史记录

      // 动态调整画布尺寸到图片尺寸
      await nextTick()

      // 发出尺寸变化事件，让父组件处理
      emit('size-changed', {
        width: result.width,
        height: result.height,
        actualWidth: props.actualWidth || 200,
        actualHeight: props.actualHeight || 200,
        pixelWidth: result.width * canvas.gridSystem.gridData.value.cellWidth,
        pixelHeight: result.height * canvas.gridSystem.gridData.value.cellHeight,
      })

      // 等待尺寸更新完成
      await nextTick()

      // 重新初始化网格存储（如果支持的话）
      if (canvas.gridStorage.value && typeof canvas.gridStorage.value.clear === 'function') {
        canvas.gridStorage.value.clear()
      }

      // 应用图片数据到画布
      for (const [key, color] of result.gridData) {
        const [x, y] = key.split(',').map(Number)
        if (x >= 0 && x < result.width && y >= 0 && y < result.height) {
          canvas.gridStorage.value?.setCell(x, y, color)
        }
      }

      // 触发渲染系统更新
      canvas.render()

      // 更新颜色列表
      if (result.colors.length > 0) {
        // 将新颜色添加到最近使用的颜色中
        result.colors.forEach((color) => {
          // canvas.colorSystem.addRecentColor(color) // Method not available
        })

        emit('colors-updated', result.colors)
      }

      // 保存新状态到历史记录
      canvas.historySystem.createSnapshot()

      // 发出图片上传完成事件
      emit('image-uploaded', {
        success: true,
        width: result.width,
        height: result.height,
        colors: result.colors,
      })

      console.log('图片上传成功:', {
        width: result.width,
        height: result.height,
        colors: result.colors.length,
      })
    } else {
      console.error('图片上传失败:', result.error)
      alert(`图片上传失败: ${result.error}`)
    }
  } catch (error) {
    console.error('图片上传处理失败:', error)
    alert('图片上传失败，请重试。')
  }
}

/**
 * 获取FPS状态样式类
 */
const getFpsClass = (fps: number): string => {
  if (fps >= 30) return 'fps-good'
  if (fps >= 20) return 'fps-medium'
  return 'fps-low'
}

/**
 * 启动性能监控
 */
const startPerformanceMonitoring = () => {
  let lastTime = performance.now()
  let frameCount = 0
  let fpsSum = 0

  const monitor = () => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTime

    frameCount++
    const fps = 1000 / deltaTime
    fpsSum += fps

    // 每10帧更新一次统计
    if (frameCount >= 10) {
      const avgFps = fpsSum / frameCount

      // 获取内存信息
      const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory
      const memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0

      performanceStats = {
        fps: avgFps,
        frameTime: deltaTime,
        memoryUsage,
        cpuUsage: 0, // 简化处理
        renderTime: deltaTime,
        eventLatency: 0, // 简化处理
      }

      frameCount = 0
      fpsSum = 0
    }

    lastTime = currentTime

    if (showPerformanceMonitor) {
      requestAnimationFrame(monitor)
    }
  }

  requestAnimationFrame(monitor)
}

/**
 * 处理鼠标滚轮缩放
 */
const handleWheel = (event: WheelEvent) => {
  if (canvas.viewportSystem) {
    canvas.viewportSystem.handleWheel(event)
    // 缩放后重新渲染
    canvas.requestRender()
  }
}

/**
 * 获取当前工具的鼠标指针样式
 */
const getToolCursor = () => {
  const tool = TOOLS.find((t) => t.id === canvas.canvasState.value.currentTool)
  return tool?.cursor || 'default'
}

/**
 * 处理工具切换
 */
const handleToolChange = async (tool: ToolType) => {
  try {
    if (useNewToolManager.value) {
      // 使用新工具管理器
      await toolManager.setActiveTool(tool)
    } else {
      // 使用传统方式
      // canvas.canvasState.currentTool = tool // Property not available

      // 如果正在绘制，取消绘制状态
      if (canvas.canvasState.value.isDrawing) {
        // canvas.canvasState.isDrawing = false // Property not available
        // canvas.canvasState.lastDrawnCell = undefined // Property not available
      }
    }
  } catch (error) {
    console.error('工具切换失败:', error)
  }
}

/**
 * 切换工具管理器
 */
const toggleToolManager = async () => {
  try {
    useNewToolManager.value = !useNewToolManager.value

    if (useNewToolManager.value) {
      // 切换到新工具管理器
      console.log('已切换到新工具管理器')

      // 如果有当前激活的工具，尝试在新系统中激活相同工具
      const currentTool = canvas.canvasState.value.currentTool
      const foundTool = toolManager.availableTools.value.find((tool) => tool.id === currentTool)
      if (currentTool && foundTool) {
        await toolManager.setActiveTool(currentTool)
      }
    } else {
      // 切换回传统工具系统
      console.log('已切换回传统工具系统')

      // 停用当前工具
      if (toolManager.currentTool.value) {
        await toolManager.setActiveTool(null)
      }
    }
  } catch (error) {
    console.error('切换工具管理器失败:', error)
    // 回滚状态
    useNewToolManager.value = !useNewToolManager.value
  }
}

// 监听props变化
watch(
  () => [props.width, props.height, props.actualWidth, props.actualHeight],
  () => {
    // 重新初始化Canvas
    if (!isLoading.value) {
      canvas.initCanvas()
    }
  },
  { deep: true },
)

// 监听颜色变化
watch(
  () => canvas.gridStorage.value,
  () => {
    if (canvas.gridStorage.value) {
      const usedColors = canvas.gridStorage.value.getUsedColors()
      emit('colors-updated', usedColors)
    }
  },
  { deep: true },
)

// 生命周期
onMounted(() => {
  initComponent()
})

onUnmounted(() => {
  unbindKeyboardEvents()
})

// 暴露方法给父组件
defineExpose({
  clearCanvas: handleClearCanvas,
  exportImage: handleExportImage,
  getCanvasStats: () => canvasStats.value,
  toggleGrid: () => canvas.gridSystem.toggleGrid(),
  toggleToolbar: () => {
    showToolbar.value = !showToolbar.value
  },
  setColor: (color: string) => canvas.colorSystem.setCurrentColor(color),
  setBrushSize: (size: number) => canvas.brushSystem.setBrushSize(size),
  setZoom: (zoom: number) => {
    if (canvas.viewportSystem) {
      canvas.viewportSystem.viewportState.zoom = zoom
      canvas.render()
    }
  },
  setPan: (pan: { x: number; y: number }) => {
    if (canvas.viewportSystem) {
      canvas.viewportSystem.viewportState.pan = pan
      canvas.render()
    }
  },

  // 历史记录方法
  undo: handleUndo,
  redo: handleRedo,
  canUndo: canvas.canUndo,
  canRedo: canvas.canRedo,
  clearHistory: canvas.clearHistory,
  getHistoryStats: () => canvas.historySystem.historyStats.value,
  getHistoryState: () => canvas.historySystem.historyState.value,
})
</script>

<script lang="ts">
export default {
  name: 'JqEditorIndex',
}
</script>

<style scoped lang="scss">
.basic-canvas-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding-top: 20px;
}

.top-toolbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  max-width: 1200px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .toolbar-left {
    .editor-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .toolbar-center {
    display: flex;
    align-items: center;
    gap: 20px;

    .undo-redo-group {
      display: flex;
      gap: 2px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 2px;
      border: 1px solid #e9ecef;

      button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #495057;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;

        .icon {
          width: 16px;
          height: 16px;
          stroke-width: 2;
        }

        .btn-text {
          font-size: 12px;
        }

        &:hover:not(.disabled) {
          background: #fff;
          color: #212529;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        &:active:not(.disabled) {
          transform: translateY(1px);
        }

        &.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent;
        }
      }

      .undo-btn:hover:not(.disabled) {
        color: #dc3545;
      }

      .redo-btn:hover:not(.disabled) {
        color: #28a745;
      }
    }

    .history-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 4px 8px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 6px;
      border: 1px solid rgba(102, 126, 234, 0.2);

      .status-text {
        font-size: 12px;
        font-weight: 600;
        color: #667eea;
      }

      .memory-text {
        font-size: 10px;
        color: #6c757d;
      }
    }
  }

  .toolbar-right {
    display: flex;
    gap: 8px;

    .control-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: #f8f9fa;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid #e9ecef;

      .icon {
        width: 18px;
        height: 18px;
        stroke-width: 2;
      }

      &:hover {
        background: #e9ecef;
        color: #495057;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      &:active {
        transform: translateY(0);
      }

      &.active {
        background: #007bff;
        color: white;
        border-color: #007bff;

        &:hover {
          background: #0056b3;
          border-color: #0056b3;
        }
      }
    }
  }
}

.canvas-wrapper {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  .main-canvas {
    display: block;
    cursor: crosshair;

    &:hover {
      cursor: crosshair;
    }
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  .loading-text {
    color: #666;
    font-size: 14px;
  }
}

.shortcuts-hint {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  max-width: 250px;
  z-index: 99999;

  .hint-item {
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }

    kbd {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-family: monospace;
    }
  }
}

.performance-monitor {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  min-width: 150px;
  z-index: 999;

  .monitor-title {
    font-weight: 600;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 4px;
  }

  .monitor-stats {
    .stat-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      .stat-label {
        opacity: 0.8;
      }

      .stat-value {
        font-weight: 600;

        &.fps-good {
          color: #4caf50;
        }

        &.fps-medium {
          color: #ff9800;
        }

        &.fps-low {
          color: #f44336;
        }
      }
    }
  }
}

// 动画
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .basic-canvas-container {
    padding: 10px;
    min-height: 100vh;
  }

  .top-toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 12px;

    .toolbar-center {
      order: 1;
      flex-direction: column;
      gap: 8px;

      .undo-redo-group {
        order: 1;
      }

      .history-status {
        order: 2;
        flex-direction: row;
        gap: 8px;
      }
    }

    .toolbar-left {
      order: 2;

      .editor-title {
        font-size: 16px;
        text-align: center;
      }
    }

    .toolbar-right {
      order: 3;
      justify-content: center;
    }
  }

  .status-bar {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    flex-wrap: wrap;
    justify-content: center;
  }

  .shortcuts-hint {
    top: 80px;
    right: 10px;
    font-size: 11px;
  }

  .performance-monitor {
    top: 80px;
    left: 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .top-toolbar {
    .toolbar-center {
      .undo-redo-group {
        flex-direction: column;
        gap: 4px;

        button {
          justify-content: center;
          padding: 10px;

          .btn-text {
            font-size: 11px;
          }
        }
      }

      .history-status {
        .status-text,
        .memory-text {
          font-size: 10px;
        }
      }
    }

    .toolbar-right {
      .control-btn {
        width: 32px;
        height: 32px;

        .icon {
          width: 16px;
          height: 16px;
        }
      }
    }
  }
}

// 深色模式支持
@media (prefers-color-scheme: dark) {
  .basic-canvas-container {
    background: #1a1a1a;
  }

  .top-toolbar {
    background: rgba(42, 42, 42, 0.95);
    border-color: #444;

    .toolbar-left {
      .editor-title {
        color: #fff;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .toolbar-center {
      .undo-redo-group {
        background: #333;
        border-color: #555;

        button {
          color: #ccc;

          &:hover:not(.disabled) {
            background: #444;
            color: #fff;
          }

          &.disabled {
            opacity: 0.4;
          }
        }

        .undo-btn:hover:not(.disabled) {
          color: #ff6b6b;
        }

        .redo-btn:hover:not(.disabled) {
          color: #51cf66;
        }
      }

      .history-status {
        background: rgba(102, 126, 234, 0.2);
        border-color: rgba(102, 126, 234, 0.3);

        .status-text {
          color: #667eea;
        }

        .memory-text {
          color: #adb5bd;
        }
      }
    }

    .toolbar-right {
      .control-btn {
        background: #333;
        border-color: #555;
        color: #adb5bd;

        &:hover {
          background: #444;
          color: #fff;
        }
      }
    }
  }

  .canvas-wrapper {
    border-color: #444;
  }
}
</style>
