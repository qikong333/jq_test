<template>
  <div class="toolbar" :class="position">
    <div class="tools-container">
      <button
        v-for="tool in TOOLS"
        :key="tool.id"
        class="tool-btn"
        :class="{ active: currentTool === tool.id }"
        :title="getTooltip(tool)"
        @click="selectTool(tool.id)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span v-if="showLabels" class="tool-name">{{ tool.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TOOLS, type ToolType } from '../types/tools';

// Props
interface Props {
  currentTool: ToolType;
  position?: 'left' | 'top';
  showLabels?: boolean;
  showShortcuts?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'left',
  showLabels: true,
  showShortcuts: true,
});

// Emits
const emit = defineEmits<{
  (e: 'tool-change', tool: ToolType): void;
}>();

// Methods
const getTooltip = (tool: (typeof TOOLS)[0]) => {
  if (!props.showShortcuts || !tool.shortcut) return tool.name;
  return `${tool.name} (${tool.shortcut})`;
};

const selectTool = (toolId: ToolType) => {
  emit('tool-change', toolId);
};
</script>

<style scoped lang="scss">
.toolbar {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  z-index: 100;

  &.left {
    flex-direction: column;
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
  }

  &.top {
    flex-direction: row;
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.tools-container {
  display: flex;
  gap: 4px;
  flex-direction: inherit;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }

  &.active {
    background: #e6f7ff;
    color: #1890ff;
  }

  .tool-icon {
    font-size: 20px;
  }

  .tool-name {
    font-size: 14px;
    white-space: nowrap;
  }
}
</style>
