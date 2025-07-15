import type { Application, Graphics, Container, Sprite } from 'pixi.js'

// 基础类型
export type Tool = 'brush' | 'eraser' | 'fill' | 'eyedropper' | 'move' | 'select'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

// PixiJS 编辑器配置
export interface PixiEditorConfig {
  width: number
  height: number
  backgroundColor: number
  gridSize: number
  showGrid: boolean
  maxZoom: number
  minZoom: number
}

// 视口状态
export interface ViewportState {
  x: number
  y: number
  scale: number
  width: number
  height: number
}

// 画笔配置
export interface BrushConfig {
  size: number
  color: string
  opacity: number
  hardness: number
}

// 网格配置
export interface GridConfig {
  size: number
  color: number
  alpha: number
  visible: boolean
}

// 像素数据
export interface PixelData {
  x: number
  y: number
  color: number
  alpha?: number
  timestamp?: number
}

// 历史记录项
export interface HistoryItem {
  id: string
  timestamp: number
  action: string
  data: unknown
  preview?: string
  description?: string
  size?: number
}

// 工具事件
export interface ToolEvent {
  type: 'start' | 'move' | 'end' | 'cancel'
  position: Point
  pressure?: number
  shiftKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

// PixiJS 应用扩展接口
export interface PixiEditorApp extends Application {
  // 主要容器
  mainContainer: Container
  gridContainer: Container
  pixelContainer: Container
  uiContainer: Container
  
  // 网格图形
  gridGraphics: Graphics
  
  // 当前状态
  currentTool: Tool
  currentColor: string
  brushSize: number
  
  // 视口状态
  viewport: ViewportState
}

// 工具接口
export interface ITool {
  name: Tool
  cursor: string
  onStart(event: ToolEvent): void
  onMove(event: ToolEvent): void
  onEnd(event: ToolEvent): void
  onCancel(): void
}

// 渲染层接口
export interface IRenderLayer {
  name: string
  container: Container
  visible: boolean
  zIndex: number
  alpha: number
  addChild(child: Container): void
  removeChild(child: Container): void
  clear(): void
  destroy(): void
}

// 存储接口
export interface IPixelStorage {
  setPixel(x: number, y: number, color: number, alpha?: number): void
  getPixel(x: number, y: number): PixelData | null
  removePixel(x: number, y: number): void
  getPixelsInRegion(rect: Rect): PixelData[]
  clear(): void
  getAllPixels(): PixelData[]
  getStats(): {
    pixelCount: number
    gridSize: number
    spatialIndexSize: number
    bounds: Rect | null
    memoryUsage: unknown
  }
}

// 历史管理接口
export interface IHistoryManager {
  canUndo(): boolean
  canRedo(): boolean
  maxHistorySize: number
  saveState(action: string, data: unknown): void
  undo(): HistoryItem | null
  redo(): HistoryItem | null
  clear(): void
  getHistory(): HistoryItem[]
}

// 性能统计
export interface PerformanceStats {
  fps: number
  renderTime: number
  updateTime: number
  memoryUsage: number
  drawCalls: number
  pixelCount: number
}

// 导出配置
export interface ExportConfig {
  format: 'png' | 'jpg' | 'webp'
  quality: number
  scale: number
  transparent: boolean
  region?: Rect
}

// 导入配置
export interface ImportConfig {
  preserveAspectRatio: boolean
  resizeToFit: boolean
  position: Point
  scale: number
}

// 事件类型
export interface EditorEvents {
  'tool-changed': Tool
  'color-changed': string
  'brush-size-changed': number
  'viewport-changed': ViewportState
  'pixel-added': PixelData
  'pixel-removed': Point
  'canvas-cleared': void
  'history-changed': { canUndo: boolean; canRedo: boolean }
  'performance-update': PerformanceStats
}

// 组件 Props 类型
export interface ToolBarProps {
  currentTool: Tool
  currentColor: string
  brushSize: number
  canUndo: boolean
  canRedo: boolean
}

export interface MinimapProps {
  viewport: ViewportState
  canvasSize: Size
  pixelData: PixelData[]
  scale: number
}

// Composable 返回类型
export interface UsePixiEditorReturn {
  app: Ref<PixiEditorApp | null>
  canvasSize: Ref<Size>
  isInitialized: Ref<boolean>
  initializeEditor: (container: HTMLElement) => Promise<void>
  destroyEditor: () => void
  exportCanvas: (config?: ExportConfig) => string
  importCanvas: (file: File, config?: ImportConfig) => Promise<void>
  clearCanvas: () => void
}

export interface UsePixiToolsReturn {
  activeTool: Ref<ITool | null>
  setTool: (tool: Tool) => void
  handleToolAction: (type: ToolEvent['type'], position: Point) => void
  registerTool: (tool: ITool) => void
  unregisterTool: (toolName: Tool) => void
}

export interface UsePixiViewportReturn {
  viewport: Ref<ViewportState>
  zoomToPoint: (x: number, y: number, scale: number) => void
  panViewport: (deltaX: number, deltaY: number) => void
  resetViewport: () => void
  fitToScreen: () => void
  screenToWorld: (screenPoint: Point) => Point
  worldToScreen: (worldPoint: Point) => Point
}

export interface UsePixiHistoryReturn {
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  historySize: Ref<number>
  saveState: (action?: string) => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
}

// 重新导出 PIXI 类型
export type { Application, Graphics, Container, Sprite, Texture, BaseTexture } from 'pixi.js'