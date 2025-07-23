<template>
  <div class="toolbar-container">
    <!-- 工具按钮组 -->
    <div class="tool-group">
      <button
        v-for="tool in tools"
        :key="tool.name"
        :class="{ active: currentTool === tool.name }"
        :title="tool.label"
        @click="handleToolSelect(tool.name)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span class="tool-label">{{ tool.label }}</span>
      </button>

      <!-- 图片上传按钮 - 单独处理 -->
      <button
        :class="{ active: false }"
        title="上传图片"
        @click="triggerFileInput"
      >
        <span class="tool-icon">🖼️</span>
        <span class="tool-label">上传图片</span>
      </button>

      <input
        id="image-upload"
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleImageUpload"
      />
    </div>

    <!-- 颜色选择器 -->
    <div class="color-picker">
      <label>颜色:</label>
      <input
        type="color"
        :value="currentColor"
        @change="handleColorChange"
        @input="handleColorChange"
      />
      <span
        class="color-preview"
        :style="{ backgroundColor: currentColor }"
      ></span>
    </div>

    <!-- 缩放控制 -->
    <div class="zoom-controls">
      <button @click="zoomOut">-</button>
      <span>{{ Math.round(zoomLevel * 100) }}%</span>
      <button @click="zoomIn">+</button>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button title="获取画布颜色" @click="getCanvasColors">获取颜色</button>
      <button title="清空画布" @click="clearCanvas">清空</button>
      <button title="导出图片" @click="exportCanvas">导出</button>
      <button title="完成编辑" class="finish-button" @click="finishEditing">
        完成
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ToolType } from '../composables/useCanvas';
import { Tool } from '../composables/useTools';

// 定义props
const props = defineProps({
  tools: {
    type: Array as () => Tool[],
    required: true,
  },
  currentTool: {
    type: String as () => ToolType,
    required: true,
  },
  currentColor: {
    type: String,
    required: true,
  },
  zoomLevel: {
    type: Number,
    required: true,
  },
});

// 定义emit
const emit = defineEmits([
  'tool-select',
  'color-change',
  'zoom-in',
  'zoom-out',
  'clear-canvas',
  'export-canvas',
  'finish-editing',
  'image-upload',
  'get-canvas-colors',
]);

// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null);

// 处理工具选择
const handleToolSelect = (toolName: ToolType) => {
  emit('tool-select', toolName);
};

// 处理颜色变化
const handleColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  console.log('ToolBar颜色变化:', target.value);
  emit('color-change', target.value);
};

// 缩放函数
const zoomIn = () => {
  emit('zoom-in');
};

const zoomOut = () => {
  emit('zoom-out');
};

// 清空画布
const clearCanvas = () => {
  emit('clear-canvas');
};

// 导出画布
const exportCanvas = () => {
  emit('export-canvas');
};

// 完成编辑
const finishEditing = () => {
  emit('finish-editing');
};

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 处理图片上传
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    emit('image-upload', target.files[0]);
  }
};

// 获取画布颜色
const getCanvasColors = () => {
  emit('get-canvas-colors');
};
</script>

<style scoped>
.toolbar-container {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #333;
  color: white;
  gap: 20px;
  width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  /* 确保工具栏不换行，允许水平滚动 */
}

.tool-group {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}

.tool-group button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 60px;
  padding: 5px;
  background: #555;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tool-group button:hover {
  background: #666;
}

.tool-group button.active {
  background: #007bff;
}

.tool-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.tool-label {
  font-size: 12px;
  white-space: nowrap;
}

.color-picker,
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #fff;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-left: auto; /* 操作按钮靠右对齐 */
}

.action-buttons button {
  padding: 6px 12px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.action-buttons button:hover {
  background: #45a049;
}

.action-buttons .finish-button {
  background: #007bff;
}

.action-buttons .finish-button:hover {
  background: #0056b3;
}

/* 针对小屏幕的响应式调整 */
@media (max-width: 768px) {
  .toolbar-container {
    overflow-x: auto;
    padding: 8px;
    gap: 10px;
  }

  .tool-group button {
    min-width: 50px;
    height: 50px;
  }

  .tool-icon {
    font-size: 16px;
  }

  .tool-label {
    font-size: 10px;
  }
}
</style>
