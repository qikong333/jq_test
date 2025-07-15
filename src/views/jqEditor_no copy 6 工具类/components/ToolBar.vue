<template>
  <div class="toolbar" :class="position">
    <div class="tools-container">
      <button
        v-for="tool in availableTools"
        :key="tool.id"
        class="tool-btn"
        :class="{
          active: currentToolId === tool.id,
          'bg-blue-500 text-white': tool.active,
          'bg-gray-200 text-gray-700 hover:bg-gray-300': !tool.active,
        }"
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
import { defineEmits, defineProps, computed } from 'vue'
import { TOOLS, type ToolType } from '../types/tools'
import { useToolManager } from '../classes/tools/ToolManager'
import { createToolAdapterList } from '../classes/tools/adapters'

// Props
interface Props {
  currentTool?: ToolType
  position?: 'left' | 'top'
  showLabels?: boolean
  showShortcuts?: boolean
  useNewManager?: boolean // 是否使用新的工具管理器
  canvasComposable?: ReturnType<typeof import('../composables/useCanvas').useCanvas>
}

const props = withDefaults(defineProps<Props>(), {
  position: 'left',
  showLabels: true,
  showShortcuts: true,
  useNewManager: false,
})

// Emits
const emit = defineEmits<{
  (e: 'tool-change', tool: ToolType): void
}>()

// 新工具管理器
const toolManager = props.canvasComposable ? useToolManager(props.canvasComposable) : null

// 计算属性：可用工具列表
const availableTools = computed(() => {
  if (props.useNewManager && props.canvasComposable) {
    // 使用新工具管理器的工具列表
    const toolAdapterList = createToolAdapterList(props.canvasComposable)
    return toolAdapterList.map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      icon: adapter.icon,
      description: adapter.name,
    }))
  } else {
    // 使用传统工具列表
    return TOOLS
  }
})

// 计算属性：当前激活的工具ID
const currentToolId = computed(() => {
  if (props.useNewManager && toolManager) {
    return toolManager.currentTool.value?.id || null
  } else {
    return props.currentTool
  }
})

// Methods
const getTooltip = (tool: (typeof TOOLS)[0]) => {
  if (!props.showShortcuts || !tool.shortcut) return tool.name
  return `${tool.name} (${tool.shortcut})`
}

const selectTool = (toolId: string) => {
  if (props.useNewManager && props.canvasComposable && toolManager) {
    // 使用新工具管理器
    toolManager.setActiveTool(toolId)
  } else {
    // 使用传统方式
    emit('tool-change', toolId as ToolType)
  }
}
</script>

<script lang="ts">
export default {
  name: 'ToolBar',
}
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
