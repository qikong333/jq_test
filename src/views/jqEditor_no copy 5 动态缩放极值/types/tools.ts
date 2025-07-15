// ========== 工具类型 ==========
export type ToolType = 'brush' | 'pan' | 'imageUpload';

// ========== 工具配置 ==========
export interface Tool {
  id: ToolType;
  name: string;
  icon: string;
  cursor: string;
  shortcut?: string;
}

// ========== 工具栏配置 ==========
export interface ToolbarConfig {
  position: 'left' | 'top';
  showLabels: boolean;
  showShortcuts: boolean;
}

// ========== 工具栏状态 ==========
export interface ToolbarState {
  currentTool: ToolType;
  isVisible: boolean;
}

// ========== 工具定义 ==========
export const TOOLS: Tool[] = [
  {
    id: 'brush',
    name: '画笔',
    icon: '🖌️',
    cursor: 'crosshair',
    shortcut: 'B',
  },
  {
    id: 'pan',
    name: '平移',
    icon: '✋',
    cursor: 'grab',
    shortcut: 'H',
  },
  {
    id: 'imageUpload',
    name: '图片上传',
    icon: '🖼️',
    cursor: 'pointer',
    shortcut: 'I',
  },
];
