import { ref } from 'vue';
import { ToolType } from './useCanvas';

export interface Tool {
  name: ToolType;
  label: string;
  icon: string;
}

export function useTools() {
  const tools: Tool[] = [
    {
      name: 'pen',
      label: '画笔',
      icon: '✏️',
    },
    {
      name: 'eraser',
      label: '橡皮擦',
      icon: '🧽',
    },
    {
      name: 'paintBucket',
      label: '填充',
      icon: '🪣',
    },
    {
      name: 'rectangle',
      label: '矩形',
      icon: '⬜',
    },
    {
      name: 'circle',
      label: '圆形',
      icon: '⭕',
    },
    {
      name: 'line',
      label: '线条',
      icon: '📏',
    },
    {
      name: 'move',
      label: '移动',
      icon: '👆',
    },
    {
      name: 'colorPicker',
      label: '取色器',
      icon: '🔍',
    },
  ];

  const currentTool = ref<ToolType>('pen');

  const selectTool = (toolName: ToolType) => {
    currentTool.value = toolName;
  };

  return {
    tools,
    currentTool,
    selectTool,
  };
}
