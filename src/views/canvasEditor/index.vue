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
        </div>

        <!-- 画笔设置 -->
        <div class="brush-settings" v-if="currentTool === 'brush'">
          <label>画笔颜色:</label>
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
          当前工具: {{ currentTool === 'move' ? '移动视窗' : '画笔工具' }}
        </span>
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
            }"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @wheel="handleWheel"
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

const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)
const isDragDrawing = ref(false) // 标记是否在拖拽绘制过程中
const backgroundImage = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)

// 工具状态
const currentTool = ref<'move' | 'brush'>('move')
const brushColor = ref('#ff0000')

// 存储绘制的格子数据
const drawnCells = ref<Map<string, string>>(new Map())

// 撤销重做功能
const history = ref<Map<string, string>[]>([new Map()]) // 历史记录数组
const historyIndex = ref(0) // 当前历史记录索引
const maxHistorySize = 50 // 最大历史记录数量

// 临时网格设置（用于输入框）
const tempGridCols = ref(949)
const tempGridRows = ref(1230)

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
const setTool = (tool: 'move' | 'brush') => {
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

  // 清空缩略图
  thumbnailCtx.clearRect(0, 0, thumbnailWidth.value, thumbnailHeight.value)

  // 启用图像平滑以获得更好的缩略图效果
  thumbnailCtx.imageSmoothingEnabled = true
  thumbnailCtx.imageSmoothingQuality = 'high'

  // 绘制完整的背景图片到缩略图（与主画布相同的拉伸逻辑）
  if (backgroundImage.value && imageLoaded.value) {
    thumbnailCtx.drawImage(backgroundImage.value, 0, 0, thumbnailWidth.value, thumbnailHeight.value)
  } else {
    // 如果没有背景图片，填充白色
    thumbnailCtx.fillStyle = '#ffffff'
    thumbnailCtx.fillRect(0, 0, thumbnailWidth.value, thumbnailHeight.value)
  }

  // 绘制已填充的格子到缩略图
  const scaleX = thumbnailWidth.value / calculatedWidth.value
  const scaleY = thumbnailHeight.value / calculatedHeight.value
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
  thumbnailCtx.strokeRect(0, 0, thumbnailWidth.value, thumbnailHeight.value)

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

// 绘制或擦除格子
const paintCell = (col: number, row: number) => {
  const cellKey = `${col},${row}`

  if (drawnCells.value.has(cellKey)) {
    // 如果格子已经被绘制，则擦除它
    drawnCells.value.delete(cellKey)
  } else {
    // 否则用当前颜色绘制格子
    drawnCells.value.set(cellKey, brushColor.value)
  }

  // 重新绘制画布
  drawCanvas()
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

  // 检查是否点击在视窗框内
  if (isPointInViewportBox(mouseX, mouseY)) {
    if (currentTool.value === 'move') {
      // 移动工具：开始拖拽视窗框（实际是移动背景）
      viewportBox.value.isDragging = true
      viewportBox.value.dragStartX = mouseX
      viewportBox.value.dragStartY = mouseY
      viewportBox.value.initialOffsetX = viewportBox.value.offsetX
      viewportBox.value.initialOffsetY = viewportBox.value.offsetY
    } else if (currentTool.value === 'brush') {
      // 画笔工具：在开始绘制前保存当前状态
      saveToHistory()

      // 绘制格子
      const gridCoords = getGridCoordinates(mouseX, mouseY)
      if (gridCoords) {
        paintCell(gridCoords.col, gridCoords.row)
        isDrawing.value = true
        isDragDrawing.value = true
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

// 绘制或拖拽
const draw = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  // 获取相对于画布的坐标（考虑显示缩放和视窗缩放）
  const displayScaleX = calculatedWidth.value / rect.width
  const displayScaleY = calculatedHeight.value / rect.height
  const currentX = (e.clientX - rect.left) * displayScaleX
  const currentY = (e.clientY - rect.top) * displayScaleY

  if (viewportBox.value.isDragging && currentTool.value === 'move') {
    // 移动工具：拖拽视窗框（实际是移动背景偏移量）
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
    currentTool.value === 'brush' &&
    isPointInViewportBox(currentX, currentY)
  ) {
    // 画笔工具：拖拽绘制格子
    const gridCoords = getGridCoordinates(currentX, currentY)
    if (gridCoords) {
      const cellKey = `${gridCoords.col},${gridCoords.row}`
      if (!drawnCells.value.has(cellKey)) {
        drawnCells.value.set(cellKey, brushColor.value)
        drawCanvas()
      }
    }
  } else if (isDrawing.value && currentTool.value === 'move' && canvasRef.value) {
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

  .brush-settings {
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

  &.move-cursor {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
}

.grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
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
</style>
