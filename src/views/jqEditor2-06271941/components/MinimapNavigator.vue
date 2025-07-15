<template>
  <div
    v-if="visible"
    class="minimap-navigator"
    :class="{ minimized: isMinimized, dragging: isDragging }"
    :style="{
      right: currentRight + 'px',
      bottom: currentBottom + 'px',
      zIndex: zIndex,
    }"
    @mousedown="startDrag"
  >
    <!-- 标题栏 -->
    <div class="minimap-header">
      <div class="minimap-title">
        <span class="title-text">缩略图导航器</span>
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
          <i class="icon-reset">⌂</i>
        </button>
        <button class="zoom-btn" title="适合窗口" @click="fitToWindow">
          <i class="icon-fit">□</i>
        </button>
        <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

// Props
interface Props {
  visible: boolean;
  zoom: number;
  offset: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  canvasData?: any[][];
  initialPosition?: { x: number; y: number };
  performanceMode?: 'high' | 'balanced' | 'memory-optimized';
  maxCacheSize?: number;
  enableDetailedGrid?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialPosition: () => ({ x: -200, y: -200 }), // 右下角相对位置
  performanceMode: 'balanced',
  maxCacheSize: 1000, // 最大缓存像素数
  enableDetailedGrid: true,
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
const currentRight = ref(20);
const currentBottom = ref(20);
const dragStart = ref({ x: 0, y: 0 });
const viewportDragStart = ref({ x: 0, y: 0 });

// DOM引用
const minimapCanvasRef = ref<HTMLCanvasElement>();

// 性能优化配置
const PERFORMANCE_CONFIGS = {
  high: {
    updateDelay: 16, // 60fps
    maxRenderSize: { width: 200, height: 200 },
    enableGrid: true,
    sampleRate: 1, // 100%采样
  },
  balanced: {
    updateDelay: 100, // 10fps
    maxRenderSize: { width: 150, height: 150 },
    enableGrid: true,
    sampleRate: 1, // 100%采样
  },
  'memory-optimized': {
    updateDelay: 300, // 3.3fps
    maxRenderSize: { width: 100, height: 100 },
    enableGrid: false,
    sampleRate: 0.5, // 50%采样
  },
};

const currentConfig = computed(
  () => PERFORMANCE_CONFIGS[props.performanceMode],
);

// 防抖更新计时器
let updateTimer: ReturnType<typeof setTimeout> | null = null;
const updateDelay = computed(() => currentConfig.value.updateDelay);

// 内存使用统计
const memoryStats = ref({
  canvasSize: 0,
  dataSize: 0,
  totalPixels: 0,
  renderedPixels: 0,
});

// 计算缩略图尺寸（考虑性能模式）
const minimapSize = computed(() => {
  const maxSize = Math.min(
    currentConfig.value.maxRenderSize.width,
    currentConfig.value.maxRenderSize.height,
  );
  const canvasAspectRatio = props.canvasWidth / props.canvasHeight;

  if (canvasAspectRatio > 1) {
    // 宽图
    return {
      width: maxSize,
      height: Math.round(maxSize / canvasAspectRatio),
    };
  } else {
    // 高图或正方形
    return {
      width: Math.round(maxSize * canvasAspectRatio),
      height: maxSize,
    };
  }
});

// 计算缩放比例
const scale = computed(() => {
  return Math.min(
    minimapSize.value.width / (props.canvasWidth * props.pixelWidth),
    minimapSize.value.height / (props.canvasHeight * props.pixelHeight),
  );
});

// 计算视口指示器位置和大小
const viewportRect = computed(() => {
  // 可见区域在画布上的尺寸
  const visibleWidth = props.containerWidth / props.zoom;
  const visibleHeight = props.containerHeight / props.zoom;

  // 可见区域在画布上的位置
  const visibleX = -props.offset.x / props.zoom;
  const visibleY = -props.offset.y / props.zoom;

  // 转换到缩略图坐标
  return {
    x: Math.max(0, Math.min(minimapSize.value.width, visibleX * scale.value)),
    y: Math.max(0, Math.min(minimapSize.value.height, visibleY * scale.value)),
    width: Math.min(minimapSize.value.width, visibleWidth * scale.value),
    height: Math.min(minimapSize.value.height, visibleHeight * scale.value),
  };
});

/**
 * 内存优化的渲染函数
 */
const renderMinimap = () => {
  const canvas = minimapCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 设置背景色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 更新内存统计
  memoryStats.value.canvasSize = canvas.width * canvas.height * 4; // RGBA
  memoryStats.value.totalPixels = props.canvasWidth * props.canvasHeight;
  memoryStats.value.renderedPixels = 0;

  // 如果有画布数据，渲染内容（内存优化版本）
  if (props.canvasData && Array.isArray(props.canvasData)) {
    const cellWidth = minimapSize.value.width / props.canvasWidth;
    const cellHeight = minimapSize.value.height / props.canvasHeight;
    const sampleRate = currentConfig.value.sampleRate;

    // 内存优化：只渲染部分像素
    const pixelBatch: { x: number; y: number; color: string }[] = [];
    let processedCount = 0;

    for (let y = 0; y < props.canvasHeight; y += Math.ceil(1 / sampleRate)) {
      for (let x = 0; x < props.canvasWidth; x += Math.ceil(1 / sampleRate)) {
        const cellData = props.canvasData[y]?.[x];
        if (cellData && cellData !== '#ffffff' && cellData !== 'transparent') {
          pixelBatch.push({
            x: Math.floor(x * cellWidth),
            y: Math.floor(y * cellHeight),
            color: cellData,
          });
          processedCount++;

          // 内存控制：限制批次大小
          if (pixelBatch.length >= props.maxCacheSize) {
            // 渲染当前批次
            pixelBatch.forEach((pixel) => {
              ctx.fillStyle = pixel.color;
              ctx.fillRect(
                pixel.x,
                pixel.y,
                Math.max(1, Math.ceil(cellWidth)),
                Math.max(1, Math.ceil(cellHeight)),
              );
            });
            pixelBatch.length = 0; // 清空批次
          }
        }
      }
    }

    // 渲染剩余像素
    pixelBatch.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x,
        pixel.y,
        Math.max(1, Math.ceil(cellWidth)),
        Math.max(1, Math.ceil(cellHeight)),
      );
    });

    memoryStats.value.renderedPixels = processedCount;
    memoryStats.value.dataSize = processedCount * 8; // 估算数据大小
  }

  // 可选：绘制网格（仅在性能允许时）
  if (currentConfig.value.enableGrid && props.enableDetailedGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    const cellWidth = minimapSize.value.width / props.canvasWidth;
    const cellHeight = minimapSize.value.height / props.canvasHeight;

    // 减少网格线数量以节省内存
    const gridStepX = Math.max(1, Math.floor(props.canvasWidth / 20));
    const gridStepY = Math.max(1, Math.floor(props.canvasHeight / 20));

    // 绘制垂直线
    for (let x = 0; x <= props.canvasWidth; x += gridStepX) {
      const lineX = x * cellWidth;
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, minimapSize.value.height);
      ctx.stroke();
    }

    // 绘制水平线
    for (let y = 0; y <= props.canvasHeight; y += gridStepY) {
      const lineY = y * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(minimapSize.value.width, lineY);
      ctx.stroke();
    }
  }
};

/**
 * 内存感知的节流渲染更新
 */
const throttledRender = () => {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  // 根据内存使用情况调整延迟
  const memoryFactor = memoryStats.value.renderedPixels > 1000 ? 1.5 : 1;
  const adjustedDelay = updateDelay.value * memoryFactor;

  updateTimer = setTimeout(renderMinimap, adjustedDelay);
};

/**
 * 切换最小化状态
 */
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

/**
 * 开始拖拽缩略图窗口（已禁用，缩略图固定位置）
 */
const startDrag = (e: MouseEvent) => {
  // 禁用拖拽，缩略图固定在右下角
};

/**
 * 拖拽缩略图窗口
 */
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;

  const deltaX = e.clientX - dragStart.value.x;
  const deltaY = e.clientY - dragStart.value.y;

  // 使用right/bottom定位，拖拽方向相反
  currentRight.value -= deltaX;
  currentBottom.value -= deltaY;

  // 限制在容器内
  currentRight.value = Math.max(10, Math.min(400, currentRight.value));
  currentBottom.value = Math.max(10, Math.min(400, currentBottom.value));

  dragStart.value = { x: e.clientX, y: e.clientY };
};

/**
 * 停止拖拽缩略图窗口
 */
const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

/**
 * 开始拖拽视口指示器
 */
const startViewportDrag = (e: MouseEvent) => {
  isViewportDragging.value = true;
  viewportDragStart.value = { x: e.clientX, y: e.clientY };

  document.addEventListener('mousemove', onViewportDrag);
  document.addEventListener('mouseup', stopViewportDrag);
};

/**
 * 拖拽视口指示器
 */
const onViewportDrag = (e: MouseEvent) => {
  if (!isViewportDragging.value) return;

  const deltaX = e.clientX - viewportDragStart.value.x;
  const deltaY = e.clientY - viewportDragStart.value.y;

  // 转换为画布坐标的变化
  const canvasDeltaX = deltaX / scale.value;
  const canvasDeltaY = deltaY / scale.value;

  // 更新视口位置
  const newPan = {
    x: props.offset.x - canvasDeltaX * props.zoom,
    y: props.offset.y - canvasDeltaY * props.zoom,
  };

  emit('viewport-change', newPan);

  viewportDragStart.value = { x: e.clientX, y: e.clientY };
};

/**
 * 停止拖拽视口指示器
 */
const stopViewportDrag = () => {
  isViewportDragging.value = false;
  document.removeEventListener('mousemove', onViewportDrag);
  document.removeEventListener('mouseup', stopViewportDrag);
};

/**
 * 处理缩略图画布点击
 */
const handleCanvasClick = (e: MouseEvent) => {
  const rect = minimapCanvasRef.value?.getBoundingClientRect();
  if (!rect) return;

  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // 转换为画布坐标
  const canvasX = clickX / scale.value;
  const canvasY = clickY / scale.value;

  // 计算新的偏移量（让点击点成为视口中心）
  const newPan = {
    x: -(canvasX - props.containerWidth / props.zoom / 2) * props.zoom,
    y: -(canvasY - props.containerHeight / props.zoom / 2) * props.zoom,
  };

  emit('viewport-change', newPan);
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

// 监听数据变化，更新缩略图
watch(
  () => [
    props.canvasData,
    props.canvasWidth,
    props.canvasHeight,
    props.zoom,
    props.offset,
  ],
  throttledRender,
  { deep: true },
);

// 组件挂载时渲染
onMounted(() => {
  nextTick(() => {
    renderMinimap();
  });
});

// 组件卸载时清理
onUnmounted(() => {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('mousemove', onViewportDrag);
  document.removeEventListener('mouseup', stopViewportDrag);
});

// 内存监控（开发模式）
const logMemoryUsage = () => {
  console.log('🗺️ 缩略图内存使用:', {
    性能模式: props.performanceMode,
    画布大小: `${minimapSize.value.width}x${minimapSize.value.height}`,
    内存占用: `${(memoryStats.value.canvasSize / 1024).toFixed(1)}KB`,
    数据大小: `${(memoryStats.value.dataSize / 1024).toFixed(1)}KB`,
    像素采样率: `${(
      (memoryStats.value.renderedPixels / memoryStats.value.totalPixels) *
      100
    ).toFixed(1)}%`,
    更新间隔: `${updateDelay.value}ms`,
  });
};
</script>

<style scoped>
.minimap-navigator {
  position: absolute;
  background: rgba(45, 45, 45, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  user-select: none;
  overflow: hidden;
}

.minimap-navigator.dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transform-origin: center;
}

.minimap-navigator.minimized {
  height: auto;
}

.minimap-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 8px 12px;
  cursor: move;
}

.minimap-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-text {
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.minimap-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.minimize-btn .icon-minimize::before {
  content: '−';
}

.minimize-btn .icon-expand::before {
  content: '□';
}

.close-btn .icon-close::before {
  content: '×';
}

.minimap-content {
  padding: 12px;
}

.minimap-canvas-container {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  cursor: crosshair;
}

.minimap-canvas {
  display: block;
  background: #ffffff;
}

.viewport-indicator {
  position: absolute;
  border: 2px solid #f39c12;
  background: rgba(243, 156, 18, 0.2);
  cursor: move;
  min-width: 4px;
  min-height: 4px;
  transition: opacity 0.2s ease;
}

.viewport-indicator:hover {
  opacity: 0.8;
  border-color: #e67e22;
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 4px 0;
}

.zoom-btn {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.zoom-level {
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  min-width: 40px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .minimap-navigator {
    width: 140px;
  }

  .title-text {
    font-size: 11px;
  }

  .minimap-content {
    padding: 8px;
  }
}
</style>
