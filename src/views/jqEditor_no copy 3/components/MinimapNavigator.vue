<template>
  <div
    v-if="visible"
    class="minimap-navigator"
    :class="{ minimized: isMinimized, dragging: isDragging }"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      zIndex: zIndex,
    }"
    @mousedown="startDrag"
  >
    <!-- 标题栏 -->
    <div class="minimap-header">
      <div class="minimap-title">
        <span class="title-text">导航器</span>
        <div class="minimap-controls">
          <button
            class="control-btn minimize-btn"
            :title="isMinimized ? '展开' : '最小化'"
            @click="toggleMinimize"
          >
            <i :class="isMinimized ? 'icon-expand' : 'icon-minimize'"></i>
          </button>
          <button
            class="control-btn close-btn"
            title="关闭"
            @click="$emit('close')"
          >
            <i class="icon-close"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 缩略图内容 -->
    <div v-show="!isMinimized" class="minimap-content">
      <div class="minimap-canvas-container" @click="handleCanvasClick">
        <canvas
          ref="minimapCanvasRef"
          class="minimap-canvas"
          :width="minimapSize.width"
          :height="minimapSize.height"
          :style="{
            width: minimapSize.width + 'px',
            height: minimapSize.height + 'px',
          }"
        ></canvas>

        <!-- 视口指示器 -->
        <div
          class="viewport-indicator"
          :style="{
            left: viewportRect.x + 'px',
            top: viewportRect.y + 'px',
            width: viewportRect.width + 'px',
            height: viewportRect.height + 'px',
          }"
          @mousedown.stop="startViewportDrag"
        ></div>
      </div>

      <!-- 缩放控制 -->
      <div class="zoom-controls">
        <button class="zoom-btn" title="重置视图" @click="resetView">
          <i class="icon-reset"></i>
        </button>
        <button class="zoom-btn" title="适合窗口" @click="fitToWindow">
          <i class="icon-fit"></i>
        </button>
        <span class="zoom-level">
          {{ Math.round(viewportState.zoom * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { BasicCanvasProps } from '../types/canvas';
import type { ViewportState, MinimapConfig } from '../types/viewport';
import type { CompressedGridStorage } from '../classes/GridStorage';

// Props
interface Props {
  visible: boolean;
  viewportState: ViewportState;
  gridStorage: CompressedGridStorage | null | undefined;
  gridData: any;
  canvasSize: { width: number; height: number };
  containerSize: { width: number; height: number };
  initialPosition?: { x: number; y: number };
}

const props = withDefaults(defineProps<Props>(), {
  initialPosition: () => ({ x: window.innerWidth - 180, y: 20 }),
});

// Emits
const emit = defineEmits<{
  'viewport-change': [pan: { x: number; y: number }];
  'reset-view': [];
  'fit-to-window': [];
  close: [];
}>();

// 响应式状态
const isMinimized = ref(false);
const isDragging = ref(false);
const isViewportDragging = ref(false);
const zIndex = ref(1002);

// 位置状态
const position = ref(
  props.initialPosition || { x: window.innerWidth - 180, y: 20 },
);
const dragStart = ref({ x: 0, y: 0 });
const viewportDragStart = ref({ x: 0, y: 0 });
const initialViewportState = ref({ pan: { x: 0, y: 0 }, zoom: 1 });

// 缩略图配置
const minimapConfig: MinimapConfig = {
  size: { width: 150, height: 150 },
  maintainAspectRatio: true,
  position: 'draggable',
  updateMode: 'throttled',
  showViewport: true,
};

// DOM引用
const minimapCanvasRef = ref<HTMLCanvasElement>();

// 计算缩略图尺寸 - 修复：使用实际的画布像素尺寸
const minimapSize = computed(() => {
  const maxSize = minimapConfig.size.width;

  if (!minimapConfig.maintainAspectRatio) {
    return minimapConfig.size;
  }

  // 优先使用网格系统的实际像素尺寸
  let canvasWidth, canvasHeight;
  if (props.gridData && props.gridData.physicalSize) {
    canvasWidth = props.gridData.physicalSize.width;
    canvasHeight = props.gridData.physicalSize.height;
  } else {
    canvasWidth = props.canvasSize.width;
    canvasHeight = props.canvasSize.height;
  }

  const aspectRatio = canvasWidth / canvasHeight;

  if (aspectRatio > 1) {
    // 宽图
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio),
    };
  } else {
    // 高图或正方形
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize,
    };
  }
});

// 计算缩放比例 - 修复：使用实际的画布像素尺寸而不是逻辑尺寸
const scale = computed(() => {
  if (!props.gridData) {
    return Math.min(
      minimapSize.value.width / props.canvasSize.width,
      minimapSize.value.height / props.canvasSize.height,
    );
  }

  // 使用网格系统的实际像素尺寸
  const actualCanvasWidth = props.gridData.physicalSize.width;
  const actualCanvasHeight = props.gridData.physicalSize.height;

  return Math.min(
    minimapSize.value.width / actualCanvasWidth,
    minimapSize.value.height / actualCanvasHeight,
  );
});

// 计算视口指示器位置和大小
const viewportRect = computed(() => {
  const { viewportState, containerSize, canvasSize } = props;

  // 可见区域在画布上的尺寸
  const visibleWidth = containerSize.width / viewportState.zoom;
  const visibleHeight = containerSize.height / viewportState.zoom;

  // 可见区域在画布上的位置（画布坐标系）
  const visibleX = -viewportState.pan.x / viewportState.zoom;
  const visibleY = -viewportState.pan.y / viewportState.zoom;

  // 转换到缩略图坐标系
  const rectX = visibleX * scale.value;
  const rectY = visibleY * scale.value;
  const rectWidth = visibleWidth * scale.value;
  const rectHeight = visibleHeight * scale.value;

  const result = {
    x: Math.max(0, Math.min(minimapSize.value.width - rectWidth, rectX)),
    y: Math.max(0, Math.min(minimapSize.value.height - rectHeight, rectY)),
    width: Math.min(minimapSize.value.width, rectWidth),
    height: Math.min(minimapSize.value.height, rectHeight),
  };

  // 调试信息（临时启用用于排查拖拽回弹问题）
  console.log('📐 视口指示器计算', {
    pan: viewportState.pan,
    zoom: viewportState.zoom,
    visibleArea: {
      x: visibleX,
      y: visibleY,
      width: visibleWidth,
      height: visibleHeight,
    },
    minimapRect: result,
    scale: scale.value,
    canvasSize,
    containerSize,
    minimapSize: minimapSize.value,
  });

  return result;
});

// 防抖更新计时器
let updateTimer: ReturnType<typeof setTimeout> | null = null;
const updateDelay = 300; // 300ms防抖

/**
 * 渲染缩略图
 */
const renderMinimap = () => {
  const canvas = minimapCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清空画布
  ctx.clearRect(0, 0, minimapSize.value.width, minimapSize.value.height);

  // 绘制背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, minimapSize.value.width, minimapSize.value.height);

  // 绘制网格内容 - 修复：确保像素对齐
  if (props.gridStorage && props.gridData) {
    const allCells = props.gridStorage.getAllPaintedCells();
    const cellScaleX =
      minimapSize.value.width / props.gridData.physicalSize.width;
    const cellScaleY =
      minimapSize.value.height / props.gridData.physicalSize.height;

    allCells.forEach(({ x, y, color }) => {
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;

        // 使用精确的像素映射
        const pixelX = x * props.gridData.cellWidth * cellScaleX;
        const pixelY = y * props.gridData.cellHeight * cellScaleY;
        const pixelWidth = Math.max(1, props.gridData.cellWidth * cellScaleX);
        const pixelHeight = Math.max(1, props.gridData.cellHeight * cellScaleY);

        ctx.fillRect(
          Math.round(pixelX),
          Math.round(pixelY),
          Math.round(pixelWidth),
          Math.round(pixelHeight),
        );
      }
    });
  }
};

/**
 * 防抖渲染更新
 */
const scheduleUpdate = () => {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  updateTimer = setTimeout(() => {
    renderMinimap();
    updateTimer = null;
  }, updateDelay);
};

/**
 * 立即更新
 */
const forceUpdate = () => {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  nextTick(() => {
    renderMinimap();
  });
};

/**
 * 点击缩略图画布
 */
const handleCanvasClick = (event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  // 转换到画布坐标
  const canvasX = clickX / scale.value;
  const canvasY = clickY / scale.value;

  // 计算新的平移位置（让点击位置居中）
  const newPanX =
    props.containerSize.width / 2 - canvasX * props.viewportState.zoom;
  const newPanY =
    props.containerSize.height / 2 - canvasY * props.viewportState.zoom;

  emit('viewport-change', { x: newPanX, y: newPanY });
};

/**
 * 开始拖拽视口指示器
 */
const startViewportDrag = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  isViewportDragging.value = true;

  // 记录拖拽开始时的鼠标位置和当前视口状态
  viewportDragStart.value = { x: event.clientX, y: event.clientY };
  initialViewportState.value = {
    pan: { ...props.viewportState.pan },
    zoom: props.viewportState.zoom,
  };

  console.log('🎯 开始拖拽视口', {
    mouse: viewportDragStart.value,
    initialPan: initialViewportState.value.pan,
    currentZoom: initialViewportState.value.zoom,
    scale: scale.value,
  });

  document.addEventListener('mousemove', onViewportDrag, { passive: false });
  document.addEventListener('mouseup', stopViewportDrag);
};

/**
 * 拖拽视口指示器
 */
const onViewportDrag = (event: MouseEvent) => {
  if (!isViewportDragging.value) return;

  event.preventDefault();

  // 计算从拖拽开始到当前的总移动距离
  const totalDeltaX = event.clientX - viewportDragStart.value.x;
  const totalDeltaY = event.clientY - viewportDragStart.value.y;

  // 转换到画布坐标系，使用初始状态的缩放
  const canvasDeltaX = totalDeltaX / scale.value;
  const canvasDeltaY = totalDeltaY / scale.value;

  // 基于初始状态计算新的平移位置（避免累积误差）
  let newPanX =
    initialViewportState.value.pan.x -
    canvasDeltaX * initialViewportState.value.zoom;
  let newPanY =
    initialViewportState.value.pan.y -
    canvasDeltaY * initialViewportState.value.zoom;

  // 计算边界限制 - 修复：使用与缩略图一致的尺寸基准
  const maxPanX = 0;
  const maxPanY = 0;

  // 使用实际的画布像素尺寸计算边界
  let actualCanvasWidth, actualCanvasHeight;
  if (props.gridData && props.gridData.physicalSize) {
    actualCanvasWidth = props.gridData.physicalSize.width;
    actualCanvasHeight = props.gridData.physicalSize.height;
  } else {
    actualCanvasWidth = props.canvasSize.width;
    actualCanvasHeight = props.canvasSize.height;
  }

  const minPanX =
    props.containerSize.width - actualCanvasWidth * props.viewportState.zoom;
  const minPanY =
    props.containerSize.height - actualCanvasHeight * props.viewportState.zoom;

  // 应用边界限制
  newPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
  newPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));

  console.log('🖱️ 拖拽中', {
    totalDelta: { x: totalDeltaX, y: totalDeltaY },
    canvasDelta: { x: canvasDeltaX, y: canvasDeltaY },
    newPan: { x: newPanX, y: newPanY },
    boundaries: { minPanX, maxPanX, minPanY, maxPanY },
    actualCanvasSize: { width: actualCanvasWidth, height: actualCanvasHeight },
    containerSize: props.containerSize,
    zoom: props.viewportState.zoom,
    scale: scale.value,
  });

  emit('viewport-change', { x: newPanX, y: newPanY });
};

/**
 * 停止拖拽视口指示器
 */
const stopViewportDrag = (event?: MouseEvent) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  console.log('🛑 停止拖拽视口', {
    finalPan: props.viewportState.pan,
    initialPan: initialViewportState.value.pan,
  });

  isViewportDragging.value = false;

  document.removeEventListener('mousemove', onViewportDrag);
  document.removeEventListener('mouseup', stopViewportDrag);

  // 重置状态
  viewportDragStart.value = { x: 0, y: 0 };
  initialViewportState.value = { pan: { x: 0, y: 0 }, zoom: 1 };
};

/**
 * 切换最小化状态
 */
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

/**
 * 开始拖拽面板
 */
const startDrag = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.minimap-header')) return;

  isDragging.value = true;
  zIndex.value = 1003;

  dragStart.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  event.preventDefault();
};

/**
 * 拖拽面板
 */
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return;

  position.value = {
    x: event.clientX - dragStart.value.x,
    y: event.clientY - dragStart.value.y,
  };

  // 边界限制
  const maxX = window.innerWidth - 200;
  const maxY = window.innerHeight - 100;

  position.value.x = Math.max(0, Math.min(maxX, position.value.x));
  position.value.y = Math.max(0, Math.min(maxY, position.value.y));
};

/**
 * 停止拖拽面板
 */
const stopDrag = () => {
  isDragging.value = false;
  zIndex.value = 1002;

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

/**
 * 重置视图
 */
const resetView = () => {
  emit('reset-view');
};

/**
 * 适合窗口
 */
const fitToWindow = () => {
  emit('fit-to-window');
};

// 监听数据变化
watch(
  () => props.gridStorage,
  () => {
    if (minimapConfig.updateMode === 'throttled') {
      scheduleUpdate();
    } else {
      forceUpdate();
    }
  },
  { deep: true },
);

// 监听视口变化
watch(
  () => [props.viewportState.zoom, props.viewportState.pan],
  () => {
    // 视口变化不需要重新渲染缩略图内容，只需要更新指示器位置
  },
  { deep: true },
);

// 生命周期
onMounted(() => {
  nextTick(() => {
    forceUpdate();
  });
});

onUnmounted(() => {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('mousemove', onViewportDrag);
  document.removeEventListener('mouseup', stopViewportDrag);
});
</script>

<style scoped lang="scss">
.minimap-navigator {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
  width: auto;
  min-width: 180px;
  user-select: none;
  transition: all 0.2s ease;

  &.dragging {
    transform-origin: center;
    transform: scale(1.02);
  }

  &.minimized {
    height: 40px;
    overflow: hidden;
  }
}

.minimap-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 8px 8px 0 0;
  cursor: move;

  .minimap-title {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title-text {
      font-weight: 600;
      font-size: 13px;
    }

    .minimap-controls {
      display: flex;
      gap: 4px;

      .control-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        i {
          font-size: 10px;
        }
      }
    }
  }
}

.minimap-content {
  padding: 12px;
}

.minimap-canvas-container {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: #f9f9f9;

  .minimap-canvas {
    display: block;
  }

  .viewport-indicator {
    position: absolute;
    border: 2px solid #667eea;
    background: rgba(102, 126, 234, 0.1);
    cursor: move;
    min-width: 4px;
    min-height: 4px;

    &:hover {
      border-color: #5a67d8;
      background: rgba(90, 103, 216, 0.2);
    }
  }
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;

  .zoom-btn {
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      border-color: #667eea;
      background: #f0f2ff;
    }

    i {
      font-size: 10px;
    }
  }

  .zoom-level {
    font-size: 11px;
    color: #666;
    font-weight: 500;
  }
}

// 图标样式
.icon-minimize::before {
  content: '−';
}
.icon-expand::before {
  content: '+';
}
.icon-close::before {
  content: '×';
}
.icon-reset::before {
  content: '⌂';
}
.icon-fit::before {
  content: '⧉';
}
</style>
