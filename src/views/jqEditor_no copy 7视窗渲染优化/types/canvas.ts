// ========== Props接口 ==========
import type { ToolType } from './tools'

// ========== 坐标系统 ==========
export interface PixelCoordinate {
  x: number
  y: number
}

export interface GridCoordinate {
  x: number
  y: number
}

export interface CoordinateSystem {
  pixelCoord: PixelCoordinate
  gridCoord: GridCoordinate
}

// ========== 核心数据类型 ==========
export interface GridCell {
  x: number // 格子X坐标
  y: number // 格子Y坐标
  color?: string // 格子颜色
  opacity?: number // 透明度
  timestamp?: number // 绘制时间戳
}

export interface CanvasSize {
  width: number // 画布宽度(格子数)
  height: number // 画布高度(格子数)
  actualWidth: number // 物理宽度(cm)
  actualHeight: number // 物理高度(cm)
  pixelWidth: number // 像素宽度
  pixelHeight: number // 像素高度
}

// ========== 选择区域 ==========
export interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
  height: number
  active: boolean
}

// ========== 导出数据类型 ==========
export interface CanvasExportData {
  imageData: ImageData // 图像数据
  gridData: Map<string, string> // 格子数据
  metadata: {
    width: number
    height: number
    actualWidth: number
    actualHeight: number
    colors: string[]
    paintedCells: number
    exportTime: number
  }
}

// ========== 画布状态 ==========
export interface CanvasState {
  isDrawing: boolean
  isPanning: boolean
  lastDrawnCell?: GridCoordinate
  lastPanPosition?: { x: number; y: number }
  currentTool: ToolType
  zoom: number
  pan: PixelCoordinate
}

export interface BasicCanvasProps {
  width?: number // 横向格子数
  height?: number // 纵向格子数
  actualWidth?: number // 实际宽度(cm)
  actualHeight?: number // 实际高度(cm)
  imageUrl?: string // 背景图片URL
  bgColor?: string // 背景颜色
  sourceType?: 1 | 2 | 3 // 来源类型
  readonly?: boolean // 只读模式
  maxUndoSteps?: number // 最大撤销步数
}

// ========== 图片上传相关 ==========
export interface ImageUploadOptions {
  quality?: number // 压缩质量
}

export interface ImageProcessResult {
  success: boolean
  width: number
  height: number
  gridData: Map<string, string>
  colors: string[]
  error?: string
}

// ========== Emits接口 ==========
export interface BasicCanvasEmits {
  finish: [data: CanvasExportData] // 完成编辑
  'colors-updated': [colors: string[]] // 颜色列表更新
  'size-changed': [size: CanvasSize] // 画布尺寸变化
  'performance-warning': [level: string] // 性能警告
  'cell-painted': [cell: GridCell] // 格子被绘制
  'selection-changed': [selection: Selection] // 选择区域变化
  'image-uploaded': [result: ImageProcessResult] // 图片上传完成
}

export interface GridConfig {
  cellWidth: number // 格子宽度(px)
  cellHeight: number // 格子高度(px)
  showGrid: boolean // 是否显示网格
  gridColor: string // 网格线颜色
  gridOpacity: number // 网格线透明度
}
