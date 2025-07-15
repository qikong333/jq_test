// ========== 画笔配置 ==========
export interface BrushConfig {
  sizeCm: number; // 物理大小(cm)
  shape: 'circle' | 'square'; // 形状
  hardness: number; // 硬度(0-100)
  opacity: number; // 不透明度(0-100)
  color: string; // 颜色
}

// ========== 画笔度量 ==========
export interface BrushMetrics {
  widthInGrids: number; // 画笔宽度(格子数)
  heightInGrids: number; // 画笔高度(格子数)
  radiusInGrids: number; // 画笔半径(格子数)
  affectedCells: number; // 影响的格子数量
  physicalSizePx: number; // 物理尺寸(像素)
}

// ========== 画笔影响的格子 ==========
export interface AffectedCell {
  x: number;
  y: number;
  opacity?: number;
  distance?: number;
}

// ========== 画笔预览 ==========
export interface BrushPreview {
  cells: AffectedCell[];
  centerX: number;
  centerY: number;
  visible: boolean;
}

// ========== 画笔设置 ==========
export interface BrushSettings {
  minSize: number; // 最小尺寸(cm)
  maxSize: number; // 最大尺寸(cm)
  defaultSize: number; // 默认尺寸(cm)
  step: number; // 步长(cm)
  shapes: BrushShape[]; // 可选形状
}

export interface BrushShape {
  name: 'circle' | 'square';
  icon: string;
  label: string;
}
