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
      <!-- 浮动工具栏 -->
      <div class="floating-toolbar" :class="{ 'toolbar-hidden': isToolbarHidden }">
        <!-- 工具栏切换按钮 -->
        <button class="toolbar-toggle" @click="toggleToolbar">
          {{ isToolbarHidden ? '▶' : '◀' }}
        </button>

        <div class="toolbar-content" v-show="!isToolbarHidden">
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
            <button
              @click="setTool('line')"
              :class="['tool-btn', { active: currentTool === 'line' }]"
            >
              直线工具
            </button>
            <button
              @click="setTool('select')"
              :class="['tool-btn', { active: currentTool === 'select' }]"
            >
              矩形选择
            </button>
          </div>

          <!-- 画笔设置 -->
          <div class="brush-settings" v-if="currentTool === 'brush'">
            <label>画笔颜色:</label>
            <input type="color" v-model="brushColor" class="color-picker" />
            <div class="brush-size-control">
              <label>画笔粗细:</label>
              <input
                type="range"
                v-model.number="brushSize"
                min="1"
                max="10"
                step="1"
                class="brush-size-slider"
              />
              <span class="brush-size-display">{{ brushSize }}x{{ brushSize }}</span>
            </div>
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

          <!-- 直线工具设置 -->
          <div class="line-settings" v-if="currentTool === 'line'">
            <label>直线颜色:</label>
            <input type="color" v-model="brushColor" class="color-picker" />
            <div class="brush-size-control">
              <label>直线粗细:</label>
              <input
                type="range"
                v-model.number="brushSize"
                min="1"
                max="10"
                step="1"
                class="brush-size-slider"
              />
              <span class="brush-size-display">{{ brushSize }}x{{ brushSize }}</span>
            </div>
            <button @click="clearGrid" class="clear-btn">清除格子</button>
          </div>

          <!-- 矩形选择工具设置 -->
          <div class="select-settings" v-if="currentTool === 'select'">
            <label>矩形选择工具</label>
            <div class="selection-info" v-if="selectedArea">
              <p>
                选择区域: {{ selectedArea.startCol }},{{ selectedArea.startRow }} 到
                {{ selectedArea.endCol }},{{ selectedArea.endRow }}
              </p>
              <p>尺寸: {{ selectedArea.width }}x{{ selectedArea.height }} 格子</p>
            </div>
            <div class="selection-actions" v-if="selectedArea">
              <button @click="copySelectedArea" class="action-btn">复制选区</button>
              <button @click="cutSelectedArea" class="action-btn">剪切选区</button>
              <button @click="pasteSelectedArea" :disabled="!copiedImageData" class="action-btn">
                粘贴选区
              </button>
              <button @click="deleteSelectedArea" class="action-btn">删除选区</button>
              <button @click="exportSelectedArea" class="action-btn">导出选区</button>
              <button @click="clearSelection" class="clear-btn">清除选择</button>
            </div>
            <div v-else>
              <p>拖拽鼠标创建选择区域</p>
              <div class="paste-section" v-if="copiedImageData">
                <button @click="pasteSelectedArea" class="action-btn">粘贴到中心</button>
                <p class="paste-hint">💡 提示：右键点击画布可在指定位置粘贴</p>
              </div>
              <div class="selection-tips" v-if="!copiedImageData">
                <p class="tip-text">📝 操作提示：</p>
                <ul class="shortcut-list">
                  <li>🖱️ 拖拽选区内部可移动选区</li>
                  <li>Ctrl+C - 复制选区</li>
                  <li>Ctrl+X - 剪切选区</li>
                  <li>Ctrl+V - 粘贴选区</li>
                  <li>Delete - 删除选区</li>
                  <li>Escape - 清除选择</li>
                </ul>
              </div>
            </div>
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

          <!-- 背景颜色设置 -->
          <div class="background-settings">
            <h4>背景设置</h4>
            <div class="background-controls">
              <div class="background-color-group">
                <label>背景颜色:</label>
                <input
                  type="color"
                  v-model="backgroundColor"
                  class="color-picker"
                  @change="drawCanvas"
                />
                <button @click="resetBackgroundColor" class="reset-bg-btn">重置为白色</button>
              </div>
            </div>
          </div>

          <!-- 颜色替换工具 -->
          <div class="color-replace-settings">
            <h4>颜色替换工具</h4>

            <!-- 背景图片状态提示 -->
            <div class="background-status" v-if="!imageLoaded">
              <p class="warning-text">⚠️ 背景图层功能需要先上传背景图片</p>
              <button @click="triggerFileUpload" class="upload-btn">上传背景图片</button>
            </div>

            <div class="color-replace-controls">
              <div class="color-replace-group">
                <label>旧颜色:</label>
                <input type="color" v-model="oldColorToReplace" class="color-picker" />
                <label>新颜色:</label>
                <input type="color" v-model="newColorToReplace" class="color-picker" />
              </div>
              <div class="target-layer-group">
                <label>目标图层:</label>
                <select v-model="targetLayer" class="layer-select">
                  <option value="both">自动判断 (优先选择可用图层)</option>
                  <option value="drawn">仅绘制层</option>
                  <option value="background" :disabled="!imageLoaded">
                    仅背景层{{ !imageLoaded ? ' (需要背景图片)' : '' }}
                  </option>
                </select>
              </div>
              <div class="color-replace-actions">
                <button @click="performColorReplace" class="replace-btn">替换颜色</button>
                <button @click="performColorDelete" class="delete-color-btn">删除颜色</button>
              </div>
            </div>
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
                    : currentTool === 'bucket'
                      ? '油桶填充'
                      : currentTool === 'line'
                        ? '直线工具'
                        : '矩形选择'
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
            @contextmenu="handleContextMenu"
          ></canvas>

          <!-- 预览层画布 -->
          <canvas ref="previewLayerRef" class="preview-layer-canvas"></canvas>

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

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="contextMenuPaste">📋 粘贴到此位置</div>
    </div>

    <!-- 右键菜单背景遮罩 -->
    <div v-if="contextMenu.show" class="context-menu-overlay" @click="hideContextMenu"></div>

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

// 背景颜色设置
const backgroundColor = ref('#ffffff')

// 画布状态
const canvasCreated = ref(false)

// 画布引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gridCanvasRef = ref<HTMLCanvasElement | null>(null)
const previewLayerRef = ref<HTMLCanvasElement | null>(null)
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
const currentTool = ref<'move' | 'brush' | 'eraser' | 'bucket' | 'line' | 'select'>('brush')
const isToolbarHidden = ref(false)

// 切换工具栏显示/隐藏
const toggleToolbar = () => {
  isToolbarHidden.value = !isToolbarHidden.value
}
const brushColor = ref('#ff0000')
const brushSize = ref(1) // 画笔粗细，表示绘制的格子数量（1x1, 2x2, 3x3等）

// 直线工具状态
const lineStartCell = ref<{ col: number; row: number } | null>(null)
const lineEndCell = ref<{ col: number; row: number } | null>(null)
const isDrawingLine = ref(false)
const linePreviewCells = ref<{ col: number; row: number }[]>([])

// 矩形选择工具状态
const isSelecting = ref(false)
const selectionStart = ref<{ col: number; row: number } | null>(null)
const selectionEnd = ref<{ col: number; row: number } | null>(null)
const selectedArea = ref<{
  startCol: number
  startRow: number
  endCol: number
  endRow: number
  width: number
  height: number
} | null>(null)
const selectedImageData = ref<Map<string, string> | null>(null)
const copiedImageData = ref<Map<string, string> | null>(null)

// 选择区域移动状态
const isMovingSelection = ref(false)
const selectionMoveStart = ref<{ col: number; row: number } | null>(null)
const originalSelectedArea = ref<{
  startCol: number
  startRow: number
  endCol: number
  endRow: number
  width: number
  height: number
} | null>(null)

// 存储绘制的格子数据
const drawnCells = ref<Map<string, string>>(new Map())

// 记录上一个绘制的格子位置（用于画笔连贯性）
const lastDrawnCell = ref<{ col: number; row: number } | null>(null)

// 预览层状态
const previewCell = ref<{ col: number; row: number } | null>(null)

// 撤销重做功能
const history = ref<Map<string, string>[]>([new Map()]) // 历史记录数组
const historyIndex = ref(0) // 当前历史记录索引
const maxHistorySize = 50 // 最大历史记录数量

// 临时网格设置（用于输入框）
const tempGridCols = ref(949)
const tempGridRows = ref(1230)

// 画布颜色数组
const canvasColors = ref<string[]>([])

// 颜色替换工具相关变量
const oldColorToReplace = ref('#ff0000') // 要替换的旧颜色
const newColorToReplace = ref('#00ff00') // 替换后的新颜色
const targetLayer = ref<'drawn' | 'background' | 'both'>('both') // 目标图层，默认选择绘制层+背景层

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

// 重置背景颜色
const resetBackgroundColor = () => {
  backgroundColor.value = '#ffffff'
  drawCanvas()
}

// 十六进制颜色转RGB辅助函数
const hexToRgba = (hex: string) => {
  try {
    // 移除#前缀
    hex = hex.replace('#', '')

    // 处理简写形式 (例如 #FFF)
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char: string) => char + char)
        .join('')
    }

    // 确保是有效的十六进制颜色
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      console.error('无效的十六进制颜色:', hex)
      return { r: 0, g: 0, b: 0, a: 255 } // 默认返回黑色
    }

    // 解析RGB值
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return { r, g, b, a: 255 }
  } catch (error) {
    console.error('颜色转换错误:', error)
    return { r: 0, g: 0, b: 0, a: 255 } // 默认返回黑色
  }
}

// 替换绘制层中的特定颜色
const replaceDrawnColor = (oldColor: string, newColor: string) => {
  let replacedCount = 0

  // 遍历所有已绘制的格子
  const newDrawnCells = new Map()

  drawnCells.value.forEach((color, cellKey) => {
    if (color.toLowerCase() === oldColor.toLowerCase()) {
      newDrawnCells.set(cellKey, newColor)
      replacedCount++
    } else {
      newDrawnCells.set(cellKey, color)
    }
  })

  // 更新绘制的格子
  drawnCells.value = newDrawnCells

  // 保存到历史记录并重新绘制
  saveToHistory()
  drawCanvas()

  console.log(`绘制层颜色替换完成，共替换 ${replacedCount} 个格子`)
  return replacedCount
}

// 替换背景图层中的特定颜色
const replaceBackgroundColor = (oldColor: string, newColor: string) => {
  console.log('背景图片状态检查:', {
    backgroundImage: !!backgroundImage.value,
    imageLoaded: imageLoaded.value,
    backgroundImageSrc: backgroundImage.value?.src,
  })

  if (!backgroundImage.value || !imageLoaded.value) {
    console.warn('没有背景图片，无法替换背景颜色')
    return 0
  }

  console.log('开始背景颜色替换:', { oldColor, newColor })

  // 创建临时画布来处理背景图片
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return 0

  // 设置临时画布尺寸为背景图片尺寸
  tempCanvas.width = backgroundImage.value.width
  tempCanvas.height = backgroundImage.value.height

  console.log('临时画布尺寸:', tempCanvas.width, 'x', tempCanvas.height)

  // 绘制背景图片到临时画布
  tempCtx.drawImage(backgroundImage.value, 0, 0)

  // 获取图像数据
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const data = imageData.data

  let replacedPixelsCount = 0
  let totalPixelsChecked = 0
  const colorMatches = new Set() // 记录找到的颜色

  // 将旧颜色和新颜色从十六进制转换为RGB
  const oldRgb = hexToRgba(oldColor)
  const newRgb = hexToRgba(newColor)
  if (!oldRgb || !newRgb) {
    console.error('无效的颜色格式:', { oldColor, newColor, oldRgb, newRgb })
    return 0
  }

  console.log('颜色转换结果:', { oldRgb, newRgb })

  // 遍历每个像素，将指定颜色替换为新颜色
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a > 0) {
      totalPixelsChecked++

      // 方法1: 直接比较RGB值（更精确）
      const rgbMatch = r === oldRgb.r && g === oldRgb.g && b === oldRgb.b

      // 方法2: 转换为十六进制再比较（原方法）
      const hex =
        '#' +
        ('0' + r.toString(16)).slice(-2) +
        ('0' + g.toString(16)).slice(-2) +
        ('0' + b.toString(16)).slice(-2)
      const hexMatch = hex.toLowerCase() === oldColor.toLowerCase()

      // 记录找到的颜色（用于调试）
      if (totalPixelsChecked <= 100) {
        // 只记录前100个像素的颜色
        colorMatches.add(hex)
      }

      // 如果像素颜色匹配要替换的颜色（使用RGB直接比较）
      if (rgbMatch || hexMatch) {
        // 替换为新颜色
        data[i] = newRgb.r // R
        data[i + 1] = newRgb.g // G
        data[i + 2] = newRgb.b // B
        // alpha值保持不变
        replacedPixelsCount++

        if (replacedPixelsCount <= 5) {
          // 记录前5个替换的像素信息
          console.log(`替换像素 ${replacedPixelsCount}:`, {
            原色: { r, g, b, hex },
            新色: { r: newRgb.r, g: newRgb.g, b: newRgb.b },
            位置: Math.floor(i / 4),
          })
        }
      }
    }
  }

  console.log('颜色替换统计:', {
    总像素数: Math.floor(data.length / 4),
    检查的像素数: totalPixelsChecked,
    替换的像素数: replacedPixelsCount,
    找到的颜色样本: Array.from(colorMatches).slice(0, 10), // 显示前10种颜色
  })

  // 将修改后的图像数据绘制回临时画布
  tempCtx.putImageData(imageData, 0, 0)

  // 创建新的图片对象
  const newImg = new Image()
  newImg.onload = () => {
    backgroundImage.value = newImg
    drawCanvas()
    console.log('背景图片已更新并重新绘制')
  }
  newImg.src = tempCanvas.toDataURL()

  console.log(`背景层颜色替换完成，共替换 ${replacedPixelsCount} 个像素`)
  return replacedPixelsCount
}

// 删除绘制层中的特定颜色
const deleteDrawnColor = (colorToDelete: string) => {
  let deletedCount = 0

  // 遍历所有已绘制的格子，删除指定颜色
  const newDrawnCells = new Map()

  drawnCells.value.forEach((color, cellKey) => {
    if (color.toLowerCase() !== colorToDelete.toLowerCase()) {
      newDrawnCells.set(cellKey, color)
    } else {
      deletedCount++
    }
  })

  // 更新绘制的格子
  drawnCells.value = newDrawnCells

  // 保存到历史记录并重新绘制
  saveToHistory()
  drawCanvas()

  console.log(`绘制层颜色删除完成，共删除 ${deletedCount} 个格子`)
  return deletedCount
}

// 删除背景图层中的特定颜色（替换为背景色）
const deleteBackgroundColor = (colorToDelete: string) => {
  console.log('背景图片状态检查:', {
    backgroundImage: !!backgroundImage.value,
    imageLoaded: imageLoaded.value,
    backgroundImageSrc: backgroundImage.value?.src,
  })

  if (!backgroundImage.value || !imageLoaded.value) {
    console.warn('没有背景图片，无法删除背景颜色')
    return 0
  }

  // 创建临时画布来处理背景图片
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return 0

  // 设置临时画布尺寸为背景图片尺寸
  tempCanvas.width = backgroundImage.value.width
  tempCanvas.height = backgroundImage.value.height

  // 绘制背景图片到临时画布
  tempCtx.drawImage(backgroundImage.value, 0, 0)

  // 获取图像数据
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const data = imageData.data

  let deletedPixelsCount = 0

  // 将背景颜色从十六进制转换为RGB
  const bgRgb = hexToRgba(backgroundColor.value)
  if (!bgRgb) {
    console.error('无效的背景颜色格式:', backgroundColor.value)
    return 0
  }

  // 遍历每个像素，将指定颜色替换为背景颜色
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a > 0) {
      const hex =
        '#' +
        ('0' + r.toString(16)).slice(-2) +
        ('0' + g.toString(16)).slice(-2) +
        ('0' + b.toString(16)).slice(-2)

      // 如果像素颜色匹配要删除的颜色
      if (hex.toLowerCase() === colorToDelete.toLowerCase()) {
        // 替换为背景颜色
        data[i] = bgRgb.r // R
        data[i + 1] = bgRgb.g // G
        data[i + 2] = bgRgb.b // B
        data[i + 3] = bgRgb.a // A
        deletedPixelsCount++
      }
    }
  }

  // 将修改后的图像数据绘制回临时画布
  tempCtx.putImageData(imageData, 0, 0)

  // 创建新的图片对象
  const newImg = new Image()
  newImg.onload = () => {
    backgroundImage.value = newImg
    drawCanvas()
  }
  newImg.src = tempCanvas.toDataURL()

  console.log(`背景层颜色删除完成，共删除 ${deletedPixelsCount} 个像素`)
  return deletedPixelsCount
}

// 综合颜色替换函数（同时处理绘制层和背景层）
const replaceColor = (
  oldColor: string,
  newColor: string,
  targetLayer: 'drawn' | 'background' | 'both' = 'both',
) => {
  let totalReplaced = 0

  if (targetLayer === 'drawn' || targetLayer === 'both') {
    totalReplaced += replaceDrawnColor(oldColor, newColor)
  }

  if (targetLayer === 'background' || targetLayer === 'both') {
    totalReplaced += replaceBackgroundColor(oldColor, newColor)
  }

  return totalReplaced
}

// 综合颜色删除函数（同时处理绘制层和背景层）
const deleteColor = (
  colorToDelete: string,
  targetLayer: 'drawn' | 'background' | 'both' = 'both',
) => {
  let totalDeleted = 0

  if (targetLayer === 'drawn' || targetLayer === 'both') {
    totalDeleted += deleteDrawnColor(colorToDelete)
  }

  if (targetLayer === 'background' || targetLayer === 'both') {
    totalDeleted += deleteBackgroundColor(colorToDelete)
  }

  return totalDeleted
}

// UI操作函数：执行颜色替换
const performColorReplace = () => {
  const oldColor = oldColorToReplace.value
  const newColor = newColorToReplace.value
  let layer = targetLayer.value

  if (oldColor === newColor) {
    return
  }

  // 自动判断目标图层
  const hasDrawnLayer = drawnCells.value.size > 0
  const hasBackgroundLayer = backgroundImage.value && imageLoaded.value

  console.log('自动判断目标图层:', {
    hasDrawnLayer,
    hasBackgroundLayer,
    drawnCellsSize: drawnCells.value.size,
    imageLoaded: imageLoaded.value,
  })

  // 根据实际情况自动选择目标图层
  if (layer === 'both') {
    if (hasDrawnLayer && hasBackgroundLayer) {
      // 两个图层都有数据，保持both不变
      layer = 'both'
    } else if (hasDrawnLayer && !hasBackgroundLayer) {
      // 只有绘制层有数据
      layer = 'drawn'
    } else if (!hasDrawnLayer && hasBackgroundLayer) {
      // 只有背景层有数据
      layer = 'background'
    } else {
      // 两个图层都没有数据
      return
    }
  } else if (layer === 'background' && !hasBackgroundLayer) {
    return
  } else if (layer === 'drawn' && !hasDrawnLayer) {
    return
  }

  const replacedCount = replaceColor(oldColor, newColor, layer)

  let layerText = ''
  switch (layer) {
    case 'drawn':
      layerText = '绘制层'
      break
    case 'background':
      layerText = '背景层'
      break
    case 'both':
      layerText = '绘制层和背景层'
      break
  }

  // 显示替换结果提示
  alert(`颜色替换完成，共替换 ${replacedCount} 个元素（${layerText}）`)
}

// UI操作函数：执行颜色删除
const performColorDelete = () => {
  const colorToDelete = oldColorToReplace.value
  let layer = targetLayer.value

  const confirmed = confirm(`确定要删除颜色 ${colorToDelete} 吗？\n此操作不可撤销！`)
  if (!confirmed) {
    return
  }

  // 自动判断目标图层
  const hasDrawnLayer = drawnCells.value.size > 0
  const hasBackgroundLayer = backgroundImage.value && imageLoaded.value

  console.log('自动判断目标图层:', {
    hasDrawnLayer,
    hasBackgroundLayer,
    drawnCellsSize: drawnCells.value.size,
    imageLoaded: imageLoaded.value,
  })

  // 根据实际情况自动选择目标图层
  if (layer === 'both') {
    if (hasDrawnLayer && hasBackgroundLayer) {
      // 两个图层都有数据，保持both不变
      layer = 'both'
    } else if (hasDrawnLayer && !hasBackgroundLayer) {
      // 只有绘制层有数据
      layer = 'drawn'
    } else if (!hasDrawnLayer && hasBackgroundLayer) {
      // 只有背景层有数据
      layer = 'background'
    } else {
      // 两个图层都没有数据
      return
    }
  } else if (layer === 'background' && !hasBackgroundLayer) {
    return
  } else if (layer === 'drawn' && !hasDrawnLayer) {
    return
  }

  const deletedCount = deleteColor(colorToDelete, layer)

  let layerText = ''
  switch (layer) {
    case 'drawn':
      layerText = '绘制层'
      break
    case 'background':
      layerText = '背景层'
      break
    case 'both':
      layerText = '绘制层和背景层'
      break
  }

  // 显示删除结果提示
  alert(`颜色删除完成，共删除 ${deletedCount} 个元素（${layerText}）`)
}

// 设置当前工具
const setTool = (tool: 'move' | 'brush' | 'eraser' | 'bucket' | 'line' | 'select') => {
  currentTool.value = tool
  // 切换工具时重置直线状态
  if (tool !== 'line') {
    lineStartCell.value = null
    lineEndCell.value = null
    isDrawingLine.value = false
    linePreviewCells.value = []
  }
  // 切换工具时重置选择状态
  if (tool !== 'select') {
    isSelecting.value = false
    isMovingSelection.value = false
    selectionStart.value = null
    selectionEnd.value = null
    selectedArea.value = null
    selectedImageData.value = null
    selectionMoveStart.value = null
    originalSelectedArea.value = null
  }
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
    return
  }
  if (tempGridRows.value < 10 || tempGridRows.value > 2000) {
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
    // 如果图片未加载，设置背景颜色，考虑缩放比例
    const scaledWidth = 4913 * viewportBox.value.scale
    const scaledHeight = 5669 * viewportBox.value.scale
    const scaledOffsetX = viewportBox.value.offsetX * viewportBox.value.scale
    const scaledOffsetY = viewportBox.value.offsetY * viewportBox.value.scale

    ctx.fillStyle = backgroundColor.value
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

  // 绘制预览层
  drawPreviewLayer()
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

  // 高精度计算格子尺寸（考虑缩放）
  const cellWidth = (calculatedWidth.value / canvasConfig.value.gridCols) * viewportBox.value.scale
  const cellHeight =
    (calculatedHeight.value / canvasConfig.value.gridRows) * viewportBox.value.scale

  // 计算网格起始位置（考虑偏移量和缩放）
  const scaledOffsetX = viewportBox.value.offsetX * viewportBox.value.scale
  const scaledOffsetY = viewportBox.value.offsetY * viewportBox.value.scale
  const startX = viewportBox.value.fixedX - scaledOffsetX
  const startY = viewportBox.value.fixedY - scaledOffsetY

  // 只有当缩放值大于等于3时才绘制网格线
  if (viewportBox.value.scale >= 3) {
    // 设置网格线样式
    ctx.strokeStyle = '#cccccc'
    ctx.globalAlpha = 1

    // 设置网格线宽度
    ctx.lineWidth = 0.4

    // 禁用抗锯齿以确保像素完美的网格线
    ctx.imageSmoothingEnabled = false
    ctx.setLineDash([])

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
  }

  // 绘制已填充的格子（确保完全不透明）
  ctx.globalAlpha = 1.0 // 重置透明度为完全不透明
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
      // 使用Math.round确保坐标为整数，避免亚像素渲染导致的边缘色差
      ctx.fillRect(
        Math.round(Math.max(cellX, viewportBox.value.fixedX)),
        Math.round(Math.max(cellY, viewportBox.value.fixedY)),
        Math.round(Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX)),
        Math.round(
          Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - cellY),
        ),
      )
    }
  })

  // 恢复状态（移除裁剪）
  ctx.restore()
}

// 绘制预览层
const drawPreviewLayer = () => {
  if (!previewLayerRef.value) return

  const ctx = previewLayerRef.value.getContext('2d')
  if (!ctx) return

  // 清空预览层画布
  ctx.clearRect(0, 0, calculatedWidth.value, calculatedHeight.value)

  // 如果没有预览格子、没有直线预览且没有选择区域，或者当前工具不支持预览，直接返回
  if (
    (!previewCell.value &&
      linePreviewCells.value.length === 0 &&
      !selectedArea.value &&
      !isSelecting.value) ||
    currentTool.value === 'move' ||
    currentTool.value === 'bucket'
  ) {
    return
  }

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

  // 计算格子尺寸（考虑缩放）
  const cellWidth = (calculatedWidth.value / canvasConfig.value.gridCols) * viewportBox.value.scale
  const cellHeight =
    (calculatedHeight.value / canvasConfig.value.gridRows) * viewportBox.value.scale

  // 计算预览格子的位置（考虑偏移量和缩放）
  const scaledOffsetX = viewportBox.value.offsetX * viewportBox.value.scale
  const scaledOffsetY = viewportBox.value.offsetY * viewportBox.value.scale
  const startX = viewportBox.value.fixedX - scaledOffsetX
  const startY = viewportBox.value.fixedY - scaledOffsetY

  // 设置预览样式
  ctx.globalAlpha = 0.5 // 半透明效果

  // 处理直线工具预览
  if (currentTool.value === 'line' && linePreviewCells.value.length > 0) {
    // 绘制直线预览
    ctx.fillStyle = brushColor.value

    linePreviewCells.value.forEach((cell) => {
      const cellX = startX + cell.col * cellWidth
      const cellY = startY + cell.row * cellHeight

      // 检查预览格子是否在可见区域内
      if (
        cellX + cellWidth >= viewportBox.value.fixedX &&
        cellX <= viewportBox.value.fixedX + viewportBox.value.width &&
        cellY + cellHeight >= viewportBox.value.fixedY &&
        cellY <= viewportBox.value.fixedY + viewportBox.value.height
      ) {
        ctx.fillRect(
          Math.round(Math.max(cellX, viewportBox.value.fixedX)),
          Math.round(Math.max(cellY, viewportBox.value.fixedY)),
          Math.round(
            Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX),
          ),
          Math.round(
            Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - cellY),
          ),
        )
      }
    })

    // 如果有起点，用不同颜色标记起点
    if (lineStartCell.value) {
      const startCellX = startX + lineStartCell.value.col * cellWidth
      const startCellY = startY + lineStartCell.value.row * cellHeight

      if (
        startCellX + cellWidth >= viewportBox.value.fixedX &&
        startCellX <= viewportBox.value.fixedX + viewportBox.value.width &&
        startCellY + cellHeight >= viewportBox.value.fixedY &&
        startCellY <= viewportBox.value.fixedY + viewportBox.value.height
      ) {
        ctx.globalAlpha = 0.8
        ctx.fillStyle = '#00ff00' // 绿色标记起点
        ctx.fillRect(
          Math.round(Math.max(startCellX, viewportBox.value.fixedX)),
          Math.round(Math.max(startCellY, viewportBox.value.fixedY)),
          Math.round(
            Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - startCellX),
          ),
          Math.round(
            Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - startCellY),
          ),
        )
        ctx.globalAlpha = 0.5 // 恢复透明度
      }
    }
  } else if (
    previewCell.value &&
    (currentTool.value === 'brush' ||
      currentTool.value === 'eraser' ||
      currentTool.value === 'line')
  ) {
    // 处理其他工具的预览
    const size = brushSize.value
    const halfSize = Math.floor(size / 2)
    const centerCol = previewCell.value.col
    const centerRow = previewCell.value.row

    // 遍历画笔粗细范围内的所有格子
    for (let col = centerCol - halfSize; col <= centerCol + halfSize; col++) {
      for (let row = centerRow - halfSize; row <= centerRow + halfSize; row++) {
        // 检查格子是否在画布范围内
        if (
          col >= 0 &&
          col < canvasConfig.value.gridCols &&
          row >= 0 &&
          row < canvasConfig.value.gridRows
        ) {
          const cellX = startX + col * cellWidth
          const cellY = startY + row * cellHeight

          // 检查预览格子是否在可见区域内
          if (
            cellX + cellWidth >= viewportBox.value.fixedX &&
            cellX <= viewportBox.value.fixedX + viewportBox.value.width &&
            cellY + cellHeight >= viewportBox.value.fixedY &&
            cellY <= viewportBox.value.fixedY + viewportBox.value.height
          ) {
            if (currentTool.value === 'brush' || currentTool.value === 'line') {
              // 画笔或直线预览：显示即将绘制的颜色
              ctx.fillStyle = brushColor.value
              ctx.fillRect(
                Math.round(Math.max(cellX, viewportBox.value.fixedX)),
                Math.round(Math.max(cellY, viewportBox.value.fixedY)),
                Math.round(
                  Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX),
                ),
                Math.round(
                  Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - cellY),
                ),
              )
            } else if (currentTool.value === 'eraser') {
              // 橡皮擦预览：显示删除效果（用更深的灰色表示，避免与网格线颜色冲突）
              ctx.fillStyle = '#999999'
              ctx.fillRect(
                Math.round(Math.max(cellX, viewportBox.value.fixedX)),
                Math.round(Math.max(cellY, viewportBox.value.fixedY)),
                Math.round(
                  Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX),
                ),
                Math.round(
                  Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - cellY),
                ),
              )

              // 为中心格子添加删除标记（X）
              if (col === centerCol && row === centerRow) {
                ctx.globalAlpha = 0.8
                ctx.strokeStyle = '#666666'
                ctx.lineWidth = Math.max(1, cellWidth * 0.05)
                ctx.beginPath()
                const margin = cellWidth * 0.2
                ctx.moveTo(cellX + margin, cellY + margin)
                ctx.lineTo(cellX + cellWidth - margin, cellY + cellHeight - margin)
                ctx.moveTo(cellX + cellWidth - margin, cellY + margin)
                ctx.lineTo(cellX + margin, cellY + cellHeight - margin)
                ctx.stroke()
                ctx.globalAlpha = 0.5 // 恢复透明度
              }
            }
          }
        }
      }
    }
  } else if (currentTool.value === 'select') {
    // 处理矩形选择工具的预览
    if (previewCell.value) {
      // 显示当前格子预览
      const cellX = startX + previewCell.value.col * cellWidth
      const cellY = startY + previewCell.value.row * cellHeight

      if (
        cellX + cellWidth >= viewportBox.value.fixedX &&
        cellX <= viewportBox.value.fixedX + viewportBox.value.width &&
        cellY + cellHeight >= viewportBox.value.fixedY &&
        cellY <= viewportBox.value.fixedY + viewportBox.value.height
      ) {
        ctx.fillStyle = '#0066ff'
        ctx.fillRect(
          Math.round(Math.max(cellX, viewportBox.value.fixedX)),
          Math.round(Math.max(cellY, viewportBox.value.fixedY)),
          Math.round(
            Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX),
          ),
          Math.round(
            Math.min(cellHeight, viewportBox.value.fixedY + viewportBox.value.height - cellY),
          ),
        )
      }
    }

    // 绘制选择框
    if (isSelecting.value && selectionStart.value && selectionEnd.value) {
      const startCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
      const endCol = Math.max(selectionStart.value.col, selectionEnd.value.col)
      const startRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
      const endRow = Math.max(selectionStart.value.row, selectionEnd.value.row)

      const selectionX = startX + startCol * cellWidth
      const selectionY = startY + startRow * cellHeight
      const selectionWidth = (endCol - startCol + 1) * cellWidth
      const selectionHeight = (endRow - startRow + 1) * cellHeight

      // 绘制选择框边框
      ctx.globalAlpha = 1.0
      ctx.strokeStyle = '#0066ff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(selectionX, selectionY, selectionWidth, selectionHeight)

      // 绘制选择区域的半透明覆盖
      ctx.globalAlpha = 0.2
      ctx.fillStyle = '#0066ff'
      ctx.fillRect(selectionX, selectionY, selectionWidth, selectionHeight)
    } else if (selectedArea.value) {
      // 绘制已选择的区域
      const selectionX = startX + selectedArea.value.startCol * cellWidth
      const selectionY = startY + selectedArea.value.startRow * cellHeight
      const selectionWidth = selectedArea.value.width * cellWidth
      const selectionHeight = selectedArea.value.height * cellHeight

      // 绘制选择框边框
      ctx.globalAlpha = 1.0
      ctx.strokeStyle = '#00aa00'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.strokeRect(selectionX, selectionY, selectionWidth, selectionHeight)

      // 绘制选择区域的半透明覆盖
      ctx.globalAlpha = 0.15
      ctx.fillStyle = '#00aa00'
      ctx.fillRect(selectionX, selectionY, selectionWidth, selectionHeight)

      // 如果正在移动选择区域，显示移动预览
      if (isMovingSelection.value && originalSelectedArea.value) {
        const originalX = startX + originalSelectedArea.value.startCol * cellWidth
        const originalY = startY + originalSelectedArea.value.startRow * cellHeight
        const originalWidth = originalSelectedArea.value.width * cellWidth
        const originalHeight = originalSelectedArea.value.height * cellHeight

        // 绘制原位置的虚线框（表示移动前的位置）
        ctx.globalAlpha = 0.3
        ctx.strokeStyle = '#ff6600'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.strokeRect(originalX, originalY, originalWidth, originalHeight)

        // 在新位置绘制选择区域的图像数据内容
        if (selectedImageData.value && selectedImageData.value.size > 0) {
          ctx.globalAlpha = 0.8
          ctx.setLineDash([]) // 重置虚线

          // 计算移动偏移量
          const deltaCol = selectedArea.value.startCol - originalSelectedArea.value.startCol
          const deltaRow = selectedArea.value.startRow - originalSelectedArea.value.startRow

          // 绘制每个像素的图像数据
          selectedImageData.value.forEach((color, cellKey) => {
            const [colStr, rowStr] = cellKey.split(',')
            const col = parseInt(colStr)
            const row = parseInt(rowStr)

            // 计算新位置
            const newCol = col + deltaCol
            const newRow = row + deltaRow

            // 检查新位置是否在画布范围内
            if (
              newCol >= 0 &&
              newCol < canvasConfig.value.gridCols &&
              newRow >= 0 &&
              newRow < canvasConfig.value.gridRows
            ) {
              const cellX = startX + newCol * cellWidth
              const cellY = startY + newRow * cellHeight

              // 检查是否在可见区域内
              if (
                cellX + cellWidth >= viewportBox.value.fixedX &&
                cellX <= viewportBox.value.fixedX + viewportBox.value.width &&
                cellY + cellHeight >= viewportBox.value.fixedY &&
                cellY <= viewportBox.value.fixedY + viewportBox.value.height
              ) {
                ctx.fillStyle = color
                ctx.fillRect(
                  Math.round(Math.max(cellX, viewportBox.value.fixedX)),
                  Math.round(Math.max(cellY, viewportBox.value.fixedY)),
                  Math.round(
                    Math.min(cellWidth, viewportBox.value.fixedX + viewportBox.value.width - cellX),
                  ),
                  Math.round(
                    Math.min(
                      cellHeight,
                      viewportBox.value.fixedY + viewportBox.value.height - cellY,
                    ),
                  ),
                )
              }
            }
          })
        }
      }
    }
  }

  // 恢复状态
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
    thumbnailCtx.fillRect(cellX, cellY, cellWidth, cellHeight)
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

  // 初始化预览层画布
  const previewCtx = previewLayerRef.value?.getContext('2d')
  if (previewCtx) {
    const previewCanvas = previewLayerRef.value

    // 设置实际画布尺寸
    previewCanvas.width = calculatedWidth.value * devicePixelRatio
    previewCanvas.height = calculatedHeight.value * devicePixelRatio

    // 设置显示尺寸
    previewCanvas.style.width = calculatedWidth.value + 'px'
    previewCanvas.style.height = calculatedHeight.value + 'px'

    // 缩放上下文以匹配设备像素比
    previewCtx.scale(devicePixelRatio, devicePixelRatio)
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

  // 不自动加载背景图片，让用户手动上传
  // loadBackgroundImage()
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

// 检测点击是否在选择区域内
const isPointInSelectedArea = (col: number, row: number) => {
  if (!selectedArea.value) return false

  return (
    col >= selectedArea.value.startCol &&
    col <= selectedArea.value.endCol &&
    row >= selectedArea.value.startRow &&
    row <= selectedArea.value.endRow
  )
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

// 计算直线预览格子（使用Bresenham算法）
const calculateLinePreview = (
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
) => {
  const cells: { col: number; row: number }[] = []

  let x0 = startCol
  let y0 = startRow
  const x1 = endCol
  const y1 = endRow

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    // 为每个线上的点添加粗细效果
    for (let offsetRow = 0; offsetRow < brushSize.value; offsetRow++) {
      for (let offsetCol = 0; offsetCol < brushSize.value; offsetCol++) {
        const newCol = x0 + offsetCol
        const newRow = y0 + offsetRow

        // 检查边界
        if (
          newCol >= 0 &&
          newCol < canvasConfig.value.gridCols &&
          newRow >= 0 &&
          newRow < canvasConfig.value.gridRows
        ) {
          cells.push({ col: newCol, row: newRow })
        }
      }
    }

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

// 绘制直线
const drawLine = (startCol: number, startRow: number, endCol: number, endRow: number) => {
  const lineCells = calculateLinePreview(startCol, startRow, endCol, endRow)

  // 保存当前状态到历史记录
  saveToHistory()

  // 绘制直线上的所有格子
  lineCells.forEach((cell) => {
    const cellKey = `${cell.col},${cell.row}`
    drawnCells.value.set(cellKey, brushColor.value)
  })

  // 重新绘制画布
  drawCanvas()
}

// 连贯绘制格子（处理画笔连贯性）
const paintCellWithContinuity = (col: number, row: number) => {
  if (lastDrawnCell.value && (currentTool.value === 'brush' || currentTool.value === 'eraser')) {
    // 如果有上一个绘制位置，使用插值算法连接两个点
    const cells = drawLineBetweenCells(lastDrawnCell.value.col, lastDrawnCell.value.row, col, row)

    // 绘制所有插值格子，支持画笔粗细
    for (const cell of cells) {
      paintCellsWithBrushSize(cell.col, cell.row, currentTool.value === 'eraser')
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
  if (currentTool.value === 'eraser') {
    // 橡皮擦工具：根据画笔粗细擦除格子
    paintCellsWithBrushSize(col, row, true)
  } else if (currentTool.value === 'brush') {
    // 画笔工具：根据画笔粗细绘制格子
    paintCellsWithBrushSize(col, row, false)
  } else if (currentTool.value === 'bucket') {
    // 油桶填充工具：洪水填充
    floodFill(col, row, brushColor.value)
  }

  // 重新绘制画布
  drawCanvas()
}

// 根据画笔粗细绘制或擦除格子
const paintCellsWithBrushSize = (centerCol: number, centerRow: number, isEraser: boolean) => {
  const size = brushSize.value
  const halfSize = Math.floor(size / 2)

  // 计算绘制区域的起始和结束位置
  const startCol = centerCol - halfSize
  const endCol = centerCol + halfSize
  const startRow = centerRow - halfSize
  const endRow = centerRow + halfSize

  // 遍历绘制区域内的所有格子
  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {
      // 检查格子是否在画布范围内
      if (
        col >= 0 &&
        col < canvasConfig.value.gridCols &&
        row >= 0 &&
        row < canvasConfig.value.gridRows
      ) {
        const cellKey = `${col},${row}`

        if (isEraser) {
          // 擦除格子
          if (drawnCells.value.has(cellKey)) {
            drawnCells.value.delete(cellKey)
          }
        } else {
          // 绘制格子
          drawnCells.value.set(cellKey, brushColor.value)
        }
      }
    }
  }
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
      } else if (currentTool.value === 'line') {
        // 直线工具：开始绘制直线
        const gridCoords = getGridCoordinates(mouseX, mouseY)
        if (gridCoords) {
          if (!isDrawingLine.value) {
            // 第一次点击：设置起点
            lineStartCell.value = { col: gridCoords.col, row: gridCoords.row }
            lineEndCell.value = null
            isDrawingLine.value = true
            linePreviewCells.value = []
          } else {
            // 第二次点击：设置终点并绘制直线
            lineEndCell.value = { col: gridCoords.col, row: gridCoords.row }
            if (lineStartCell.value) {
              drawLine(
                lineStartCell.value.col,
                lineStartCell.value.row,
                gridCoords.col,
                gridCoords.row,
              )
            }
            // 重置直线状态
            lineStartCell.value = null
            lineEndCell.value = null
            isDrawingLine.value = false
            linePreviewCells.value = []
          }
        }
      } else if (currentTool.value === 'select') {
        // 矩形选择工具：检查是否在现有选择区域内点击
        const gridCoords = getGridCoordinates(mouseX, mouseY)
        if (gridCoords) {
          // 检查是否点击在现有选择区域内
          if (selectedArea.value && isPointInSelectedArea(gridCoords.col, gridCoords.row)) {
            // 在选择区域内点击，开始移动选择区域
            isMovingSelection.value = true
            selectionMoveStart.value = { col: gridCoords.col, row: gridCoords.row }
            originalSelectedArea.value = { ...selectedArea.value }
          } else {
            // 在选择区域外点击，开始新的选择
            isSelecting.value = true
            selectionStart.value = { col: gridCoords.col, row: gridCoords.row }
            selectionEnd.value = { col: gridCoords.col, row: gridCoords.row }
            selectedArea.value = null
            selectedImageData.value = null
          }
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
  } else if (
    isSelecting.value &&
    currentTool.value === 'select' &&
    isPointInViewportBox(currentX, currentY)
  ) {
    // 矩形选择工具：更新选择区域
    const gridCoords = getGridCoordinates(currentX, currentY)
    if (gridCoords && selectionStart.value) {
      selectionEnd.value = { col: gridCoords.col, row: gridCoords.row }
      // 重绘预览层以显示选择框
      drawPreviewLayer()
    }
  } else if (
    isMovingSelection.value &&
    currentTool.value === 'select' &&
    isPointInViewportBox(currentX, currentY)
  ) {
    // 移动选择区域
    const gridCoords = getGridCoordinates(currentX, currentY)
    if (gridCoords && selectionMoveStart.value && originalSelectedArea.value) {
      // 计算移动偏移量
      const deltaCol = gridCoords.col - selectionMoveStart.value.col
      const deltaRow = gridCoords.row - selectionMoveStart.value.row

      // 更新选择区域位置
      const newStartCol = originalSelectedArea.value.startCol + deltaCol
      const newStartRow = originalSelectedArea.value.startRow + deltaRow
      const newEndCol = originalSelectedArea.value.endCol + deltaCol
      const newEndRow = originalSelectedArea.value.endRow + deltaRow

      // 检查边界，确保选择区域不超出画布范围
      if (
        newStartCol >= 0 &&
        newEndCol < canvasConfig.value.gridCols &&
        newStartRow >= 0 &&
        newEndRow < canvasConfig.value.gridRows
      ) {
        selectedArea.value = {
          startCol: newStartCol,
          startRow: newStartRow,
          endCol: newEndCol,
          endRow: newEndRow,
          width: originalSelectedArea.value.width,
          height: originalSelectedArea.value.height,
        }

        // 重绘预览层以显示移动后的选择框
        drawPreviewLayer()
      }
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

  // 更新预览层（当鼠标在视窗框内移动时）
  if (
    isPointInViewportBox(currentX, currentY) &&
    !isDrawing.value &&
    !viewportBox.value.isDragging
  ) {
    const gridCoords = getGridCoordinates(currentX, currentY)
    if (gridCoords && (currentTool.value === 'brush' || currentTool.value === 'eraser')) {
      // 更新预览格子位置
      previewCell.value = { col: gridCoords.col, row: gridCoords.row }
      // 重绘预览层
      drawPreviewLayer()
    } else if (gridCoords && currentTool.value === 'line') {
      // 直线工具预览
      if (isDrawingLine.value && lineStartCell.value) {
        // 正在绘制直线，显示从起点到当前位置的预览
        linePreviewCells.value = calculateLinePreview(
          lineStartCell.value.col,
          lineStartCell.value.row,
          gridCoords.col,
          gridCoords.row,
        )
      } else {
        // 还未开始绘制直线，只显示当前格子预览
        previewCell.value = { col: gridCoords.col, row: gridCoords.row }
        linePreviewCells.value = []
      }
      drawPreviewLayer()
    } else if (gridCoords && currentTool.value === 'select') {
      // 矩形选择工具预览
      if (!isSelecting.value) {
        // 还未开始选择，只显示当前格子预览
        previewCell.value = { col: gridCoords.col, row: gridCoords.row }
      }
      drawPreviewLayer()
    } else {
      // 清除预览
      previewCell.value = null
      linePreviewCells.value = []
      drawPreviewLayer()
    }
  } else if (!isPointInViewportBox(currentX, currentY)) {
    // 鼠标移出视窗框，清除预览
    previewCell.value = null
    linePreviewCells.value = []
    drawPreviewLayer()
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

  // 处理矩形选择完成
  if (isSelecting.value && currentTool.value === 'select') {
    isSelecting.value = false
    // 计算选择区域并提取图像数据
    if (selectionStart.value && selectionEnd.value) {
      const startCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
      const endCol = Math.max(selectionStart.value.col, selectionEnd.value.col)
      const startRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
      const endRow = Math.max(selectionStart.value.row, selectionEnd.value.row)

      selectedArea.value = {
        startCol,
        startRow,
        endCol,
        endRow,
        width: endCol - startCol + 1,
        height: endRow - startRow + 1,
      }

      // 提取选择区域的图像数据（包括背景层和绘制层）
      const imageData = new Map()

      // 创建临时画布来获取背景图片的像素数据
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')

      if (tempCtx && backgroundImage.value && imageLoaded.value) {
        // 设置临时画布尺寸
        tempCanvas.width = calculatedWidth.value
        tempCanvas.height = calculatedHeight.value

        // 绘制背景图片到临时画布
        tempCtx.drawImage(
          backgroundImage.value,
          0,
          0,
          calculatedWidth.value,
          calculatedHeight.value,
        )

        // 获取选择区域的像素数据
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const cellKey = `${col},${row}`

            // 优先使用绘制层的数据
            if (drawnCells.value.has(cellKey)) {
              imageData.set(cellKey, drawnCells.value.get(cellKey)!)
            } else {
              // 如果绘制层没有数据，从背景图片获取
              const x = col * gridCellWidth.value
              const y = row * gridCellHeight.value

              // 获取该格子中心点的像素颜色
              const centerX = Math.floor(x + gridCellWidth.value / 2)
              const centerY = Math.floor(y + gridCellHeight.value / 2)

              if (
                centerX >= 0 &&
                centerX < calculatedWidth.value &&
                centerY >= 0 &&
                centerY < calculatedHeight.value
              ) {
                const pixelData = tempCtx.getImageData(centerX, centerY, 1, 1).data
                const r = pixelData[0]
                const g = pixelData[1]
                const b = pixelData[2]
                const a = pixelData[3]

                // 只有当像素不是完全透明时才添加
                if (a > 0) {
                  const color = `rgba(${r}, ${g}, ${b}, ${a / 255})`
                  imageData.set(cellKey, color)
                }
              }
            }
          }
        }
      } else {
        // 如果没有背景图片，只提取绘制层数据
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const cellKey = `${col},${row}`
            if (drawnCells.value.has(cellKey)) {
              imageData.set(cellKey, drawnCells.value.get(cellKey)!)
            }
          }
        }
      }

      selectedImageData.value = imageData
    }
  }

  // 处理选择区域移动完成
  if (isMovingSelection.value && currentTool.value === 'select') {
    isMovingSelection.value = false

    if (selectedArea.value && selectedImageData.value && originalSelectedArea.value) {
      // 保存到历史记录
      saveToHistory()

      // 清除原位置的图像数据
      for (
        let row = originalSelectedArea.value.startRow;
        row <= originalSelectedArea.value.endRow;
        row++
      ) {
        for (
          let col = originalSelectedArea.value.startCol;
          col <= originalSelectedArea.value.endCol;
          col++
        ) {
          const cellKey = `${col},${row}`
          // 如果原来有背景图片数据，用白色覆盖；否则删除绘制层数据
          if (selectedImageData.value.has(cellKey) && !drawnCells.value.has(cellKey)) {
            // 原来是背景图片数据，用白色覆盖
            drawnCells.value.set(cellKey, '#ffffff')
          } else {
            // 原来是绘制层数据，直接删除
            drawnCells.value.delete(cellKey)
          }
        }
      }

      // 在新位置绘制图像数据
      const deltaCol = selectedArea.value.startCol - originalSelectedArea.value.startCol
      const deltaRow = selectedArea.value.startRow - originalSelectedArea.value.startRow

      const newImageData = new Map()
      selectedImageData.value.forEach((color, oldKey) => {
        const [oldColStr, oldRowStr] = oldKey.split(',')
        const oldCol = parseInt(oldColStr)
        const oldRow = parseInt(oldRowStr)
        const newCol = oldCol + deltaCol
        const newRow = oldRow + deltaRow
        const newKey = `${newCol},${newRow}`

        drawnCells.value.set(newKey, color)
        newImageData.set(newKey, color)
      })

      // 更新选择区域的图像数据
      selectedImageData.value = newImageData

      // 重新绘制画布
      drawCanvas()
    }

    // 重置移动状态
    selectionMoveStart.value = null
    originalSelectedArea.value = null
  }

  // 清除预览层（但保持直线工具和矩形选择的状态）
  if (
    (currentTool.value !== 'line' || !isDrawingLine.value) &&
    (currentTool.value !== 'select' || !selectedArea.value)
  ) {
    previewCell.value = null
    linePreviewCells.value = []
  }
  drawPreviewLayer()
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
    // 如果没有背景图片，填充背景颜色
    ctx.fillStyle = backgroundColor.value
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
    // 使用Math.round确保坐标为整数，避免亚像素渲染导致的边缘色差
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(cellWidth), Math.round(cellHeight))
  })
}

// 矩形选择工具的操作函数
const copySelectedArea = () => {
  if (selectedImageData.value) {
    copiedImageData.value = new Map(selectedImageData.value)
    console.log('已复制选择区域')
  }
}

const cutSelectedArea = () => {
  if (selectedImageData.value && selectedArea.value) {
    // 先复制
    copiedImageData.value = new Map(selectedImageData.value)

    // 然后删除原区域
    deleteSelectedArea()
    console.log('已剪切选择区域')
  }
}

const deleteSelectedArea = () => {
  if (selectedArea.value) {
    const { startCol, startRow, width, height } = selectedArea.value

    // 删除选择区域内的所有格子
    for (let row = startRow; row < startRow + height; row++) {
      for (let col = startCol; col < startCol + width; col++) {
        const cellKey = `${col},${row}`
        drawnCells.value.delete(cellKey)
      }
    }

    // 保存到历史记录
    saveToHistory()

    // 重新绘制画布
    drawCanvas()

    console.log('已删除选择区域')
  }
}

const exportSelectedArea = () => {
  if (!selectedArea.value || !selectedImageData.value) return

  const { width, height } = selectedArea.value

  // 创建临时画布
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  // 设置画布尺寸
  const cellWidth = gridCellWidth.value
  const cellHeight = gridCellHeight.value
  tempCanvas.width = width * cellWidth
  tempCanvas.height = height * cellHeight

  // 禁用图像平滑
  tempCtx.imageSmoothingEnabled = false

  // 填充背景颜色
  tempCtx.fillStyle = backgroundColor.value
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // 绘制选择区域的内容
  selectedImageData.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const relativeCol = col - selectedArea.value!.startCol
    const relativeRow = row - selectedArea.value!.startRow

    const x = relativeCol * cellWidth
    const y = relativeRow * cellHeight

    tempCtx.fillStyle = color
    tempCtx.fillRect(x, y, cellWidth, cellHeight)
  })

  // 下载图片
  const link = document.createElement('a')
  link.download = `selection_${width}x${height}.png`
  link.href = tempCanvas.toDataURL()
  link.click()

  console.log('已导出选择区域')
}

const clearSelection = () => {
  selectedArea.value = null
  selectedImageData.value = null
  selectionStart.value = null
  selectionEnd.value = null
  isSelecting.value = false

  // 重新绘制预览层
  drawPreviewLayer()

  console.log('已清除选择')
}

// 粘贴选择区域
const pasteSelectedArea = (targetCol?: number, targetRow?: number) => {
  if (!copiedImageData.value) {
    console.warn('没有可粘贴的内容')
    return
  }

  // 如果没有指定目标位置，使用当前选择区域的位置或画布中心
  let pasteCol = targetCol
  let pasteRow = targetRow

  if (pasteCol === undefined || pasteRow === undefined) {
    if (selectedArea.value) {
      // 使用当前选择区域的位置
      pasteCol = selectedArea.value.startCol
      pasteRow = selectedArea.value.startRow
    } else {
      // 使用画布中心
      pasteCol = Math.floor(canvasConfig.value.gridCols / 2)
      pasteRow = Math.floor(canvasConfig.value.gridRows / 2)
    }
  }

  // 计算复制内容的原始位置范围
  let minCol = Infinity
  let minRow = Infinity
  let maxCol = -Infinity
  let maxRow = -Infinity

  copiedImageData.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    minCol = Math.min(minCol, col)
    minRow = Math.min(minRow, row)
    maxCol = Math.max(maxCol, col)
    maxRow = Math.max(maxRow, row)
  })

  // 计算偏移量
  const offsetCol = pasteCol - minCol
  const offsetRow = pasteRow - minRow

  // 粘贴内容到新位置
  copiedImageData.value.forEach((color, cellKey) => {
    const [col, row] = cellKey.split(',').map(Number)
    const newCol = col + offsetCol
    const newRow = row + offsetRow

    // 检查新位置是否在画布范围内
    if (
      newCol >= 0 &&
      newCol < canvasConfig.value.gridCols &&
      newRow >= 0 &&
      newRow < canvasConfig.value.gridRows
    ) {
      const newCellKey = `${newCol},${newRow}`
      drawnCells.value.set(newCellKey, color)
    }
  })

  // 保存到历史记录
  saveToHistory()

  // 重新绘制画布
  drawCanvas()

  // 更新选择区域到粘贴位置
  const pasteWidth = maxCol - minCol + 1
  const pasteHeight = maxRow - minRow + 1
  selectedArea.value = {
    startCol: pasteCol,
    startRow: pasteRow,
    endCol: pasteCol + pasteWidth - 1,
    endRow: pasteRow + pasteHeight - 1,
    width: pasteWidth,
    height: pasteHeight,
  }

  // 更新选择区域的图像数据
  selectedImageData.value = new Map()
  for (let row = pasteRow; row < pasteRow + pasteHeight; row++) {
    for (let col = pasteCol; col < pasteCol + pasteWidth; col++) {
      const cellKey = `${col},${row}`
      const color = drawnCells.value.get(cellKey)
      if (color) {
        selectedImageData.value.set(cellKey, color)
      }
    }
  }

  // 重新绘制预览层
  drawPreviewLayer()

  console.log('已粘贴选择区域到位置:', pasteCol, pasteRow)
}

// 在指定位置粘贴（用于右键菜单或点击粘贴）
const pasteAtPosition = (event: MouseEvent) => {
  if (!copiedImageData.value) {
    console.warn('没有可粘贴的内容')
    return
  }

  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = (event.clientX - rect.left) / viewportBox.value.scale + viewportBox.value.offsetX
  const y = (event.clientY - rect.top) / viewportBox.value.scale + viewportBox.value.offsetY

  // 转换为格子坐标
  const col = Math.floor(x / gridCellWidth.value)
  const row = Math.floor(y / gridCellHeight.value)

  // 在指定位置粘贴
  pasteSelectedArea(col, row)
}

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  event: null as MouseEvent | null,
})

// 处理右键菜单
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()

  // 如果有复制的内容，显示右键菜单
  if (copiedImageData.value) {
    contextMenu.value = {
      show: true,
      x: event.clientX,
      y: event.clientY,
      event: event,
    }
  }
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenu.value.show = false
}

// 右键菜单粘贴
const contextMenuPaste = () => {
  if (contextMenu.value.event) {
    pasteAtPosition(contextMenu.value.event)
  }
  hideContextMenu()
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

  // 禁用图像平滑以获得像素完美的清晰度
  tempCtx.imageSmoothingEnabled = false

  // 清空画布
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)

  // 绘制背景图片（如果有）
  if (backgroundImage.value && imageLoaded.value) {
    tempCtx.drawImage(backgroundImage.value, 0, 0, tempCanvas.width, tempCanvas.height)
  } else {
    // 如果没有背景图片，填充背景颜色
    tempCtx.fillStyle = backgroundColor.value
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
    // 使用Math.round确保坐标为整数，避免亚像素渲染导致的边缘色差
    tempCtx.fillRect(Math.round(x), Math.round(y), Math.round(cellWidth), Math.round(cellHeight))
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

  // 清空画布（背景颜色）
  tempCtx.fillStyle = backgroundColor.value
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
    // 使用Math.round确保坐标为整数，避免亚像素渲染导致的边缘色差
    tempCtx.fillRect(Math.round(x), Math.round(y), Math.round(cellWidth), Math.round(cellHeight))
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

        // 添加所有颜色（包括白色）
        colors.add(hex)
      }
    }
  } catch (error) {
    console.warn('无法获取完整画布的像素数据:', error)

    // 降级方案：只从已绘制的格子中获取颜色
    drawnCells.value.forEach((color) => {
      if (color) {
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
    return
  }

  // 在控制台输出详细信息
  console.log('画布颜色数组:', colors)
  console.log('颜色数量:', colors.length)
  console.log('已绘制格子数量:', drawnCells.value.size)
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
    } else if (e.key === 'c' && selectedArea.value) {
      e.preventDefault()
      copySelectedArea()
    } else if (e.key === 'x' && selectedArea.value) {
      e.preventDefault()
      cutSelectedArea()
    } else if (e.key === 'v' && copiedImageData.value) {
      e.preventDefault()
      pasteSelectedArea()
    }
  } else if (e.key === 'Delete' && selectedArea.value) {
    e.preventDefault()
    deleteSelectedArea()
  } else if (e.key === 'Escape' && selectedArea.value) {
    e.preventDefault()
    clearSelection()
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

// 浮动工具栏样式
.floating-toolbar {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  background: white;
  border-radius: 0 12px 12px 0;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  max-height: 90vh;
  overflow-y: auto;
  min-width: 60px;

  &.toolbar-hidden {
    transform: translateY(-50%) translateX(-90%);
  }

  .toolbar-toggle {
    position: absolute;
    right: -30px;
    top: 20px;
    width: 30px;
    height: 40px;
    background: white;
    border: none;
    border-radius: 0 8px 8px 0;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #666;
    transition: all 0.2s ease;
    z-index: 1001;

    &:hover {
      background: #f8f9fa;
      color: #333;
    }
  }

  .toolbar-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 280px;
    max-width: 350px;

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
      flex-direction: column;
      gap: 0.5rem;
      margin-left: 0;
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
    .bucket-settings,
    .line-settings,
    .select-settings {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-left: 0;
      padding: 0.75rem;
      background-color: #f8f9fa;
      border-radius: 6px;
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

      .brush-size-control {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-left: 0;

        label {
          font-size: 0.8rem;
          color: #495057;
          margin: 0;
          white-space: nowrap;
        }

        .brush-size-slider {
          width: 80px;
          height: 20px;
          background: #ddd;
          border-radius: 10px;
          outline: none;
          cursor: pointer;

          &::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: #007bff;
            border-radius: 50%;
            cursor: pointer;
            transition: background-color 0.2s;

            &:hover {
              background: #0056b3;
            }
          }

          &::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #007bff;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s;

            &:hover {
              background: #0056b3;
            }
          }
        }

        .brush-size-display {
          font-size: 0.8rem;
          color: #495057;
          font-weight: 600;
          min-width: 35px;
          text-align: center;
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 3px;
        }
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

      .action-btn {
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s;
        width: 100%;

        &:hover {
          background-color: #0056b3;
        }

        &:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
          opacity: 0.6;
        }
      }

      .paste-section {
        margin-top: 1rem;
        padding: 0.75rem;
        background-color: #e8f5e8;
        border-radius: 6px;
        border: 1px solid #c3e6c3;

        .paste-hint {
          margin: 0.5rem 0 0 0;
          font-size: 0.85rem;
          color: #28a745;
          font-style: italic;
        }
      }

      .selection-tips {
        margin-top: 1rem;
        padding: 0.75rem;
        background-color: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #dee2e6;

        .tip-text {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          color: #495057;
          font-weight: 500;
        }

        .shortcut-list {
          margin: 0;
          padding-left: 1.2rem;

          li {
            font-size: 0.85rem;
            color: #6c757d;
            margin-bottom: 0.25rem;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }

      .selection-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .selection-info {
        font-size: 0.8rem;
        color: #666;
        margin-bottom: 0.5rem;

        p {
          margin: 0.25rem 0;
        }
      }
    }

    .history-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-left: 0;
      padding: 0.75rem;
      background-color: #f8f9fa;
      border-radius: 6px;
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
      margin-left: 0;
      padding: 0.75rem;
      background-color: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #dee2e6;

      h4 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: #495057;
        font-weight: 600;
      }

      .grid-controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .grid-input-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        justify-content: space-between;

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
    margin-left: 0;
    transition: margin-left 0.3s ease;
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
    cursor: crosshair;
  }

  &.eraser-cursor {
    cursor: crosshair;
  }

  &.move-cursor {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &.bucket-cursor {
    cursor: crosshair;
  }
}

.grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

.preview-layer-canvas {
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
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;

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
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
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

// 右键菜单样式
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  min-width: 150px;
  padding: 4px 0;

  .context-menu-item {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;
    }

    &:active {
      background-color: #e9ecef;
    }
  }
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1999;
  background: transparent;
}

// 颜色替换工具样式
.color-replace-settings {
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: #fff3cd;
  border-radius: 8px;
  border: 1px solid #ffeaa7;

  h4 {
    margin: 0 0 0.75rem 0;
    color: #856404;
    font-size: 1rem;
    font-weight: 600;
  }

  .background-status {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;

    .warning-text {
      margin: 0 0 0.5rem 0;
      color: #856404;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .upload-btn {
      padding: 0.5rem 1rem;
      background-color: #ffc107;
      color: #212529;
      border: none;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: #e0a800;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  .color-replace-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .color-replace-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;

    label {
      font-size: 0.9rem;
      color: #856404;
      min-width: 60px;
      font-weight: 500;
    }

    .color-picker {
      width: 50px;
      height: 35px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      background: none;
      padding: 0;

      &::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      &::-webkit-color-swatch {
        border: none;
        border-radius: 3px;
      }
    }
  }

  .target-layer-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    label {
      font-size: 0.9rem;
      color: #856404;
      min-width: 80px;
      font-weight: 500;
    }

    .layer-select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
      color: #333;
      font-size: 0.85rem;
      cursor: pointer;
      min-width: 140px;

      &:focus {
        outline: none;
        border-color: #ffc107;
        box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.25);
      }

      option:disabled {
        color: #6c757d;
        background-color: #f8f9fa;
      }
    }
  }

  .color-replace-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;

    .replace-btn {
      padding: 0.5rem 1rem;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;

      &:hover {
        background-color: #218838;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .delete-color-btn {
      padding: 0.5rem 1rem;
      background-color: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;

      &:hover {
        background-color: #c82333;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}
</style>
