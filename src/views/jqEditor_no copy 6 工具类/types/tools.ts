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

// ========== 新工具管理接口 ==========
import type { Ref, ComputedRef } from 'vue';
import type { GridCoordinate, CanvasState } from './canvas';
import type { GridStorage } from '../classes/GridStorage';

// 工具配置接口
export interface ToolConfig {
  [key: string]: any;
}

// 工具使用统计
export interface ToolUsageStats {
  usageCount: number;
  totalTime: number;
  lastUsed?: Date;
}

// 工具状态接口
export interface ToolState {
  isActive: boolean;
  config: ToolConfig;
  lastUsed?: Date;
  usage: ToolUsageStats;
}

// 视口状态接口
export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  width: number;
  height: number;
}

// 工具上下文接口
export interface ToolContext {
  canvas: CanvasRenderingContext2D;
  canvasState: CanvasState;
  viewport: ViewportState;
  gridStorage: GridStorage;
}

// 工具事件接口
export interface ToolEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'keydown' | 'keyup';
  data: MouseEvent | KeyboardEvent;
  canvasCoords?: GridCoordinate;
}

// 工具接口
export interface ITool {
  // 基础属性
  readonly id: ToolType;
  readonly name: string;
  readonly icon: string;
  readonly cursor: string;
  readonly shortcut?: string;
  
  // 状态管理
  readonly state: Ref<ToolState>;
  readonly isActive: ComputedRef<boolean>;
  
  // 生命周期方法
  onActivate(context: ToolContext): Promise<void> | void;
  onDeactivate(context: ToolContext): Promise<void> | void;
  onUpdate(deltaTime: number): void;
  
  // 事件处理
  handleEvent(event: ToolEvent): boolean;
  
  // 配置管理
  getConfig(): ToolConfig;
  setConfig(config: Partial<ToolConfig>): void;
}

// 工具管理器接口
export interface IToolManager {
  // 工具注册
  registerTool(tool: ITool): void;
  unregisterTool(toolId: ToolType): void;
  
  // 工具切换
  setActiveTool(toolId: ToolType): Promise<boolean>;
  getActiveTool(): ITool | null;
  
  // 状态访问
  readonly currentTool: Ref<ToolType | null>;
  readonly availableTools: ComputedRef<ITool[]>;
  readonly toolStates: Ref<Record<ToolType, ToolState>>;
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
