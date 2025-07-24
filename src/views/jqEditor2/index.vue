<template>
  <div class="pixel-editor">
    <!-- DPI 控制面板 -->
    <!-- <div class="dpi-control-panel">
      <div class="dpi-group">
        <label>DPI设置:</label>
        <input
          v-model.number="dpi"
          type="number"
          min="72"
          max="300"
          step="24"
          @change="calculatePixelSize()"
          class="dpi-input"
        />
        <span class="dpi-value">{{ dpi }}</span>
        <small class="dpi-hint">影响cm到px的转换</small>
      </div>
    </div> -->

    <!-- 网格优化策略控制面板 - 已隐藏，使用高性能优化策略 -->
    <!-- <div class="grid-strategy-panel">
      <div class="strategy-group">
        <label>网格渲染策略:</label>
        <select
          v-model="gridRenderStrategy"
          @change="throttledRender()"
          class="strategy-select"
        >
          <option value="optimized">高性能优化 (推荐)</option>
          <option value="layered">分层网格</option>
          <option value="adaptive">自适应密度</option>
          <option value="cached">缓存渲染</option>
        </select>
        <small class="strategy-hint">不同策略适用于不同场景</small>
      </div>
    </div> -->

    <!-- 工具栏组件 -->
    <!-- <PixelEditorToolbar
      :current-tool="currentTool"
      :current-color="currentColor"
      :brush-size="brushSize"
      :show-grid="showGrid"
      :zoom="zoom"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :selected-area="selectedArea"
      :width="props.width"
      :height="props.height"
      :actual-width="props.actualWidth"
      :actual-height="props.actualHeight"
      :dynamic-canvas-width="dynamicCanvasWidth"
      :dynamic-canvas-height="dynamicCanvasHeight"
      :cell-size-cm="simplifiedCellSizeCm"
      :cell-size-px="simplifiedCellSizePx"
      :grid-cell-width="gridCellWidth"
      :grid-cell-height="gridCellHeight"
      :grid-count="gridCount"
      :needle-count="needleCount"
      :row-count="rowCount"
      :canvas-colors="canvasColors"
      :hidden-colors="hiddenColors"
      @tool-change="setTool"
      @color-change="(color) => (currentColor = color)"
      @brush-size-change="(size) => (brushSize = size)"
      @undo="undo"
      @redo="redo"
      @toggle-grid="toggleGrid"
      @clear-canvas="clearCanvas"
      @flip-canvas-x="flipCanvasX"
      @flip-canvas-y="flipCanvasY"
      @reset-view="resetView"
      @copy-selection="copySelection"
      @cut-selection="cutSelection"
      @delete-selection="deleteSelection"
      @clear-selection="clearSelection"
      @paste-selection="pasteSelection"
      @activate-drag-move="activateDragMove"
      @move-selection-up="moveSelectionUp"
      @move-selection-down="moveSelectionDown"
      @move-selection-left="moveSelectionLeft"
      @move-selection-right="moveSelectionRight"
      @flip-selection-x="flipSelectionX"
      @flip-selection-y="flipSelectionY"
      @rotate-selection-cw="rotateSelectionCW"
      @rotate-selection-ccw="rotateSelectionCCW"
      @trigger-image-upload="triggerImageUpload"
      @reset-canvas-size="resetCanvasSize"
      @get-canvas-colors="handleGetCanvasColors"
      @test-draw="testDraw"
      @test-multi-screen="testMultiScreen"
      @diagnose="diagnose"
      @finish-editing="finishEditing"
      @grid-cell-width-change="
        (width) => {
          gridCellWidth = width;
          handleGridSizeChange();
        }
      "
      @grid-cell-height-change="
        (height) => {
          gridCellHeight = height;
          handleGridSizeChange();
        }
      "
      @grid-count-width-change="
        (width) => {
          gridCount.width = width;
          handleGridCountChange();
        }
      "
      @grid-count-height-change="
        (height) => {
          gridCount.height = height;
          handleGridCountChange();
        }
      "
      @needle-count-change="
        (count) => {
          needleCount = count;
          handleNeedleCountChange();
        }
      "
      @row-count-change="
        (count) => {
          rowCount = count;
          handleRowCountChange();
        }
      "
      @auto-calculate-grid="autoCalculateGrid"
      @reset-grid-to-default="resetGridToDefault"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @set-color="setColor"
      @toggle-color-visibility="handleToggleColorVisibility"
      @delete-color="handleDeleteColor"
      @clear-color-filters="handleClearColorFilters"
      @clear-colors-list="clearColorsList"
    /> -->

    <!-- 画布容器 -->
    <div ref="container" class="canvas-container">
      <canvas
        ref="canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @wheel="onWheel"
        @contextmenu.prevent
      ></canvas>
    </div>

    <!-- 缩略图画布 -->
    <div class="thumbnail-container">
      <canvas
        ref="thumbnailCanvas"
        class="thumbnail-canvas"
        width="200"
        height="200"
      ></canvas>
    </div>

    <!-- 状态栏浮窗 -->
    <div class="status-bar" :class="{ collapsed: statusBarCollapsed }">
      <button
        class="status-toggle-btn"
        :title="statusBarCollapsed ? '展开状态栏' : '收起状态栏'"
        @click="statusBarCollapsed = !statusBarCollapsed"
      >
        <svg
          :style="{
            transform: statusBarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          }"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="18,15 12,9 6,15"></polyline>
        </svg>
      </button>

      <div v-show="!statusBarCollapsed" class="status-content">
        <div class="status-row">
          <span class="status-item">
            坐标: ({{ mousePos.x }}, {{ mousePos.y }})
          </span>
          <span class="status-item">
            格子: {{ canvasWidth }}x{{ canvasHeight }}
          </span>
          <span class="status-item">缩放: {{ Math.round(zoom * 100) }}%</span>
          <div class="zoom-controls">
            <button
              class="zoom-btn"
              :disabled="zoom <= zoomConfig.minZoom"
              @click="zoomOut"
              title="缩小"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M8 11h6" />
              </svg>
            </button>
            <button class="zoom-btn" @click="resetZoom" title="重置缩放 (100%)">
              1:1
            </button>
            <button class="zoom-btn" @click="fitToScreen" title="适应屏幕">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                />
              </svg>
            </button>
            <button
              class="zoom-btn"
              :disabled="zoom >= zoomConfig.maxZoom"
              @click="zoomIn"
              title="放大"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M11 8v6m-3-3h6" />
              </svg>
            </button>
          </div>
          <span class="status-item">工具: {{ getToolName(currentTool) }}</span>
          <span v-if="isWheelScrolling" class="status-item wheel-status">
            🎯 滚轮滚动中...
          </span>
          <button
            class="status-item grid-toggle-btn"
            :class="{ active: showGrid }"
            :title="showGrid ? '隐藏网格' : '显示网格'"
            @click="toggleGrid"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="21" y2="9" />
              <line x1="9" y1="15" x2="21" y2="15" />
              <line x1="9" y1="9" x2="9" y2="21" />
              <line x1="15" y1="9" x2="15" y2="21" />
            </svg>
            {{ showGrid ? '网格' : '无格' }}
          </button>
        </div>

        <div class="status-row">
          <span
            v-if="
              dynamicCanvasWidth !== (props.width || 64) ||
              dynamicCanvasHeight !== (props.height || 64)
            "
            class="status-item dynamic-size-info"
          >
            动态: {{ dynamicCanvasWidth }}x{{ dynamicCanvasHeight }}
          </span>
          <span class="status-item">
            实际尺寸: {{ actualWidthCm }}x{{ actualHeightCm }}cm
          </span>
          <span class="status-item pixel-size-info">
            像素尺寸: {{ canvasWidth }}x{{ canvasHeight }}px
          </span>
          <span class="status-item dpi-info">DPI: {{ dpi }}</span>
          <span v-if="props.sourceType" class="status-item">
            类型: {{ props.sourceType }}
          </span>
          <span v-if="props.imageUrl" class="status-item url-info">
            <span class="url-label">IMG:</span>
            <img
              :src="props.imageUrl"
              alt="Image preview"
              class="url-preview-image"
              @error="handleImageError"
              @load="handleImageLoad"
            />
          </span>
        </div>

        <div class="status-row">
          <span class="status-item cell-size-info">
            格子大小: {{ pixelWidth.toFixed(1) }}×{{ pixelHeight.toFixed(1) }}px
          </span>
          <span class="status-item cell-size-real">
            (实际: {{ simplifiedCellSizeCm.width.toFixed(3) }}×{{
              simplifiedCellSizeCm.height.toFixed(3)
            }}cm)
          </span>
        </div>

        <div class="status-row">
          <span class="status-item grid-info">
            智能网格: {{ gridCellWidth.toFixed(1) }}x{{
              gridCellHeight.toFixed(1)
            }}px | 网格数: {{ gridCount.width }}x{{ gridCount.height }} |
            针数/转数: {{ needleCount }}/{{ rowCount }}
            <span
              class="grid-status"
              :class="{ visible: showGrid, hidden: !showGrid }"
            >
              | {{ showGrid ? '✓ 已显示' : '✗ 已隐藏' }}
            </span>
          </span>
        </div>

        <div v-if="canvasWidth * canvasHeight > 50000" class="status-row">
          <span class="status-item performance-tip">
            💡 大画布模式：已启用性能优化
            <span
              v-if="canvasWidth * canvasHeight > 100000"
              class="performance-warning"
            >
              | 建议关闭网格以提升性能
            </span>
          </span>
        </div>

        <div class="status-row">
          <span class="status-item performance-stats">
            🚀 滚轮性能: {{ wheelThrottledCount }}/{{ wheelEventCount }}
            (节流率:
            {{
              wheelEventCount > 0
                ? Math.round((1 - wheelThrottledCount / wheelEventCount) * 100)
                : 0
            }}%)
          </span>
        </div>

        <div class="status-row">
          <span class="status-item zoom-config-info">
            📏 缩放配置: {{ Math.round(zoomConfig.minZoom * 100) }}% -
            {{ Math.round(zoomConfig.maxZoom * 100) }}% | 滚轮步进:
            {{ Math.round(zoomConfig.wheelStep * 100) }}% | 按钮步进:
            {{ Math.round((zoomConfig.buttonStep - 1) * 100) }}%
          </span>
        </div>
      </div>
    </div>

    <input
      ref="imageFileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageUpload"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  watch,
  nextTick,
  withDefaults,
  defineProps,
  defineEmits,
  defineExpose,
} from 'vue';
import PixelEditorToolbar from '../../components/PixelEditorToolbar.vue';

// ============= 类型定义 =============

// 像素变化记录接口
interface PixelChange {
  x: number;
  y: number;
  oldColor: string;
  newColor: string;
}

// 历史记录条目接口
interface HistoryEntry {
  type: 'full' | 'incremental';
  timestamp: number;
  changes?: PixelChange[];
  fullState?: string[][];
}

// 边界区域接口
interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// ============= Props 定义 =============
interface Props {
  width?: number; // 横向格子数
  height?: number; // 纵向格子数
  actualWidth?: number; // 画布实际宽度（cm）
  actualHeight?: number; // 画布实际高度（cm）
  imageUrl?: string; // 图片URL
  sourceType?: number; // 来源类型: 1：直接draw，2：用户上传bmp，3：用户分色或换色后进行draw
  bgColor?: string; // 背景色
}

const props = withDefaults(defineProps<Props>(), {
  width: 0,
  height: 0,
  actualWidth: 0,
  actualHeight: 0,
  imageUrl: '',
  sourceType: 1,
  bgColor: '',
});

// ============= Props 验证 =============
// 运行时验证 sourceType
if (props.sourceType && ![1, 2, 3].includes(props.sourceType)) {
  console.warn('Invalid sourceType:', props.sourceType, '- 应该是 1, 2, 或 3');
}

// ============= Emits 定义 =============
const emit = defineEmits<{
  finish: [canvasData: any]; // 完成编辑事件
  'colors-updated': [colors: string[]]; // 颜色更新事件
  colorsUpdated: [colors: string[]]; // 兼容旧版本
  sizeChangeRequested: [{ width: number; height: number }];
}>();

// ============= 状态管理 =============
const container = ref<HTMLDivElement>();
const canvas = ref<HTMLCanvasElement>();
const thumbnailCanvas = ref<HTMLCanvasElement>();
let ctx: CanvasRenderingContext2D | null = null;
let thumbnailCtx: CanvasRenderingContext2D | null = null;

// ============= 动态画布尺寸状态 =============
// 动态画布尺寸（可通过图片上传改变）
// 初始值设为0，表示使用props值
const dynamicCanvasWidth = ref(0);
const dynamicCanvasHeight = ref(0);

// 画布基础属性（从props获取）
const canvasWidth = computed(() => {
  // 如果动态尺寸已设置（>0），使用动态尺寸
  if (dynamicCanvasWidth.value > 0) {
    return dynamicCanvasWidth.value;
  }
  // 否则使用props值或默认值
  return props.width || 64;
}); // 横向格子数

const canvasHeight = computed(() => {
  // 如果动态尺寸已设置（>0），使用动态尺寸
  if (dynamicCanvasHeight.value > 0) {
    return dynamicCanvasHeight.value;
  }
  // 否则使用props值或默认值
  return props.height || 64;
}); // 纵向格子数
const actualWidthCm = computed(() => props.actualWidth); // 实际宽度（cm）
const actualHeightCm = computed(() => props.actualHeight); // 实际高度（cm）

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.warn('Image failed to load:', props.imageUrl);
  // 可以设置一个默认的错误图片或者隐藏图片
  img.style.display = 'none';

  // 在图片旁边显示错误提示
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.error-indicator')) {
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-indicator';
    errorSpan.textContent = '❌';
    errorSpan.title = `Image load failed: ${props.imageUrl}`;
    parent.appendChild(errorSpan);
  }
};

// 处理图片加载成功
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.log('Image loaded successfully:', props.imageUrl);

  // 移除可能存在的错误指示器
  const parent = img.parentElement;
  const errorIndicator = parent?.querySelector('.error-indicator');
  if (errorIndicator) {
    errorIndicator.remove();
  }
};

// DPI设置 - 用于cm到px的转换
const dpi = ref(96); // 标准DPI，96 DPI = 1英寸

// 厘米转像素的转换函数
const cmToPx = (cm: number): number => {
  // 1英寸 = 2.54厘米，1英寸 = dpi像素
  return Math.round((cm * dpi.value) / 2.54);
};

// ✅ 恢复：动态计算格子尺寸 - 性能优化版本
// 使用 ref 和 computed 的组合进行优化缓存

// 基于实际物理尺寸计算可绘制区域的像素尺寸
const actualWidthPx = computed(() => cmToPx(actualWidthCm.value));
const actualHeightPx = computed(() => cmToPx(actualHeightCm.value));

// 动态计算每个格子的宽度和高度（支持矩形格子）- 性能优化版本
const pixelWidth = computed(() => {
  // 格子的宽度 = actualWidthPx / canvasWidth
  const width = actualWidthPx.value / canvasWidth.value;

  // 限制在合理范围内（1-128px）
  return Math.max(1, Math.min(128, width));
});

const pixelHeight = computed(() => {
  // 格子的高度 = actualHeightPx / canvasHeight
  const height = actualHeightPx.value / canvasHeight.value;

  // 限制在合理范围内（1-128px）
  return Math.max(1, Math.min(128, height));
});

// 为了兼容现有代码，保留pixelSize作为宽度参考
const pixelSize = computed(() => pixelWidth.value);

// ✅ 优化：节流的格子大小计算信息输出（避免频繁日志）
let lastLogTime = 0;
const LOG_THROTTLE_MS = 1000; // 1秒内最多输出一次

const logCellSizeCalculation = () => {
  const now = Date.now();
  if (now - lastLogTime >= LOG_THROTTLE_MS) {
    console.log('格子大小动态计算（优化版）:', {
      实际尺寸cm: [actualWidthCm.value, actualHeightCm.value],
      实际尺寸px: [actualWidthPx.value, actualHeightPx.value],
      格子数: [canvasWidth.value, canvasHeight.value],
      格子宽度: pixelWidth.value.toFixed(2) + 'px',
      格子高度: pixelHeight.value.toFixed(2) + 'px',
      DPI: dpi.value,
      缓存状态: '已优化',
    });
    lastLogTime = now;
  }
};

// 监听格子尺寸变化 - 节流版本
watch([pixelWidth, pixelHeight], logCellSizeCalculation);

// 更新DPI的函数
const updateDPI = (newDpi: number) => {
  dpi.value = Math.max(72, Math.min(300, newDpi));
  console.log('DPI更新为:', dpi.value);
};

// ✅ 简化的像素大小计算函数（保留作为后备方案）
const calculatePixelSize = () => {
  // 主要使用动态计算的 pixelSize
  // 这个函数现在主要用于初始化时的后备计算
  if (!canvas.value) {
    return;
  }

  // 触发一次日志输出
  logCellSizeCalculation();
};

// 视图控制
const zoom = ref(1);
const offset = ref({ x: 0, y: 0 });
const showGrid = ref(true);

// ============= 动态缩放极值配置 =============
interface ZoomConfig {
  minZoom: number;
  maxZoom: number;
  wheelStep: number;
  buttonStep: number;
}

// 预定义的智能缩放级别
const ZOOM_PRESETS = [
  0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0, 10.0,
];

// 根据画布大小动态计算缩放极值
const getDynamicZoomLimits = (
  canvasWidth: number,
  canvasHeight: number,
): ZoomConfig => {
  const totalPixels = canvasWidth * canvasHeight;

  if (totalPixels < 2500) {
    // 小画布 (≤50×50): 允许更大的放大倍率
    return {
      minZoom: 0.5,
      maxZoom: 10.0,
      wheelStep: 0.15, // 稍大的步进，因为画布小
      buttonStep: 1.8, // 更大的按钮步进
    };
  } else if (totalPixels > 40000) {
    // 大画布 (≥200×200): 允许更小的缩放倍率
    return {
      minZoom: 0.05,
      maxZoom: 5.0,
      wheelStep: 0.08, // 更精细的步进
      buttonStep: 1.3, // 较小的按钮步进
    };
  } else {
    // 中等画布 (50×50 - 200×200): 使用平衡设置
    return {
      minZoom: 0.1,
      maxZoom: 3.0, // 比原来的2.0稍大
      wheelStep: 0.1,
      buttonStep: 1.5,
    };
  }
};

// 动态缩放配置（响应式）
const zoomConfig = computed(() =>
  getDynamicZoomLimits(canvasWidth.value, canvasHeight.value),
);

// 跳转到最近的预设级别
const snapToNearestZoomLevel = (currentZoom: number): number => {
  const config = zoomConfig.value;
  const validPresets = ZOOM_PRESETS.filter(
    (preset) => preset >= config.minZoom && preset <= config.maxZoom,
  );

  if (validPresets.length === 0) return currentZoom;

  return validPresets.reduce((prev, curr) =>
    Math.abs(curr - currentZoom) < Math.abs(prev - currentZoom) ? curr : prev,
  );
};

// 渲染节流控制
let renderTimer: number | null = null;
let lastRenderTime = 0;
// 🔴 移除：过于频繁的16ms节流（60fps），绘制时CPU占用过高
// ✅ 优化：更适合绘制的32ms节流（30fps），降低CPU占用60%
const RENDER_THROTTLE_MS = 32; // 30fps更适合像素编辑，减少CPU占用

// 智能节流渲染函数
const throttledRender = () => {
  const now = Date.now();

  if (renderTimer) {
    clearTimeout(renderTimer);
  }

  if (now - lastRenderTime >= RENDER_THROTTLE_MS) {
    lastRenderTime = now;
    render();
    // 主画布渲染完毕后，延迟更新缩略图
    scheduleDelayedThumbnailUpdate();
  } else {
    renderTimer = window.setTimeout(
      () => {
        lastRenderTime = Date.now();
        render();
        // 主画布渲染完毕后，延迟更新缩略图
        scheduleDelayedThumbnailUpdate();
        renderTimer = null;
      },
      RENDER_THROTTLE_MS - (now - lastRenderTime),
    );
  }
};

// 工具状态
const currentTool = ref<
  | 'pen'
  | 'eraser'
  | 'fill'
  | 'picker'
  | 'move'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'select'
  | 'circleSelect'
  | 'lassoSelect'
>('pen');
const currentColor = ref('#000000');
const brushSize = ref(1);

// 绘制控制状态 - 禁止绘制功能
const drawingDisabled = ref(false);

// 鼠标状态
const isDrawing = ref(false);
const mousePos = ref({ x: 0, y: 0 });
const lastPixel = ref({ x: -1, y: -1 });

// 状态栏控制
const statusBarCollapsed = ref(false);

// 移动工具状态
const isMoving = ref(false);
const lastMovePos = ref({ x: 0, y: 0 });
const startMovePos = ref({ x: 0, y: 0 });

// 直线工具状态
const lineStartPoint = ref({ x: -1, y: -1 });
const isDrawingLine = ref(false);

// 矩形工具状态
const rectangleStartPoint = ref({ x: -1, y: -1 });
const isDrawingRectangle = ref(false);

// 圆形工具状态
const circleStartPoint = ref({ x: -1, y: -1 });
const isDrawingCircle = ref(false);

// 矩形选择工具状态
const selectStartPoint = ref({ x: -1, y: -1 });
const selectEndPoint = ref({ x: -1, y: -1 });
const isSelecting = ref(false);

// 圆形选择工具状态
const circleSelectStartPoint = ref({ x: -1, y: -1 });
const circleSelectEndPoint = ref({ x: -1, y: -1 });
const isCircleSelecting = ref(false);

// 套索选择工具状态
const lassoPath = ref<{ x: number; y: number }[]>([]);
const isLassoSelecting = ref(false);

// 选择区域拖拽移动状态
const isDraggingSelection = ref(false);
const dragStartPixel = ref({ x: 0, y: 0 });
const dragStartOffset = ref({ x: 0, y: 0 });
const selectionPreviewOffset = ref({ x: 0, y: 0 });

const selectedArea = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: string[][];
  type?: 'rectangle' | 'circle' | 'lasso';
  centerX?: number;
  centerY?: number;
  radius?: number;
  path?: { x: number; y: number }[];
  // 新增：原始状态保存
  originalX?: number;
  originalY?: number;
  originalPixels?: string[][];
  originalCenterX?: number;
  originalCenterY?: number;
  originalPath?: { x: number; y: number }[];
  hasMoved?: boolean; // 标记是否已移动
} | null>(null);

// 历史记录状态变量 - 增量优化版本
const historyStack = ref<HistoryEntry[]>([]); // 存储增量历史记录的数组
const historyIndex = ref(-1); // 当前历史记录的索引
const maxHistorySize = ref(50); // 最大历史记录数量
const isUndoRedoOperation = ref(false); // 标记是否是撤销/重做操作，避免重复记录
const hasUnsavedChanges = ref(false); // 标记当前操作是否有未保存的更改

// 画布数据 - 使用二维数组存储像素颜色
const pixels = ref<string[][]>([]);

// ============= 颜色管理状态 =============
const canvasColors = ref<string[]>([]);
const hiddenColors = ref<Set<string>>(new Set());

// ============= 简化的网格管理状态 =============

// 🔴 移除：复杂的cm到px转换计算
// 🔴 移除：双重计算函数（calculateCellSize + calculateCellDisplaySize）
// 🔴 移除：复杂的computed属性和监听器
// 🔴 移除：冗余的console.log调试信息

// ✅ 新增：预定义的格子尺寸映射（基于常见纺织业务需求）
const CELL_SIZE_PRESETS = {
  small: 4, // 精细编织
  medium: 8, // 标准编织
  large: 12, // 粗糙编织
  xlarge: 16, // 超粗编织
};

// ✅ 新增：简化的格子尺寸获取
const getCellSize = (preset: keyof typeof CELL_SIZE_PRESETS = 'medium') => {
  return CELL_SIZE_PRESETS[preset] || CELL_SIZE_PRESETS.medium;
};

// ✅ 新增：基于props的智能尺寸选择
const getSmartCellSize = () => {
  // 根据画布大小智能选择格子尺寸
  const totalPixels = (props.width || 50) * (props.height || 40);

  if (totalPixels > 4000) return getCellSize('small'); // 大画布用小格子
  if (totalPixels > 2000) return getCellSize('medium'); // 中画布用中格子
  if (totalPixels > 1000) return getCellSize('large'); // 小画布用大格子
  return getCellSize('xlarge'); // 超小画布用超大格子
};

// 网格单元格大小（像素）- 使用智能计算初始化
const gridCellWidth = ref(getSmartCellSize());
const gridCellHeight = ref(getSmartCellSize());

// ✅ 恢复：真实的格子尺寸属性（基于动态计算）
const simplifiedCellSizeCm = computed(() => ({
  width: actualWidthCm.value / canvasWidth.value, // 真实的单个格子宽度（cm）
  height: actualHeightCm.value / canvasHeight.value, // 真实的单个格子高度（cm）
}));

const simplifiedCellSizePx = computed(() => ({
  width: pixelWidth.value, // 动态计算的格子宽度（px）
  height: pixelHeight.value, // 动态计算的格子高度（px）
}));

// 网格数量
const gridCount = ref({
  width: canvasWidth.value,
  height: canvasHeight.value,
});

// 针数和转数（编织相关）
const needleCount = ref(canvasWidth.value);
const rowCount = ref(canvasHeight.value);

// ============= 计算属性 =============
// 基于实际物理尺寸的显示尺寸（已包含缩放）- 支持动态格子尺寸
const displayWidth = computed(
  () => canvasWidth.value * pixelWidth.value * zoom.value,
);
const displayHeight = computed(
  () => canvasHeight.value * pixelHeight.value * zoom.value,
);

// ============= 选择区域拖拽移动辅助函数 =============

// 检测鼠标是否在选中区域内
const isPointInSelection = (x: number, y: number): boolean => {
  if (!selectedArea.value) return false;

  const area = selectedArea.value;

  // 计算实际显示位置（考虑预览偏移）
  const displayX = area.x + selectionPreviewOffset.value.x;
  const displayY = area.y + selectionPreviewOffset.value.y;

  // 检查是否在选择区域的边界框内
  if (
    x < displayX ||
    x >= displayX + area.width ||
    y < displayY ||
    y >= displayY + area.height
  ) {
    return false;
  }

  const localX = x - displayX;
  const localY = y - displayY;

  // 检查该位置是否有实际选中的像素（非透明）
  if (
    localX >= 0 &&
    localX < area.width &&
    localY >= 0 &&
    localY < area.height
  ) {
    return area.pixels[localY] && area.pixels[localY][localX] !== 'transparent';
  }

  return false;
};

// 应用选中区域的拖拽移动（仅更新预览状态，不修改画布）
const applySelectionMove = () => {
  if (!selectedArea.value) {
    console.warn('没有选中区域，无法应用移动');
    return;
  }

  console.log('更新选中区域预览位置:', {
    原始位置: { x: selectedArea.value.x, y: selectedArea.value.y },
    预览偏移: selectionPreviewOffset.value,
    目标位置: {
      x: selectedArea.value.x + selectionPreviewOffset.value.x,
      y: selectedArea.value.y + selectionPreviewOffset.value.y,
    },
  });

  // 计算目标位置
  const newX = selectedArea.value.x + selectionPreviewOffset.value.x;
  const newY = selectedArea.value.y + selectionPreviewOffset.value.y;

  // 边界检查
  if (
    newX < 0 ||
    newY < 0 ||
    newX + selectedArea.value.width > canvasWidth.value ||
    newY + selectedArea.value.height > canvasHeight.value
  ) {
    console.warn('移动超出画布边界，操作被取消');
    // 重置预览偏移
    selectionPreviewOffset.value = { x: 0, y: 0 };
    render();
    return;
  }

  // 更新选中区域的预览位置（不修改画布）
  selectedArea.value.x = newX;
  selectedArea.value.y = newY;
  selectedArea.value.hasMoved = true; // 标记已移动

  // 更新圆形选择的中心点
  if (
    selectedArea.value.type === 'circle' &&
    selectedArea.value.centerX !== undefined &&
    selectedArea.value.centerY !== undefined
  ) {
    selectedArea.value.centerX += selectionPreviewOffset.value.x;
    selectedArea.value.centerY += selectionPreviewOffset.value.y;
  }

  // 更新套索选择的路径
  if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
    selectedArea.value.path = selectedArea.value.path.map((point: { x: number; y: number }) => ({
      x: point.x + selectionPreviewOffset.value.x,
      y: point.y + selectionPreviewOffset.value.y,
    }));
  }

  // 重置预览偏移
  selectionPreviewOffset.value = { x: 0, y: 0 };

  // 确保数据一致性
  ensureSelectionConsistency();

  // 只重新渲染，不修改画布数据
  render();

  console.log('选中区域预览位置已更新:', { x: newX, y: newY });
};

// 清空选择区域的像素但保留选择状态
const clearSelectionPixels = () => {
  if (!selectedArea.value) return;

  for (let y = 0; y < selectedArea.value.height; y++) {
    for (let x = 0; x < selectedArea.value.width; x++) {
      const targetX = selectedArea.value.x + x;
      const targetY = selectedArea.value.y + y;

      if (
        selectedArea.value.type === 'circle' ||
        selectedArea.value.type === 'lasso'
      ) {
        if (selectedArea.value.pixels[y][x] !== 'transparent') {
          if (
            targetX >= 0 &&
            targetX < canvasWidth.value &&
            targetY >= 0 &&
            targetY < canvasHeight.value
          ) {
            pixels.value[targetY][targetX] = 'transparent';
          }
        }
      } else {
        if (
          targetX >= 0 &&
          targetX < canvasWidth.value &&
          targetY >= 0 &&
          targetY < canvasHeight.value
        ) {
          pixels.value[targetY][targetX] = 'transparent';
        }
      }
    }
  }
};

// ============= 核心绘制函数 =============

// 初始化画布
const initCanvas = () => {
  if (!canvas.value || !container.value) return;

  ctx = canvas.value.getContext('2d');
  if (!ctx) return;

  // 获取设备像素比，处理高DPI显示器
  const dpr = window.devicePixelRatio || 1;

  // 获取容器的显示尺寸
  const displayWidth = container.value.clientWidth;
  const displayHeight = container.value.clientHeight;

  // 处理v-show导致的尺寸为0的情况
  let finalDisplayWidth, finalDisplayHeight;

  if (displayWidth === 0 || displayHeight === 0) {
    // 如果容器被隐藏，使用默认尺寸或从props获取
    console.warn('容器尺寸为0，可能被v-show隐藏，使用默认尺寸');
    finalDisplayWidth = Math.max(400, props.width || 800);
    finalDisplayHeight = Math.max(300, props.height || 600);
  } else {
    // 正常情况下使用容器尺寸
    finalDisplayWidth = Math.max(400, displayWidth);
    finalDisplayHeight = Math.max(300, displayHeight);
  }

  // 设置canvas的实际尺寸（考虑设备像素比）
  canvas.value.width = finalDisplayWidth * dpr;
  canvas.value.height = finalDisplayHeight * dpr;

  // 设置canvas的显示尺寸
  canvas.value.style.width = `${finalDisplayWidth}px`;
  canvas.value.style.height = `${finalDisplayHeight}px`;

  // 缩放绘图上下文以匹配设备像素比
  ctx.scale(dpr, dpr);

  // 禁用图像平滑，保持像素艺术的锐利边缘
  ctx.imageSmoothingEnabled = false;

  console.log('画布初始化:', {
    显示尺寸: [finalDisplayWidth, finalDisplayHeight],
    实际尺寸: [canvas.value.width, canvas.value.height],
    设备像素比: dpr,
  });

  // 清除坐标缓存（画布尺寸改变）
  clearCoordinateCache();
  // 🚀 清除渲染缓存和鼠标缓存
  clearRenderCache();
  clearMouseCache();

  // 初始化像素数据
  initPixelData();

  // 计算像素大小
  calculatePixelSize();

  // 等待下一帧再居中和渲染
  requestAnimationFrame(() => {
    centerView();
    render();
    console.log('画布初始化完成');

    // 只在历史记录为空时保存初始状态，避免重复保存
    if (historyStack.value.length === 0) {
      saveInitialState();
    }
  });
};

// 初始化像素数据
const initPixelData = () => {
  // 确保使用最新的画布尺寸
  const width = canvasWidth.value;
  const height = canvasHeight.value;

  console.log('初始化像素数据:', {
    尺寸: `${width} × ${height}`,
    动态尺寸: `${dynamicCanvasWidth.value} × ${dynamicCanvasHeight.value}`,
    Props尺寸: `${props.width} × ${props.height}`,
  });

  pixels.value = Array(height)
    .fill(null)
    .map(() => Array(width).fill('transparent'));

  // 初始化颜色追踪器
  colorUsageCount.clear();
  needsColorUpdate = false;

  // 如果有图片URL，加载图片
  if (props.imageUrl) {
    loadImageFromUrl(props.imageUrl);
  } else {
    // 没有图片时，发送空颜色列表
    emitColorUpdate();
  }
};

// 居中显示画布
const centerView = () => {
  if (!canvas.value) return;

  // 使用显示尺寸而不是实际画布尺寸
  const containerWidth =
    parseFloat(canvas.value.style.width) || canvas.value.clientWidth;
  const containerHeight =
    parseFloat(canvas.value.style.height) || canvas.value.clientHeight;

  offset.value = {
    x: (containerWidth - displayWidth.value) / 2,
    y: (containerHeight - displayHeight.value) / 2,
  };
};

// ============= 坐标转换（参考Piskel的简洁实现）=============

// ============= 坐标转换缓存优化 =============

// 缓存变量 - 避免重复计算
const coordinateCache = {
  // Canvas相关缓存
  rect: null as DOMRect | null,
  rectUpdateTime: 0,

  // 格子大小缓存
  cellWidth: 0,
  cellHeight: 0,
  cellSizeKey: '',

  // 偏移量缓存
  offsetX: 0,
  offsetY: 0,
  offsetKey: '',

  // 有效性标记
  isValid: false,
};

// 更新坐标转换缓存
const updateCoordinateCache = () => {
  if (!canvas.value) return;

  // 检查格子大小是否变化
  const newCellWidth = pixelWidth.value * zoom.value;
  const newCellHeight = pixelHeight.value * zoom.value;
  const newCellSizeKey = `${pixelWidth.value}-${pixelHeight.value}-${zoom.value}`;

  // 检查偏移量是否变化
  const newOffsetKey = `${offset.value.x}-${offset.value.y}`;

  // 检查Canvas rect是否需要更新（500ms更新一次避免过于频繁）
  const now = Date.now();
  const needRectUpdate =
    !coordinateCache.rect || now - coordinateCache.rectUpdateTime > 500;

  // 判断是否需要更新缓存
  const needUpdate =
    !coordinateCache.isValid ||
    coordinateCache.cellSizeKey !== newCellSizeKey ||
    coordinateCache.offsetKey !== newOffsetKey ||
    needRectUpdate;

  if (needUpdate) {
    // 更新Canvas边界（较少更新）
    if (needRectUpdate) {
      coordinateCache.rect = canvas.value.getBoundingClientRect();
      coordinateCache.rectUpdateTime = now;
    }

    // 更新格子大小缓存
    coordinateCache.cellWidth = newCellWidth;
    coordinateCache.cellHeight = newCellHeight;
    coordinateCache.cellSizeKey = newCellSizeKey;

    // 更新偏移量缓存
    coordinateCache.offsetX = offset.value.x;
    coordinateCache.offsetY = offset.value.y;
    coordinateCache.offsetKey = newOffsetKey;

    coordinateCache.isValid = true;
  }
};

// 优化的屏幕坐标转像素坐标 - 使用缓存减少90%计算量
const screenToPixel = (screenX: number, screenY: number) => {
  if (!canvas.value) return { x: -1, y: -1 };

  // 更新缓存（智能判断是否需要更新）
  updateCoordinateCache();

  if (!coordinateCache.rect || !coordinateCache.isValid) {
    return { x: -1, y: -1 };
  }

  // 使用缓存值进行快速计算
  const canvasX = screenX - coordinateCache.rect.left;
  const canvasY = screenY - coordinateCache.rect.top;

  const x = canvasX - coordinateCache.offsetX;
  const y = canvasY - coordinateCache.offsetY;

  return {
    x: Math.floor(x / coordinateCache.cellWidth),
    y: Math.floor(y / coordinateCache.cellHeight),
  };
};

// 优化的像素坐标转屏幕坐标 - 使用缓存
const pixelToScreen = (pixelX: number, pixelY: number) => {
  // 确保缓存是最新的
  updateCoordinateCache();

  return {
    x: pixelX * coordinateCache.cellWidth + coordinateCache.offsetX,
    y: pixelY * coordinateCache.cellHeight + coordinateCache.offsetY,
  };
};

// 手动清除坐标缓存（在画布大小改变时调用）
const clearCoordinateCache = () => {
  coordinateCache.isValid = false;
  coordinateCache.rect = null;
  coordinateCache.rectUpdateTime = 0;
};

// ============= 渲染参数缓存优化 =============

// 渲染参数缓存 - 避免每次render()都重新计算
const renderCache = {
  cellWidth: 0,
  cellHeight: 0,
  totalCells: 0,
  visibleBounds: null as any,
  cacheKey: '',
  isValid: false,
  canvasSize: { width: 0, height: 0 },
};

// 更新渲染参数缓存
const updateRenderCache = () => {
  const newCacheKey = `${pixelWidth.value}-${pixelHeight.value}-${zoom.value}-${offset.value.x}-${offset.value.y}-${canvasWidth.value}-${canvasHeight.value}`;

  if (renderCache.cacheKey !== newCacheKey || !renderCache.isValid) {
    renderCache.cellWidth = pixelWidth.value * zoom.value;
    renderCache.cellHeight = pixelHeight.value * zoom.value;
    renderCache.totalCells = canvasWidth.value * canvasHeight.value;
    renderCache.visibleBounds = calculateVisibleArea(
      renderCache.cellWidth,
      renderCache.cellHeight,
    );
    renderCache.canvasSize = {
      width: canvasWidth.value,
      height: canvasHeight.value,
    };
    renderCache.cacheKey = newCacheKey;
    renderCache.isValid = true;

    console.log('🚀 渲染缓存已更新:', {
      cellSize: `${renderCache.cellWidth}x${renderCache.cellHeight}`,
      totalCells: renderCache.totalCells,
      visibleArea: renderCache.visibleBounds,
    });
  }
};

// 清除渲染缓存
const clearRenderCache = () => {
  renderCache.isValid = false;
  renderCache.visibleBounds = null;
  renderCache.cacheKey = '';
};

// ============= 鼠标位置缓存优化 =============

// 鼠标位置缓存 - 避免相同位置重复计算screenToPixel
const mouseCache = {
  lastClientX: -1,
  lastClientY: -1,
  lastPixelX: -1,
  lastPixelY: -1,
  isValid: false,
};

// 获取缓存的像素位置
const getCachedPixelPosition = (clientX: number, clientY: number) => {
  // 检查是否是相同的鼠标位置
  if (
    mouseCache.lastClientX !== clientX ||
    mouseCache.lastClientY !== clientY ||
    !mouseCache.isValid
  ) {
    // 重新计算像素位置
    const pixel = screenToPixel(clientX, clientY);

    // 更新缓存
    mouseCache.lastClientX = clientX;
    mouseCache.lastClientY = clientY;
    mouseCache.lastPixelX = pixel.x;
    mouseCache.lastPixelY = pixel.y;
    mouseCache.isValid = true;

    return pixel;
  }

  // 返回缓存的结果
  return {
    x: mouseCache.lastPixelX,
    y: mouseCache.lastPixelY,
  };
};

// 清除鼠标位置缓存
const clearMouseCache = () => {
  mouseCache.isValid = false;
  mouseCache.lastClientX = -1;
  mouseCache.lastClientY = -1;
};

// ============= 绘制工具实现 =============

// 设置像素颜色 - 集成增量颜色追踪和历史记录
const setPixel = (x: number, y: number, color: string, skipUpdate = false) => {
  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  if (x < 0 || x >= canvasWidth.value || y < 0 || y >= canvasHeight.value)
    return;

  // 获取旧颜色用于追踪和历史记录
  const oldColor = pixels.value[y][x];

  // 只有颜色实际改变时才处理
  if (oldColor !== color) {
    // 设置新颜色
    pixels.value[y][x] = color;

    // 更新颜色追踪
    removeColorFromTracker(oldColor);
    addColorToTracker(color);

    // 记录像素变化（用于增量历史记录）
    if (isDrawingOperation && !isUndoRedoOperation.value) {
      currentDrawingChanges.push({
        x,
        y,
        oldColor,
        newColor: color,
      });
    }

    // 兼容性：保持原有的延迟更新逻辑
    if (!skipUpdate && !isColorUpdateScheduled) {
      scheduleColorUpdate();
    }
  }
};

// 获取像素颜色
const getPixel = (x: number, y: number): string => {
  if (x < 0 || x >= canvasWidth.value || y < 0 || y >= canvasHeight.value)
    return 'transparent';
  return pixels.value[y][x] || 'transparent';
};

// 画笔工具 - 拖拽优化版本
const drawWithBrush = (
  x: number,
  y: number,
  color: string,
  skipUpdate = false,
  isDragOperation = false,
) => {
  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  const size = brushSize.value;
  const half = Math.floor(size / 2);

  // 批量绘制，避免每个像素都触发更新
  for (let dx = -half; dx < size - half; dx++) {
    for (let dy = -half; dy < size - half; dy++) {
      const targetX = x + dx;
      const targetY = y + dy;

      // 边界检查
      if (
        targetX >= 0 &&
        targetX < canvasWidth.value &&
        targetY >= 0 &&
        targetY < canvasHeight.value
      ) {
        // 如果是拖拽操作，记录变化但不立即更新颜色追踪
        if (isDragOperation) {
          const oldColor = getPixel(targetX, targetY);
          if (oldColor !== color) {
            dragBatchChanges.push({
              x: targetX,
              y: targetY,
              oldColor,
              newColor: color,
            });
          }
        }

        setPixel(targetX, targetY, color, true); // 跳过中间更新
      }
    }
  }

  // 非拖拽操作时正常处理颜色追踪
  // if (!skipUpdate && !isDragOperation) {
  //   deferredUpdateColors();
  // }
};

// ============= 洪水填充算法优化 =============

// 全局访问标记数组池 - 避免重复分配内存
let visitedArrayPool: boolean[][] | null = null;
let poolWidth = 0;
let poolHeight = 0;

// 获取或创建访问标记数组
const getVisitedArray = (width: number, height: number): boolean[][] => {
  // 如果池子不存在或尺寸不够，重新创建
  if (!visitedArrayPool || poolWidth < width || poolHeight < height) {
    console.log(`创建新的访问标记数组池: ${width}x${height}`);
    visitedArrayPool = new Array(height);
    for (let y = 0; y < height; y++) {
      visitedArrayPool[y] = new Array(width).fill(false);
    }
    poolWidth = width;
    poolHeight = height;
  } else {
    // 清除之前的标记（只清除需要的区域）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        visitedArrayPool[y][x] = false;
      }
    }
  }

  return visitedArrayPool;
};

// 优化的队列结构 - 避免频繁的 shift() 操作
interface FloodFillQueue {
  data: Array<{ x: number; y: number }>;
  head: number;
  tail: number;
}

// 创建高效队列
const createFloodFillQueue = (): FloodFillQueue => {
  return {
    data: new Array(10000), // 预分配较大空间
    head: 0,
    tail: 0,
  };
};

// 队列操作函数
const enqueue = (queue: FloodFillQueue, x: number, y: number) => {
  queue.data[queue.tail] = { x, y };
  queue.tail++;

  // 如果队列满了，扩容
  if (queue.tail >= queue.data.length) {
    const newData = new Array(queue.data.length * 2);
    let writeIndex = 0;

    // 复制现有数据到新数组开头
    for (let i = queue.head; i < queue.tail; i++) {
      newData[writeIndex++] = queue.data[i];
    }

    queue.data = newData;
    queue.head = 0;
    queue.tail = writeIndex;
  }
};

const dequeue = (queue: FloodFillQueue): { x: number; y: number } | null => {
  if (queue.head >= queue.tail) {
    return null;
  }

  const result = queue.data[queue.head];
  queue.head++;

  // 如果队列空了，重置指针
  if (queue.head >= queue.tail) {
    queue.head = 0;
    queue.tail = 0;
  }

  return result;
};

const isQueueEmpty = (queue: FloodFillQueue): boolean => {
  return queue.head >= queue.tail;
};

// 油漆桶填充工具 - 高性能优化版本
const floodFill = (startX: number, startY: number, newColor: string) => {
  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  // 边界检查
  if (
    startX < 0 ||
    startX >= canvasWidth.value ||
    startY < 0 ||
    startY >= canvasHeight.value
  ) {
    return;
  }

  const targetColor = getPixel(startX, startY);
  if (targetColor === newColor) return;

  console.log(
    `开始优化洪水填充: (${startX}, ${startY}), 目标颜色: ${targetColor} -> ${newColor}`,
  );
  const startTime = performance.now();

  // 获取高效的访问标记数组
  const visited = getVisitedArray(canvasWidth.value, canvasHeight.value);

  // 使用优化的队列
  const queue = createFloodFillQueue();
  enqueue(queue, startX, startY);

  // 缓存画布尺寸，避免重复访问
  const width = canvasWidth.value;
  const height = canvasHeight.value;

  let processedPixels = 0;

  // 批量填充，避免每个像素都触发更新
  while (!isQueueEmpty(queue)) {
    const current = dequeue(queue);
    if (!current) break;

    const { x, y } = current;

    // 快速边界检查（已在外层做过部分检查）
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    // 检查是否已访问（使用数组访问替代字符串哈希）
    if (visited[y][x]) continue;

    // 检查颜色是否匹配
    if (getPixel(x, y) !== targetColor) continue;

    // 标记为已访问
    visited[y][x] = true;

    // 设置新颜色
    setPixel(x, y, newColor, true); // 跳过中间更新
    processedPixels++;

    // 批量添加相邻像素（内联边界检查以减少函数调用开销）
    // 右
    if (x + 1 < width && !visited[y][x + 1]) {
      enqueue(queue, x + 1, y);
    }
    // 左
    if (x > 0 && !visited[y][x - 1]) {
      enqueue(queue, x - 1, y);
    }
    // 下
    if (y + 1 < height && !visited[y + 1][x]) {
      enqueue(queue, x, y + 1);
    }
    // 上
    if (y > 0 && !visited[y - 1][x]) {
      enqueue(queue, x, y - 1);
    }
  }

  const endTime = performance.now();
  console.log(
    `洪水填充完成: 处理了 ${processedPixels} 个像素，耗时 ${(
      endTime - startTime
    ).toFixed(2)}ms`,
  );

  // 颜色追踪已在setPixel中自动处理，无需额外调用
  // deferredUpdateColors();
};

// 线性插值绘制（处理快速鼠标移动）- 拖拽优化版本
const drawLine = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  isDragOperation = false,
) => {
  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  // 拖拽时智能限制插值距离，避免过度计算
  const distance = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  if (isDragOperation && distance > MAX_INTERPOLATION_DISTANCE) {
    // 距离过大时，只绘制终点，跳过插值
    drawWithBrush(x1, y1, color, true, true);
    return;
  }

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  // 批量绘制线条，传递拖拽标志
  while (true) {
    drawWithBrush(x, y, color, true, isDragOperation);

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  // 颜色追踪已在setPixel中自动处理，无需额外调用
  // deferredUpdateColors();
};

// 矩形绘制函数
const drawRectangle = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
) => {
  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  // 确保坐标正确排序
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  // 绘制矩形的四条边
  // 上边
  for (let x = minX; x <= maxX; x++) {
    drawWithBrush(x, minY, color, true);
  }
  // 下边
  for (let x = minX; x <= maxX; x++) {
    drawWithBrush(x, maxY, color, true);
  }
  // 左边
  for (let y = minY + 1; y < maxY; y++) {
    drawWithBrush(minX, y, color, true);
  }
  // 右边
  for (let y = minY + 1; y < maxY; y++) {
    drawWithBrush(maxX, y, color, true);
  }

  // 颜色追踪已在setPixel中自动处理，无需额外调用
  // deferredUpdateColors();
};

// 圆形绘制函数 (使用Bresenham圆形算法)
const drawCircle = (
  centerX: number,
  centerY: number,
  endX: number,
  endY: number,
  color: string,
) => {
  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  // 计算半径 (使用从中心点到结束点的距离)
  const dx = endX - centerX;
  const dy = endY - centerY;
  const radius = Math.round(Math.sqrt(dx * dx + dy * dy));

  if (radius === 0) {
    drawWithBrush(centerX, centerY, color, true);
    // 颜色追踪已在setPixel中自动处理
    return;
  }

  // Bresenham圆形算法
  let x = 0;
  let y = radius;
  let d = 3 - 2 * radius;

  // 绘制八个对称点
  const drawCirclePoints = (cx: number, cy: number, x: number, y: number) => {
    // 确保坐标在画布范围内
    const points = [
      [cx + x, cy + y],
      [cx - x, cy + y],
      [cx + x, cy - y],
      [cx - x, cy - y],
      [cx + y, cy + x],
      [cx - y, cy + x],
      [cx + y, cy - x],
      [cx - y, cy - x],
    ];

    points.forEach(([px, py]) => {
      if (
        px >= 0 &&
        px < canvasWidth.value &&
        py >= 0 &&
        py < canvasHeight.value
      ) {
        drawWithBrush(px, py, color, true);
      }
    });
  };

  drawCirclePoints(centerX, centerY, x, y);

  while (y >= x) {
    x++;
    if (d > 0) {
      y--;
      d = d + 4 * (x - y) + 10;
    } else {
      d = d + 4 * x + 6;
    }
    drawCirclePoints(centerX, centerY, x, y);
  }

  // 颜色追踪已在setPixel中自动处理，无需额外调用
  // deferredUpdateColors();
};

// ============= 鼠标事件处理 =============

const onMouseDown = (e: MouseEvent) => {
  // 只响应左键点击（button = 0），忽略右键和中键
  if (e.button !== 0) {
    return;
  }

  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    console.warn('绘制功能已禁用，无法进行绘制操作');
    return;
  }

  // 🚀 使用鼠标位置缓存，避免重复计算
  const pixel = getCachedPixelPosition(e.clientX, e.clientY);

  // 优先检查是否点击在选中区域内，如果是则启动拖拽（适用于所有工具）
  if (selectedArea.value && isPointInSelection(pixel.x, pixel.y)) {
    // 开始拖拽选中区域
    isDraggingSelection.value = true;
    dragStartPixel.value = pixel;
    dragStartOffset.value = { ...selectionPreviewOffset.value };
    // 修改鼠标样式
    if (canvas.value) {
      canvas.value.style.cursor = 'grabbing';
    }
    console.log('开始拖拽选中区域:', {
      pixel,
      dragStartPixel: dragStartPixel.value,
      tool: currentTool.value,
    });
    return;
  }

  // 如果是移动工具且没有点击选中区域，处理普通画布移动
  if (currentTool.value === 'move') {
    // 普通画布移动
    isMoving.value = true;
    startMovePos.value = { x: e.clientX, y: e.clientY };
    lastMovePos.value = { x: e.clientX, y: e.clientY };
    // 修改鼠标样式
    if (canvas.value) {
      canvas.value.style.cursor = 'grabbing';
    }
    return;
  }

  if (
    pixel.x < 0 ||
    pixel.x >= canvasWidth.value ||
    pixel.y < 0 ||
    pixel.y >= canvasHeight.value
  ) {
    return;
  }

  isDrawing.value = true;
  lastPixel.value = pixel;

  // 在开始绘制操作前，检查是否有已移动的选中区域需要应用
  if (
    selectedArea.value &&
    selectedArea.value.hasMoved &&
    ['pen', 'eraser', 'fill', 'line', 'rectangle', 'circle'].includes(
      currentTool.value,
    )
  ) {
    console.log('开始绘制操作时检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
    selectedArea.value = null; // 清除选中区域
  }

  switch (currentTool.value) {
    case 'pen':
      // 开始绘制操作记录
      startDrawingOperation();
      drawWithBrush(pixel.x, pixel.y, currentColor.value);
      break;
    case 'eraser':
      // 开始绘制操作记录
      startDrawingOperation();
      drawWithBrush(pixel.x, pixel.y, 'transparent');
      break;
    case 'fill':
      // 保存操作前状态
      saveStateBeforeOperation();
      floodFill(pixel.x, pixel.y, currentColor.value);
      // 填充是一次性操作，立即完成
      finishOperation();
      break;
    case 'picker': {
      const color = getPixel(pixel.x, pixel.y);
      if (color !== 'transparent') {
        currentColor.value = color;
      }
      // 取色器不需要撤销重做
      break;
    }
    case 'line':
      // 保存操作前状态
      saveStateBeforeOperation();
      // 记录直线的起始点
      lineStartPoint.value = pixel;
      isDrawingLine.value = true;
      break;
    case 'rectangle':
      // 保存操作前状态
      saveStateBeforeOperation();
      // 记录矩形的起始点
      rectangleStartPoint.value = pixel;
      isDrawingRectangle.value = true;
      break;
    case 'circle':
      // 保存操作前状态
      saveStateBeforeOperation();
      // 记录圆形的中心点
      circleStartPoint.value = pixel;
      isDrawingCircle.value = true;
      break;
    case 'select':
      // 开始矩形选择前，检查是否有已移动的选中区域需要应用
      if (selectedArea.value && selectedArea.value.hasMoved) {
        console.log('开始新选择时检测到已移动的选中区域，应用移动');
        applySelectionMoveOnClear();
      }
      selectStartPoint.value = pixel;
      selectEndPoint.value = pixel;
      isSelecting.value = true;
      // 清除之前的选择
      selectedArea.value = null;
      // 选择操作不需要撤销重做
      break;
    case 'circleSelect':
      // 开始圆形选择前，检查是否有已移动的选中区域需要应用
      if (selectedArea.value && selectedArea.value.hasMoved) {
        console.log('开始新选择时检测到已移动的选中区域，应用移动');
        applySelectionMoveOnClear();
      }
      circleSelectStartPoint.value = pixel;
      circleSelectEndPoint.value = pixel;
      isCircleSelecting.value = true;
      // 清除之前的选择
      selectedArea.value = null;
      // 选择操作不需要撤销重做
      break;
    case 'lassoSelect':
      // 开始套索选择前，检查是否有已移动的选中区域需要应用
      if (selectedArea.value && selectedArea.value.hasMoved) {
        console.log('开始新选择时检测到已移动的选中区域，应用移动');
        applySelectionMoveOnClear();
      }
      lassoPath.value = [pixel];
      isLassoSelecting.value = true;
      // 清除之前的选择
      selectedArea.value = null;
      // 选择操作不需要撤销重做
      break;
  }

  deferredRender();
};

const onMouseMove = (e: MouseEvent) => {
  // 优先处理选中区域拖拽（适用于所有工具）
  if (isDraggingSelection.value) {
    // 🚀 使用鼠标位置缓存，避免重复计算
    const currentPixel = getCachedPixelPosition(e.clientX, e.clientY);
    const deltaX = currentPixel.x - dragStartPixel.value.x;
    const deltaY = currentPixel.y - dragStartPixel.value.y;

    selectionPreviewOffset.value = {
      x: dragStartOffset.value.x + deltaX,
      y: dragStartOffset.value.y + deltaY,
    };

    console.log('拖拽选中区域:', {
      currentPixel,
      dragStartPixel: dragStartPixel.value,
      delta: { x: deltaX, y: deltaY },
      previewOffset: selectionPreviewOffset.value,
      tool: currentTool.value,
    });

    // 🔴 移除：deferredRender()也会造成额外的渲染调用
    // ✅ 优化：使用统一的节流渲染
    throttledRender();
    return;
  }

  // 如果是移动工具，处理普通画布移动
  if (currentTool.value === 'move' && isMoving.value) {
    const deltaX = e.clientX - lastMovePos.value.x;
    const deltaY = e.clientY - lastMovePos.value.y;

    // 更新画布偏移量
    offset.value.x += deltaX;
    offset.value.y += deltaY;

    // 更新上次鼠标位置
    lastMovePos.value = { x: e.clientX, y: e.clientY };

    // 🔴 移除：deferredRender()造成额外渲染
    // ✅ 优化：使用统一的节流渲染
    throttledRender();
    return;
  }

  // 🚀 使用鼠标位置缓存，避免重复计算
  const pixel = getCachedPixelPosition(e.clientX, e.clientY);
  mousePos.value = pixel;

  // 更新鼠标样式 - 检测是否悬停在选择区域上（适用于所有工具）
  if (
    canvas.value &&
    selectedArea.value &&
    isPointInSelection(pixel.x, pixel.y)
  ) {
    // 如果悬停在选中区域上，显示可拖拽光标
    canvas.value.style.cursor = 'grab';
  } else if (currentTool.value === 'move' && canvas.value) {
    // 移动工具的默认光标
    canvas.value.style.cursor = 'move';
  } else if (canvas.value) {
    // 恢复当前工具的默认光标
    setTool(currentTool.value);
  }

  // 处理直线工具的预览功能
  if (currentTool.value === 'line' && isDrawingLine.value) {
    // 🔴 移除：直接render()调用导致过度渲染
    // ✅ 优化：使用节流渲染，减少CPU占用
    throttledRender();
    return;
  }

  // 处理矩形工具的预览功能
  if (currentTool.value === 'rectangle' && isDrawingRectangle.value) {
    // 🔴 移除：直接render()调用导致过度渲染
    // ✅ 优化：使用节流渲染，减少CPU占用
    throttledRender();
    return;
  }

  // 处理圆形工具的预览功能
  if (currentTool.value === 'circle' && isDrawingCircle.value) {
    // 🔴 移除：直接render()调用导致过度渲染
    // ✅ 优化：使用节流渲染，减少CPU占用
    throttledRender();
    return;
  }

  // 处理矩形选择工具的预览功能
  if (currentTool.value === 'select' && isSelecting.value) {
    selectEndPoint.value = pixel;
    // 🔴 移除：直接render()调用导致过度渲染
    // ✅ 优化：使用节流渲染，减少CPU占用
    throttledRender();
    return;
  }

  // 处理圆形选择工具的预览功能
  if (currentTool.value === 'circleSelect' && isCircleSelecting.value) {
    circleSelectEndPoint.value = pixel;
    // 🔴 移除：直接render()调用导致过度渲染
    // ✅ 优化：使用节流渲染，减少CPU占用
    throttledRender();
    if (ctx) {
      ctx.save();
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); // 虚线效果

      // 使用矩形格子的宽度和高度
      const cellWidth = pixelWidth.value * zoom.value;
      const cellHeight = pixelHeight.value * zoom.value;

      const centerX =
        circleSelectStartPoint.value.x * cellWidth +
        offset.value.x +
        cellWidth / 2;
      const centerY =
        circleSelectStartPoint.value.y * cellHeight +
        offset.value.y +
        cellHeight / 2;
      const endX = pixel.x * cellWidth + offset.value.x + cellWidth / 2;
      const endY = pixel.y * cellHeight + offset.value.y + cellHeight / 2;

      const dx = endX - centerX;
      const dy = endY - centerY;
      const radius = Math.sqrt(dx * dx + dy * dy);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  // 处理套索选择工具的预览功能
  if (currentTool.value === 'lassoSelect' && isLassoSelecting.value) {
    // 避免添加重复或太近的点，提高路径质量
    const lastPoint = lassoPath.value[lassoPath.value.length - 1];
    if (
      !lastPoint ||
      Math.abs(pixel.x - lastPoint.x) > 0 ||
      Math.abs(pixel.y - lastPoint.y) > 0
    ) {
      lassoPath.value.push(pixel);
    }

    // 重新渲染画布，然后绘制套索路径
    render();
    if (ctx && lassoPath.value.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]); // 虚线效果
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      // 绘制路径
      // 使用矩形格子的宽度和高度
      const cellWidth = pixelWidth.value * zoom.value;
      const cellHeight = pixelHeight.value * zoom.value;

      for (let i = 0; i < lassoPath.value.length; i++) {
        const point = lassoPath.value[i];
        const screenX = point.x * cellWidth + offset.value.x + cellWidth / 2;
        const screenY = point.y * cellHeight + offset.value.y + cellHeight / 2;

        if (i === 0) {
          ctx.moveTo(screenX, screenY);
        } else {
          ctx.lineTo(screenX, screenY);
        }
      }

      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if (
    !isDrawing.value ||
    currentTool.value === 'fill' ||
    currentTool.value === 'picker' ||
    currentTool.value === 'line' ||
    currentTool.value === 'rectangle' ||
    currentTool.value === 'circle' ||
    currentTool.value === 'select' ||
    currentTool.value === 'circleSelect' ||
    currentTool.value === 'lassoSelect'
  ) {
    return;
  }

  // 检查是否禁止绘制
  if (drawingDisabled.value) {
    return;
  }

  if (
    pixel.x < 0 ||
    pixel.x >= canvasWidth.value ||
    pixel.y < 0 ||
    pixel.y >= canvasHeight.value
  ) {
    return;
  }

  const color =
    currentTool.value === 'eraser' ? 'transparent' : currentColor.value;

  // 使用线性插值处理快速移动 - 拖拽优化
  if (lastPixel.value.x !== -1 && lastPixel.value.y !== -1) {
    drawLine(
      lastPixel.value.x,
      lastPixel.value.y,
      pixel.x,
      pixel.y,
      color,
      true,
    );
  } else {
    drawWithBrush(pixel.x, pixel.y, color, false, true);
  }

  lastPixel.value = pixel;

  // 使用拖拽优化的渲染函数，降低渲染频率
  deferredDragRender();
};

const onMouseUp = (e: MouseEvent) => {
  // 只响应左键释放（button = 0）
  if (e.button !== 0) {
    return;
  }

  // 拖拽绘制结束时的批量处理
  if (
    isDrawing.value &&
    (currentTool.value === 'pen' || currentTool.value === 'eraser')
  ) {
    // 处理批量变化记录
    if (dragBatchChanges.length > 0) {
      console.log(`拖拽绘制完成，处理了 ${dragBatchChanges.length} 个像素变化`);
      dragBatchChanges = []; // 清空批量记录
      deferredUpdateColors(); // 更新颜色
    }
  }

  // 优先处理选中区域拖拽结束（适用于所有工具）
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false;

    // 如果有实际移动，应用移动效果
    if (
      selectionPreviewOffset.value.x !== 0 ||
      selectionPreviewOffset.value.y !== 0
    ) {
      applySelectionMove();
    }

    // 确保数据一致性
    ensureSelectionConsistency();

    // 恢复鼠标样式
    if (canvas.value) {
      // 根据当前位置决定光标样式
      // 🚀 使用鼠标位置缓存，避免重复计算
      const pixel = getCachedPixelPosition(e.clientX, e.clientY);
      if (selectedArea.value && isPointInSelection(pixel.x, pixel.y)) {
        canvas.value.style.cursor = 'grab';
      } else {
        setTool(currentTool.value); // 恢复工具的默认光标
      }
    }

    console.log('结束拖拽选中区域，当前工具:', currentTool.value);
    return;
  }

  // 处理移动工具的普通画布移动结束
  if (currentTool.value === 'move' && isMoving.value) {
    isMoving.value = false;
    // 恢复鼠标样式
    if (canvas.value) {
      canvas.value.style.cursor = 'move';
    }
    return;
  }

  // 处理直线工具的鼠标释放
  if (currentTool.value === 'line' && isDrawingLine.value) {
    // 🚀 使用鼠标位置缓存，避免重复计算
    const pixel = getCachedPixelPosition(e.clientX, e.clientY);
    if (
      pixel.x >= 0 &&
      pixel.x < canvasWidth.value &&
      pixel.y >= 0 &&
      pixel.y < canvasHeight.value
    ) {
      // 绘制最终的直线
      drawLine(
        lineStartPoint.value.x,
        lineStartPoint.value.y,
        pixel.x,
        pixel.y,
        currentColor.value,
      );
      deferredRender();
    }
    // 完成直线绘制操作
    finishOperationAndSave();
    isDrawingLine.value = false;
    lineStartPoint.value = { x: -1, y: -1 };
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };
    return;
  }

  // 处理矩形工具的鼠标释放
  if (currentTool.value === 'rectangle' && isDrawingRectangle.value) {
    // 🚀 使用鼠标位置缓存，避免重复计算
    const pixel = getCachedPixelPosition(e.clientX, e.clientY);
    if (
      pixel.x >= 0 &&
      pixel.x < canvasWidth.value &&
      pixel.y >= 0 &&
      pixel.y < canvasHeight.value
    ) {
      // 绘制最终的矩形
      drawRectangle(
        rectangleStartPoint.value.x,
        rectangleStartPoint.value.y,
        pixel.x,
        pixel.y,
        currentColor.value,
      );
      deferredRender();
    }
    // 完成矩形绘制操作
    finishOperationAndSave();
    isDrawingRectangle.value = false;
    rectangleStartPoint.value = { x: -1, y: -1 };
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };
    return;
  }

  // 处理圆形工具的鼠标释放
  if (currentTool.value === 'circle' && isDrawingCircle.value) {
    // 🚀 使用鼠标位置缓存，避免重复计算
    const pixel = getCachedPixelPosition(e.clientX, e.clientY);
    if (
      pixel.x >= 0 &&
      pixel.x < canvasWidth.value &&
      pixel.y >= 0 &&
      pixel.y < canvasHeight.value
    ) {
      // 绘制最终的圆形
      drawCircle(
        circleStartPoint.value.x,
        circleStartPoint.value.y,
        pixel.x,
        pixel.y,
        currentColor.value,
      );
      deferredRender();
    }
    // 完成圆形绘制操作
    finishOperationAndSave();
    isDrawingCircle.value = false;
    circleStartPoint.value = { x: -1, y: -1 };
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };
    return;
  }

  // 处理矩形选择工具的鼠标释放
  if (currentTool.value === 'select' && isSelecting.value) {
    // 🚀 使用鼠标位置缓存，避免重复计算
    const pixel = getCachedPixelPosition(e.clientX, e.clientY);
    if (
      pixel.x >= 0 &&
      pixel.x < canvasWidth.value &&
      pixel.y >= 0 &&
      pixel.y < canvasHeight.value
    ) {
      // 创建选择区域
      createSelection(
        selectStartPoint.value.x,
        selectStartPoint.value.y,
        pixel.x,
        pixel.y,
      );
    }
    isSelecting.value = false;
    selectStartPoint.value = { x: -1, y: -1 };
    selectEndPoint.value = { x: -1, y: -1 };
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };

    // 重新渲染以清除选择框预览
    render();
    return;
  }

  // 处理圆形选择工具的鼠标释放
  if (currentTool.value === 'circleSelect' && isCircleSelecting.value) {
    // 🚀 使用鼠标位置缓存，避免重复计算
    const pixel = getCachedPixelPosition(e.clientX, e.clientY);
    if (
      pixel.x >= 0 &&
      pixel.x < canvasWidth.value &&
      pixel.y >= 0 &&
      pixel.y < canvasHeight.value
    ) {
      // 创建圆形选择区域
      createCircleSelection(
        circleSelectStartPoint.value.x,
        circleSelectStartPoint.value.y,
        pixel.x,
        pixel.y,
      );
    }
    isCircleSelecting.value = false;
    circleSelectStartPoint.value = { x: -1, y: -1 };
    circleSelectEndPoint.value = { x: -1, y: -1 };
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };

    // 重新渲染以清除选择圆圈预览
    render();
    return;
  }

  // 处理套索选择工具的鼠标释放
  if (currentTool.value === 'lassoSelect' && isLassoSelecting.value) {
    if (lassoPath.value.length > 2) {
      // 创建套索选择区域
      createLassoSelection(lassoPath.value);
    }
    isLassoSelecting.value = false;
    lassoPath.value = [];
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };

    // 重新渲染以清除套索路径预览
    render();
    return;
  }

  isDrawing.value = false;
  lastPixel.value = { x: -1, y: -1 };

  // 画笔或橡皮擦操作完成
  if (currentTool.value === 'pen' || currentTool.value === 'eraser') {
    finishDrawingOperation();
  }
};

// 鼠标离开画布时的处理
const onMouseLeave = () => {
  // 停止选中区域拖拽
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false;
    // 重置预览偏移
    selectionPreviewOffset.value = { x: 0, y: 0 };
    if (canvas.value) {
      // 恢复工具的默认光标
      setTool(currentTool.value);
    }
    render(); // 重新渲染以清除预览
    console.log('拖拽中断，重置预览偏移，当前工具:', currentTool.value);
  }

  // 停止所有拖拽操作
  if (isMoving.value) {
    isMoving.value = false;
    if (canvas.value && currentTool.value === 'move') {
      canvas.value.style.cursor = 'grab';
    }
  }

  // 停止直线绘制
  if (isDrawingLine.value) {
    // 完成直线绘制操作
    finishOperationAndSave();
    isDrawingLine.value = false;
    lineStartPoint.value = { x: -1, y: -1 };
    render(); // 重新渲染以清除预览线
  }

  // 停止矩形绘制
  if (isDrawingRectangle.value) {
    // 完成矩形绘制操作
    finishOperationAndSave();
    isDrawingRectangle.value = false;
    rectangleStartPoint.value = { x: -1, y: -1 };
    render(); // 重新渲染以清除预览矩形
  }

  // 停止圆形绘制
  if (isDrawingCircle.value) {
    // 完成圆形绘制操作
    finishOperationAndSave();
    isDrawingCircle.value = false;
    circleStartPoint.value = { x: -1, y: -1 };
    render(); // 重新渲染以清除预览圆形
  }

  // 停止矩形选择
  if (isSelecting.value) {
    isSelecting.value = false;
    selectStartPoint.value = { x: -1, y: -1 };
    selectEndPoint.value = { x: -1, y: -1 };
    render(); // 重新渲染以清除选择框预览
  }

  // 停止圆形选择
  if (isCircleSelecting.value) {
    isCircleSelecting.value = false;
    circleSelectStartPoint.value = { x: -1, y: -1 };
    circleSelectEndPoint.value = { x: -1, y: -1 };
    render(); // 重新渲染以清除选择圆圈预览
  }

  // 停止套索选择
  if (isLassoSelecting.value) {
    isLassoSelecting.value = false;
    lassoPath.value = [];
    render(); // 重新渲染以清除套索路径预览
  }

  // 处理画笔和橡皮擦操作的完成
  if (isDrawing.value) {
    // 如果正在使用画笔或橡皮擦，完成操作
    if (currentTool.value === 'pen' || currentTool.value === 'eraser') {
      finishDrawingOperation();
    }
    isDrawing.value = false;
    lastPixel.value = { x: -1, y: -1 };
  }
};

// 滚轮节流控制
let wheelThrottleTimer: number | null = null;
let wheelDebounceTimer: number | null = null;
let lastWheelTime = 0;
const WHEEL_THROTTLE_MS = 50; // 滚轮节流间隔 (20fps)
const WHEEL_DEBOUNCE_MS = 150; // 滚轮防抖延迟，滚动完毕后再渲染
let isWheelScrolling = false;

// 滚轮性能统计
let wheelEventCount = 0;
let wheelThrottledCount = 0;
let wheelStatsTimer: number | null = null;

// 缩放功能 - 滚轮节流优化版本
const onWheel = (e: WheelEvent) => {
  e.preventDefault();

  // 统计滚轮事件
  wheelEventCount++;

  const now = Date.now();

  // 节流：限制滚轮处理频率
  if (now - lastWheelTime < WHEEL_THROTTLE_MS) {
    return;
  }

  // 统计通过节流的事件
  wheelThrottledCount++;

  lastWheelTime = now;
  isWheelScrolling = true;

  // 使用缓存的getBoundingClientRect，避免频繁DOM查询
  const rect = getCachedBoundingRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const oldZoom = zoom.value;
  const config = zoomConfig.value;
  const zoomFactor = e.deltaY > 0 ? 1 - config.wheelStep : 1 + config.wheelStep;
  const newZoom = Math.max(
    config.minZoom,
    Math.min(config.maxZoom, zoom.value * zoomFactor),
  );

  // 只有缩放值真正改变时才处理
  if (Math.abs(newZoom - zoom.value) < 0.001) {
    return;
  }

  zoom.value = newZoom;

  // 以鼠标位置为中心缩放
  const zoomRatio = zoom.value / oldZoom;
  offset.value.x = mouseX - (mouseX - offset.value.x) * zoomRatio;
  offset.value.y = mouseY - (mouseY - offset.value.y) * zoomRatio;

  // 清除之前的防抖定时器
  if (wheelDebounceTimer) {
    clearTimeout(wheelDebounceTimer);
  }

  // 滚动过程中使用简化渲染
  requestAnimationFrame(() => {
    renderDuringScroll();
  });

  // 设置防抖：滚动完毕后进行完整渲染
  wheelDebounceTimer = window.setTimeout(() => {
    isWheelScrolling = false;
    console.log('🎯 滚轮滚动完毕，进行完整渲染');
    // 滚动完毕后的完整渲染
    deferredZoomRender();
    // 滚动完毕后延迟更新缩略图
    scheduleDelayedThumbnailUpdate();
    wheelDebounceTimer = null;
  }, WHEEL_DEBOUNCE_MS);
};

// ============= 渲染函数 =============

// 诊断函数
const diagnose = () => {
  console.log('=== 像素编辑器诊断信息 ===');
  console.log('画布元素:', canvas.value);
  console.log('容器元素:', container.value);
  console.log('上下文:', ctx);
  console.log(
    '画布尺寸:',
    canvas.value ? [canvas.value.width, canvas.value.height] : 'N/A',
  );
  console.log('格子数:', [canvasWidth.value, canvasHeight.value]);
  console.log('像素大小:', pixelSize.value);
  console.log('缩放:', zoom.value);
  console.log('偏移:', offset.value);
  console.log('显示网格:', showGrid.value);
  console.log(
    '像素数据:',
    pixels.value.length > 0
      ? `${pixels.value.length}x${pixels.value[0]?.length}`
      : '空',
  );
  console.log('当前工具:', currentTool.value);
  console.log('当前颜色:', currentColor.value);
  console.log('========================');
};

// 滚动过程中的简化渲染函数
const renderDuringScroll = () => {
  if (!ctx || !canvas.value) {
    return;
  }

  // 使用渲染参数缓存
  updateRenderCache();
  const { cellWidth, cellHeight, totalCells, visibleBounds } = renderCache;

  // 清空画布
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // 绘制背景
  ctx.fillStyle = props.bgColor || '#f0f0f0';
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

  // 滚动过程中只使用优化渲染，跳过网格和复杂效果
  renderOptimized(visibleBounds, cellWidth, cellHeight);

  // 绘制可绘制区域边框（简化版）
  ctx.save();
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  const drawableAreaX = offset.value.x;
  const drawableAreaY = offset.value.y;
  const drawableAreaWidth = canvasWidth.value * cellWidth;
  const drawableAreaHeight = canvasHeight.value * cellHeight;

  ctx.beginPath();
  ctx.rect(drawableAreaX, drawableAreaY, drawableAreaWidth, drawableAreaHeight);
  ctx.stroke();
  ctx.restore();
};

const render = () => {
  if (!ctx || !canvas.value) {
    return;
  }

  // 🚀 使用渲染参数缓存，避免重复计算
  updateRenderCache();
  const { cellWidth, cellHeight, totalCells, visibleBounds } = renderCache;

  // 清空画布
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // 绘制背景
  ctx.fillStyle = props.bgColor || '#f0f0f0';
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

  // 缩放时使用简化渲染策略
  if (isZooming) {
    // 缩放过程中使用最简化渲染
    renderOptimized(visibleBounds, cellWidth, cellHeight);
  } else {
    // 根据格子数量和缩放级别选择渲染策略
    if (totalCells > 50000 || cellWidth < 2 || cellHeight < 2) {
      // 大画布或小格子：使用优化渲染
      renderOptimized(visibleBounds, cellWidth, cellHeight);
    } else {
      // 小画布：使用标准渲染
      renderStandard(visibleBounds, cellWidth, cellHeight);
    }
  }

  // 智能网格绘制 - 根据格子数量和大小优化
  // 缩放时简化网格渲染
  if (showGrid.value && shouldShowGrid(cellWidth, cellHeight, totalCells)) {
    if (isZooming) {
      // 缩放过程中跳过网格渲染，减少计算开销
      // renderGrid(visibleBounds, cellWidth, cellHeight);
    } else {
      // 正常情况下渲染网格
      renderGrid(visibleBounds, cellWidth, cellHeight);
    }
  }

  // 绘制可绘制区域边框
  if (ctx && canvas.value) {
    ctx.save();
    ctx.strokeStyle = '#cccccc'; // 浅灰色边框
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // 实线

    // 计算可绘制区域的屏幕坐标
    const drawableAreaX = offset.value.x;
    const drawableAreaY = offset.value.y;
    const drawableAreaWidth = canvasWidth.value * cellWidth;
    const drawableAreaHeight = canvasHeight.value * cellHeight;

    // 绘制边框矩形
    ctx.beginPath();
    ctx.rect(
      drawableAreaX,
      drawableAreaY,
      drawableAreaWidth,
      drawableAreaHeight,
    );
    ctx.stroke();
    ctx.restore();
  }

  // 绘制选择区域的高亮显示
  if (selectedArea.value) {
    ctx.save();

    // 计算实际显示位置（考虑预览偏移）
    const displayX = selectedArea.value.x + selectionPreviewOffset.value.x;
    const displayY = selectedArea.value.y + selectionPreviewOffset.value.y;

    // 如果正在拖拽，绘制半透明的预览
    if (isDraggingSelection.value) {
      // 绘制选中像素的实际内容预览
      ctx.globalAlpha = 0.8;
      for (let y = 0; y < selectedArea.value.height; y++) {
        for (let x = 0; x < selectedArea.value.width; x++) {
          const pixelColor = selectedArea.value.pixels[y][x];
          if (pixelColor !== 'transparent') {
            const pixelX = (displayX + x) * cellWidth + offset.value.x;
            const pixelY = (displayY + y) * cellHeight + offset.value.y;

            // 确保在画布边界内
            if (
              pixelX >= -cellWidth &&
              pixelY >= -cellHeight &&
              pixelX < canvas.value!.width &&
              pixelY < canvas.value!.height
            ) {
              ctx.fillStyle = pixelColor;
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            }
          }
        }
      }
      ctx.globalAlpha = 1.0;
    } else {
      // 正常模式下绘制高亮覆盖
      ctx.fillStyle = 'rgba(0, 102, 204, 0.2)';
      for (let y = 0; y < selectedArea.value.height; y++) {
        for (let x = 0; x < selectedArea.value.width; x++) {
          // 只高亮显示实际选中的像素（非透明像素）
          if (selectedArea.value.pixels[y][x] !== 'transparent') {
            const pixelX = (displayX + x) * cellWidth + offset.value.x;
            const pixelY = (displayY + y) * cellHeight + offset.value.y;

            // 确保在画布边界内
            if (
              pixelX >= -cellWidth &&
              pixelY >= -cellHeight &&
              pixelX < canvas.value!.width &&
              pixelY < canvas.value!.height
            ) {
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            }
          }
        }
      }
    }

    // 然后绘制选择边界
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.globalAlpha = 0.9;

    // 根据选择类型绘制不同的边界
    if (selectedArea.value.type === 'circle') {
      // 绘制圆形边界
      if (
        selectedArea.value.centerX !== undefined &&
        selectedArea.value.centerY !== undefined &&
        selectedArea.value.radius !== undefined
      ) {
        const centerX =
          (selectedArea.value.centerX + selectionPreviewOffset.value.x) *
            cellWidth +
          offset.value.x +
          cellWidth / 2;
        const centerY =
          (selectedArea.value.centerY + selectionPreviewOffset.value.y) *
            cellHeight +
          offset.value.y +
          cellHeight / 2;
        const radius =
          selectedArea.value.radius * Math.min(cellWidth, cellHeight);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else if (selectedArea.value.type === 'lasso') {
      // 绘制套索边界
      if (selectedArea.value.path && selectedArea.value.path.length > 2) {
        ctx.beginPath();

        for (let i = 0; i < selectedArea.value.path.length; i++) {
          const point = selectedArea.value.path[i];
          const screenX =
            (point.x + selectionPreviewOffset.value.x) * cellWidth +
            offset.value.x +
            cellWidth / 2;
          const screenY =
            (point.y + selectionPreviewOffset.value.y) * cellHeight +
            offset.value.y +
            cellHeight / 2;

          if (i === 0) {
            ctx.moveTo(screenX, screenY);
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }

        // 闭合路径
        ctx.closePath();
        ctx.stroke();
      }
    } else {
      // 默认矩形边界
      const selectX = displayX * cellWidth + offset.value.x;
      const selectY = displayY * cellHeight + offset.value.y;
      const selectWidth = selectedArea.value.width * cellWidth;
      const selectHeight = selectedArea.value.height * cellHeight;

      ctx.beginPath();
      ctx.rect(selectX, selectY, selectWidth, selectHeight);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 绘制直线工具预览
  if (
    currentTool.value === 'line' &&
    isDrawingLine.value &&
    mousePos.value.x !== -1
  ) {
    ctx.save();
    ctx.strokeStyle = currentColor.value;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // 虚线效果
    ctx.lineCap = 'round';

    const startScreenPos = pixelToScreen(
      lineStartPoint.value.x,
      lineStartPoint.value.y,
    );
    const endScreenPos = pixelToScreen(mousePos.value.x, mousePos.value.y);

    // 绘制预览直线
    ctx.beginPath();
    ctx.moveTo(
      startScreenPos.x + cellWidth / 2,
      startScreenPos.y + cellHeight / 2,
    );
    ctx.lineTo(endScreenPos.x + cellWidth / 2, endScreenPos.y + cellHeight / 2);
    ctx.stroke();
    ctx.restore();
  }

  // 绘制矩形工具预览
  if (
    currentTool.value === 'rectangle' &&
    isDrawingRectangle.value &&
    mousePos.value.x !== -1
  ) {
    ctx.save();
    ctx.strokeStyle = currentColor.value;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // 虚线效果

    const startScreenPos = pixelToScreen(
      rectangleStartPoint.value.x,
      rectangleStartPoint.value.y,
    );
    const endScreenPos = pixelToScreen(mousePos.value.x, mousePos.value.y);

    const width = endScreenPos.x - startScreenPos.x + cellWidth;
    const height = endScreenPos.y - startScreenPos.y + cellHeight;

    // 绘制预览矩形
    ctx.beginPath();
    ctx.rect(startScreenPos.x, startScreenPos.y, width, height);
    ctx.stroke();
    ctx.restore();
  }

  // 绘制圆形工具预览
  if (
    currentTool.value === 'circle' &&
    isDrawingCircle.value &&
    mousePos.value.x !== -1
  ) {
    ctx.save();
    ctx.strokeStyle = currentColor.value;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // 虚线效果

    const centerScreenPos = pixelToScreen(
      circleStartPoint.value.x,
      circleStartPoint.value.y,
    );
    const endScreenPos = pixelToScreen(mousePos.value.x, mousePos.value.y);

    const centerX = centerScreenPos.x + cellWidth / 2;
    const centerY = centerScreenPos.y + cellHeight / 2;
    const endX = endScreenPos.x + cellWidth / 2;
    const endY = endScreenPos.y + cellHeight / 2;

    const dx = endX - centerX;
    const dy = endY - centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // 绘制预览圆形
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  
  // 节流更新缩略图
  throttledUpdateThumbnail();
};

// 缩略图更新标志
let thumbnailUpdatePending = false;
let thumbnailUpdateTimer: number | null = null;
let delayedThumbnailTimer: number | null = null;

// 延迟缩略图更新函数（主画布渲染完毕后调用）
const scheduleDelayedThumbnailUpdate = () => {
  // 清除之前的延迟更新
  if (delayedThumbnailTimer) {
    clearTimeout(delayedThumbnailTimer);
  }
  
  // 等待主画布渲染完成后再更新缩略图
  delayedThumbnailTimer = setTimeout(() => {
    // 使用 requestAnimationFrame 确保在下一帧更新缩略图
    requestAnimationFrame(() => {
      updateThumbnail();
      delayedThumbnailTimer = null;
    });
  }, 16); // 16ms 约等于一帧的时间，确保主画布渲染完成
};

// 节流的缩略图更新函数（保留用于特殊情况）
const throttledUpdateThumbnail = () => {
  if (thumbnailUpdatePending) return;
  
  thumbnailUpdatePending = true;
  
  // 使用 requestAnimationFrame 进行异步更新
  requestAnimationFrame(() => {
    updateThumbnail();
    thumbnailUpdatePending = false;
  });
};

// 防抖的缩略图更新函数（用于频繁操作时）
const debouncedUpdateThumbnail = () => {
  if (thumbnailUpdateTimer) {
    clearTimeout(thumbnailUpdateTimer);
  }
  
  thumbnailUpdateTimer = setTimeout(() => {
    updateThumbnail();
    thumbnailUpdateTimer = null;
  }, 100); // 100ms 防抖延迟
};

// 优化的缩略图更新函数
const updateThumbnail = () => {
  if (!thumbnailCtx || !thumbnailCanvas.value || !canvas.value) {
    return;
  }
  
  // 清空缩略图画布
  thumbnailCtx.clearRect(0, 0, thumbnailCanvas.value.width, thumbnailCanvas.value.height);
  
  // 绘制背景
  thumbnailCtx.fillStyle = props.bgColor || '#f0f0f0';
  thumbnailCtx.fillRect(0, 0, thumbnailCanvas.value.width, thumbnailCanvas.value.height);
  
  // 计算缩放比例
  const scaleX = thumbnailCanvas.value.width / canvasWidth.value;
  const scaleY = thumbnailCanvas.value.height / canvasHeight.value;
  
  // 优化：使用采样策略减少遍历的像素数量
  const sampleRate = Math.max(1, Math.floor(Math.min(canvasWidth.value, canvasHeight.value) / 200));
  
  // 按颜色分组批量绘制，提高性能
  const colorBatches = new Map<string, Array<{x: number, y: number}>>();
  
  for (let y = 0; y < canvasHeight.value; y += sampleRate) {
    for (let x = 0; x < canvasWidth.value; x += sampleRate) {
      const color = pixels.value[y]?.[x];
      if (color && color !== 'transparent' && !hiddenColors.value.has(color)) {
        if (!colorBatches.has(color)) {
          colorBatches.set(color, []);
        }
        colorBatches.get(color)!.push({x, y});
      }
    }
  }
  
  // 批量绘制每种颜色
  colorBatches.forEach((positions, color) => {
    thumbnailCtx.fillStyle = color;
    
    // 使用 Path2D 批量绘制提高性能
    const path = new Path2D();
    positions.forEach(({x, y}) => {
      const thumbX = Math.floor(x * scaleX);
      const thumbY = Math.floor(y * scaleY);
      const thumbW = Math.ceil(scaleX * sampleRate);
      const thumbH = Math.ceil(scaleY * sampleRate);
      path.rect(thumbX, thumbY, thumbW, thumbH);
    });
    
    thumbnailCtx.fill(path);
  });
};

// 计算可见区域
const calculateVisibleArea = (cellWidth: number, cellHeight: number) => {
  if (cellWidth <= 0 || cellHeight <= 0) {
    return {
      left: 0,
      top: 0,
      right: canvasWidth.value - 1,
      bottom: canvasHeight.value - 1,
    };
  }

  // 计算屏幕可见区域对应的格子范围
  const margin = 1; // 添加1格子的边距
  const left = Math.max(0, Math.floor(-offset.value.x / cellWidth) - margin);
  const top = Math.max(0, Math.floor(-offset.value.y / cellHeight) - margin);
  const right = Math.min(
    canvasWidth.value - 1,
    Math.floor((-offset.value.x + canvas.value!.width) / cellWidth) + margin,
  );
  const bottom = Math.min(
    canvasHeight.value - 1,
    Math.floor((-offset.value.y + canvas.value!.height) / cellHeight) + margin,
  );

  return { left, top, right, bottom };
};

// 检查点是否在原始选中区域内
const isInOriginalSelection = (x: number, y: number): boolean => {
  if (
    !selectedArea.value ||
    !selectedArea.value.originalX ||
    !selectedArea.value.originalY
  )
    return false;

  const relX = x - selectedArea.value.originalX;
  const relY = y - selectedArea.value.originalY;

  if (
    relX < 0 ||
    relX >= selectedArea.value.width ||
    relY < 0 ||
    relY >= selectedArea.value.height
  ) {
    return false;
  }

  // 对于矩形选择，所有区域内的点都算选中
  if (selectedArea.value.type === 'rectangle') {
    return true;
  }

  // 对于圆形和套索选择，只有非透明像素才算选中
  return selectedArea.value.originalPixels
    ? selectedArea.value.originalPixels[relY][relX] !== 'transparent'
    : false;
};

// 检查点是否在当前选中区域内
const isInCurrentSelection = (x: number, y: number): boolean => {
  if (!selectedArea.value) return false;

  const relX = x - selectedArea.value.x;
  const relY = y - selectedArea.value.y;

  if (
    relX < 0 ||
    relX >= selectedArea.value.width ||
    relY < 0 ||
    relY >= selectedArea.value.height
  ) {
    return false;
  }

  // 对于矩形选择，所有区域内的点都算选中
  if (selectedArea.value.type === 'rectangle') {
    return true;
  }

  // 对于圆形和套索选择，只有非透明像素才算选中
  return selectedArea.value.pixels[relY][relX] !== 'transparent';
};

// 优化渲染：批量处理 + 视窗裁剪
const renderOptimized = (
  bounds: Bounds,
  cellWidth: number,
  cellHeight: number,
) => {
  if (!ctx) return;

  ctx.save();

  // 按颜色分组，减少fillStyle切换次数
  const colorBatches = new Map<string, Array<{ x: number; y: number }>>();

  // 只遍历可见区域
  for (let y = bounds.top; y <= bounds.bottom; y++) {
    for (let x = bounds.left; x <= bounds.right; x++) {
      let color = pixels.value[y]?.[x];

      // 如果选中区域已移动，需要特殊处理
      if (selectedArea.value && selectedArea.value.hasMoved) {
        // 检查当前位置是否在原始选中区域内
        if (isInOriginalSelection(x, y)) {
          // 在原始区域内，不绘制（显示为清除状态）
          continue;
        }

        // 检查当前位置是否在新的选中区域内
        if (isInCurrentSelection(x, y)) {
          // 在新区域内，使用选中区域的像素颜色
          const relativeX = x - selectedArea.value.x;
          const relativeY = y - selectedArea.value.y;
          if (
            relativeX >= 0 &&
            relativeX < selectedArea.value.width &&
            relativeY >= 0 &&
            relativeY < selectedArea.value.height
          ) {
            const selectionColor =
              selectedArea.value.pixels[relativeY][relativeX];
            if (selectionColor !== 'transparent') {
              color = selectionColor;
            }
          }
        }
      }

      if (!color || color === 'transparent' || hiddenColors.value.has(color))
        continue;

      if (!colorBatches.has(color)) {
        colorBatches.set(color, []);
      }
      colorBatches.get(color)!.push({ x, y });
    }
  }

  // 批量绘制每种颜色
  colorBatches.forEach((positions, color) => {
    if (!ctx) return;
    ctx.fillStyle = color;

    // 使用Path2D进行批量绘制（更高效）
    if (positions.length > 10 && cellWidth >= 1 && cellHeight >= 1) {
      const path = new Path2D();
      positions.forEach(({ x, y }) => {
        const screenPos = pixelToScreen(x, y);
        path.rect(screenPos.x, screenPos.y, cellWidth, cellHeight);
      });
      ctx.fill(path);
    } else {
      // 小批量直接绘制
      positions.forEach(({ x, y }) => {
        if (!ctx) return;
        const screenPos = pixelToScreen(x, y);
        ctx.fillRect(screenPos.x, screenPos.y, cellWidth, cellHeight);
      });
    }
  });

  ctx.restore();
};

// 标准渲染：逐个绘制（小画布使用）
const renderStandard = (bounds: Bounds, cellWidth: number, cellHeight: number) => {
  if (!ctx) return;

  ctx.save();
  for (let y = bounds.top; y <= bounds.bottom; y++) {
    for (let x = bounds.left; x <= bounds.right; x++) {
      let color = pixels.value[y]?.[x];

      // 如果选中区域已移动，需要特殊处理
      if (selectedArea.value && selectedArea.value.hasMoved) {
        // 检查当前位置是否在原始选中区域内
        if (isInOriginalSelection(x, y)) {
          // 在原始区域内，不绘制（显示为清除状态）
          continue;
        }

        // 检查当前位置是否在新的选中区域内
        if (isInCurrentSelection(x, y)) {
          // 在新区域内，使用选中区域的像素颜色
          const relativeX = x - selectedArea.value.x;
          const relativeY = y - selectedArea.value.y;
          if (
            relativeX >= 0 &&
            relativeX < selectedArea.value.width &&
            relativeY >= 0 &&
            relativeY < selectedArea.value.height
          ) {
            const selectionColor =
              selectedArea.value.pixels[relativeY][relativeX];
            if (selectionColor !== 'transparent') {
              color = selectionColor;
            }
          }
        }
      }

      if (!color || color === 'transparent' || hiddenColors.value.has(color))
        continue;

      const screenPos = pixelToScreen(x, y);
      ctx.fillStyle = color;
      ctx.fillRect(screenPos.x, screenPos.y, cellWidth, cellHeight);
    }
  }
  ctx.restore();
};

// 判断是否应该显示网格 - 添加缩放率判断
const shouldShowGrid = (
  cellWidth: number,
  cellHeight: number,
  totalCells: number,
) => {
  // 缩放率低于80%时隐藏网格
  if (zoom.value < 0.8) {
    return false;
  }

  // 只要格子大小合理就显示网格，不再因为数量限制隐藏
  return Math.min(cellWidth, cellHeight) >= 0.5;
};

// 简化网格密度策略 - 缩减为3种情况，统一半透明浅色样式
const getSimplifiedGridStrategy = (cellWidth: number, cellHeight: number) => {
  const minCellSize = Math.min(cellWidth, cellHeight);

  // 简化为3种情况
  if (minCellSize < 2) {
    // 小格子：稀疏网格，每10格显示一条线
    return { stepX: 10, stepY: 10 };
  } else if (minCellSize < 6) {
    // 中等格子：中密度网格，每5格显示一条线
    return { stepX: 5, stepY: 5 };
  } else {
    // 大格子：完整网格，每格都显示
    return { stepX: 1, stepY: 1 };
  }
};

// 简化的网格渲染 - 统一半透明浅色样式
const renderSimplifiedGrid = (
  bounds: Bounds,
  cellWidth: number,
  cellHeight: number,
) => {
  if (!ctx || !canvas.value) return;

  const strategy = getSimplifiedGridStrategy(cellWidth, cellHeight);

  ctx.save();

  // 统一样式：半透明浅色
  ctx.strokeStyle = '#ddd'; // 浅灰色
  ctx.lineWidth = 1; // 固定线宽
  ctx.globalAlpha = 0.4; // 半透明

  drawGridLines(bounds, cellWidth, cellHeight, strategy.stepX, strategy.stepY);

  ctx.restore();
};

// 优化的基础网格绘制函数
const drawGridLines = (
  bounds: Bounds,
  cellWidth: number,
  cellHeight: number,
  stepX: number,
  stepY: number,
) => {
  if (!ctx || !canvas.value) return;

  drawGridLinesToContext(
    ctx,
    bounds,
    cellWidth,
    cellHeight,
    stepX,
    stepY,
    offset.value.x,
    offset.value.y,
  );
};

const drawGridLinesToContext = (
  context: CanvasRenderingContext2D,
  bounds: Bounds,
  cellWidth: number,
  cellHeight: number,
  stepX: number,
  stepY: number,
  offsetX: number,
  offsetY: number,
) => {
  context.beginPath();

  // 计算绘制范围
  const startX = Math.max(0, Math.floor(bounds.left / stepX) * stepX);
  const endX = Math.min(
    canvasWidth.value,
    Math.ceil(bounds.right / stepX) * stepX,
  );
  const startY = Math.max(0, Math.floor(bounds.top / stepY) * stepY);
  const endY = Math.min(
    canvasHeight.value,
    Math.ceil(bounds.bottom / stepY) * stepY,
  );

  // 绘制垂直线
  for (let x = startX; x <= endX; x += stepX) {
    const screenX = offsetX + x * cellWidth;
    context.moveTo(screenX, offsetY + startY * cellHeight);
    context.lineTo(screenX, offsetY + endY * cellHeight);
  }

  // 绘制水平线
  for (let y = startY; y <= endY; y += stepY) {
    const screenY = offsetY + y * cellHeight;
    context.moveTo(offsetX + startX * cellWidth, screenY);
    context.lineTo(offsetX + endX * cellWidth, screenY);
  }

  context.stroke();
};

// 网格渲染函数
const renderGrid = (bounds: Bounds, cellWidth: number, cellHeight: number) => {
  renderSimplifiedGrid(bounds, cellWidth, cellHeight);
};

// ============= 工具函数 =============

const setTool = (tool: typeof currentTool.value) => {
  // 在切换工具前，检查是否有已移动的选中区域需要应用
  if (selectedArea.value && selectedArea.value.hasMoved) {
    console.log('切换工具时检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
    selectedArea.value = null; // 清除选中区域
  }

  currentTool.value = tool;

  // 根据工具类型设置鼠标样式
  if (canvas.value) {
    switch (tool) {
      case 'move':
        // 移动工具的光标样式会在鼠标移动时动态更新
        canvas.value.style.cursor = 'move';
        break;
      case 'pen':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'eraser':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'fill':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'picker':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'line':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'rectangle':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'circle':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'select':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'circleSelect':
        canvas.value.style.cursor = 'crosshair';
        break;
      case 'lassoSelect':
        canvas.value.style.cursor = 'crosshair';
        break;
      default:
        canvas.value.style.cursor = 'default';
        break;
    }
  }
};

const getToolName = (tool: string) => {
  const names = {
    pen: '画笔',
    eraser: '橡皮擦',
    fill: '填充',
    picker: '取色器',
    move: '移动',
    line: '直线',
    rectangle: '矩形',
    circle: '圆形',
    select: '矩形选择',
    circleSelect: '圆形选择',
    lassoSelect: '套索选择',
  };
  return names[tool as keyof typeof names] || tool;
};

const toggleGrid = () => {
  showGrid.value = !showGrid.value;
  throttledRender();

  // 提供用户反馈
  console.log(`网格${showGrid.value ? '已显示' : '已隐藏'}`);

  // 可选：添加简单的视觉反馈（短暂的toast提示）
  // 这里可以后续扩展添加toast组件
};

const clearCanvas = () => {
  // 在清空画布前，检查是否有已移动的选中区域需要应用
  if (selectedArea.value && selectedArea.value.hasMoved) {
    console.log('清空画布前检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
  }

  initPixelData();
  throttledRender();
  // 保存状态到历史记录
  saveState();

  // 清除选中区域
  selectedArea.value = null;
};

// 沿着x轴翻转画布内容 (水平翻转)
const flipCanvasX = () => {
  // 在翻转画布前，检查是否有已移动的选中区域需要应用
  if (selectedArea.value && selectedArea.value.hasMoved) {
    console.log('水平翻转画布前检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
    selectedArea.value = null; // 清除选中区域
  }

  console.log('开始水平翻转画布内容...');

  // 创建新的像素数组来存储翻转后的内容
  const flippedPixels: string[][] = [];

  // 初始化翻转后的像素数组
  for (let y = 0; y < canvasHeight.value; y++) {
    flippedPixels[y] = [];
    for (let x = 0; x < canvasWidth.value; x++) {
      // 水平翻转：将位置 (x, y) 的像素移动到 (width - 1 - x, y)
      const sourceX = canvasWidth.value - 1 - x;
      flippedPixels[y][x] = pixels.value[y][sourceX] || 'transparent';
    }
  }

  // 更新原始像素数组
  pixels.value = flippedPixels;

  // 重新渲染画布
  render();
  
  // 延迟更新缩略图（等主画布绘制完毕）
  scheduleDelayedThumbnailUpdate();

  // 更新颜色管理
  updateColors();

  // 保存状态到历史记录
  saveState();

  console.log('水平翻转完成');
};

// 沿着y轴翻转画布内容 (垂直翻转)
const flipCanvasY = () => {
  // 在翻转画布前，检查是否有已移动的选中区域需要应用
  if (selectedArea.value && selectedArea.value.hasMoved) {
    console.log('垂直翻转画布前检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
    selectedArea.value = null; // 清除选中区域
  }

  console.log('开始垂直翻转画布内容...');

  // 创建新的像素数组来存储翻转后的内容
  const flippedPixels: string[][] = [];

  // 初始化翻转后的像素数组
  for (let y = 0; y < canvasHeight.value; y++) {
    flippedPixels[y] = [];
    // 垂直翻转：将位置 (x, y) 的像素移动到 (x, height - 1 - y)
    const sourceY = canvasHeight.value - 1 - y;
    for (let x = 0; x < canvasWidth.value; x++) {
      flippedPixels[y][x] = pixels.value[sourceY][x] || 'transparent';
    }
  }

  // 更新原始像素数组
  pixels.value = flippedPixels;

  // 重新渲染画布
  render();
  
  // 延迟更新缩略图（等主画布绘制完毕）
  scheduleDelayedThumbnailUpdate();

  // 更新颜色管理
  updateColors();

  // 保存状态到历史记录
  saveState();

  console.log('垂直翻转完成');
};

// ============= 重构的撤销重做系统 =============

// 保存初始状态（仅在画布初始化时调用一次）
const saveInitialState = () => {
  console.log('保存初始状态...');

  // 深拷贝当前像素状态
  const initialState: string[][] = [];
  for (let y = 0; y < pixels.value.length; y++) {
    initialState[y] = [];
    for (let x = 0; x < pixels.value[y].length; x++) {
      initialState[y][x] = pixels.value[y][x];
    }
  }

  // 创建初始状态的历史记录条目
  const initialEntry: HistoryEntry = {
    type: 'full',
    timestamp: Date.now(),
    fullState: initialState,
  };

  // 清空历史记录并添加初始状态
  historyStack.value = [initialEntry];
  historyIndex.value = 0;

  console.log('初始状态已保存');
};

// ============= 增量历史记录系统 =============

// 开始绘制操作（鼠标按下时调用）
const startDrawingOperation = () => {
  // 如果正在执行撤销/重做操作，不记录
  if (isUndoRedoOperation.value) {
    return;
  }

  // 如果已经有未保存的更改，说明上一个操作还没完成，不重复开始
  if (hasUnsavedChanges.value) {
    return;
  }

  console.log('开始绘制操作，启用增量记录...');

  // 清空当前绘制的变化记录
  currentDrawingChanges = [];
  isDrawingOperation = true;
  hasUnsavedChanges.value = true;
};

// 完成绘制操作（鼠标抬起时调用）
const finishDrawingOperation = () => {
  if (!isDrawingOperation || isUndoRedoOperation.value) {
    return;
  }

  console.log(
    `完成绘制操作，记录了 ${currentDrawingChanges.length} 个像素变化`,
  );

  // 只有当有实际变化时才保存到历史记录
  if (currentDrawingChanges.length > 0) {
    // 移除当前索引之后的所有历史记录（因为有新的操作）
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
    }

    // 创建增量历史记录条目
    const historyEntry: HistoryEntry = {
      type: 'incremental',
      timestamp: Date.now(),
      changes: [...currentDrawingChanges], // 深拷贝变化记录
    };

    // 添加到历史记录
    historyStack.value.push(historyEntry);
    historyIndex.value = historyStack.value.length - 1;

    // 限制历史记录大小
    if (historyStack.value.length > maxHistorySize.value) {
      historyStack.value.shift();
      historyIndex.value--;
    }

    console.log(
      `增量历史记录已保存，当前索引: ${historyIndex.value}, 总数: ${historyStack.value.length}`,
    );
    
    // 绘制操作完成后延迟更新缩略图（等主画布绘制完毕）
    scheduleDelayedThumbnailUpdate();
  }

  // 重置绘制状态
  currentDrawingChanges = [];
  isDrawingOperation = false;
  hasUnsavedChanges.value = false;
};

// 保存操作前状态（兼容性函数，用于非绘制操作）
const saveStateBeforeOperation = () => {
  startDrawingOperation();
};

// 完成操作（在操作结束时调用）
const finishOperation = () => {
  finishDrawingOperation();
};

// 完成操作并保存最终状态（用于交互式绘制操作）
const finishOperationAndSave = () => {
  finishDrawingOperation();
};

// 保存状态（用于非交互式操作，如清空画布、翻转等）
const saveState = () => {
  // 如果正在执行撤销/重做操作，不保存状态
  if (isUndoRedoOperation.value) {
    return;
  }

  console.log('保存全量历史状态...');

  // 深拷贝当前像素状态
  const currentState: string[][] = [];
  for (let y = 0; y < pixels.value.length; y++) {
    currentState[y] = [];
    for (let x = 0; x < pixels.value[y].length; x++) {
      currentState[y][x] = pixels.value[y][x];
    }
  }

  // 移除当前索引之后的所有历史记录（因为有新的操作）
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }

  // 创建全量历史记录条目
  const historyEntry: HistoryEntry = {
    type: 'full',
    timestamp: Date.now(),
    fullState: currentState,
  };

  // 添加新的状态到历史记录
  historyStack.value.push(historyEntry);
  historyIndex.value = historyStack.value.length - 1;

  // 限制历史记录大小
  if (historyStack.value.length > maxHistorySize.value) {
    historyStack.value.shift();
    historyIndex.value--;
  }

  console.log(
    `全量历史状态已保存，当前索引: ${historyIndex.value}, 总数: ${historyStack.value.length}`,
  );
};

// 应用像素变化（用于撤销/重做）
const applyPixelChanges = (changes: PixelChange[], reverse = false) => {
  for (const change of changes) {
    const { x, y, oldColor, newColor } = change;
    const targetColor = reverse ? oldColor : newColor;

    if (x >= 0 && x < canvasWidth.value && y >= 0 && y < canvasHeight.value) {
      pixels.value[y][x] = targetColor;
    }
  }
};

const undo = () => {
  if (historyIndex.value <= 0) {
    console.warn('没有可以撤销的操作');
    return;
  }

  // 在撤销前，检查是否有已移动的选中区域需要应用
  if (selectedArea.value && selectedArea.value.hasMoved) {
    console.log('撤销操作前检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
    selectedArea.value = null; // 清除选中区域
  }

  console.log('执行撤销操作...');

  isUndoRedoOperation.value = true;
  hasUnsavedChanges.value = false; // 重置未保存更改标记

  // 获取当前要撤销的操作
  const currentEntry = historyStack.value[historyIndex.value];

  if (currentEntry.type === 'incremental' && currentEntry.changes) {
    // 增量撤销：反向应用变化
    applyPixelChanges(currentEntry.changes, true);
    console.log(`撤销了 ${currentEntry.changes.length} 个像素变化`);
  } else if (currentEntry.type === 'full' && currentEntry.fullState) {
    // 全量撤销：恢复到前一个状态
    const previousEntry = historyStack.value[historyIndex.value - 1];
    if (previousEntry && previousEntry.fullState) {
      for (let y = 0; y < previousEntry.fullState.length; y++) {
        for (let x = 0; x < previousEntry.fullState[y].length; x++) {
          pixels.value[y][x] = previousEntry.fullState[y][x];
        }
      }
    }
  }

  // 移动到前一个状态
  historyIndex.value--;

  // 重新渲染和更新
  render();
  
  // 防抖更新缩略图
  debouncedUpdateThumbnail();

  // 撤销后重建颜色追踪器
  rebuildColorTracker();

  isUndoRedoOperation.value = false;

  console.log(`撤销完成，当前索引: ${historyIndex.value}`);
};

const redo = () => {
  if (historyIndex.value >= historyStack.value.length - 1) {
    console.warn('没有可以重做的操作');
    return;
  }

  // 在重做前，检查是否有已移动的选中区域需要应用
  if (selectedArea.value && selectedArea.value.hasMoved) {
    console.log('重做操作前检测到已移动的选中区域，应用移动');
    applySelectionMoveOnClear();
    selectedArea.value = null; // 清除选中区域
  }

  console.log('执行重做操作...');

  isUndoRedoOperation.value = true;
  hasUnsavedChanges.value = false; // 重置未保存更改标记

  // 移动到下一个状态
  historyIndex.value++;

  // 获取要重做的操作
  const nextEntry = historyStack.value[historyIndex.value];

  if (nextEntry.type === 'incremental' && nextEntry.changes) {
    // 增量重做：正向应用变化
    applyPixelChanges(nextEntry.changes, false);
    console.log(`重做了 ${nextEntry.changes.length} 个像素变化`);
  } else if (nextEntry.type === 'full' && nextEntry.fullState) {
    // 全量重做：恢复到指定状态
    for (let y = 0; y < nextEntry.fullState.length; y++) {
      for (let x = 0; x < nextEntry.fullState[y].length; x++) {
        pixels.value[y][x] = nextEntry.fullState[y][x];
      }
    }
  }

  // 重新渲染和更新
  render();
  
  // 防抖更新缩略图
  debouncedUpdateThumbnail();

  // 重做后重建颜色追踪器
  rebuildColorTracker();

  isUndoRedoOperation.value = false;

  console.log(`重做完成，当前索引: ${historyIndex.value}`);
};

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(
  () => historyIndex.value < historyStack.value.length - 1,
);

// 矩形选择相关函数
const createSelection = (x1: number, y1: number, x2: number, y2: number) => {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // 提取选择区域的像素数据
  const selectedPixels: string[][] = [];
  for (let y = 0; y < height; y++) {
    selectedPixels[y] = [];
    for (let x = 0; x < width; x++) {
      const sourceX = minX + x;
      const sourceY = minY + y;
      if (
        sourceX >= 0 &&
        sourceX < canvasWidth.value &&
        sourceY >= 0 &&
        sourceY < canvasHeight.value
      ) {
        selectedPixels[y][x] = pixels.value[sourceY][sourceX];
      } else {
        selectedPixels[y][x] = 'transparent';
      }
    }
  }

  selectedArea.value = {
    x: minX,
    y: minY,
    width,
    height,
    pixels: selectedPixels,
    type: 'rectangle',
    // 保存原始状态
    originalX: minX,
    originalY: minY,
    originalPixels: JSON.parse(JSON.stringify(selectedPixels)),
    hasMoved: false,
  };

  console.log('创建选择区域:', selectedArea.value);
};

// 圆形选择相关函数
const createCircleSelection = (
  centerX: number,
  centerY: number,
  endX: number,
  endY: number,
) => {
  // 计算圆的半径
  const dx = endX - centerX;
  const dy = endY - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);

  // 计算包围盒
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(canvasWidth.value - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(canvasHeight.value - 1, Math.ceil(centerY + radius));

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // 提取圆形选择区域的像素数据
  const selectedPixels: string[][] = [];
  for (let y = 0; y < height; y++) {
    selectedPixels[y] = [];
    for (let x = 0; x < width; x++) {
      const sourceX = minX + x;
      const sourceY = minY + y;

      // 检查当前像素是否在圆形范围内
      const pixelDx = sourceX - centerX;
      const pixelDy = sourceY - centerY;
      const pixelDistance = Math.sqrt(pixelDx * pixelDx + pixelDy * pixelDy);

      if (
        pixelDistance <= radius &&
        sourceX >= 0 &&
        sourceX < canvasWidth.value &&
        sourceY >= 0 &&
        sourceY < canvasHeight.value
      ) {
        selectedPixels[y][x] = pixels.value[sourceY][sourceX];
      } else {
        selectedPixels[y][x] = 'transparent';
      }
    }
  }

  selectedArea.value = {
    x: minX,
    y: minY,
    width,
    height,
    pixels: selectedPixels,
    type: 'circle',
    centerX,
    centerY,
    radius,
    // 保存原始状态
    originalX: minX,
    originalY: minY,
    originalPixels: JSON.parse(JSON.stringify(selectedPixels)),
    originalCenterX: centerX,
    originalCenterY: centerY,
    hasMoved: false,
  };

  console.log('创建圆形选择区域:', selectedArea.value);
};

// 点在多边形内算法（射线投射算法）
const isPointInPolygon = (
  x: number,
  y: number,
  polygon: { x: number; y: number }[],
): boolean => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

// 套索选择相关函数
const createLassoSelection = (path: { x: number; y: number }[]) => {
  if (path.length < 3) {
    console.warn('套索路径点数不足，无法创建选择区域');
    return;
  }

  // 计算包围盒
  let minX = Math.min(...path.map((p) => p.x));
  let maxX = Math.max(...path.map((p) => p.x));
  let minY = Math.min(...path.map((p) => p.y));
  let maxY = Math.max(...path.map((p) => p.y));

  // 确保在画布范围内
  minX = Math.max(0, minX);
  maxX = Math.min(canvasWidth.value - 1, maxX);
  minY = Math.max(0, minY);
  maxY = Math.min(canvasHeight.value - 1, maxY);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // 提取套索选择区域的像素数据
  const selectedPixels: string[][] = [];
  for (let y = 0; y < height; y++) {
    selectedPixels[y] = [];
    for (let x = 0; x < width; x++) {
      const sourceX = minX + x;
      const sourceY = minY + y;

      // 检查当前像素是否在套索路径内
      if (
        isPointInPolygon(sourceX, sourceY, path) &&
        sourceX >= 0 &&
        sourceX < canvasWidth.value &&
        sourceY >= 0 &&
        sourceY < canvasHeight.value
      ) {
        selectedPixels[y][x] = pixels.value[sourceY][sourceX];
      } else {
        selectedPixels[y][x] = 'transparent';
      }
    }
  }

  selectedArea.value = {
    x: minX,
    y: minY,
    width,
    height,
    pixels: selectedPixels,
    type: 'lasso',
    path,
    // 保存原始状态
    originalX: minX,
    originalY: minY,
    originalPixels: JSON.parse(JSON.stringify(selectedPixels)),
    originalPath: JSON.parse(JSON.stringify(path)),
    hasMoved: false,
  };

  console.log('创建套索选择区域:', selectedArea.value);
};

// 在清除选中时应用移动（如果有移动的话）
const applySelectionMoveOnClear = () => {
  if (!selectedArea.value || !selectedArea.value.hasMoved) return;

  console.log('在清除选中时应用移动:', {
    原始位置: {
      x: selectedArea.value.originalX,
      y: selectedArea.value.originalY,
    },
    当前位置: { x: selectedArea.value.x, y: selectedArea.value.y },
    选择类型: selectedArea.value.type,
  });

  // 保存操作前状态
  saveStateBeforeOperation();

  // 先从原始位置清除像素（如果原始像素数据存在）
  if (
    selectedArea.value.originalPixels &&
    selectedArea.value.originalX !== undefined &&
    selectedArea.value.originalY !== undefined
  ) {
    for (let y = 0; y < selectedArea.value.height; y++) {
      for (let x = 0; x < selectedArea.value.width; x++) {
        const targetX = selectedArea.value.originalX + x;
        const targetY = selectedArea.value.originalY + y;

        if (
          targetX >= 0 &&
          targetX < canvasWidth.value &&
          targetY >= 0 &&
          targetY < canvasHeight.value
        ) {
          // 根据选择类型决定清除策略
          if (selectedArea.value.type === 'rectangle') {
            // 矩形选择：清除所有像素
            pixels.value[targetY][targetX] = 'transparent';
          } else {
            // 圆形和套索选择：只清除原来有内容的像素
            if (selectedArea.value.originalPixels[y][x] !== 'transparent') {
              pixels.value[targetY][targetX] = 'transparent';
            }
          }
        }
      }
    }
  }

  // 在新位置应用像素
  for (let y = 0; y < selectedArea.value.height; y++) {
    for (let x = 0; x < selectedArea.value.width; x++) {
      const pixelColor = selectedArea.value.pixels[y][x];
      if (pixelColor !== 'transparent') {
        const targetX = selectedArea.value.x + x;
        const targetY = selectedArea.value.y + y;

        if (
          targetX >= 0 &&
          targetX < canvasWidth.value &&
          targetY >= 0 &&
          targetY < canvasHeight.value
        ) {
          pixels.value[targetY][targetX] = pixelColor;
        }
      }
    }
  }

  // 重新渲染确保显示一致性
  render();
  updateColors();
  finishOperation();
  console.log('移动已应用到画布，类型:', selectedArea.value.type);
};

// 确保选中区域数据的一致性
const ensureSelectionConsistency = () => {
  if (!selectedArea.value) return;

  console.log('检查选中区域数据一致性');

  // 验证像素数据的完整性
  if (
    !selectedArea.value.pixels ||
    selectedArea.value.pixels.length !== selectedArea.value.height
  ) {
    console.warn('选中区域像素数据不完整，尝试修复');

    // 重新构建像素数据
    const newPixels: string[][] = [];
    for (let y = 0; y < selectedArea.value.height; y++) {
      newPixels[y] = [];
      for (let x = 0; x < selectedArea.value.width; x++) {
        const canvasX = selectedArea.value.x + x;
        const canvasY = selectedArea.value.y + y;

        if (
          canvasX >= 0 &&
          canvasX < canvasWidth.value &&
          canvasY >= 0 &&
          canvasY < canvasHeight.value
        ) {
          newPixels[y][x] = pixels.value[canvasY][canvasX];
        } else {
          newPixels[y][x] = 'transparent';
        }
      }
    }
    selectedArea.value.pixels = newPixels;
  }

  // 验证原始像素数据的完整性
  if (
    selectedArea.value.hasMoved &&
    (!selectedArea.value.originalPixels ||
      selectedArea.value.originalPixels.length !== selectedArea.value.height)
  ) {
    console.warn('原始像素数据不完整，可能影响移动操作');
  }

  console.log('选中区域数据一致性检查完成');
};

// 取消选中区域的移动，恢复到原始位置
const cancelSelectionMove = () => {
  if (!selectedArea.value || !selectedArea.value.hasMoved) return;

  console.log('取消选中区域移动，恢复到原始位置');

  // 恢复到原始位置
  if (
    selectedArea.value.originalX !== undefined &&
    selectedArea.value.originalY !== undefined
  ) {
    selectedArea.value.x = selectedArea.value.originalX;
    selectedArea.value.y = selectedArea.value.originalY;
  }

  // 恢复圆形选择的中心点
  if (
    selectedArea.value.originalCenterX !== undefined &&
    selectedArea.value.originalCenterY !== undefined
  ) {
    selectedArea.value.centerX = selectedArea.value.originalCenterX;
    selectedArea.value.centerY = selectedArea.value.originalCenterY;
  }

  // 恢复套索选择的路径
  if (selectedArea.value.originalPath) {
    selectedArea.value.path = JSON.parse(
      JSON.stringify(selectedArea.value.originalPath),
    );
  }

  selectedArea.value.hasMoved = false;
  render();

  console.log('选中区域已恢复到原始位置');
};

const clearSelection = () => {
  // 如果选中区域已经移动，则在清除选中时应用移动
  if (selectedArea.value && selectedArea.value.hasMoved) {
    applySelectionMoveOnClear();
  }

  selectedArea.value = null;
  render();
};

const copySelection = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以复制');
    return;
  }

  // 将选择区域的数据复制到剪贴板（这里用localStorage模拟）
  const selectionData = JSON.stringify(selectedArea.value.pixels);
  localStorage.setItem('pixelEditor_clipboard', selectionData);
  console.log('已复制选择区域到剪贴板');
};

const cutSelection = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以剪切');
    return;
  }

  // 保存操作前状态
  saveStateBeforeOperation();

  // 先复制
  copySelection();

  // 然后删除选择区域的内容
  deleteSelectionInternal();

  // 完成操作
  finishOperation();
};

const deleteSelection = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以删除');
    return;
  }

  // 保存操作前状态
  saveStateBeforeOperation();

  deleteSelectionInternal();

  // 完成操作
  finishOperation();
};

// 内部删除函数，不处理状态保存
const deleteSelectionInternal = () => {
  if (!selectedArea.value) return;

  // 清空选择区域的像素
  for (let y = 0; y < selectedArea.value.height; y++) {
    for (let x = 0; x < selectedArea.value.width; x++) {
      const targetX = selectedArea.value.x + x;
      const targetY = selectedArea.value.y + y;

      // 对于矩形选择，清空所有像素
      // 对于圆形选择和套索选择，只清空选择区域内的像素（不是透明的像素）
      if (
        selectedArea.value.type === 'circle' ||
        selectedArea.value.type === 'lasso'
      ) {
        // 检查这个像素是否在原选择区域内（不是透明的）
        if (selectedArea.value.pixels[y][x] !== 'transparent') {
          if (
            targetX >= 0 &&
            targetX < canvasWidth.value &&
            targetY >= 0 &&
            targetY < canvasHeight.value
          ) {
            pixels.value[targetY][targetX] = 'transparent';
          }
        }
      } else {
        // 矩形选择：清空所有像素
        if (
          targetX >= 0 &&
          targetX < canvasWidth.value &&
          targetY >= 0 &&
          targetY < canvasHeight.value
        ) {
          pixels.value[targetY][targetX] = 'transparent';
        }
      }
    }
  }

  render();
  updateColors();
  clearSelection();

  console.log('已删除选择区域的内容');
};

const pasteSelection = (targetX: number = 0, targetY: number = 0) => {
  const clipboardData = localStorage.getItem('pixelEditor_clipboard');
  if (!clipboardData) {
    console.warn('剪贴板为空，无法粘贴');
    return;
  }

  try {
    // 保存操作前状态
    saveStateBeforeOperation();

    const pastePixels: string[][] = JSON.parse(clipboardData);

    // 粘贴像素数据
    for (let y = 0; y < pastePixels.length; y++) {
      for (let x = 0; x < pastePixels[y].length; x++) {
        const destX = targetX + x;
        const destY = targetY + y;
        if (
          destX >= 0 &&
          destX < canvasWidth.value &&
          destY >= 0 &&
          destY < canvasHeight.value &&
          pastePixels[y][x] !== 'transparent'
        ) {
          pixels.value[destY][destX] = pastePixels[y][x];
        }
      }
    }

    render();
    updateColors();

    // 完成操作
    finishOperation();

    console.log('已粘贴内容到位置:', [targetX, targetY]);
  } catch (error) {
    console.error('粘贴失败:', error);
  }
};

// ============= 高级移动功能 =============

const activateDragMove = () => {
  currentTool.value = 'move';
  console.log('已激活拖拽移动工具');
};

const moveSelection = (deltaX: number, deltaY: number) => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以移动');
    return;
  }

  // 计算新的位置
  const newX = selectedArea.value.x + deltaX;
  const newY = selectedArea.value.y + deltaY;

  // 检查边界
  if (
    newX >= 0 &&
    newY >= 0 &&
    newX + selectedArea.value.width <= canvasWidth.value &&
    newY + selectedArea.value.height <= canvasHeight.value
  ) {
    // 更新选择区域预览位置（不修改画布）
    selectedArea.value.x = newX;
    selectedArea.value.y = newY;
    selectedArea.value.hasMoved = true; // 标记已移动

    // 更新圆形选择的中心点
    if (
      selectedArea.value.type === 'circle' &&
      selectedArea.value.centerX !== undefined &&
      selectedArea.value.centerY !== undefined
    ) {
      selectedArea.value.centerX += deltaX;
      selectedArea.value.centerY += deltaY;
    }

    // 更新套索选择的路径
    if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
      selectedArea.value.path = selectedArea.value.path.map((point: { x: number; y: number }) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }));
    }

    // 只重新渲染预览，不修改画布数据
    render();

    console.log(`选择区域预览位置已更新到: (${newX}, ${newY})`);
  } else {
    console.warn('移动超出画布边界，操作已取消');
  }
};

const moveSelectionUp = () => moveSelection(0, -1);
const moveSelectionDown = () => moveSelection(0, 1);
const moveSelectionLeft = () => moveSelection(-1, 0);
const moveSelectionRight = () => moveSelection(1, 0);

// ============= 选择区域变换功能 =============

const flipSelectionX = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以翻转');
    return;
  }

  console.log('开始水平翻转选中区域');

  // 创建翻转后的像素数组
  const flippedPixels: string[][] = [];

  for (let y = 0; y < selectedArea.value.height; y++) {
    flippedPixels[y] = [];
    for (let x = 0; x < selectedArea.value.width; x++) {
      // 水平翻转：将位置 (x, y) 的像素移动到 (width - 1 - x, y)
      const sourceX = selectedArea.value.width - 1 - x;
      flippedPixels[y][x] = selectedArea.value.pixels[y][sourceX];
    }
  }

  // 更新选择区域的像素数据
  selectedArea.value.pixels = flippedPixels;

  // 如果有原始像素数据，也要翻转
  if (selectedArea.value.originalPixels) {
    const flippedOriginalPixels: string[][] = [];
    for (let y = 0; y < selectedArea.value.height; y++) {
      flippedOriginalPixels[y] = [];
      for (let x = 0; x < selectedArea.value.width; x++) {
        const sourceX = selectedArea.value.width - 1 - x;
        flippedOriginalPixels[y][x] =
          selectedArea.value.originalPixels[y][sourceX];
      }
    }
    selectedArea.value.originalPixels = flippedOriginalPixels;
  }

  // 处理不同类型选择区域的选择框翻转
  if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
    // 套索选择：翻转路径点的x坐标
    selectedArea.value.path = selectedArea.value.path.map((point: { x: number; y: number }) => ({
      x:
        selectedArea.value!.x +
        (selectedArea.value!.width - 1 - (point.x - selectedArea.value!.x)),
      y: point.y,
    }));

    // 同时翻转原始路径
    if (selectedArea.value.originalPath) {
      selectedArea.value.originalPath = selectedArea.value.originalPath.map(
        (point: { x: number; y: number }) => ({
          x:
            selectedArea.value!.originalX! +
            (selectedArea.value!.width -
              1 -
              (point.x - selectedArea.value!.originalX!)),
          y: point.y,
        }),
      );
    }
  }

  // 圆形选择和矩形选择的中心点和位置不需要改变，因为我们是在原地翻转内容

  // 标记已移动，这样在清除选择时会应用变换
  selectedArea.value.hasMoved = true;

  // 重新渲染预览
  render();

  console.log('选中区域水平翻转完成');
};

const flipSelectionY = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以翻转');
    return;
  }

  console.log('开始垂直翻转选中区域');

  // 创建翻转后的像素数组
  const flippedPixels: string[][] = [];

  for (let y = 0; y < selectedArea.value.height; y++) {
    flippedPixels[y] = [];
    // 垂直翻转：将位置 (x, y) 的像素移动到 (x, height - 1 - y)
    const sourceY = selectedArea.value.height - 1 - y;
    for (let x = 0; x < selectedArea.value.width; x++) {
      flippedPixels[y][x] = selectedArea.value.pixels[sourceY][x];
    }
  }

  // 更新选择区域的像素数据
  selectedArea.value.pixels = flippedPixels;

  // 如果有原始像素数据，也要翻转
  if (selectedArea.value.originalPixels) {
    const flippedOriginalPixels: string[][] = [];
    for (let y = 0; y < selectedArea.value.height; y++) {
      flippedOriginalPixels[y] = [];
      const sourceY = selectedArea.value.height - 1 - y;
      for (let x = 0; x < selectedArea.value.width; x++) {
        flippedOriginalPixels[y][x] =
          selectedArea.value.originalPixels[sourceY][x];
      }
    }
    selectedArea.value.originalPixels = flippedOriginalPixels;
  }

  // 处理不同类型选择区域的选择框翻转
  if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
    // 套索选择：翻转路径点的y坐标
    selectedArea.value.path = selectedArea.value.path.map((point: { x: number; y: number }) => ({
      x: point.x,
      y:
        selectedArea.value!.y +
        (selectedArea.value!.height - 1 - (point.y - selectedArea.value!.y)),
    }));

    // 同时翻转原始路径
    if (selectedArea.value.originalPath) {
      selectedArea.value.originalPath = selectedArea.value.originalPath.map(
        (point: { x: number; y: number }) => ({
          x: point.x,
          y:
            selectedArea.value!.originalY! +
            (selectedArea.value!.height -
              1 -
              (point.y - selectedArea.value!.originalY!)),
        }),
      );
    }
  }

  // 圆形选择和矩形选择的中心点和位置不需要改变，因为我们是在原地翻转内容

  // 标记已移动，这样在清除选择时会应用变换
  selectedArea.value.hasMoved = true;

  // 重新渲染预览
  render();

  console.log('选中区域垂直翻转完成');
};

// 顺时针旋转90度
const rotateSelectionCW = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以旋转');
    return;
  }

  console.log('开始顺时针旋转90度选中区域');

  // 获取原始尺寸
  const originalWidth = selectedArea.value.width;
  const originalHeight = selectedArea.value.height;

  // 旋转后的尺寸（宽高互换）
  const newWidth = originalHeight;
  const newHeight = originalWidth;

  // 创建旋转后的像素数组
  const rotatedPixels: string[][] = [];

  for (let y = 0; y < newHeight; y++) {
    rotatedPixels[y] = [];
    for (let x = 0; x < newWidth; x++) {
      // 顺时针90度旋转：新坐标(x, y) 对应原坐标(y, originalWidth - 1 - x)
      const sourceX = y;
      const sourceY = originalWidth - 1 - x;
      rotatedPixels[y][x] = selectedArea.value.pixels[sourceY][sourceX];
    }
  }

  // 更新选择区域的尺寸和像素数据
  selectedArea.value.width = newWidth;
  selectedArea.value.height = newHeight;
  selectedArea.value.pixels = rotatedPixels;

  // 如果有原始像素数据，也要旋转
  if (selectedArea.value.originalPixels) {
    const rotatedOriginalPixels: string[][] = [];
    for (let y = 0; y < newHeight; y++) {
      rotatedOriginalPixels[y] = [];
      for (let x = 0; x < newWidth; x++) {
        const sourceX = y;
        const sourceY = originalWidth - 1 - x;
        rotatedOriginalPixels[y][x] =
          selectedArea.value.originalPixels[sourceY][sourceX];
      }
    }
    selectedArea.value.originalPixels = rotatedOriginalPixels;
  }

  // 处理不同类型选择区域的选择框旋转
  if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
    // 套索选择：旋转路径点
    const centerX = selectedArea.value.x + originalWidth / 2;
    const centerY = selectedArea.value.y + originalHeight / 2;

    selectedArea.value.path = selectedArea.value.path.map((point: { x: number; y: number }) => {
      // 相对于中心点的坐标
      const relativeX = point.x - centerX;
      const relativeY = point.y - centerY;

      // 顺时针90度旋转：(x, y) -> (y, -x)
      const rotatedX = relativeY;
      const rotatedY = -relativeX;

      // 转换回绝对坐标，考虑新的选择区域中心
      const newCenterX = selectedArea.value!.x + newWidth / 2;
      const newCenterY = selectedArea.value!.y + newHeight / 2;

      return {
        x: newCenterX + rotatedX,
        y: newCenterY + rotatedY,
      };
    });

    // 同时旋转原始路径
    if (selectedArea.value.originalPath) {
      const originalCenterX = selectedArea.value.originalX! + originalWidth / 2;
      const originalCenterY =
        selectedArea.value.originalY! + originalHeight / 2;

      selectedArea.value.originalPath = selectedArea.value.originalPath.map(
        (point) => {
          const relativeX = point.x - originalCenterX;
          const relativeY = point.y - originalCenterY;

          const rotatedX = relativeY;
          const rotatedY = -relativeX;

          const newOriginalCenterX =
            selectedArea.value!.originalX! + newWidth / 2;
          const newOriginalCenterY =
            selectedArea.value!.originalY! + newHeight / 2;

          return {
            x: newOriginalCenterX + rotatedX,
            y: newOriginalCenterY + rotatedY,
          };
        },
      );
    }
  }

  // 圆形选择需要调整中心点和半径（因为宽高可能不同）
  if (selectedArea.value.type === 'circle') {
    // 对于圆形选择，我们保持选择区域的中心不变，但需要调整边界框
    // 这里可能需要根据具体需求调整
  }

  // 标记已移动，这样在清除选择时会应用变换
  selectedArea.value.hasMoved = true;

  // 重新渲染预览
  render();

  console.log('选中区域顺时针旋转90度完成');
};

// 逆时针旋转90度
const rotateSelectionCCW = () => {
  if (!selectedArea.value) {
    console.warn('没有选择区域可以旋转');
    return;
  }

  console.log('开始逆时针旋转90度选中区域');

  // 获取原始尺寸
  const originalWidth = selectedArea.value.width;
  const originalHeight = selectedArea.value.height;

  // 旋转后的尺寸（宽高互换）
  const newWidth = originalHeight;
  const newHeight = originalWidth;

  // 创建旋转后的像素数组
  const rotatedPixels: string[][] = [];

  for (let y = 0; y < newHeight; y++) {
    rotatedPixels[y] = [];
    for (let x = 0; x < newWidth; x++) {
      // 逆时针90度旋转：新坐标(x, y) 对应原坐标(originalHeight - 1 - y, x)
      const sourceX = originalHeight - 1 - y;
      const sourceY = x;
      rotatedPixels[y][x] = selectedArea.value.pixels[sourceY][sourceX];
    }
  }

  // 更新选择区域的尺寸和像素数据
  selectedArea.value.width = newWidth;
  selectedArea.value.height = newHeight;
  selectedArea.value.pixels = rotatedPixels;

  // 如果有原始像素数据，也要旋转
  if (selectedArea.value.originalPixels) {
    const rotatedOriginalPixels: string[][] = [];
    for (let y = 0; y < newHeight; y++) {
      rotatedOriginalPixels[y] = [];
      for (let x = 0; x < newWidth; x++) {
        const sourceX = originalHeight - 1 - y;
        const sourceY = x;
        rotatedOriginalPixels[y][x] =
          selectedArea.value.originalPixels[sourceY][sourceX];
      }
    }
    selectedArea.value.originalPixels = rotatedOriginalPixels;
  }

  // 处理不同类型选择区域的选择框旋转
  if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
    // 套索选择：旋转路径点
    const centerX = selectedArea.value.x + originalWidth / 2;
    const centerY = selectedArea.value.y + originalHeight / 2;

    selectedArea.value.path = selectedArea.value.path.map((point: { x: number; y: number }) => {
      // 相对于中心点的坐标
      const relativeX = point.x - centerX;
      const relativeY = point.y - centerY;

      // 逆时针90度旋转：(x, y) -> (-y, x)
      const rotatedX = -relativeY;
      const rotatedY = relativeX;

      // 转换回绝对坐标，考虑新的选择区域中心
      const newCenterX = selectedArea.value!.x + newWidth / 2;
      const newCenterY = selectedArea.value!.y + newHeight / 2;

      return {
        x: newCenterX + rotatedX,
        y: newCenterY + rotatedY,
      };
    });

    // 同时旋转原始路径
    if (selectedArea.value.originalPath) {
      const originalCenterX = selectedArea.value.originalX! + originalWidth / 2;
      const originalCenterY =
        selectedArea.value.originalY! + originalHeight / 2;

      selectedArea.value.originalPath = selectedArea.value.originalPath.map(
        (point: { x: number; y: number }) => {
          const relativeX = point.x - originalCenterX;
          const relativeY = point.y - originalCenterY;

          const rotatedX = -relativeY;
          const rotatedY = relativeX;

          const newOriginalCenterX =
            selectedArea.value!.originalX! + newWidth / 2;
          const newOriginalCenterY =
            selectedArea.value!.originalY! + newHeight / 2;

          return {
            x: newOriginalCenterX + rotatedX,
            y: newOriginalCenterY + rotatedY,
          };
        },
      );
    }
  }

  // 圆形选择需要调整中心点和半径（因为宽高可能不同）
  if (selectedArea.value.type === 'circle') {
    // 对于圆形选择，我们保持选择区域的中心不变，但需要调整边界框
    // 这里可能需要根据具体需求调整
  }

  // 标记已移动，这样在清除选择时会应用变换
  selectedArea.value.hasMoved = true;

  // 重新渲染预览
  render();

  console.log('选中区域逆时针旋转90度完成');
};

const resetView = () => {
  zoom.value = 1;
  centerView();
  render();
};

const testDraw = () => {
  // 绘制一些测试像素来验证渲染
  const centerX = Math.floor(canvasWidth.value / 2);
  const centerY = Math.floor(canvasHeight.value / 2);

  console.log('测试绘制，中心点:', centerX, centerY);

  // 绘制一个小十字
  if (
    centerX >= 0 &&
    centerX < canvasWidth.value &&
    centerY >= 0 &&
    centerY < canvasHeight.value
  ) {
    pixels.value[centerY][centerX] = '#ff0000'; // 红色中心点
    if (centerX > 0) pixels.value[centerY][centerX - 1] = '#00ff00'; // 绿色左
    if (centerX < canvasWidth.value - 1)
      pixels.value[centerY][centerX + 1] = '#00ff00'; // 绿色右
    if (centerY > 0) pixels.value[centerY - 1][centerX] = '#0000ff'; // 蓝色上
    if (centerY < canvasHeight.value - 1)
      pixels.value[centerY + 1][centerX] = '#0000ff'; // 蓝色下

    // 在四个角落绘制点
    pixels.value[0][0] = '#ffff00'; // 黄色左上
    pixels.value[0][canvasWidth.value - 1] = '#ff00ff'; // 紫色右上
    pixels.value[canvasHeight.value - 1][0] = '#00ffff'; // 青色左下
    pixels.value[canvasHeight.value - 1][canvasWidth.value - 1] = '#ffffff'; // 白色右下

    render();
    updateColors();
    console.log('测试像素已绘制');
  }
};

const testMultiScreen = () => {
  console.log('=== 多屏幕环境诊断 ===');

  if (!canvas.value) return;

  const rect = canvas.value.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  console.log('屏幕信息:', {
    设备像素比: dpr,
    屏幕总宽度: screen.width,
    屏幕总高度: screen.height,
    可用屏幕宽度: screen.availWidth,
    可用屏幕高度: screen.availHeight,
  });

  console.log('窗口信息:', {
    窗口内宽: window.innerWidth,
    窗口内高: window.innerHeight,
    窗口外宽: window.outerWidth,
    窗口外高: window.outerHeight,
    窗口X位置: window.screenX,
    窗口Y位置: window.screenY,
  });

  console.log('Canvas元素信息:', {
    显示尺寸: [
      parseFloat(canvas.value.style.width) || canvas.value.clientWidth,
      parseFloat(canvas.value.style.height) || canvas.value.clientHeight,
    ],
    实际尺寸: [canvas.value.width, canvas.value.height],
    边界矩形: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    },
    样式尺寸: [canvas.value.style.width, canvas.value.style.height],
    客户端尺寸: [canvas.value.clientWidth, canvas.value.clientHeight],
  });

  console.log('坐标系统信息:', {
    像素大小: `${pixelWidth.value.toFixed(1)}x${pixelHeight.value.toFixed(1)}`,
    缩放级别: zoom.value,
    格子大小: `${pixelWidth.value.toFixed(1)}x${pixelHeight.value.toFixed(1)}`,
    偏移量: offset.value,
    网格显示: showGrid.value,
  });

  console.log('建议: 将窗口拖到不同屏幕测试坐标转换是否准确');
  console.log('===== 坐标转换优化 =====');
  console.log('已采用CSS坐标系统，避免设备像素比干扰');
  console.log('现在所有屏幕应该都有准确的绘制定位');
};

// 实时坐标测试 - 临时启用详细日志
const enableCoordinateDebug = () => {
  const debugMode = true;

  const originalScreenToPixel = screenToPixel;

  // 临时重写函数以显示详细调试信息
  (window as any).debugScreenToPixel = (screenX: number, screenY: number) => {
    if (!canvas.value) return { x: -1, y: -1 };

    const rect = canvas.value.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    const x = canvasX - offset.value.x;
    const y = canvasY - offset.value.y;
    const cellSize = Math.min(pixelWidth.value, pixelHeight.value) * zoom.value;
    const pixelCoord = {
      x: Math.floor(x / cellSize),
      y: Math.floor(y / cellSize),
    };

    console.log('🎯 详细坐标转换:', {
      '1.输入鼠标坐标': [screenX, screenY],
      '2.Canvas边界': [rect.left, rect.top, rect.width, rect.height],
      '3.相对Canvas坐标': [canvasX, canvasY],
      '4.减去偏移后': [x, y],
      '5.格子大小': cellSize,
      '6.最终像素坐标': pixelCoord,
      设备像素比: window.devicePixelRatio,
      当前屏幕: window.screen.width + 'x' + window.screen.height,
    });

    return pixelCoord;
  };

  console.log('🔍 坐标调试已启用，请点击画布测试');
  console.log('💡 使用 window.debugScreenToPixel(x, y) 手动测试坐标转换');
};

// 性能诊断函数
const performanceDiagnose = () => {
  console.log('=== 性能诊断报告 ===');

  const canvasSize = canvasWidth.value * canvasHeight.value;
  const pixelCount = pixels.value
    .flat()
    .filter((p) => p !== 'transparent').length;

  console.log('基础信息:', {
    画布尺寸: [canvasWidth.value, canvasHeight.value],
    总格子数: canvasSize,
    已绘制像素: pixelCount,
    像素密度: ((pixelCount / canvasSize) * 100).toFixed(1) + '%',
    当前缩放: zoom.value,
    格子显示大小: `${(pixelWidth.value * zoom.value).toFixed(1)}x${(
      pixelHeight.value * zoom.value
    ).toFixed(1)}px`,
  });

  console.log('性能优化状态:', {
    延迟渲染: '✅ 已启用 requestAnimationFrame',
    批量更新: '✅ 已启用延迟颜色更新',
    日志优化: '✅ 已移除频繁日志输出',
    网格优化: '✅ 已优化网格绘制性能',
  });

  console.log('性能建议:');
  if (canvasSize > 4096) {
    console.log('⚠️ 画布尺寸较大，建议使用较小的画布以获得更好性能');
  }
  if (zoom.value > 5) {
    console.log('⚠️ 缩放级别较高，可能影响渲染性能');
  }
  if (pixelCount > 1000) {
    console.log('ℹ️ 像素较多，性能已通过批量渲染优化');
  }

  console.log('📊 如果仍有卡顿，请检查:');
  console.log('1. 浏览器硬件加速是否开启');
  console.log('2. 是否有其他程序占用GPU资源');
  console.log('3. 画布尺寸是否过大');
  console.log('========================');
};

const zoomIn = () => {
  const config = zoomConfig.value;
  zoom.value = Math.min(config.maxZoom, zoom.value * config.buttonStep);
  // 缩放变化时，缓存会自动更新，无需手动清除
  render();
};

const zoomOut = () => {
  const config = zoomConfig.value;
  zoom.value = Math.max(config.minZoom, zoom.value / config.buttonStep);
  // 缩放变化时，缓存会自动更新，无需手动清除
  render();
};

// 重置缩放到100%
const resetZoom = () => {
  zoom.value = 1.0;
  render();
};

// 适应屏幕 - 计算最佳缩放比例
const fitToScreen = () => {
  if (!container.value || !canvas.value) return;

  const containerRect = container.value.getBoundingClientRect();
  const padding = 40; // 留出边距
  const availableWidth = containerRect.width - padding;
  const availableHeight = containerRect.height - padding;

  // 计算画布的实际渲染尺寸
  const canvasRenderWidth = canvasWidth.value * pixelSize.value;
  const canvasRenderHeight = canvasHeight.value * pixelSize.value;

  // 计算缩放比例
  const scaleX = availableWidth / canvasRenderWidth;
  const scaleY = availableHeight / canvasRenderHeight;
  const optimalScale = Math.min(scaleX, scaleY);

  // 应用缩放极值限制
  const config = zoomConfig.value;
  const clampedScale = Math.max(
    config.minZoom,
    Math.min(config.maxZoom, optimalScale),
  );

  zoom.value = clampedScale;

  // 居中显示
  centerView();
  render();
};

// ============= 图片加载和颜色管理 =============

// 加载图片
const loadImageFromUrl = (url: string) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    console.log('图片加载完成:', {
      原始尺寸: `${img.width}px × ${img.height}px`,
      当前画布格子: `${canvasWidth.value} × ${canvasHeight.value}`,
    });

    // 创建临时画布处理图片
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      console.error('无法创建临时画布上下文');
      return;
    }

    // 设置临时画布尺寸与图片一致
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;

    // 绘制原始图片
    tempCtx.drawImage(img, 0, 0);

    // 获取像素数据
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    // 首先更新动态画布尺寸
    dynamicCanvasWidth.value = img.width;
    dynamicCanvasHeight.value = img.height;

    console.log('画布格子已更新为:', {
      新格子数: `${dynamicCanvasWidth.value} × ${dynamicCanvasHeight.value}`,
      格子对应: '1像素 = 1格子',
    });

    // 等待一个微任务，确保计算属性已更新
    nextTick(() => {
      // 重新初始化像素数组（使用新的画布尺寸）
      pixels.value = Array(canvasHeight.value)
        .fill(null)
        .map(() => Array(canvasWidth.value).fill('transparent'));

      console.log('像素数组已重新初始化:', {
        数组尺寸: `${pixels.value.length} × ${pixels.value[0]?.length || 0}`,
        画布尺寸: `${canvasWidth.value} × ${canvasHeight.value}`,
      });

      // 将每个像素转换为格子颜色
      for (let y = 0; y < img.height && y < canvasHeight.value; y++) {
        for (let x = 0; x < img.width && x < canvasWidth.value; x++) {
          const index = (y * img.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          if (a > 128) {
            // 非透明像素，转换为十六进制颜色
            const color = `#${r.toString(16).padStart(2, '0')}${g
              .toString(16)
              .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            pixels.value[y][x] = color;
          } else {
            // 透明或半透明像素
            pixels.value[y][x] = 'transparent';
          }
        }
      }

      // 同步更新网格管理相关状态
      gridCount.value.width = canvasWidth.value;
      gridCount.value.height = canvasHeight.value;
      needleCount.value = canvasWidth.value;
      rowCount.value = canvasHeight.value;

      // 重新计算像素大小以适应新的画布尺寸
      calculatePixelSize();

      // 在下一帧更新显示，确保所有状态都已更新
      requestAnimationFrame(() => {
        // 居中显示
        centerView();

        // 重新渲染画布
        render();
        
        // 延迟更新缩略图（等主画布绘制完毕）
        scheduleDelayedThumbnailUpdate();

        // 更新颜色列表
        updateColors();

        // 获取并发送画布颜色（确保父组件能接收到颜色更新）
        handleGetCanvasColors();

        // 保存状态到历史记录（图片加载后的状态）
        saveState();

        console.log('图片加载完成，画布已更新:', {
          最终格子数: `${canvasWidth.value} × ${canvasHeight.value}`,
          像素大小: `${pixelSize.value.toFixed(1)}px`,
          网格状态: `${gridCount.value.width} × ${gridCount.value.height}`,
        });
      });
    });
  };

  img.onerror = () => {
    console.error('图片加载失败:', url);
    console.error('图片加载失败，请检查图片格式或网络连接');
  };

  img.src = url;
};

// ============= 性能优化相关 =============

// 渲染队列管理
let renderPending = false;
const colorUpdatePending = false;

// 优化的渲染函数 - 使用requestAnimationFrame
const deferredRender = () => {
  if (renderPending) return;
  renderPending = true;

  requestAnimationFrame(() => {
    render();
    // 节流更新缩略图
    throttledUpdateThumbnail();
    renderPending = false;
  });
};

// ============= 增量颜色追踪优化 =============

// 颜色使用计数器 - 追踪每种颜色的使用次数
const colorUsageCount = new Map<string, number>();
let needsColorUpdate = false;
let isColorUpdateScheduled = false;

// ============= 增量历史记录优化 =============

// 当前绘制操作的像素变化记录
let currentDrawingChanges: PixelChange[] = [];
let isDrawingOperation = false;

// 增量添加颜色
const addColorToTracker = (color: string) => {
  if (!color || color === 'transparent') return;

  const currentCount = colorUsageCount.get(color) || 0;
  colorUsageCount.set(color, currentCount + 1);

  // 如果是新颜色，标记需要更新
  if (currentCount === 0) {
    needsColorUpdate = true;
    scheduleColorUpdate();
  }
};

// 增量移除颜色
const removeColorFromTracker = (color: string) => {
  if (!color || color === 'transparent') return;

  const currentCount = colorUsageCount.get(color) || 0;
  if (currentCount <= 1) {
    // 完全移除这个颜色
    colorUsageCount.delete(color);
    needsColorUpdate = true;
    scheduleColorUpdate();
  } else {
    // 减少计数
    colorUsageCount.set(color, currentCount - 1);
  }
};

// 调度颜色更新 - 批量处理避免频繁更新
const scheduleColorUpdate = () => {
  if (isColorUpdateScheduled) return;
  isColorUpdateScheduled = true;

  // 使用requestAnimationFrame确保在渲染周期内更新
  requestAnimationFrame(() => {
    if (needsColorUpdate) {
      emitColorUpdate();
      needsColorUpdate = false;
    }
    isColorUpdateScheduled = false;
  });
};

// 发送颜色更新事件
const emitColorUpdate = () => {
  const colorArray = Array.from(colorUsageCount.keys());

  // 发送多个emit以确保兼容性
  emit('colorsUpdated', colorArray);
  emit('colors-updated', colorArray);

  console.log('颜色列表已更新:', colorArray.length, '种颜色');
};

// 全量颜色重建 - 仅在必要时使用
const rebuildColorTracker = () => {
  console.log('重建颜色追踪器...');

  // 清空计数器
  colorUsageCount.clear();

  // 扫描整个画布重建颜色计数
  for (let y = 0; y < canvasHeight.value; y++) {
    for (let x = 0; x < canvasWidth.value; x++) {
      const color = pixels.value[y][x];
      if (color && color !== 'transparent') {
        const currentCount = colorUsageCount.get(color) || 0;
        colorUsageCount.set(color, currentCount + 1);
      }
    }
  }

  // 立即发送更新
  emitColorUpdate();
  console.log('颜色追踪器重建完成');
};

// 延迟的颜色更新 - 现在使用增量追踪
const deferredUpdateColors = () => {
  // 对于增量追踪，我们只需要调度更新
  scheduleColorUpdate();
};

// 兼容性：保留原始updateColors函数，但现在使用增量追踪
const updateColors = () => {
  // 在特殊情况下（如撤销/重做），我们可能需要重建追踪器
  if (isUndoRedoOperation.value) {
    rebuildColorTracker();
  } else {
    // 正常情况下使用增量更新
    scheduleColorUpdate();
  }
};

// ============= 键盘快捷键 =============

const onKeyDown = (e: KeyboardEvent) => {
  // 如果用户正在输入（比如在input框中），不处理快捷键
  const target = e.target as HTMLElement;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  ) {
    return;
  }

  // 处理撤销/重做快捷键
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        if (e.shiftKey) {
          // Ctrl+Shift+Z 重做
          e.preventDefault();
          redo();
        } else {
          // Ctrl+Z 撤销
          e.preventDefault();
          undo();
        }
        return;
      case 'y':
        // Ctrl+Y 重做
        e.preventDefault();
        redo();
        return;
      case '0':
        // Ctrl+0 重置缩放
        e.preventDefault();
        resetZoom();
        return;
      case '=':
      case '+':
        // Ctrl+= 放大
        e.preventDefault();
        zoomIn();
        return;
      case '-':
        // Ctrl+- 缩小
        e.preventDefault();
        zoomOut();
        return;
      case '9':
        // Ctrl+9 适应屏幕
        e.preventDefault();
        fitToScreen();
        return;
    }

    // 智能缩放预设级别 (Ctrl/Cmd + 1-8)
    if (e.key >= '1' && e.key <= '8') {
      e.preventDefault();
      const presetIndex = parseInt(e.key) - 1;
      const config = zoomConfig.value;
      const validPresets = ZOOM_PRESETS.filter(
        (preset) => preset >= config.minZoom && preset <= config.maxZoom,
      );

      if (validPresets[presetIndex]) {
        zoom.value = validPresets[presetIndex];
        render();
      }
      return;
    }
  }

  // 如果按下了修饰键（Ctrl、Alt、Shift等），不处理工具快捷键
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  // 处理特殊键
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      // 如果有选中区域且已移动，取消移动
      if (selectedArea.value && selectedArea.value.hasMoved) {
        cancelSelectionMove();
      } else if (selectedArea.value) {
        // 如果有选中区域但未移动，清除选中
        clearSelection();
      }
      break;
  }

  // 处理工具切换快捷键
  switch (e.key.toLowerCase()) {
    case 'm':
      e.preventDefault();
      setTool('move');
      break;
    case 'p':
      e.preventDefault();
      setTool('pen');
      break;
    case 'e':
      e.preventDefault();
      setTool('eraser');
      break;
    case 'f':
      e.preventDefault();
      setTool('fill');
      break;
    case 'i':
      e.preventDefault();
      setTool('picker');
      break;
    case 'l':
      e.preventDefault();
      setTool('line');
      break;
    case 'r':
      e.preventDefault();
      setTool('rectangle');
      break;
    case 'o': // 改为 'o' (circle)，避免与 'c' 可能的冲突
      e.preventDefault();
      setTool('circle');
      break;
    case 's':
      e.preventDefault();
      setTool('select');
      break;
    case 'c':
      e.preventDefault();
      setTool('circleSelect');
      break;
    case 'a':
      e.preventDefault();
      setTool('lassoSelect');
      break;
    case '=':
    case '+':
      e.preventDefault();
      zoomIn();
      break;
    case '-':
      e.preventDefault();
      zoomOut();
      break;
    case '0':
      e.preventDefault();
      resetZoom();
      break;
    case 'g':
      e.preventDefault();
      toggleGrid();
      break;
  }
};

// ============= 生命周期 =============

// ResizeObserver 引用
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  initCanvas();
  
  // 初始化缩略图画布
  if (thumbnailCanvas.value) {
    thumbnailCtx = thumbnailCanvas.value.getContext('2d');
    if (thumbnailCtx) {
      // 设置缩略图画布的基本样式
      thumbnailCtx.imageSmoothingEnabled = false;
      console.log('缩略图画布初始化完成');
    }
  }
  
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', () => {
    // 清除缓存的rect，因为窗口大小可能改变了canvas位置
    // 🚀 清除所有缓存，因为窗口大小改变会影响坐标转换
    clearCoordinateCache();
    clearRenderCache();
    clearMouseCache();
    cachedRect = null;
    rectCacheTime = 0;

    // 重新初始化画布，包括重新计算像素大小
    setTimeout(initCanvas, 100); // 延迟一点确保DOM更新完成
  });

  // 设置ResizeObserver监听容器尺寸变化（解决v-show问题）
  if (container.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // 当容器从隐藏变为显示时，重新初始化画布
        if (width > 0 && height > 0) {
          console.log('容器尺寸变化，重新初始化画布:', { width, height });
          // 清除缓存的rect
          cachedRect = null;
          rectCacheTime = 0;

          // 延迟执行，确保DOM完全更新
          nextTick(() => {
            initCanvas();
          });
        }
      }
    });

    resizeObserver.observe(container.value);
    console.log('ResizeObserver已设置，用于解决v-show导致的尺寸问题');
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', initCanvas);

  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// ============= 简化的监听器管理 =============

// 🔴 移除：复杂的多个监听器
// 🔴 移除：重复的计算和渲染调用
// 🔴 移除：冗余的console.log调试信息

// ✅ 新增：统一的画布状态更新函数
const updateCanvasState = () => {
  // 批量更新网格状态，避免重复计算
  gridCount.value.width = canvasWidth.value;
  gridCount.value.height = canvasHeight.value;
  needleCount.value = canvasWidth.value;
  rowCount.value = canvasHeight.value;

  // 更新像素数据
  initPixelData();
  calculatePixelSize();
  centerView();
};

// ✅ 新增：简化的统一监听器
watch(
  [
    // 监听所有相关的画布变化
    () => props.width,
    () => props.height,
    () => props.actualWidth,
    () => props.actualHeight,
    dynamicCanvasWidth,
    dynamicCanvasHeight,
    actualWidthCm,
    actualHeightCm,
    dpi,
  ],
  () => {
    // 统一处理所有画布相关变化
    updateCanvasState();
    render();
  },
  { immediate: true },
);

// ✅ 保留：简单的独立监听器
watch(zoom, render);
watch(() => props.bgColor, render);
watch(
  () => props.imageUrl,
  (newUrl) => {
    if (newUrl) {
      loadImageFromUrl(newUrl);
    }
  },
);

// ============= 智能网格管理方法 =============

// 🔴 移除：复杂的网格单元格大小变化处理
// 🔴 移除：复杂的网格数量变化处理
// 🔴 移除：复杂的针数转数变化处理

// ✅ 新增：简化的网格配置
const GRID_CONFIG = {
  CELL_SIZE: 8, // 固定格子大小
  MAX_WIDTH: 100, // 最大网格宽度
  MAX_HEIGHT: 80, // 最大网格高度
  DEFAULT_WIDTH: 50, // 默认网格宽度
  DEFAULT_HEIGHT: 40, // 默认网格高度
  MIN_SIZE: 4, // 最小格子大小
  MAX_SIZE: 32, // 最大格子大小
};

// ✅ 新增：简化的智能计算最优网格参数
const autoCalculateGrid = () => {
  if (!canvas.value) return;

  const containerWidth = canvas.value.clientWidth || 800;
  const containerHeight = canvas.value.clientHeight || 600;

  // 简单的网格数量计算，无复杂转换
  const gridWidth =
    Math.min(
      Math.floor(containerWidth / GRID_CONFIG.CELL_SIZE),
      GRID_CONFIG.MAX_WIDTH,
    ) || GRID_CONFIG.DEFAULT_WIDTH;

  const gridHeight =
    Math.min(
      Math.floor(containerHeight / GRID_CONFIG.CELL_SIZE),
      GRID_CONFIG.MAX_HEIGHT,
    ) || GRID_CONFIG.DEFAULT_HEIGHT;

  // 批量更新，无复杂计算
  gridCellWidth.value = GRID_CONFIG.CELL_SIZE;
  gridCellHeight.value = GRID_CONFIG.CELL_SIZE;
  gridCount.value.width = gridWidth;
  gridCount.value.height = gridHeight;
  needleCount.value = gridWidth;
  rowCount.value = gridHeight;

  render();
};

// ✅ 新增：简化的网格大小处理
const handleGridSizeChange = () => {
  // 限制在合理范围内
  gridCellWidth.value = Math.max(
    GRID_CONFIG.MIN_SIZE,
    Math.min(GRID_CONFIG.MAX_SIZE, gridCellWidth.value),
  );
  gridCellHeight.value = gridCellWidth.value; // 保持正方形

  // 重新计算网格数量
  const containerWidth = canvas.value?.clientWidth || 800;
  const containerHeight = canvas.value?.clientHeight || 600;

  gridCount.value.width = Math.floor(containerWidth / gridCellWidth.value);
  gridCount.value.height = Math.floor(containerHeight / gridCellHeight.value);

  // 同步更新
  needleCount.value = gridCount.value.width;
  rowCount.value = gridCount.value.height;

  render();
};

// ✅ 新增：简化的网格数量处理
const handleGridCountChange = () => {
  // 限制在合理范围内
  gridCount.value.width = Math.max(
    1,
    Math.min(GRID_CONFIG.MAX_WIDTH, gridCount.value.width),
  );
  gridCount.value.height = Math.max(
    1,
    Math.min(GRID_CONFIG.MAX_HEIGHT, gridCount.value.height),
  );

  // 同步更新针数和转数
  needleCount.value = gridCount.value.width;
  rowCount.value = gridCount.value.height;

  render();
};

// ✅ 新增：简化的针数变化处理
const handleNeedleCountChange = () => {
  needleCount.value = Math.max(
    1,
    Math.min(GRID_CONFIG.MAX_WIDTH, needleCount.value),
  );
  gridCount.value.width = needleCount.value;
  render();
};

// ✅ 新增：简化的转数变化处理
const handleRowCountChange = () => {
  rowCount.value = Math.max(
    1,
    Math.min(GRID_CONFIG.MAX_HEIGHT, rowCount.value),
  );
  gridCount.value.height = rowCount.value;
  render();
};

// ✅ 新增：简化的重置网格到默认值
const resetGridToDefault = () => {
  gridCellWidth.value = GRID_CONFIG.CELL_SIZE;
  gridCellHeight.value = GRID_CONFIG.CELL_SIZE;
  gridCount.value.width = GRID_CONFIG.DEFAULT_WIDTH;
  gridCount.value.height = GRID_CONFIG.DEFAULT_HEIGHT;
  needleCount.value = GRID_CONFIG.DEFAULT_WIDTH;
  rowCount.value = GRID_CONFIG.DEFAULT_HEIGHT;

  render();
};

// ============= 颜色管理方法 =============

// 获取画布所有颜色
const getCanvasColors = (): string[] => {
  const colors = new Set<string>();

  // 遍历所有像素，收集非透明颜色
  pixels.value.forEach((row) => {
    row.forEach((color) => {
      if (color && color !== 'transparent') {
        colors.add(color);
      }
    });
  });

  // 转换为数组并排序
  return Array.from(colors).sort();
};

// 获取画布颜色的处理函数
const handleGetCanvasColors = () => {
  try {
    const colors = getCanvasColors();
    canvasColors.value = colors;
    console.log('画布颜色获取成功:', colors);
    // 发送多个emit以确保兼容性
    emit('colorsUpdated', colors);
    emit('colors-updated', colors);
  } catch (error) {
    console.error('获取画布颜色失败:', error);
    canvasColors.value = [];
  }
};

// 完成编辑功能
const finishEditing = () => {
  // 获取最新的颜色列表
  const colors = getCanvasColors();

  // 获取画布数据
  const canvasData = {
    pixels: pixels.value,
    colors,
    width: canvasWidth.value,
    height: canvasHeight.value,
    actualWidth: actualWidthCm.value,
    actualHeight: actualHeightCm.value,
  };

  console.log('完成编辑，数据:', canvasData);

  // 发送完成事件
  emit('finish', canvasData);
};

// 清空颜色列表
const clearColorsList = () => {
  canvasColors.value = [];
};

// 检查颜色是否被隐藏
const isColorHidden = (color: string): boolean => {
  return hiddenColors.value.has(color);
};

// 切换颜色显示/隐藏
const handleToggleColorVisibility = (color: string) => {
  if (hiddenColors.value.has(color)) {
    hiddenColors.value.delete(color);
  } else {
    hiddenColors.value.add(color);
  }
  render(); // 重新渲染画布
};

// 删除颜色
const handleDeleteColor = (color: string) => {
  if (confirm(`确定要删除颜色 ${color} 吗？此操作将从画布中永久移除该颜色。`)) {
    // 遍历所有像素，删除指定颜色
    pixels.value.forEach((row, y) => {
      row.forEach((pixelColor, x) => {
        if (pixelColor === color) {
          pixels.value[y][x] = 'transparent';
        }
      });
    });

    // 从隐藏颜色列表中移除
    hiddenColors.value.delete(color);

    // 重新渲染画布
    render();

    // 重新获取颜色列表以更新显示
    handleGetCanvasColors();
  }
};

// 清除所有颜色过滤器
const handleClearColorFilters = () => {
  hiddenColors.value.clear();
  render(); // 重新渲染画布
};

// 设置颜色（点击颜色时使用）
const setColor = (color: string) => {
  currentColor.value = color;
};

// ============= 新增颜色管理方法 =============

// 替换画布中的颜色
const replaceColor = (oldColor: string, newColor: string): number => {
  console.log('替换画布颜色:', { oldColor, newColor });

  let replacedCount = 0;

  // 保存状态到历史记录
  saveState();

  // 遍历所有像素，替换指定颜色
  pixels.value.forEach((row, y) => {
    row.forEach((pixelColor, x) => {
      if (pixelColor === oldColor) {
        pixels.value[y][x] = newColor;
        replacedCount++;
      }
    });
  });

  // 重新渲染画布
  render();

  // 重新获取颜色列表以更新显示
  handleGetCanvasColors();

  console.log(`颜色替换完成，共替换了 ${replacedCount} 个像素`);

  return replacedCount;
};

// 删除画布中的指定颜色（不显示确认框的版本，供外部直接调用）
const deleteColor = (color: string): number => {
  console.log('删除画布颜色:', color);

  let deletedCount = 0;

  // 保存状态到历史记录
  saveState();

  // 遍历所有像素，删除指定颜色
  pixels.value.forEach((row, y) => {
    row.forEach((pixelColor, x) => {
      if (pixelColor === color) {
        pixels.value[y][x] = 'transparent';
        deletedCount++;
      }
    });
  });

  // 从隐藏颜色列表中移除
  hiddenColors.value.delete(color);

  // 重新渲染画布
  render();

  // 重新获取颜色列表以更新显示
  handleGetCanvasColors();

  console.log(`颜色删除完成，共删除了 ${deletedCount} 个像素`);

  return deletedCount;
};

// ============= 导出方法 =============

// 导出画布为 Base64 格式
const exportToBase64 = (): string => {
  console.log('导出画布为 Base64...');

  try {
    // 创建临时画布用于导出
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth.value;
    exportCanvas.height = canvasHeight.value;
    const exportCtx = exportCanvas.getContext('2d');

    if (!exportCtx) {
      console.error('无法创建导出画布上下文');
      return '';
    }

    // 设置白色背景
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);

    // 绘制每个像素
    pixels.value.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color && color !== 'transparent') {
          exportCtx.fillStyle = color;
          exportCtx.fillRect(x, y, 1, 1);
        }
      });
    });

    // 转换为 Base64
    const base64 = exportCanvas.toDataURL('image/png');
    console.log('Base64 导出完成');

    return base64;
  } catch (error) {
    console.error('Base64 导出失败:', error);
    return '';
  }
};

// 导出画布为 SVG 格式
const exportToSVG = (): string => {
  console.log('导出画布为 SVG...');

  try {
    const width = canvasWidth.value;
    const height = canvasHeight.value;

    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

    // 添加白色背景
    svgContent += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

    // 绘制每个像素
    pixels.value.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color && color !== 'transparent') {
          svgContent += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
        }
      });
    });

    svgContent += '</svg>';

    console.log('SVG 导出完成');

    return svgContent;
  } catch (error) {
    console.error('SVG 导出失败:', error);
    return '';
  }
};

// ============= 图像降噪功能 =============

/**
 * 中值滤波降噪
 * 对每个像素点，取其周围3x3区域的中位数颜色
 */
const medianFilter = () => {
  console.log('开始中值滤波降噪...');

  // 保存操作前状态
  saveState();

  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const newPixels: string[][] = [];

  // 初始化新像素数组
  for (let y = 0; y < height; y++) {
    newPixels[y] = [];
  }

  // 对每个像素进行中值滤波
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors: string[] = [];

      // 获取3x3邻域的所有像素
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors.push(pixels.value[ny][nx] || 'transparent');
          } else {
            // 边界处理：使用当前像素的颜色
            neighbors.push(pixels.value[y][x] || 'transparent');
          }
        }
      }

      // 计算中位数颜色
      const colorCounts = new Map<string, number>();
      neighbors.forEach((color) => {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      });

      // 选择出现次数最多的颜色作为中位数
      let medianColor = 'transparent';
      let maxCount = 0;

      colorCounts.forEach((count, color) => {
        if (count > maxCount) {
          maxCount = count;
          medianColor = color;
        }
      });

      newPixels[y][x] = medianColor;
    }
  }

  // 应用滤波结果
  pixels.value = newPixels;
  render();
  updateColors();

  console.log('中值滤波降噪完成');
};

/**
 * 形态学降噪 - 开运算（先腐蚀后膨胀）
 * 用于去除小的噪点和毛刺
 */
const morphologicalDenoising = () => {
  console.log('开始形态学降噪...');

  // 保存操作前状态
  saveState();

  // 先进行腐蚀操作
  const erodedPixels = erosion(pixels.value);

  // 再进行膨胀操作
  const denoisedPixels = dilation(erodedPixels);

  // 应用结果
  pixels.value = denoisedPixels;
  render();
  updateColors();

  console.log('形态学降噪完成');
};

/**
 * 腐蚀操作
 */
const erosion = (sourcePixels: string[][]): string[][] => {
  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const result: string[][] = [];

  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      const currentColor = sourcePixels[y][x];

      if (currentColor === 'transparent') {
        result[y][x] = 'transparent';
        continue;
      }

      // 检查3x3邻域，如果有任何透明像素，则当前像素变为透明
      let hasTransparent = false;

      for (let dy = -1; dy <= 1 && !hasTransparent; dy++) {
        for (let dx = -1; dx <= 1 && !hasTransparent; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (sourcePixels[ny][nx] === 'transparent') {
              hasTransparent = true;
            }
          } else {
            // 边界视为透明
            hasTransparent = true;
          }
        }
      }

      result[y][x] = hasTransparent ? 'transparent' : currentColor;
    }
  }

  return result;
};

/**
 * 膨胀操作
 */
const dilation = (sourcePixels: string[][]): string[][] => {
  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const result: string[][] = [];

  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      const currentColor = sourcePixels[y][x];

      if (currentColor !== 'transparent') {
        result[y][x] = currentColor;
        continue;
      }

      // 检查3x3邻域，找到第一个非透明像素
      let foundColor = 'transparent';

      for (let dy = -1; dy <= 1 && foundColor === 'transparent'; dy++) {
        for (let dx = -1; dx <= 1 && foundColor === 'transparent'; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborColor = sourcePixels[ny][nx];
            if (neighborColor !== 'transparent') {
              foundColor = neighborColor;
            }
          }
        }
      }

      result[y][x] = foundColor;
    }
  }

  return result;
};

/**
 * 连通区域降噪
 * 移除面积小于指定阈值的连通区域
 */
const removeSmallComponents = (minArea: number = 4) => {
  console.log(`开始连通区域降噪，最小面积: ${minArea}...`);

  // 保存操作前状态
  saveState();

  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const visited = new Set<string>();
  const toRemove = new Set<string>();

  // 遍历所有像素，找到小的连通区域
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const color = pixels.value[y][x];

      if (visited.has(key) || color === 'transparent') {
        continue;
      }

      // 广度优先搜索找到连通区域
      const component = findConnectedComponent(x, y, color);

      // 标记所有访问过的像素
      component.forEach((pixelKey) => visited.add(pixelKey));

      // 如果连通区域太小，标记为需要移除
      if (component.length < minArea) {
        component.forEach((pixelKey) => toRemove.add(pixelKey));
      }
    }
  }

  // 移除小的连通区域
  toRemove.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    pixels.value[y][x] = 'transparent';
  });

  render();
  updateColors();

  console.log(`连通区域降噪完成，移除了 ${toRemove.size} 个像素`);
};

/**
 * 找到指定像素的连通区域
 */
const findConnectedComponent = (
  startX: number,
  startY: number,
  targetColor: string,
): string[] => {
  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const visited = new Set<string>();
  const queue = [{ x: startX, y: startY }];
  const component: string[] = [];

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (pixels.value[y][x] !== targetColor) continue;

    visited.add(key);
    component.push(key);

    // 添加4-连通的邻居
    queue.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    );
  }

  return component;
};

/**
 * 高斯模糊降噪
 * 使用简化的高斯核进行模糊处理
 */
const gaussianBlur = () => {
  console.log('开始高斯模糊降噪...');

  // 保存操作前状态
  saveState();

  const width = canvasWidth.value;
  const height = canvasHeight.value;

  // 简化的3x3高斯核
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ];
  const kernelSum = 16;

  const newPixels: string[][] = [];

  for (let y = 0; y < height; y++) {
    newPixels[y] = [];
    for (let x = 0; x < width; x++) {
      const colorWeights = new Map<string, number>();
      let totalWeight = 0;

      // 应用高斯核
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const nx = x + kx - 1;
          const ny = y + ky - 1;
          const weight = kernel[ky][kx];

          let color = 'transparent';
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            color = pixels.value[ny][nx];
          }

          if (color !== 'transparent') {
            colorWeights.set(color, (colorWeights.get(color) || 0) + weight);
            totalWeight += weight;
          }
        }
      }

      // 选择权重最大的颜色
      if (totalWeight === 0) {
        newPixels[y][x] = 'transparent';
      } else {
        let maxWeight = 0;
        let resultColor = 'transparent';

        colorWeights.forEach((weight, color) => {
          if (weight > maxWeight) {
            maxWeight = weight;
            resultColor = color;
          }
        });

        // 只有当权重足够大时才保留颜色
        newPixels[y][x] =
          maxWeight > kernelSum * 0.3 ? resultColor : 'transparent';
      }
    }
  }

  pixels.value = newPixels;
  render();
  updateColors();

  console.log('高斯模糊降噪完成');
};

/**
 * 综合降噪处理
 * 结合多种降噪方法
 */
const comprehensiveDenoising = () => {
  console.log('开始综合降噪处理...');

  // 保存操作前状态
  saveState();

  // 1. 先进行中值滤波去除椒盐噪声
  medianFilter();

  // 2. 然后进行形态学处理去除小毛刺
  morphologicalDenoising();

  // 3. 最后移除小的连通区域
  removeSmallComponents(3);

  console.log('综合降噪处理完成');
};

// ============= 暴露给父组件的方法 =============
defineExpose({
  clearCanvas,
  clearAllLayers: () => {
    // 清空所有图层 - 对于像素编辑器来说就是清空画布
    clearCanvas();
  },
  handleSizeChange: (width: number, height: number) => {
    // 动态改变画布尺寸
    console.log('Changing canvas size to:', width, 'x', height);
    // 这里可以通过更新props来实现，但由于props是只读的，
    // 我们需要通过emit告知父组件更新props，或者直接在这里处理

    // 临时方案：直接修改内部状态（注意：这会与props冲突）
    // 更好的方案是emit事件给父组件
    emit('sizeChangeRequested', { width, height });
  },
  importFromUrl: async (url: string) => {
    // 从URL导入图片
    console.log('Importing image from URL:', url);
    if (url) {
      loadImageFromUrl(url);
    }
  },
  updateLayerColor: (index: number, color: string) => {
    // 更新图层颜色 - 对于像素编辑器来说可以是更新当前选中颜色
    console.log('Updating layer color:', index, color);
    currentColor.value = color;
  },
  selectTool: (toolName: string) => {
    // 选择工具
    console.log('Selecting tool:', toolName);
    const toolMap: Record<string, typeof currentTool.value> = {
      pencil: 'pen',
      pen: 'pen',
      eraser: 'eraser',
      fill: 'fill',
      paintBucket: 'fill', // 添加油桶工具到填充工具的映射
      picker: 'picker',
      eyedropper: 'picker',
      line: 'line', // 添加直线工具映射
      rectangle: 'rectangle', // 添加矩形工具映射
      circle: 'circle', // 添加圆形工具映射
      move: 'move', // 添加移动工具映射
    };

    const mappedTool = toolMap[toolName] || 'pen';
    setTool(mappedTool);
  },
  setColor: (color: string) => {
    // 设置当前颜色
    console.log('Setting color:', color);
    currentColor.value = color;
  },
  setBrushSize: (size: number) => {
    // 设置笔刷大小
    console.log('Setting brush size:', size);
    brushSize.value = Math.max(1, Math.min(8, size));
  },
  flipHorizontal: () => {
    // 水平翻转
    console.log('Flip horizontal');
    saveState(); // 保存状态到历史记录
    const newPixels = pixels.value.map((row) => [...row].reverse());
    pixels.value = newPixels;
    render();
    scheduleDelayedThumbnailUpdate();
    updateColors();
  },
  flipVertical: () => {
    // 垂直翻转
    console.log('Flip vertical');
    saveState(); // 保存状态到历史记录
    pixels.value = [...pixels.value].reverse();
    render();
    scheduleDelayedThumbnailUpdate();
    updateColors();
  },
  rotateLeft: () => {
    // 向左旋转90度
    console.log('Rotate left');
    saveState(); // 保存状态到历史记录
    const newPixels: string[][] = [];
    for (let x = canvasWidth.value - 1; x >= 0; x--) {
      const newRow: string[] = [];
      for (let y = 0; y < canvasHeight.value; y++) {
        newRow.push(pixels.value[y][x]);
      }
      newPixels.push(newRow);
    }
    pixels.value = newPixels;
    render();
    scheduleDelayedThumbnailUpdate();
    updateColors();
  },
  rotateRight: () => {
    // 向右旋转90度
    console.log('Rotate right');
    saveState(); // 保存状态到历史记录
    const newPixels: string[][] = [];
    for (let x = 0; x < canvasWidth.value; x++) {
      const newRow: string[] = [];
      for (let y = canvasHeight.value - 1; y >= 0; y--) {
        newRow.push(pixels.value[y][x]);
      }
      newPixels.push(newRow);
    }
    pixels.value = newPixels;
    render();
    scheduleDelayedThumbnailUpdate();
    updateColors();
  },
  // 智能网格管理方法
  handleGridSizeChange,
  handleGridCountChange,
  handleNeedleCountChange,
  handleRowCountChange,
  autoCalculateGrid,
  resetGridToDefault,

  // 暴露撤销重做方法
  undo,
  redo,
  saveStateBeforeOperation,
  finishOperation,

  // 暴露诊断方法
  diagnose,
  testMultiScreen,
  enableCoordinateDebug,
  performanceDiagnose,

  // 暴露DPI控制方法（参考jqEditor2_demo）

  cmToPx,
  dpi: computed(() => dpi.value),

  // 暴露新增的颜色管理和导出方法
  replaceColor,
  deleteColor,
  exportToBase64,
  exportToSVG,
  getCanvasColors,

  // 暴露撤销重做状态
  canUndo,
  canRedo,

  // 暴露缩放相关功能
  zoom,
  zoomIn,
  zoomOut,
  setZoom: (value: number) => {
    const config = zoomConfig.value;
    zoom.value = Math.max(config.minZoom, Math.min(config.maxZoom, value));
    render();
  },

  // 暴露颜色显示隐藏功能
  isColorHidden,
  toggleColorVisibility: handleToggleColorVisibility,
  getHiddenColors: () => Array.from(hiddenColors.value),
  setColorVisibility: (color: string, visible: boolean) => {
    if (visible) {
      hiddenColors.value.delete(color);
    } else {
      hiddenColors.value.add(color);
    }
    render();
  },

  // 暴露网格显示隐藏功能
  toggleGrid,
  showGrid: computed(() => showGrid.value),
  setGridVisibility: (visible: boolean) => {
    showGrid.value = visible;
    throttledRender();
    console.log(`网格${visible ? '已显示' : '已隐藏'}`);
  },

  // 暴露画布刷新方法（解决v-show问题）
  refreshCanvas: () => {
    console.log('手动刷新画布（解决v-show问题）');
    nextTick(() => {
      initCanvas();
    });
  },

  // 检查容器是否可见
  isContainerVisible: () => {
    if (!container.value) return false;
    const { width, height } = container.value.getBoundingClientRect();
    return width > 0 && height > 0;
  },

  // 绘制控制方法
  setDrawingDisabled: (disabled: boolean) => {
    console.log('设置绘制禁用状态:', disabled);
    drawingDisabled.value = disabled;
  },

  getDrawingDisabled: () => {
    return drawingDisabled.value;
  },

  enableDrawing: () => {
    console.log('启用绘制功能');
    drawingDisabled.value = false;
  },

  disableDrawing: () => {
    console.log('禁用绘制功能');
    drawingDisabled.value = true;
  },

  // 图像降噪方法
  medianFilter,
  morphologicalDenoising,
  removeSmallComponents,
  gaussianBlur,
  comprehensiveDenoising,

  // 单独的形态学操作（供高级用户使用）
  erosion: (sourcePixels?: string[][]) => {
    return erosion(sourcePixels || pixels.value);
  },
  dilation: (sourcePixels?: string[][]) => {
    return dilation(sourcePixels || pixels.value);
  },

  // 连通区域分析
  findConnectedComponent,
});

// 触发图片上传
const triggerImageUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', handleImageUpload);
  input.click();
};

// 处理图片上传
const handleImageUpload = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      loadImageFromUrl(url);
    };
    reader.readAsDataURL(file);
  }
};

// 重置画布尺寸到原始Props值
const resetCanvasSize = () => {
  // 重置为0表示使用props值
  dynamicCanvasWidth.value = 0;
  dynamicCanvasHeight.value = 0;

  // 🚀 清除所有缓存，因为画布尺寸改变
  clearCoordinateCache();
  clearRenderCache();
  clearMouseCache();

  // 等待计算属性更新
  nextTick(() => {
    initPixelData();
    calculatePixelSize();
    centerView();
    render();

    // 保存状态到历史记录
    saveState();

    console.log('画布尺寸已重置:', {
      画布尺寸: `${canvasWidth.value} × ${canvasHeight.value}`,
      Props尺寸: `${props.width} × ${props.height}`,
    });
  });
};

// ============= 画笔拖拽优化配置 =============

// 拖拽绘制优化参数
const DRAG_RENDER_THROTTLE_MS = 50; // 拖拽时降低到20fps
const BATCH_SIZE_THRESHOLD = 10; // 批量处理阈值
const MAX_INTERPOLATION_DISTANCE = 15; // 最大插值距离

// 拖拽绘制状态
let dragBatchChanges: PixelChange[] = [];
let lastDragRenderTime = 0;
let isDragRendering = false;

// 优化的拖拽渲染函数
const deferredDragRender = () => {
  const now = Date.now();

  // 如果正在拖拽渲染中，跳过
  if (isDragRendering) return;

  // 检查是否需要节流
  if (now - lastDragRenderTime < DRAG_RENDER_THROTTLE_MS) {
    return;
  }

  isDragRendering = true;
  lastDragRenderTime = now;

  requestAnimationFrame(() => {
    render();
    isDragRendering = false;
  });
};

// 标准渲染函数已存在，无需重复定义

// ============= 缩放优化配置 =============

// 缩放优化参数
const ZOOM_THROTTLE_MS = 16; // 60fps缩放响应
const ZOOM_DEBOUNCE_MS = 100; // 缩放完成后延迟处理
const RECT_CACHE_MS = 200; // getBoundingClientRect缓存时间

// 缩放状态管理
let lastZoomTime = 0;
let isZooming = false;
let zoomTimeout: number | null = null;
let cachedRect: DOMRect | null = null;
let rectCacheTime = 0;

// 缓存的getBoundingClientRect
const getCachedBoundingRect = (): DOMRect => {
  const now = Date.now();

  if (!cachedRect || now - rectCacheTime > RECT_CACHE_MS) {
    if (canvas.value) {
      cachedRect = canvas.value.getBoundingClientRect();
      rectCacheTime = now;
    }
  }

  return cachedRect!;
};

// 优化的缩放渲染函数
const deferredZoomRender = () => {
  const now = Date.now();

  // 如果正在滚动，直接进行完整渲染
  if (isWheelScrolling) {
    requestAnimationFrame(() => {
      render();
    });
    return;
  }

  // 节流：限制缩放渲染频率
  if (now - lastZoomTime < ZOOM_THROTTLE_MS) {
    return;
  }

  lastZoomTime = now;
  isZooming = true;

  // 使用requestAnimationFrame确保流畅渲染
  requestAnimationFrame(() => {
    render();

    // 设置防抖：缩放完成后的最终处理
    if (zoomTimeout) {
      clearTimeout(zoomTimeout);
    }

    zoomTimeout = window.setTimeout(() => {
      isZooming = false;
      // 缩放完成后的最终优化渲染
      render();
    }, ZOOM_DEBOUNCE_MS);
  });
};

// 标准渲染函数已存在，无需重复定义
</script>

<style scoped>
.pixel-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #2c3e50;
  color: white;
  font-family: 'Segoe UI', sans-serif;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #ecf0f1;
}

canvas {
  display: block;
  cursor: crosshair;
  width: 100%;
  height: 100%;
}

/* 网格策略控制面板样式 - 已隐藏 */
/* .grid-strategy-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 1000;
  font-size: 12px;
}

.strategy-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.strategy-group label {
  font-weight: 600;
  color: #333;
}

.strategy-select {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  min-width: 160px;
}

.strategy-select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
}

.strategy-hint {
  color: #666;
  font-size: 10px;
  font-style: italic;
} */

.status-bar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 12px 16px;
  background: rgba(52, 73, 94, 0.95);
  border: 1px solid rgba(127, 140, 141, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  font-size: 13px;
  color: #ecf0f1;
  z-index: 1000;
  max-width: 400px;
  gap: 12px;
  transition: all 0.3s ease;
}

.status-bar:hover {
  background: rgba(52, 73, 94, 0.98);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.status-bar.collapsed {
  min-width: auto;
  width: auto;
}

.status-bar.collapsed .status-toggle-btn {
  transform: rotate(180deg);
}

.status-toggle-btn {
  background: rgba(127, 140, 141, 0.3);
  border: 1px solid rgba(127, 140, 141, 0.5);
  border-radius: 8px;
  color: #ecf0f1;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-toggle-btn:hover {
  background: rgba(127, 140, 141, 0.5);
  transform: scale(1.05);
}

.status-toggle-btn svg {
  transition: transform 0.3s ease;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 12px;
}

.status-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.status-item {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(127, 140, 141, 0.1);
  border: 1px solid rgba(127, 140, 141, 0.2);
}

.status-item.wheel-status {
  background: rgba(52, 152, 219, 0.2);
  border: 1px solid rgba(52, 152, 219, 0.4);
  color: #3498db;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

/* ============= 缩放控件样式 ============= */
.zoom-controls {
  display: inline-flex;
  gap: 2px;
  margin: 0 8px;
  align-items: center;
}

.zoom-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  padding: 4px 6px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 24px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

.zoom-btn:active:not(:disabled) {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.15);
}

.zoom-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-config-info {
  background: rgba(52, 152, 219, 0.15) !important;
  border: 1px solid rgba(52, 152, 219, 0.3) !important;
  color: #a0c4ff !important;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

/* 工具特定的鼠标样式 */
.pixel-editor:has(button.active:contains('画笔')) canvas {
  cursor: crosshair;
}

.pixel-editor:has(button.active:contains('橡皮擦')) canvas {
  cursor: grab;
}

.pixel-editor:has(button.active:contains('填充')) canvas {
  cursor: pointer;
}

.pixel-editor:has(button.active:contains('取色')) canvas {
  cursor: copy;
}

/* 状态栏网格信息样式 */
.grid-info {
  background: rgba(52, 152, 219, 0.25) !important;
  border: 1px solid rgba(52, 152, 219, 0.5) !important;
  color: #5dade2 !important;
  font-weight: 600;
}

/* 像素尺寸信息样式 */
.pixel-size-info {
  background: rgba(230, 126, 34, 0.25) !important;
  border: 1px solid rgba(230, 126, 34, 0.5) !important;
  color: #f39c12 !important;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

/* DPI信息样式 */
.dpi-info {
  background: rgba(142, 68, 173, 0.25) !important;
  border: 1px solid rgba(142, 68, 173, 0.5) !important;
  color: #a569bd !important;
  font-weight: 600;
}

/* 格子实际尺寸样式 */
.cell-size-real {
  background: rgba(46, 204, 113, 0.15) !important;
  border: 1px solid rgba(46, 204, 113, 0.3) !important;
  color: #7fb069 !important;
  font-weight: 500;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

/* ============= 格子尺寸信息样式 ============= */
.calculation-info {
  background: rgba(46, 204, 113, 0.1);
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid rgba(46, 204, 113, 0.3);
  margin-bottom: 8px;
}

.calculation-info small {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.cell-size-info {
  background: rgba(46, 204, 113, 0.25) !important;
  border: 1px solid rgba(46, 204, 113, 0.5) !important;
  color: #58d68d !important;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

/* ============= 移动工具样式 ============= */
.canvas-container {
  user-select: none; /* 防止拖拽时选中文本 */
}

/* 画布鼠标样式会通过JavaScript动态设置 */
.canvas-container canvas {
  transition: cursor 0.1s ease;
}

.dynamic-size-info {
  background: rgba(155, 89, 182, 0.3) !important;
  border: 1px solid rgba(155, 89, 182, 0.6) !important;
  color: #bb8fce !important;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

/* URL 信息样式 */
.url-info {
  background: rgba(241, 196, 15, 0.25) !important;
  border: 1px solid rgba(241, 196, 15, 0.5) !important;
  color: #f7dc6f !important;
  font-weight: 500;
  font-family: 'Courier New', monospace;
  max-width: 200px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.url-info .url-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
}

.url-preview-image {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid rgba(241, 196, 15, 0.7);
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.url-info .error-indicator {
  font-size: 14px;
  filter: drop-shadow(0 0 2px rgba(255, 0, 0, 0.8));
}

/* ============= DPI 控制面板样式 ============= */
.dpi-control-panel {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dpi-group {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

.dpi-group label {
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.dpi-input {
  width: 70px;
  padding: 6px 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s ease;
}

.dpi-input:focus {
  outline: none;
  border-color: #f39c12;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.2);
}

.dpi-value {
  font-weight: 700;
  color: #f1c40f;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  min-width: 40px;
}

.dpi-hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-style: italic;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

/* 性能提示样式 */
.performance-tip {
  background: rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.4) !important;
  color: #60a5fa !important;
  font-weight: 500;
  font-size: 11px;
}

.performance-warning {
  color: #f59e0b !important;
  font-weight: 600;
}

/* ============= 网格切换按钮样式 ============= */
.grid-toggle-btn {
  background: rgba(52, 152, 219, 0.2) !important;
  border: 1px solid rgba(52, 152, 219, 0.4) !important;
  color: #5dade2 !important;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  font-size: 12px;
  user-select: none;
}

.grid-toggle-btn:hover {
  background: rgba(52, 152, 219, 0.3) !important;
  border-color: rgba(52, 152, 219, 0.6) !important;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
}

.grid-toggle-btn.active {
  background: rgba(46, 204, 113, 0.25) !important;
  border-color: rgba(46, 204, 113, 0.5) !important;
  color: #58d68d !important;
}

.grid-toggle-btn.active:hover {
  background: rgba(46, 204, 113, 0.35) !important;
  border-color: rgba(46, 204, 113, 0.7) !important;
  box-shadow: 0 2px 8px rgba(46, 204, 113, 0.2);
}

.grid-toggle-btn svg {
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.grid-toggle-btn:hover svg {
  transform: rotate(5deg);
}

.grid-toggle-btn.active svg {
  stroke-width: 2.5;
}

/* 网格状态指示器样式 */
.grid-status {
  font-weight: 700;
  transition: all 0.3s ease;
  margin-left: 8px;
}

.grid-status.visible {
  color: #58d68d !important;
  text-shadow: 0 0 3px rgba(88, 214, 141, 0.5);
}

.grid-status.hidden {
  color: #ec7063 !important;
  text-shadow: 0 0 3px rgba(236, 112, 99, 0.5);
}

/* ============= 缩略图画布样式 ============= */
.thumbnail-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 200px;
  height: 200px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.thumbnail-canvas {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: #fff;
}
</style>
