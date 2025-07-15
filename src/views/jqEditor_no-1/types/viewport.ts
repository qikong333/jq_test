import type { PixelCoordinate } from './canvas'

// ========== 视图状态管理 ==========
export interface ViewportState {
  zoom: number // 缩放级别
  pan: PixelCoordinate // 平移偏移
  isZooming: boolean // 缩放状态
  isPanning: boolean // 平移状态
}

// ========== 缩放配置 ==========
export interface ZoomConfig {
  minZoom: number // 最小缩放级别
  maxZoom: number // 最大缩放级别
  zoomStep: number // 缩放步长
  centerMode: 'mouse' | 'center' | 'viewport' // 缩放中心模式
}

// ========== 平移配置 ==========
export interface PanConfig {
  enableKeyboardPan: boolean // 启用键盘平移
  panStep: number // 平移步长
  boundaryMode: 'clamp' | 'free' // 边界处理模式
}



// ========== 视口边界 ==========
export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// ========== 视口矩形 ==========
export interface ViewportRect {
  x: number
  y: number
  width: number
  height: number
}

// ========== 平移状态 ==========
export interface PanState {
  isPanning: boolean
  spacePressed: boolean
  startPoint: PixelCoordinate
  startPan: PixelCoordinate
}

// ========== 视图控制事件 ==========
export interface ViewportEvents {
  'zoom-changed': [zoom: number]
  'pan-changed': [pan: PixelCoordinate]
  'viewport-reset': []

}
