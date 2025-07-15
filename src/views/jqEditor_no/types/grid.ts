// ========== 网格数据 ==========
export interface GridData {
  cellWidth: number; // 格子宽度(px)
  cellHeight: number; // 格子高度(px)
  totalCells: number; // 总格子数
  physicalSize: {
    // 物理尺寸
    width: number; // 宽度(px)
    height: number; // 高度(px)
  };
  dpi: number; // DPI值
}

// ========== 网格可见性 ==========
export interface GridVisibility {
  showGrid: boolean; // 是否显示主网格
  showSubGrid: boolean; // 是否显示子网格
  lineWidth: number; // 网格线宽度
  opacity: number; // 网格透明度
}

// ========== 网格渲染配置 ==========
export interface GridRenderConfig {
  color: string; // 网格线颜色
  subGridColor: string; // 子网格线颜色
  opacity: number; // 主网格透明度
  subGridOpacity: number; // 子网格透明度
  lineWidth: number; // 线宽
  subGridLineWidth: number; // 子网格线宽
  dashPattern?: number[]; // 虚线模式
}

// ========== 网格统计信息 ==========
export interface GridStats {
  totalGrids: number; // 总网格数
  visibleGrids: number; // 可见网格数
  paintedGrids: number; // 已绘制网格数
  emptyGrids: number; // 空网格数
  memoryUsage: number; // 内存使用量(bytes)
  compressionRatio: number; // 压缩比
}

// ========== 网格缓存 ==========
export interface GridCache {
  key: string;
  imageData: ImageData;
  timestamp: number;
  hitCount: number;
}

// ========== 网格渲染区域 ==========
export interface GridRenderRegion {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
}
