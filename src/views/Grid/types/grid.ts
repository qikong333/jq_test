// ========== 网格数据 ==========
export interface GridData {
  cellWidth: number // 格子宽度(px)
  cellHeight: number // 格子高度(px)
  totalCells: number // 总格子数
  physicalSize: {
    // 物理尺寸
    width: number // 宽度(px)
    height: number // 高度(px)
  }
  dpi: number // DPI值
}

// ========== 网格可见性 ==========
export interface GridVisibility {
  showGrid: boolean // 是否显示主网格
  showSubGrid: boolean // 是否显示子网格
  lineWidth: number // 网格线宽度
  opacity: number // 网格透明度
}

// ========== 网格渲染配置 ==========
export interface GridRenderConfig {
  color: string // 网格线颜色
  subGridColor: string // 子网格线颜色
  opacity: number // 主网格透明度
  subGridOpacity: number // 子网格透明度
  lineWidth: number // 线宽
  subGridLineWidth: number // 子网格线宽
  dashPattern?: number[] // 虚线模式
}

// ========== 网格统计信息 ==========
export interface GridStats {
  totalGrids: number // 总网格数
  visibleGrids: number // 可见网格数
  paintedGrids: number // 已绘制网格数
  emptyGrids: number // 空网格数
  memoryUsage: number // 内存使用量(bytes)
  compressionRatio: number // 压缩比
}

// ========== 网格缓存 ==========
export interface GridCache {
  key: string
  imageData: ImageData
  timestamp: number
  hitCount: number
}

// ========== 网格渲染区域 ==========
export interface GridRenderRegion {
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
  height: number
}

// ========== 视口状态 ==========
export interface ViewportState {
  zoom: number // 缩放级别
  pan: {
    x: number // 平移X
    y: number // 平移Y
  }
}

// ========== 坐标系统 ==========
export interface PixelCoordinate {
  x: number
  y: number
}

export interface GridCoordinate {
  x: number
  y: number
}

// ========== 组件 Props ==========
export interface GridComponentProps {
  width?: number // 横向格子数
  height?: number // 纵向格子数
  actualWidth?: number // 实际宽度(cm)
  actualHeight?: number // 实际高度(cm)
  showControls?: boolean // 是否显示控制面板
  bgColor?: string // 背景颜色
  gridConfig?: Partial<GridRenderConfig> // 网格配置
}

// ========== 组件 Emits ==========
export interface GridComponentEmits {
  'grid-toggle': [visible: boolean] // 网格显示切换
  'zoom-change': [zoom: number] // 缩放变化
  'config-change': [config: GridRenderConfig] // 配置变化
  'stats-update': [stats: GridStats] // 统计信息更新
}

// ========== 网格系统返回值 ==========
export interface UseGridSystemReturn {
  // 响应式数据
  gridData: ComputedRef<GridData>
  gridVisibility: ComputedRef<GridVisibility>
  showGrid: Ref<boolean>
  zoom: Ref<number>
  gridRenderConfig: Ref<GridRenderConfig>

  // 方法
  drawGrid: (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    viewportState: ViewportState,
  ) => void
  toggleGrid: () => void
  setZoom: (newZoom: number) => void
  syncZoom: (externalZoom: number) => void
  updateGridConfig: (config: Partial<GridRenderConfig>) => void
  getGridCellBounds: (
    gridX: number,
    gridY: number,
  ) => {
    x: number
    y: number
    width: number
    height: number
  }
  getVisibleGridRange: (
    viewportX: number,
    viewportY: number,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    startX: number
    startY: number
    endX: number
    endY: number
  }
}

// ========== 视口系统返回值 ==========
export interface UseViewportSystemReturn {
  viewportState: ViewportState
  isPanning: Ref<boolean>
  setZoom: (zoom: number) => void
  startPan: (x: number, y: number) => void
  updatePan: (x: number, y: number) => void
  endPan: () => void
  reset: () => void
}

// ========== 渲染器返回值 ==========
export interface UseGridRendererReturn {
  renderStats: Ref<{
    lastRenderTime: number
    frameCount: number
    averageRenderTime: number
  }>
  renderSubGrid: (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    gridData: GridData,
    gridConfig: GridRenderConfig,
    viewportState: ViewportState,
  ) => void
  clearCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  setupHighDPI: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void
  exportCanvasAsImage: (
    canvas: HTMLCanvasElement,
    format?: 'png' | 'jpeg' | 'webp',
    quality?: number,
  ) => string
  createOffscreenCanvas: (
    width: number,
    height: number,
  ) => { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
  cacheRenderResult: (key: string, imageData: ImageData) => void
  getCachedRenderResult: (key: string) => ImageData | null
  clearRenderCache: () => void
  updateRenderStats: (renderTime: number) => void
  resetRenderStats: () => void
  shouldRerender: (
    lastViewportState: ViewportState,
    currentViewportState: ViewportState,
    threshold?: number,
  ) => boolean
}

// 导入 Vue 类型
import type { Ref, ComputedRef } from 'vue'
