<template>
  <div class="canvas-editor">
    <!-- 画布创建配置面板 -->
    <div class="canvas-config-panel" v-if="!canvasCreated">
      <div class="config-form">
        <h2>创建新背景画布</h2>
        <div class="form-group">
          <label>宽度 (cm):</label>
          <input v-model.number="canvasConfig.widthCm" type="number" min="1" />
        </div>
        <div class="form-group">
          <label>高度 (cm):</label>
          <input v-model.number="canvasConfig.heightCm" type="number" min="1" />
        </div>
        <div class="form-group">
          <label>DPI:</label>
          <input v-model.number="canvasConfig.dpi" type="number" min="72" />
        </div>
        <div class="form-group">
          <label>横向格子数:</label>
          <input v-model.number="canvasConfig.gridCols" type="number" min="1" />
        </div>
        <div class="form-group">
          <label>纵向格子数:</label>
          <input v-model.number="canvasConfig.gridRows" type="number" min="1" />
        </div>
        <div class="form-group">
          <label>计算后的像素尺寸:</label>
          <span>{{ calculatedWidth }} × {{ calculatedHeight }} px</span>
        </div>
        <button @click="createCanvas" class="create-btn">创建背景画布</button>
      </div>
    </div>

    <!-- 画布编辑器 -->
    <div class="canvas-container" v-if="canvasCreated">
      <div class="toolbar">
        <button @click="resetCanvas" class="reset-btn">重新创建背景画布</button>
        <div class="upload-section">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            @change="handleImageUpload"
            style="display: none"
          />
          <button @click="triggerFileUpload" class="upload-btn">上传背景图片</button>
        </div>

        <!-- 工具切换按钮 -->
        <div class="tool-section">
          <button
            @click="setTool('move')"
            :class="['tool-btn', { active: currentTool === 'move' }]"
          >
            移动视窗
          </button>
          <button
            @click="setTool('brush')"
            :class="['tool-btn', { active: currentTool === 'brush' }]"
          >
            画笔工具
          </button>
          <button
            @click="setTool('eraser')"
            :class="['tool-btn', { active: currentTool === 'eraser' }]"
          >
            橡皮擦
          </button>
          <button
            @click="setTool('bucket')"
            :class="['tool-btn', { active: currentTool === 'bucket' }]"
          >
            油桶填充
          </button>
        </div>

        <!-- 画笔设置 -->
        <div class="brush-settings" v-if="currentTool === 'brush'">
          <label>画笔颜色:</label>
          <input type="color" v-model="brushColor" class="color-picker" />
          <button @click="clearGrid" class="clear-btn">清除格子</button>
        </div>

        <!-- 橡皮擦设置 -->
        <div class="eraser-settings" v-if="currentTool === 'eraser'">
          <label>橡皮擦工具</label>
          <button @click="clearGrid" class="clear-btn">清除所有</button>
        </div>

        <!-- 油桶填充设置 -->
        <div class="bucket-settings" v-if="currentTool === 'bucket'">
          <label>填充颜色:</label>
          <input type="color" v-model="brushColor" class="color-picker" />
          <button @click="clearGrid" class="clear-btn">清除格子</button>
        </div>

        <!-- 撤销重做按钮 -->
        <div class="history-controls">
          <button @click="undo" :disabled="!canUndo" class="history-btn" title="撤销 (Ctrl+Z)">
            ↶ 撤销
          </button>
          <button @click="redo" :disabled="!canRedo" class="history-btn" title="重做 (Ctrl+Y)">
            ↷ 重做
          </button>
          <button @click="showFullImage" class="preview-btn" title="显示完整画布">
            🖼️ 显示大图
          </button>
          <button @click="showCanvasColors" class="colors-btn" title="获取画布颜色">
            🎨 获取颜色
          </button>
        </div>

        <!-- 网格设置 -->
        <div class="grid-settings">
          <h4>网格设置</h4>
          <div class="grid-controls">
            <div class="grid-input-group">
              <label>列数:</label>
              <input
                type="number"
                v-model.number="tempGridCols"
                min="10"
                max="2000"
                class="grid-input"
              />
            </div>
            <div class="grid-input-group">
              <label>行数:</label>
              <input
                type="number"
                v-model.number="tempGridRows"
                min="10"
                max="2000"
                class="grid-input"
              />
            </div>
            <button @click="updateGridSize" class="update-grid-btn">更新网格</button>
            <button @click="resetGridSize" class="reset-grid-btn">重置网格</button>
          </div>
        </div>

        <span class="canvas-info">
          背景画布尺寸: {{ canvasConfig.widthCm }}cm × {{ canvasConfig.heightCm }}cm ({{
            calculatedWidth
          }}px × {{ calculatedHeight }}px, {{ canvasConfig.dpi }} DPI)
        </span>
        <span class="grid-info">
          网格: {{ canvasConfig.gridCols }} × {{ canvasConfig.gridRows }} (每格:
          {{ Math.round(gridCellWidth) }}px × {{ Math.round(gridCellHeight) }}px)
        </span>
        <span class="tool-info">
          当前工具:
          {{
            currentTool === 'move'
              ? '移动视窗'
              : currentTool === 'brush'
                ? '画笔工具'
                : currentTool === 'eraser'
                  ? '橡皮擦工具'
                  : '油桶填充'
          }}
        </span>

        <!-- 颜色显示面板 -->
        <div class="colors-panel" v-if="canvasColors.length > 0">
          <h4>画布颜色 ({{ canvasColors.length }}种)</h4>
          <div class="colors-grid">
            <div
              v-for="(color, index) in canvasColors"
              :key="color"
              class="color-item"
              :style="{ backgroundColor: color }"
              :title="`${color} (${index + 1}/${canvasColors.length})`"
            >
              <span class="color-text">{{ color }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="canvas-wrapper">
        <div
          class="canvas-container-relative"
          :style="{ width: viewportBox.width + 'px', height: viewportBox.height + 'px' }"
        >
          <!-- 背景画布 -->
          <canvas
            ref="canvasRef"
            class="background-canvas"
            :class="{
              'brush-cursor': currentTool === 'brush',
              'move-cursor': currentTool === 'move',
              'eraser-cursor': currentTool === 'eraser',
              'bucket-cursor': currentTool === 'bucket',
            }"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @wheel="handleWheel"
            @contextmenu.prevent
          ></canvas>

          <!-- 网格画布 -->
          <canvas ref="gridCanvasRef" class="grid-canvas"></canvas>
        </div>

        <!-- 缩略图画布 -->
        <div class="thumbnail-container">
          <canvas
            ref="thumbnailRef"
            class="thumbnail-canvas"
            :width="thumbnailWidth"
            :height="thumbnailHeight"
            @click="onThumbnailClick"
          ></canvas>
        </div>
      </div>
    </div>

    <!-- 大图预览弹窗 -->
    <div v-if="showPreviewModal" class="preview-modal" @click="closePreviewModal">
      <div class="preview-modal-content" @click.stop>
        <div class="preview-modal-header">
          <h3>完整画布预览</h3>
          <button @click="closePreviewModal" class="close-btn">×</button>
        </div>
        <div class="preview-modal-body">
          <canvas ref="previewCanvasRef" class="preview-canvas"></canvas>
        </div>
        <div class="preview-modal-footer">
          <button @click="downloadFullImage" class="download-btn">下载图片</button>
          <button @click="closePreviewModal" class="cancel-btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 定义组件名称
defineOptions({
  name: 'CanvasEditor',
})

// 画布配置
const canvasConfig = ref({
  widthCm: 130,
  heightCm: 150,
  dpi: 96,
  gridCols: 949, // 横向格子数
  gridRows: 1230, // 纵向格子数
})

// 画布状态
const canvasCreated = ref(false)

// 画布引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gridCanvasRef = ref<HTMLCanvasElement | null>(null)
const thumbnailRef = ref<HTMLCanvasElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)

// 预览弹窗状态
const showPreviewModal = ref(false)

const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)
const isDragDrawing = ref(false) // 标记是否在拖拽绘制过程中
const isRightDragging = ref(false) // 标记是否在右键拖拽移动过程中
const backgroundImage = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)

// 工具状态
const currentTool = ref<'move' | 'brush' | 'eraser' | 'bucket'>('brush')
const brushColor = ref('#ff0000')

// 存储绘制的格子数据
const drawnCells = ref<Map<string, string>>(new Map())

// 记录上一个绘制的格子位置（用于画笔连贯性）
const lastDrawnCell = ref<{ col: number; row: number } | null>(null)

// 撤销重做功能
const history = ref<Map<string, string>[]>([new Map()]) // 历史记录数组
const historyIndex = ref(0) // 当前历史记录索引
const maxHistorySize = 50 // 最大历史记录数量

// 临时网格设置（用于输入框）
const tempGridCols = ref(949)
const tempGridRows = ref(1230)

// 画布颜色数组
const canvasColors = ref<string[]>([])

// 视窗框状态 - 固定在左上角，通过偏移量控制背景移动
const viewportBox = ref({
  // 视窗框固定位置（左上角）
  fixedX: 0,
  fixedY: 0,
  width: 1000,
  height: 1000,
  // 背景偏移量（控制背景画布的显示位置）
  offsetX: 0,
  offsetY: 0,
  // 缩放相关
  scale: 1.0, // 缩放比例
  minScale: 0.5, // 最小缩放比例（确保显示窗口不大于画布大小的五分之一）
  maxScale: 5.0, // 最大缩放比例
  // 拖拽状态
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialOffsetX: 0,
  initialOffsetY: 0,
})

// 计算像素尺寸 (固定尺寸)
const calculatedWidth = computed(() => {
  return 4913 // 固定宽度4913px
})

const calculatedHeight = computed(() => {
  return 5669 // 固定高度5669px
})

// 网格尺寸计算
const gridCellWidth = computed(() => {
  return calculatedWidth.value / canvasConfig.value.gridCols
})

const gridCellHeight = computed(() => {
  return calculatedHeight.value / canvasConfig.value.gridRows
})

// 缩略图尺寸（动态计算）
const thumbnailWidth = computed(() => {
  const maxThumbnailSize = 200 // 缩略图最大尺寸
  const minThumbnailSize = 80 // 缩略图最小尺寸

  const canvasWidth = calculatedWidth.value
  const canvasHeight = calculatedHeight.value
  const maxCanvasDimension = Math.max(canvasWidth, canvasHeight)

  // 根据画布最大尺寸动态计算缩放比例
  let scale
  if (maxCanvasDimension <= 500) {
    scale = 0.3 // 小画布使用较大比例
  } else if (maxCanvasDimension <= 1000) {
    scale = 0.25
  } else if (maxCanvasDimension <= 2000) {
    scale = 0.2
  } else if (maxCanvasDimension <= 3000) {
    scale = 0.15
  } else if (maxCanvasDimension <= 4000) {
    scale = 0.12
  } else {
    scale = 0.1 // 大画布使用较小比例
  }

  const thumbnailWidth = Math.round(canvasWidth * scale)

  // 确保缩略图尺寸在合理范围内
  return Math.max(minThumbnailSize, Math.min(maxThumbnailSize, thumbnailWidth))
})

const thumbnailHeight = computed(() => {
  const maxThumbnailSize = 200
  const minThumbnailSize = 80

  const canvasWidth = calculatedWidth.value
  const canvasHeight = calculatedHeight.value
  const maxCanvasDimension = Math.max(canvasWidth, canvasHeight)

  // 使用与宽度相同的缩放逻辑
  let scale
  if (maxCanvasDimension <= 500) {
    scale = 0.3
  } else if (maxCanvasDimension <= 1000) {
    scale = 0.25
  } else if (maxCanvasDimension <= 2000) {
    scale = 0.2
  } else if (maxCanvasDimension <= 3000) {
    scale = 0.15
  } else if (maxCanvasDimension <= 4000) {
    scale = 0.12
  } else {
    scale = 0.1
  }

  const thumbnailHeight = Math.round(canvasHeight * scale)

  // 确保缩略图尺寸在合理范围内
  return Math.max(minThumbnailSize, Math.min(maxThumbnailSize, thumbnailHeight))
})

// 创建画布
const createCanvas = () => {
  canvasCreated.value = true
  nextTick(() => {
    initCanvas()
  })
}

// 重置画布
const resetCanvas = () => {
  canvasCreated.value = false
  imageLoaded.value = false
  backgroundImage.value = null
  drawnCells.value.clear()
}

// 设置当前工具
const setTool = (tool: 'move' | 'brush' | 'eraser' | 'bucket') => {
  currentTool.value = tool
}

// 保存当前状态到历史记录
const saveToHistory = () => {
  // 创建当前状态的深拷贝
  const currentState = new Map(drawnCells.value)

  // 如果当前不在历史记录的末尾，删除后面的记录
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // 添加新状态
  history.value.push(currentState)
  historyIndex.value = history.value.length - 1

  // 限制历史记录大小
  if (history.value.length > maxHistorySize) {
    history.value.shift()
    historyIndex.value = history.value.length - 1
  }
}

// 撤销操作
const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    drawnCells.value = new Map(history.value[historyIndex.value])
    drawCanvas()
  }
}

// 重做操作
const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    drawnCells.value = new Map(history.value[historyIndex.value])
    drawCanvas()
  }
}

// 检查是否可以撤销
const canUndo = computed(() => historyIndex.value > 0)

// 检查是否可以重做
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// 清除所有绘制的格子
const clearGrid = () => {
  drawnCells.value.clear()
  saveToHistory()
  drawCanvas()
}

// 更新网格大小
const updateGridSize = () => {
  // 验证输入值
  if (tempGridCols.value < 10 || tempGridCols.value > 2000) {
    alert('列数必须在 10 到 2000 之间')
    return
  }
  if (tempGridRows.value < 10 || tempGridRows.value > 2000) {
    alert('行数必须在 10 到 2000 之间')
    return
  }

  // 更新网格配置
  canvasConfig.value.gridCols = tempGridCols.value
  canvasConfig.value.gridRows = tempGridRows.value

  // 清除已绘制的格子（因为网格大小改变，原有格子位置可能不再有效）
  drawnCells.value.clear()

  // 重新绘制画布
  if (canvasCreated.value) {
    drawCanvas()
  }

  console.log(`网格已更新为: ${tempGridCols.value} × ${tempGridRows.value}`)
}

// 重置网格大小到默认值
const resetGridSize = () => {
  tempGridCols.value = 949
  tempGridRows.value = 1230
  updateGridSize()
}

// 加载背景图片
const loadBackgroundImage = (imageSrc?: string) => {
  const img = new Image()
  img.onload = () => {
    backgroundImage.value = img
    imageLoaded.value = true

    // 如果是用户上传的图片（有imageSrc参数），则根据图片尺寸更新网格
    if (imageSrc && imageSrc !== '/00664371.bmp') {
      // 获取图片的实际尺寸
      const imageWidth = img.naturalWidth
      const imageHeight = img.naturalHeight

      // 将图片宽度作为网格列数，高度作为网格行数
      tempGridCols.value = imageWidth
      tempGridRows.value = imageHeight

      // 更新网格配置
      canvasConfig.value.gridCols = imageWidth
      canvasConfig.value.gridRows = imageHeight

      // 清除已绘制的格子（因为网格大小改变）
      drawnCells.value.clear()

      console.log(`根据图片尺寸自动更新网格: ${imageWidth} × ${imageHeight}`)
    }

    drawCanvas()
  }
  img.onerror = () => {
    console.error('Failed to load background image')
    drawCanvas()
  }
  img.src = imageSrc || '/00664371.bmp'
}

// 触发文件上传
const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

// 处理图片上传
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string
      if (imageSrc) {
        loadBackgroundImage(imageSrc)
      }
    }
    reader.readAsDataURL(file)
  } else {
    console.error('请选择有效的图片文件')
  }
}

// 绘制画布（包含背景图片）
const drawCanvas = () => {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.clearRect(0, 0, calculatedWidth.value, calculatedHeight.value)

  // 保存当前状态
  ctx.save()

  // 设置裁剪区域为视窗框内部
  ctx.beginPath()
  ctx.rect(
    viewportBox.value.fixedX,
    viewportBox.value.fixedY,
    viewportBox.value.width,
    viewportBox.value.height,
  )
  ctx.clip()

  if (imageLoaded.value && backgroundImage.value) {
    // 禁用图像平滑以获得像素完美的清晰度
    ctx.imageSmoothingEnabled = false

    // 根据偏移量和缩放比例绘制背景图片
    const scaledWidth = 4913 * viewportBox.value.scale
    const scaledHeight = 5669 * viewportBox.value.scale
    const scaledOffsetX = viewportBox.value.offsetX * viewportBox.value.scale
    const scaledOffsetY = viewportBox.value.offsetY * viewportBox.value.scale

    ctx.drawImage(
      backgroundImage.value,
      viewportBox.value.fixedX - scaledOffsetX,
      viewportBox.value.fixedY - scaledOffsetY,
      scaledWidth,
      scaledHeight,
    )
  } else {
    // 如果图片未加载，设置白色背景，考虑缩放比例
    const scaledWidth = 4913 * viewportBox.value.scale
    const scaledHeight = 5669 * viewportBox.value.scale
    const scaledOffsetX = viewportBox.value.offsetX * viewportBox.value.scale
    const scaledOffsetY = viewportBox.value.offsetY * viewportBox.value.scale

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(
      viewportBox.value.fixedX - scaledOffsetX,
      viewportBox.value.fixedY - scaledOffsetY,
      scaledWidth,
      scaledHeight,
    )
  }

  // 恢复状态（移除裁剪）
  ctx.restore()

  // 设置绘图样式
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 绘制视窗框
  drawViewportBox()

  // 更新缩略图
  updateThumbnail()

  // 绘制网格
  drawGrid()
}

// 绘制网格线
const drawGrid = () => {
  if (!gridCanvasRef.value) return

  const ctx = gridCanvasRef.value.getContext('2d')
  if (!ctx) return

  // 清空网格画布
  ctx.clearRect(0, 0, calculatedWidth.value, calculatedHeight.value)

  // 保存当前状态
  ctx.save()

  // 设置裁剪区域为视窗框内部
  ctx.beginPath()
  ctx.rect(
    viewportBox.value.fixedX,
    viewportBox.value.fixedY,
    viewportBox.value.width,
    viewportBox.value.height,
  )
  ctx.clip()

  // 设置网格线样式
  ctx.strokeStyle = '#cccccc'
  ctx.globalAlpha = 0.6

  // 确保线宽在高DPI屏幕上正确显示
  const dpr = window.devicePixelRatio || 1
  ctx.lineWidth = 1 / dpr

  // 禁用抗锯齿以确保像素完美的网格线
  ctx.imageSmoothingEnabled = false
  ctx.setLineDash([])

  // 高精度计算格子尺寸（考虑缩放）
  const cellWidth = (calculatedWidth.value / canvasConfig.value.gridCols) * viewportBox.value.scale
  const cellHeight =
    (calculatedHeight.value / canvasConfig.value.gridRows) * viewportBox.value.scale

  // 计算网格起始位置（考虑偏移量和缩放）
  const scaledOffsetX = viewportBox.value.offsetX * viewportBox.value.scale
  const scaledOffsetY = viewportBox.value.offsetY * viewportBox.value.scale
  const startX = viewportBox.value.fixedX - scaledOffsetX
  const startY = viewportBox.value.fixedY - scaledOffsetY

  // 高精度计算可见范围，避免绘制不可见的网格线（考虑缩放）
  const baseCellWidth = calculatedWidth.value / canvasConfig.value.gridCols
  const baseCellHeight = calculatedHeight.value / canvasConfig.value.gridRows
  const visibleStartCol = Math.max(0, Math.floor(viewportBox.value.offsetX / baseCellWidth))
  const visibleStartRow = Math.max(0, Math.floor(viewportBox.value.offsetY / baseCellHeight))
  const visibleEndCol = Math.min(
    canvasConfig.value.gridCols,
    Math.ceil(
      (viewportBox.value.offsetX + viewportBox.value.width / viewportBox.value.scale) /
        baseCellWidth,
    ),
  )
  const visibleEndRow = Math.min(
    canvasConfig.value.gridRows,
    Math.ceil(
      (viewportBox.value.offsetY + viewportBox.value.height / viewportBox.value.scale) /
        baseCellHeight,
    ),
  )

  // 批量绘制垂直网格线 - 优化性能
  ctx.beginPath()
  for (let i = visibleStartCol; i <= visibleEndCol; i++) {
    const x = Math.round(startX + i * cellWidth)
    ctx.moveTo(x, viewportBox.value.fixedY)
    ctx.lineTo(x, viewportBox.value.fixedY + viewportBox.value.height)
  }

  // 批量绘制水平网格线 - 优化性能
  for (let i = visibleStartRow; i <= visibleEndRow; i++) {
    const y = Math.round(startY + i * cellHeight)
    ctx.moveTo(viewportBox.value.fixedX, y)
    ctx.lineTo(viewportBox.value.fixedX + viewportBox.value.width, y)
  }

  ctx.stroke()

  // 绘制已填充的格子
  drawnCells.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const cellX = startX + col * cellWidth
    const cellY = startY + row * cellHeight

    // 检查格子是否在可见区域内
    if (
      cellX + cellWidth >= viewportBox.value.fixedX &&
      cellX <= viewportBox.value.fixedX + viewportBox.value.width &&
      cellY + cellHeight >= viewportBox.value.fixedY &&
      cellY <= viewportBox.value.fixedY + viewportBox.value.height
    ) {
      ctx.fillStyle = color
      ctx.globalAlpha = 1.0
      ctx.fillRect(
        Math.max(cellX, viewportBox.value.fixedX),
        Math.max(cellY, viewportBox.value.fixedY),
        Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX),
        Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - cellY),
      )
      ctx.globalAlpha = 0.6 // 恢复网格线透明度
    }
  })

  // 恢复状态（移除裁剪）
  ctx.restore()
}

// 绘制视窗框（固定在左上角）
const drawViewportBox = () => {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  // 保存当前状态
  ctx.save()

  // 设置视窗框样式
  ctx.strokeStyle = '#ff0000'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  // 绘制固定位置的视窗框
  ctx.strokeRect(
    viewportBox.value.fixedX,
    viewportBox.value.fixedY,
    viewportBox.value.width,
    viewportBox.value.height,
  )

  // 恢复状态
  ctx.restore()
}

// 更新缩略图
const updateThumbnail = () => {
  if (!thumbnailRef.value) return

  const thumbnailCtx = thumbnailRef.value.getContext('2d')
  if (!thumbnailCtx) return

  const devicePixelRatio = window.devicePixelRatio || 1

  // 设置缩略图画布的高分辨率
  const displayWidth = thumbnailWidth.value
  const displayHeight = thumbnailHeight.value
  const canvasWidth = displayWidth * devicePixelRatio
  const canvasHeight = displayHeight * devicePixelRatio

  // 设置实际画布尺寸（高分辨率）
  thumbnailRef.value.width = canvasWidth
  thumbnailRef.value.height = canvasHeight

  // 设置显示尺寸
  thumbnailRef.value.style.width = displayWidth + 'px'
  thumbnailRef.value.style.height = displayHeight + 'px'

  // 缩放上下文以匹配设备像素比
  thumbnailCtx.scale(devicePixelRatio, devicePixelRatio)

  // 清空缩略图
  thumbnailCtx.clearRect(0, 0, displayWidth, displayHeight)

  // 启用图像平滑以获得更好的缩略图效果
  thumbnailCtx.imageSmoothingEnabled = true
  thumbnailCtx.imageSmoothingQuality = 'high'

  // 绘制完整的背景图片到缩略图（与主画布相同的拉伸逻辑）
  if (backgroundImage.value && imageLoaded.value) {
    thumbnailCtx.drawImage(backgroundImage.value, 0, 0, displayWidth, displayHeight)
  } else {
    // 如果没有背景图片，填充白色
    thumbnailCtx.fillStyle = '#ffffff'
    thumbnailCtx.fillRect(0, 0, displayWidth, displayHeight)
  }

  // 绘制已填充的格子到缩略图
  const scaleX = displayWidth / calculatedWidth.value
  const scaleY = displayHeight / calculatedHeight.value
  // 使用基础网格尺寸（不受视窗缩放影响）
  const baseCellWidth = calculatedWidth.value / canvasConfig.value.gridCols
  const baseCellHeight = calculatedHeight.value / canvasConfig.value.gridRows
  const cellWidth = baseCellWidth * scaleX
  const cellHeight = baseCellHeight * scaleY

  drawnCells.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const cellX = col * cellWidth
    const cellY = row * cellHeight

    thumbnailCtx.fillStyle = color
    thumbnailCtx.globalAlpha = 1.0
    thumbnailCtx.fillRect(cellX, cellY, cellWidth, cellHeight)
    thumbnailCtx.globalAlpha = 1.0 // 恢复透明度
  })

  // 添加边框
  thumbnailCtx.strokeStyle = '#333'
  thumbnailCtx.lineWidth = 1
  thumbnailCtx.strokeRect(0, 0, displayWidth, displayHeight)

  // 绘制缩略图上的视窗框（显示当前查看区域）
  thumbnailCtx.strokeStyle = '#ff0000'
  thumbnailCtx.lineWidth = 1
  thumbnailCtx.setLineDash([3, 3])
  // 计算实际可视区域的尺寸（考虑缩放）
  const visibleWidth = viewportBox.value.width / viewportBox.value.scale
  const visibleHeight = viewportBox.value.height / viewportBox.value.scale
  thumbnailCtx.strokeRect(
    viewportBox.value.offsetX * scaleX,
    viewportBox.value.offsetY * scaleY,
    visibleWidth * scaleX,
    visibleHeight * scaleY,
  )
  thumbnailCtx.setLineDash([]) // 重置虚线
}

// 初始化画布
const initCanvas = () => {
  if (!canvasRef.value || !gridCanvasRef.value) return

  const devicePixelRatio = window.devicePixelRatio || 1

  // 初始化背景画布
  const ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    const canvas = canvasRef.value

    // 设置实际画布尺寸
    canvas.width = calculatedWidth.value * devicePixelRatio
    canvas.height = calculatedHeight.value * devicePixelRatio

    // 设置显示尺寸
    canvas.style.width = calculatedWidth.value + 'px'
    canvas.style.height = calculatedHeight.value + 'px'

    // 缩放上下文以匹配设备像素比
    ctx.scale(devicePixelRatio, devicePixelRatio)
  }

  // 初始化网格画布
  const gridCtx = gridCanvasRef.value.getContext('2d')
  if (gridCtx) {
    const gridCanvas = gridCanvasRef.value

    // 设置实际画布尺寸
    gridCanvas.width = calculatedWidth.value * devicePixelRatio
    gridCanvas.height = calculatedHeight.value * devicePixelRatio

    // 设置显示尺寸
    gridCanvas.style.width = calculatedWidth.value + 'px'
    gridCanvas.style.height = calculatedHeight.value + 'px'

    // 缩放上下文以匹配设备像素比
    gridCtx.scale(devicePixelRatio, devicePixelRatio)
  }

  // 初始化缩略图画布
  if (thumbnailRef.value) {
    const thumbnailCtx = thumbnailRef.value.getContext('2d')
    if (thumbnailCtx) {
      const thumbnailCanvas = thumbnailRef.value
      const devicePixelRatio = window.devicePixelRatio || 1

      // 设置缩略图画布的高分辨率
      const displayWidth = thumbnailWidth.value
      const displayHeight = thumbnailHeight.value
      const canvasWidth = displayWidth * devicePixelRatio
      const canvasHeight = displayHeight * devicePixelRatio

      // 设置实际画布尺寸（高分辨率）
      thumbnailCanvas.width = canvasWidth
      thumbnailCanvas.height = canvasHeight

      // 设置显示尺寸
      thumbnailCanvas.style.width = displayWidth + 'px'
      thumbnailCanvas.style.height = displayHeight + 'px'

      // 缩放上下文以匹配设备像素比
      thumbnailCtx.scale(devicePixelRatio, devicePixelRatio)
    }
  }

  // 加载背景图片
  loadBackgroundImage()
}

// 检查点是否在视窗框内（固定位置）
const isPointInViewportBox = (x: number, y: number) => {
  return (
    x >= viewportBox.value.fixedX &&
    x <= viewportBox.value.fixedX + viewportBox.value.width &&
    y >= viewportBox.value.fixedY &&
    y <= viewportBox.value.fixedY + viewportBox.value.height
  )
}

// 获取网格坐标
const getGridCoordinates = (mouseX: number, mouseY: number) => {
  // 将鼠标坐标转换为背景画布上的实际坐标（考虑缩放）
  const actualX = mouseX / viewportBox.value.scale + viewportBox.value.offsetX
  const actualY = mouseY / viewportBox.value.scale + viewportBox.value.offsetY

  // 计算网格坐标（使用基础网格尺寸）
  const baseCellWidth = calculatedWidth.value / canvasConfig.value.gridCols
  const baseCellHeight = calculatedHeight.value / canvasConfig.value.gridRows
  const col = Math.floor(actualX / baseCellWidth)
  const row = Math.floor(actualY / baseCellHeight)

  // 确保坐标在有效范围内
  if (
    col >= 0 &&
    col < canvasConfig.value.gridCols &&
    row >= 0 &&
    row < canvasConfig.value.gridRows
  ) {
    return { col, row }
  }

  return null
}

// 使用 Bresenham 算法连接两个格子之间的所有格子（用于画笔连贯性）
const drawLineBetweenCells = (fromCol: number, fromRow: number, toCol: number, toRow: number) => {
  const cells: { col: number; row: number }[] = []

  let x0 = fromCol
  let y0 = fromRow
  const x1 = toCol
  const y1 = toRow

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    cells.push({ col: x0, row: y0 })

    if (x0 === x1 && y0 === y1) break

    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }

  return cells
}

// 连贯绘制格子（处理画笔连贯性）
const paintCellWithContinuity = (col: number, row: number) => {
  if (lastDrawnCell.value && (currentTool.value === 'brush' || currentTool.value === 'eraser')) {
    // 如果有上一个绘制位置，使用插值算法连接两个点
    const cells = drawLineBetweenCells(lastDrawnCell.value.col, lastDrawnCell.value.row, col, row)

    // 绘制所有插值格子
    for (const cell of cells) {
      const cellKey = `${cell.col},${cell.row}`
      if (currentTool.value === 'brush') {
        drawnCells.value.set(cellKey, brushColor.value)
      } else if (currentTool.value === 'eraser') {
        drawnCells.value.delete(cellKey)
      }
    }

    drawCanvas()
  } else {
    // 第一次绘制或非画笔/橡皮擦工具，直接绘制单个格子
    paintCell(col, row)
  }

  // 更新上一个绘制位置
  if (currentTool.value === 'brush' || currentTool.value === 'eraser') {
    lastDrawnCell.value = { col, row }
  }
}

// 绘制或擦除格子
const paintCell = (col: number, row: number) => {
  const cellKey = `${col},${row}`

  if (currentTool.value === 'eraser') {
    // 橡皮擦工具：只擦除格子
    if (drawnCells.value.has(cellKey)) {
      drawnCells.value.delete(cellKey)
    }
  } else if (currentTool.value === 'brush') {
    // 画笔工具：绘制格子
    drawnCells.value.set(cellKey, brushColor.value)
  } else if (currentTool.value === 'bucket') {
    // 油桶填充工具：洪水填充
    floodFill(col, row, brushColor.value)
  }

  // 重新绘制画布
  drawCanvas()
}

// 洪水填充算法
const floodFill = (startCol: number, startRow: number, fillColor: string) => {
  const startKey = `${startCol},${startRow}`
  const targetColor = drawnCells.value.get(startKey) || null // 目标颜色（要被替换的颜色）

  // 如果目标颜色和填充颜色相同，不需要填充
  if (targetColor === fillColor) {
    return
  }

  // 使用栈来实现非递归的洪水填充算法
  const stack: Array<{ col: number; row: number }> = [{ col: startCol, row: startRow }]
  const visited = new Set<string>()

  while (stack.length > 0) {
    const { col, row } = stack.pop()!
    const cellKey = `${col},${row}`

    // 检查边界条件
    if (
      col < 0 ||
      col >= canvasConfig.value.gridCols ||
      row < 0 ||
      row >= canvasConfig.value.gridRows ||
      visited.has(cellKey)
    ) {
      continue
    }

    // 检查当前格子的颜色
    const currentColor = drawnCells.value.get(cellKey) || null
    if (currentColor !== targetColor) {
      continue
    }

    // 标记为已访问
    visited.add(cellKey)

    // 填充当前格子
    if (fillColor) {
      drawnCells.value.set(cellKey, fillColor)
    } else {
      drawnCells.value.delete(cellKey)
    }

    // 添加相邻的四个格子到栈中
    stack.push({ col: col + 1, row: row }) // 右
    stack.push({ col: col - 1, row: row }) // 左
    stack.push({ col: col, row: row + 1 }) // 下
    stack.push({ col: col, row: row - 1 }) // 上
  }
}

// 开始绘制或拖拽
const startDrawing = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  // 获取相对于画布的坐标（考虑显示缩放和视窗缩放）
  const displayScaleX = calculatedWidth.value / rect.width
  const displayScaleY = calculatedHeight.value / rect.height
  const mouseX = (e.clientX - rect.left) * displayScaleX
  const mouseY = (e.clientY - rect.top) * displayScaleY

  // 检测是否为右键点击
  const isRightClick = e.button === 2

  // 如果是右键点击，无论当前工具是什么，都启用移动功能
  if (isRightClick && isPointInViewportBox(mouseX, mouseY)) {
    isRightDragging.value = true
    viewportBox.value.isDragging = true
    viewportBox.value.dragStartX = mouseX
    viewportBox.value.dragStartY = mouseY
    viewportBox.value.initialOffsetX = viewportBox.value.offsetX
    viewportBox.value.initialOffsetY = viewportBox.value.offsetY
    return
  }

  // 左键点击的原有逻辑
  if (!isRightClick) {
    // 检查是否点击在视窗框内
    if (isPointInViewportBox(mouseX, mouseY)) {
      if (currentTool.value === 'move') {
        // 移动工具：开始拖拽视窗框（实际是移动背景）
        viewportBox.value.isDragging = true
        viewportBox.value.dragStartX = mouseX
        viewportBox.value.dragStartY = mouseY
        viewportBox.value.initialOffsetX = viewportBox.value.offsetX
        viewportBox.value.initialOffsetY = viewportBox.value.offsetY
      } else if (currentTool.value === 'brush' || currentTool.value === 'eraser') {
        // 画笔工具或橡皮擦工具：在开始绘制前保存当前状态
        saveToHistory()

        // 重置上一个绘制位置（开始新的绘制操作）
        lastDrawnCell.value = null

        // 绘制或擦除格子
        const gridCoords = getGridCoordinates(mouseX, mouseY)
        if (gridCoords) {
          paintCellWithContinuity(gridCoords.col, gridCoords.row)
          isDrawing.value = true
          isDragDrawing.value = true
        }
      } else if (currentTool.value === 'bucket') {
        // 油桶填充工具：在填充前保存当前状态
        saveToHistory()

        // 执行洪水填充
        const gridCoords = getGridCoordinates(mouseX, mouseY)
        if (gridCoords) {
          paintCell(gridCoords.col, gridCoords.row)
        }
      }
    } else {
      // 点击在视窗框外的区域
      if (currentTool.value === 'move') {
        // 移动工具：开始自由绘制（保持原有功能）
        isDrawing.value = true
        lastX.value = mouseX
        lastY.value = mouseY
      }
    }
  }
}

// 绘制或拖拽
const draw = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  // 获取相对于画布的坐标（考虑显示缩放和视窗缩放）
  const displayScaleX = calculatedWidth.value / rect.width
  const displayScaleY = calculatedHeight.value / rect.height
  const currentX = (e.clientX - rect.left) * displayScaleX
  const currentY = (e.clientY - rect.top) * displayScaleY

  if (viewportBox.value.isDragging && (currentTool.value === 'move' || isRightDragging.value)) {
    // 移动工具或右键拖拽：拖拽视窗框（实际是移动背景偏移量）
    const deltaX = currentX - viewportBox.value.dragStartX
    const deltaY = currentY - viewportBox.value.dragStartY

    let newOffsetX = viewportBox.value.initialOffsetX - deltaX
    let newOffsetY = viewportBox.value.initialOffsetY - deltaY

    // 限制背景偏移量在合理范围内（考虑缩放）
    const visibleWidth = viewportBox.value.width / viewportBox.value.scale
    const visibleHeight = viewportBox.value.height / viewportBox.value.scale
    const maxOffsetX = Math.max(0, calculatedWidth.value - visibleWidth)
    const maxOffsetY = Math.max(0, calculatedHeight.value - visibleHeight)
    newOffsetX = Math.max(0, Math.min(newOffsetX, maxOffsetX))
    newOffsetY = Math.max(0, Math.min(newOffsetY, maxOffsetY))

    viewportBox.value.offsetX = newOffsetX
    viewportBox.value.offsetY = newOffsetY

    // 重新绘制画布和网格
    drawCanvas()
  } else if (
    isDrawing.value &&
    (currentTool.value === 'brush' || currentTool.value === 'eraser') &&
    isPointInViewportBox(currentX, currentY)
  ) {
    // 画笔工具或橡皮擦工具：拖拽绘制或擦除格子
    const gridCoords = getGridCoordinates(currentX, currentY)
    if (gridCoords) {
      // 使用连贯绘制函数确保快速移动时不跳过格子
      paintCellWithContinuity(gridCoords.col, gridCoords.row)
    }
  }
  // 注意：油桶填充工具不支持拖拽操作，只在点击时执行填充
  else if (isDrawing.value && currentTool.value === 'move' && canvasRef.value) {
    // 移动工具：自由绘制线条（保持原有功能）
    const ctx = canvasRef.value.getContext('2d')
    if (!ctx) return

    // 设置绘图样式
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(lastX.value, lastY.value)
    ctx.lineTo(currentX, currentY)
    ctx.stroke()

    lastX.value = currentX
    lastY.value = currentY

    // 更新缩略图
    updateThumbnail()
  }
}

// 停止绘制或拖拽
const stopDrawing = () => {
  if (isDragDrawing.value) {
    isDragDrawing.value = false
  }

  isDrawing.value = false
  viewportBox.value.isDragging = false
  isRightDragging.value = false

  // 重置上一个绘制位置（结束绘制操作）
  lastDrawnCell.value = null
}

// 处理滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  // 获取鼠标在画布上的位置（屏幕坐标）
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  // 转换为画布坐标（考虑当前缩放）
  const canvasX = mouseX / viewportBox.value.scale
  const canvasY = mouseY / viewportBox.value.scale

  // 计算缩放因子
  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(
    viewportBox.value.minScale,
    Math.min(viewportBox.value.maxScale, viewportBox.value.scale * scaleFactor),
  )

  // 如果缩放比例没有变化，直接返回
  if (newScale === viewportBox.value.scale) return

  // 计算缩放前后鼠标位置在画布上的偏移
  const newMouseX = mouseX / newScale
  const newMouseY = mouseY / newScale

  // 调整偏移量，使鼠标位置保持不变
  viewportBox.value.offsetX += canvasX - newMouseX
  viewportBox.value.offsetY += canvasY - newMouseY

  // 更新缩放比例
  viewportBox.value.scale = newScale

  // 限制偏移量在合理范围内
  const maxOffsetX = Math.max(
    0,
    calculatedWidth.value - viewportBox.value.width / viewportBox.value.scale,
  )
  const maxOffsetY = Math.max(
    0,
    calculatedHeight.value - viewportBox.value.height / viewportBox.value.scale,
  )
  viewportBox.value.offsetX = Math.max(0, Math.min(viewportBox.value.offsetX, maxOffsetX))
  viewportBox.value.offsetY = Math.max(0, Math.min(viewportBox.value.offsetY, maxOffsetY))

  // 重新绘制画布
  drawCanvas()
}

// 缩略图点击事件
const onThumbnailClick = (e: MouseEvent) => {
  if (!thumbnailRef.value) return

  const rect = thumbnailRef.value.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top

  // 将缩略图坐标转换为主画布坐标
  const scaleX = calculatedWidth.value / thumbnailWidth.value
  const scaleY = calculatedHeight.value / thumbnailHeight.value

  const mainCanvasX = clickX * scaleX
  const mainCanvasY = clickY * scaleY

  // 将视窗框中心移动到点击位置（通过调整背景偏移量）
  let newOffsetX = mainCanvasX - viewportBox.value.width / 2
  let newOffsetY = mainCanvasY - viewportBox.value.height / 2

  // 限制背景偏移量在合理范围内
  const maxOffsetX = calculatedWidth.value - viewportBox.value.width
  const maxOffsetY = calculatedHeight.value - viewportBox.value.height
  newOffsetX = Math.max(0, Math.min(newOffsetX, maxOffsetX))
  newOffsetY = Math.max(0, Math.min(newOffsetY, maxOffsetY))

  viewportBox.value.offsetX = newOffsetX
  viewportBox.value.offsetY = newOffsetY

  // 重新绘制画布和网格
  drawCanvas()
}

// 显示完整画布预览
const showFullImage = () => {
  showPreviewModal.value = true
  nextTick(() => {
    renderFullCanvas()
  })
}

// 关闭预览弹窗
const closePreviewModal = () => {
  showPreviewModal.value = false
}

// 渲染完整画布到预览画布
const renderFullCanvas = () => {
  if (!previewCanvasRef.value) return

  const canvas = previewCanvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 计算合适的预览尺寸（保持原始比例，但限制最大尺寸）
  const originalWidth = calculatedWidth.value
  const originalHeight = calculatedHeight.value
  const maxPreviewSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.7, 1200)

  let previewWidth = originalWidth
  let previewHeight = originalHeight

  // 如果画布太大，按比例缩放
  if (originalWidth > maxPreviewSize || originalHeight > maxPreviewSize) {
    const scale = Math.min(maxPreviewSize / originalWidth, maxPreviewSize / originalHeight)
    previewWidth = originalWidth * scale
    previewHeight = originalHeight * scale
  }

  // 设置画布尺寸
  canvas.width = previewWidth
  canvas.height = previewHeight

  // 设置画布样式尺寸（CSS尺寸）
  canvas.style.width = previewWidth + 'px'
  canvas.style.height = previewHeight + 'px'

  // 禁用图像平滑以获得像素完美的清晰度
  ctx.imageSmoothingEnabled = false

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 计算缩放比例
  const scaleX = previewWidth / originalWidth
  const scaleY = previewHeight / originalHeight

  // 绘制背景图片（如果有）
  if (backgroundImage.value && imageLoaded.value) {
    // 使用高质量的图像绘制
    ctx.drawImage(backgroundImage.value, 0, 0, previewWidth, previewHeight)
  } else {
    // 如果没有背景图片，填充白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, previewWidth, previewHeight)
  }

  // 绘制所有已填充的格子
  const cellWidth = gridCellWidth.value * scaleX
  const cellHeight = gridCellHeight.value * scaleY

  drawnCells.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const x = col * cellWidth
    const y = row * cellHeight

    ctx.fillStyle = color
    ctx.fillRect(x, y, cellWidth, cellHeight)
  })
}

// 下载完整画布图片
const downloadFullImage = () => {
  // 创建一个临时画布用于生成原始尺寸的图片
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  // 设置为原始画布尺寸
  tempCanvas.width = calculatedWidth.value
  tempCanvas.height = calculatedHeight.value

  // 清空画布
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)

  // 绘制背景图片（如果有）
  if (backgroundImage.value && imageLoaded.value) {
    tempCtx.drawImage(backgroundImage.value, 0, 0, tempCanvas.width, tempCanvas.height)
  } else {
    // 如果没有背景图片，填充白色背景
    tempCtx.fillStyle = '#ffffff'
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
  }

  // 绘制所有已填充的格子（原始尺寸）
  const cellWidth = gridCellWidth.value
  const cellHeight = gridCellHeight.value

  drawnCells.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const x = col * cellWidth
    const y = row * cellHeight

    tempCtx.fillStyle = color
    tempCtx.fillRect(x, y, cellWidth, cellHeight)
  })

  // 创建下载链接
  const link = document.createElement('a')
  link.download = `canvas-${Date.now()}.png`
  link.href = tempCanvas.toDataURL('image/png')
  link.click()
}

// 获取背景画布所有颜色数组
const getCanvasColors = (): string[] => {
  const colors = new Set<string>()

  // 创建一个临时画布来渲染完整的背景画布
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) {
    console.warn('无法创建临时画布上下文')
    return []
  }

  // 设置临时画布尺寸为完整的背景画布尺寸
  const fullWidth = calculatedWidth.value
  const fullHeight = calculatedHeight.value
  tempCanvas.width = fullWidth
  tempCanvas.height = fullHeight

  // 禁用图像平滑以获得像素完美的清晰度
  tempCtx.imageSmoothingEnabled = false

  // 清空画布（白色背景）
  tempCtx.fillStyle = '#ffffff'
  tempCtx.fillRect(0, 0, fullWidth, fullHeight)

  // 绘制背景图片（如果有）
  if (backgroundImage.value && imageLoaded.value) {
    tempCtx.drawImage(backgroundImage.value, 0, 0, fullWidth, fullHeight)
  }

  // 绘制所有已绘制的格子
  const cellWidth = gridCellWidth.value
  const cellHeight = gridCellHeight.value

  drawnCells.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const x = col * cellWidth
    const y = row * cellHeight

    tempCtx.fillStyle = color
    tempCtx.fillRect(x, y, cellWidth, cellHeight)
  })

  // 获取完整画布的 imageData
  try {
    const imageData = tempCtx.getImageData(0, 0, fullWidth, fullHeight)
    const data = imageData.data

    // 遍历所有像素，提取颜色
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      // 只处理不透明的像素
      if (a > 0) {
        // 将RGB值转换为十六进制
        const hex =
          '#' +
          ('0' + r.toString(16)).slice(-2) +
          ('0' + g.toString(16)).slice(-2) +
          ('0' + b.toString(16)).slice(-2)

        // 排除纯白色背景
        if (hex !== '#ffffff') {
          colors.add(hex)
        }
      }
    }
  } catch (error) {
    console.warn('无法获取完整画布的像素数据:', error)

    // 降级方案：只从已绘制的格子中获取颜色
    drawnCells.value.forEach((color) => {
      if (color && color !== '#ffffff') {
        colors.add(color)
      }
    })
  }

  // 转换为数组并排序
  return Array.from(colors).sort()
}

// 显示画布颜色数组
const showCanvasColors = () => {
  const colors = getCanvasColors()

  // 更新响应式颜色数组
  canvasColors.value = colors

  if (colors.length === 0) {
    alert('画布中没有检测到颜色，请先绘制一些内容或加载背景图片。')
    return
  }

  // 在控制台输出详细信息
  console.log('画布颜色数组:', colors)
  console.log('颜色数量:', colors.length)
  console.log('已绘制格子数量:', drawnCells.value.size)

  // 显示成功提示
  alert(`成功获取到 ${colors.length} 种颜色，已在页面上显示！`)
}

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    }
  }
}

// 组件挂载时自动创建指定尺寸的画布
onMounted(() => {
  // 初始化临时网格变量
  tempGridCols.value = canvasConfig.value.gridCols
  tempGridRows.value = canvasConfig.value.gridRows

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeydown)

  createCanvas()
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
.canvas-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.canvas-config-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  .config-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 300px;

    h2 {
      margin-bottom: 1.5rem;
      text-align: center;
      color: #333;
    }

    .form-group {
      margin-bottom: 1rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #555;
      }

      input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: #007bff;
        }
      }

      span {
        color: #666;
        font-size: 0.9rem;
      }
    }

    .create-btn {
      width: 100%;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #0056b3;
      }
    }
  }
}

.canvas-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  background: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  gap: 1rem;

  .reset-btn {
    padding: 0.5rem 1rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #545b62;
    }
  }

  .upload-section {
    display: flex;
    align-items: center;
  }

  .upload-btn {
    padding: 0.5rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #218838;
    }
  }

  .canvas-info {
    color: #666;
    font-size: 0.9rem;
  }

  .grid-info {
    color: #666;
    font-size: 0.9rem;
    margin-left: 1rem;
  }

  .tool-info {
    color: #666;
    font-size: 0.9rem;
    margin-left: 1rem;
    font-weight: 500;
  }

  .tool-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1rem;
  }

  .tool-btn {
    padding: 0.5rem 1rem;
    background-color: #f8f9fa;
    color: #495057;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;

    &:hover {
      background-color: #e9ecef;
      border-color: #adb5bd;
    }

    &.active {
      background-color: #007bff;
      color: white;
      border-color: #007bff;

      &:hover {
        background-color: #0056b3;
        border-color: #0056b3;
      }
    }
  }

  .brush-settings,
  .eraser-settings,
  .bucket-settings {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1rem;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;

    label {
      font-size: 0.9rem;
      color: #495057;
      margin: 0;
    }

    .color-picker {
      width: 40px;
      height: 30px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
    }

    .clear-btn {
      padding: 0.25rem 0.75rem;
      background-color: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: background-color 0.2s;

      &:hover {
        background-color: #c82333;
      }
    }
  }

  .history-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1rem;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;

    .history-btn {
      padding: 0.25rem 0.75rem;
      background-color: #17a2b8;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      min-width: 60px;

      &:hover:not(:disabled) {
        background-color: #138496;
      }

      &:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    .preview-btn {
      padding: 0.25rem 0.75rem;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      min-width: 80px;

      &:hover {
        background-color: #218838;
      }
    }
  }

  .grid-settings {
    margin-left: 1rem;
    padding: 0.75rem;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;
    margin-top: 0.5rem;

    h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #495057;
      font-weight: 600;
    }

    .grid-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .grid-input-group {
      display: flex;
      align-items: center;
      gap: 0.25rem;

      label {
        font-size: 0.8rem;
        color: #495057;
        margin: 0;
        white-space: nowrap;
      }

      .grid-input {
        width: 80px;
        padding: 0.25rem 0.5rem;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 0.8rem;
        text-align: center;

        &:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
      }
    }

    .update-grid-btn {
      padding: 0.25rem 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: background-color 0.2s;

      &:hover {
        background-color: #0056b3;
      }
    }

    .reset-grid-btn {
      padding: 0.25rem 0.75rem;
      background-color: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: background-color 0.2s;

      &:hover {
        background-color: #545b62;
      }
    }
  }

  .colors-panel {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    max-width: 100%;

    h4 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #495057;
      font-weight: 600;
    }

    .colors-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .color-item {
      position: relative;
      width: 60px;
      height: 40px;
      border-radius: 6px;
      border: 2px solid #fff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 10;
      }

      .color-text {
        font-size: 0.7rem;
        font-weight: 500;
        color: #fff;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 4px;
        border-radius: 3px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      &:hover .color-text {
        opacity: 1;
      }
    }
  }
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.canvas-container-relative {
  position: relative;
  display: inline-block;
  overflow: hidden;
}

.background-canvas {
  border: 1px solid #ddd;
  background: white;
  cursor: crosshair;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  display: block;

  &.brush-cursor {
    cursor:
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="%23ff0000" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="%23ff0000"/></svg>')
        12 12,
      crosshair;
  }

  &.eraser-cursor {
    cursor:
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="8" rx="2" fill="none" stroke="%23666" stroke-width="2"/><path d="M8 12h8" stroke="%23666" stroke-width="2"/></svg>')
        12 12,
      crosshair;
  }

  &.move-cursor {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &.bucket-cursor {
    cursor:
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L8 6h8l-4-4z" fill="%23007bff"/><path d="M8 6v10c0 2 2 4 4 4s4-2 4-4V6H8z" fill="none" stroke="%23007bff" stroke-width="2"/><circle cx="12" cy="10" r="1" fill="%23007bff"/></svg>')
        12 12,
      crosshair;
  }
}

.grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

.thumbnail-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.thumbnail-canvas {
  display: block;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

// 预览弹窗样式
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.preview-modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 95vw;
  max-height: 95vh;
  width: auto;
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background-color: #f8f9fa;

  h3 {
    margin: 0;
    color: #333;
    font-size: 1.2rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;

    &:hover {
      background-color: #e9ecef;
      color: #333;
    }
  }
}

.preview-modal-body {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  background-color: #f8f9fa;
  min-height: 0;

  .preview-canvas {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background: white;
    display: block;
    min-width: auto;
    min-height: auto;
  }
}

.preview-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  background-color: #f8f9fa;

  .download-btn {
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;

    &:hover {
      background-color: #0056b3;
    }
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;

    &:hover {
      background-color: #545b62;
    }
  }
}
</style>
