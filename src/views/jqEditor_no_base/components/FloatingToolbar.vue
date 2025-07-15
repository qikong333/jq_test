<template>
  <div
    class="floating-toolbar"
    :class="{ minimized: isMinimized, dragging: isDragging }"
    :style="{
      transform: `translate(1200px, 500px)`,
      zIndex: zIndex,
    }"
    @mousedown="startDrag"
  >
    <!-- 工具栏头部 -->
    <div class="toolbar-header">
      <div class="toolbar-title">
        <span class="title-text">画笔工具</span>
        <div class="toolbar-controls">
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

    <!-- 工具栏内容 -->
    <div v-show="!isMinimized" class="toolbar-content">
      <!-- 颜色面板 -->
      <div class="tool-section color-section">
        <div class="section-title">颜色</div>

        <!-- 当前颜色显示 -->
        <div class="current-color-display">
          <div
            class="color-preview"
            :style="{ backgroundColor: colorSystem.currentColor.value }"
            @click="showColorPicker = !showColorPicker"
          ></div>
          <input
            v-show="showColorPicker"
            v-model="colorSystem.currentColor.value"
            type="color"
            class="color-input"
            @change="onColorChange"
          />
        </div>

        <!-- 预设颜色 -->
        <div class="color-palette">
          <div
            v-for="color in colorSystem.presetColors.value"
            :key="color"
            class="color-item"
            :class="{ active: color === colorSystem.currentColor.value }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          ></div>
        </div>

        <!-- 最近使用的颜色 -->
        <div
          v-if="colorSystem.recentColors.value.length > 0"
          class="recent-colors"
        >
          <div class="section-subtitle">最近使用</div>
          <div class="color-palette">
            <div
              v-for="color in colorSystem.recentColors.value"
              :key="color"
              class="color-item recent"
              :style="{ backgroundColor: color }"
              :title="color"
              @click="selectColor(color)"
            ></div>
          </div>
        </div>
      </div>

      <!-- 画笔设置 -->
      <div class="tool-section brush-section">
        <div class="section-title">画笔</div>

        <!-- 画笔大小 -->
        <div class="brush-size-control">
          <label class="control-label">
            大小: {{ brushSystem.brushConfig.value.sizeCm.toFixed(1) }}cm
          </label>
          <input
            v-model.number="brushSystem.brushConfig.value.sizeCm"
            type="range"
            :min="0.1"
            :max="2.0"
            :step="0.1"
            class="size-slider"
          />
          <div class="size-info">
            {{ brushSystem.getBrushInfo().sizeInGrids }} 格子
          </div>
        </div>

        <!-- 画笔形状 -->
        <div class="brush-shape-control">
          <label class="control-label">形状</label>
          <div class="shape-buttons">
            <button
              v-for="shape in ['circle', 'square']"
              :key="shape"
              class="shape-btn"
              :class="{ active: brushSystem.brushConfig.value.shape === shape }"
              :title="shape === 'circle' ? '圆形' : '方形'"
              @click="brushSystem.setBrushShape(shape)"
            >
              <i :class="`icon-${shape}`"></i>
            </button>
          </div>
        </div>

        <!-- 画笔硬度 -->
        <div class="brush-hardness-control">
          <label class="control-label">
            硬度: {{ brushSystem.brushConfig.value.hardness }}%
          </label>
          <input
            v-model.number="brushSystem.brushConfig.value.hardness"
            type="range"
            min="0"
            max="100"
            class="hardness-slider"
          />
        </div>

        <!-- 画笔信息 -->
        <div class="brush-info">
          <div class="info-item">
            <span class="info-label">物理大小:</span>
            <span class="info-value">
              {{ brushSystem.getBrushInfo().size }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">影响格子:</span>
            <span class="info-value">
              {{ brushSystem.getBrushInfo().affectedCells }}
            </span>
          </div>
        </div>
      </div>

      <!-- 工具选项 -->
      <div class="tool-section options-section">
        <div class="section-title">选项</div>

        <!-- 网格开关 -->
        <div class="option-control">
          <label class="checkbox-label">
            <input
              v-model="gridSystem.showGrid.value"
              type="checkbox"
              class="option-checkbox"
            />
            <span class="checkbox-text">显示网格</span>
          </label>
        </div>

        <!-- 清空按钮 -->
        <div class="option-control">
          <button
            class="action-btn clear-btn"
            title="清空画布"
            @click="$emit('clear-canvas')"
          >
            <i class="icon-clear"></i>
            清空画布
          </button>
        </div>

        <!-- 导出按钮 -->
        <div class="option-control">
          <button
            class="action-btn export-btn"
            title="导出图片"
            @click="$emit('export-image')"
          >
            <i class="icon-export"></i>
            导出图片
          </button>
        </div>
      </div>

      <!-- 画布信息 -->
      <div class="tool-section info-section">
        <div class="section-title">信息</div>
        <div class="canvas-info">
          <div class="info-item">
            <span class="info-label">尺寸:</span>
            <span class="info-value">{{ props.width }}×{{ props.height }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">物理:</span>
            <span class="info-value">
              {{ props.actualWidth }}×{{ props.actualHeight }}cm
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">格子:</span>
            <span class="info-value">
              {{ gridSystem.gridData.value.cellWidth.toFixed(1) }}×{{
                gridSystem.gridData.value.cellHeight.toFixed(1)
              }}px
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { BasicCanvasProps } from '../types/canvas';

// Props
interface Props {
  props: BasicCanvasProps;
  colorSystem: any;
  brushSystem: any;
  gridSystem: any;
  initialPosition?: { x: number; y: number };
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'clear-canvas': [];
  'export-image': [];
  close: [];
}>();

// 响应式状态
const isMinimized = ref(false);
const isDragging = ref(false);
const showColorPicker = ref(false);
const zIndex = ref(1000);

// 位置状态
const position = ref(props.initialPosition || { x: 20, y: 20 });
const dragStart = ref({ x: 0, y: 0 });

/**
 * 选择颜色
 */
const selectColor = (color: string) => {
  props.colorSystem.setCurrentColor(color);
};

/**
 * 颜色改变事件
 */
const onColorChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.value) {
    selectColor(target.value);
  }
};

/**
 * 切换最小化状态
 */
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

/**
 * 开始拖拽
 */
const startDrag = (event: MouseEvent) => {
  // 只有点击头部才能拖拽
  const target = event.target as HTMLElement;
  if (!target.closest('.toolbar-header')) return;

  isDragging.value = true;
  zIndex.value = 1001; // 提升层级

  dragStart.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  // 阻止默认行为
  event.preventDefault();
};

/**
 * 拖拽中
 */
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return;

  position.value = {
    x: event.clientX - dragStart.value.x,
    y: event.clientY - dragStart.value.y,
  };

  // 边界限制
  const maxX = window.innerWidth - 300; // 工具栏最小宽度
  const maxY = window.innerHeight - 100; // 工具栏最小高度

  position.value.x = Math.max(0, Math.min(maxX, position.value.x));
  position.value.y = Math.max(0, Math.min(maxY, position.value.y));
};

/**
 * 停止拖拽
 */
const stopDrag = () => {
  isDragging.value = false;
  zIndex.value = 1000; // 恢复层级

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 生命周期
onMounted(() => {
  // 可以添加一些初始化逻辑
});

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<style scoped lang="scss">
.floating-toolbar {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
  width: 280px;
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

.toolbar-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 8px 8px 0 0;
  cursor: move;

  .toolbar-title {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title-text {
      font-weight: 600;
      font-size: 13px;
    }

    .toolbar-controls {
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

.toolbar-content {
  padding: 12px;
  max-height: 600px;
  overflow-y: auto;
}

.tool-section {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
    font-size: 13px;
    border-bottom: 1px solid #eee;
    padding-bottom: 4px;
  }

  .section-subtitle {
    font-size: 11px;
    color: #666;
    margin: 8px 0 4px 0;
  }
}

// 颜色相关样式
.current-color-display {
  margin-bottom: 8px;
  position: relative;

  .color-preview {
    width: 40px;
    height: 40px;
    border: 2px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-color: #667eea;
    }
  }

  .color-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 40px;
    height: 40px;
    opacity: 0;
    cursor: pointer;
  }
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin-bottom: 8px;

  .color-item {
    width: 24px;
    height: 24px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.1);
      border-color: #667eea;
    }

    &.active {
      border-color: #667eea;
      border-width: 2px;
      transform: scale(1.05);
    }

    &.recent {
      border-radius: 50%;
    }
  }
}

// 画笔控制样式
.brush-size-control,
.brush-hardness-control {
  margin-bottom: 12px;

  .control-label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    color: #555;
  }

  .size-slider,
  .hardness-slider {
    width: 100%;
    margin-bottom: 4px;
  }

  .size-info {
    font-size: 11px;
    color: #888;
  }
}

.brush-shape-control {
  margin-bottom: 12px;

  .shape-buttons {
    display: flex;
    gap: 6px;
    margin-top: 4px;

    .shape-btn {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      background: #f8f9fa;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #667eea;
        background: #f0f2ff;
      }

      &.active {
        border-color: #667eea;
        background: #667eea;
        color: white;
      }

      i {
        font-size: 14px;
      }
    }
  }
}

.brush-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
    font-size: 11px;

    .info-label {
      color: #666;
    }

    .info-value {
      color: #333;
      font-weight: 500;
    }
  }
}

// 选项控制样式
.option-control {
  margin-bottom: 8px;

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;

    .option-checkbox {
      margin-right: 6px;
    }

    .checkbox-text {
      font-size: 12px;
      color: #555;
    }
  }

  .action-btn {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    background: #f8f9fa;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;

    &:hover {
      border-color: #667eea;
      background: #f0f2ff;
    }

    &.clear-btn:hover {
      border-color: #dc3545;
      background: #ffe6e6;
      color: #dc3545;
    }

    i {
      font-size: 12px;
    }
  }
}

// 信息显示样式
.canvas-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 11px;

    .info-label {
      color: #666;
    }

    .info-value {
      color: #333;
      font-weight: 500;
    }
  }
}

// 图标样式（使用简单的CSS图标）
.icon-minimize::before {
  content: '−';
}
.icon-expand::before {
  content: '+';
}
.icon-close::before {
  content: '×';
}
.icon-circle::before {
  content: '●';
}
.icon-square::before {
  content: '■';
}
.icon-clear::before {
  content: '🗑';
}
.icon-export::before {
  content: '↓';
}

// 滚动条样式
.toolbar-content::-webkit-scrollbar {
  width: 6px;
}

.toolbar-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.toolbar-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>
