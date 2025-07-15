/**
 * PixiJS 编辑器工具模块
 * 导出所有可用的绘图和编辑工具
 */

export { BrushTool } from './BrushTool'
export { EraserTool } from './EraserTool'
export { FillTool } from './FillTool'
export { EyedropperTool } from './EyedropperTool'
export { MoveTool } from './MoveTool'
export { SelectTool } from './SelectTool'

// 工具类型定义
export type ToolClass =
  | typeof BrushTool
  | typeof EraserTool
  | typeof FillTool
  | typeof EyedropperTool
  | typeof MoveTool
  | typeof SelectTool

// 工具名称枚举
export enum ToolNames {
  BRUSH = 'brush',
  ERASER = 'eraser',
  FILL = 'fill',
  EYEDROPPER = 'eyedropper',
  MOVE = 'move',
  SELECT = 'select',
}

// 工具配置类型
export interface ToolConfigs {
  [ToolNames.BRUSH]: {
    size: number
    color: string
    opacity: number
  }
  [ToolNames.ERASER]: {
    size: number
  }
  [ToolNames.FILL]: {
    color: string
    tolerance: number
  }
  [ToolNames.EYEDROPPER]: {}
  [ToolNames.MOVE]: {}
  [ToolNames.SELECT]: {}
}

// 默认工具配置
export const defaultToolConfigs: ToolConfigs = {
  [ToolNames.BRUSH]: {
    size: 1,
    color: '#000000',
    opacity: 1,
  },
  [ToolNames.ERASER]: {
    size: 1,
  },
  [ToolNames.FILL]: {
    color: '#000000',
    tolerance: 0,
  },
  [ToolNames.EYEDROPPER]: {},
  [ToolNames.MOVE]: {},
  [ToolNames.SELECT]: {},
}

// 工具元数据
export interface ToolMetadata {
  name: string
  displayName: string
  icon: string
  shortcut: string
  cursor: string
  description: string
}

// 工具元数据映射
export const toolMetadata: Record<ToolNames, ToolMetadata> = {
  [ToolNames.BRUSH]: {
    name: 'brush',
    displayName: '画笔',
    icon: '🖌️',
    shortcut: 'B',
    cursor: 'crosshair',
    description: '用于绘制像素',
  },
  [ToolNames.ERASER]: {
    name: 'eraser',
    displayName: '橡皮擦',
    icon: '🧽',
    shortcut: 'E',
    cursor: 'crosshair',
    description: '用于擦除像素',
  },
  [ToolNames.FILL]: {
    name: 'fill',
    displayName: '填充',
    icon: '🪣',
    shortcut: 'F',
    cursor: 'crosshair',
    description: '用于填充连通区域',
  },
  [ToolNames.EYEDROPPER]: {
    name: 'eyedropper',
    displayName: '吸管',
    icon: '💉',
    shortcut: 'I',
    cursor: 'crosshair',
    description: '用于提取颜色',
  },
  [ToolNames.MOVE]: {
    name: 'move',
    displayName: '移动',
    icon: '✋',
    shortcut: 'M',
    cursor: 'grab',
    description: '用于平移视图',
  },
  [ToolNames.SELECT]: {
    name: 'select',
    displayName: '选择',
    icon: '⬚',
    shortcut: 'S',
    cursor: 'crosshair',
    description: '用于选择像素区域',
  },
}

// 工具分组
export const toolGroups = {
  drawing: [ToolNames.BRUSH, ToolNames.ERASER, ToolNames.FILL],
  utility: [ToolNames.EYEDROPPER, ToolNames.MOVE, ToolNames.SELECT],
}

// 工具快捷键映射
export const toolShortcuts: Record<string, ToolNames> = {
  b: ToolNames.BRUSH,
  e: ToolNames.ERASER,
  f: ToolNames.FILL,
  i: ToolNames.EYEDROPPER,
  m: ToolNames.MOVE,
  s: ToolNames.SELECT,
}
