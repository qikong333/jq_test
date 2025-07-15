import { computed, ref } from 'vue';
import type {
  BrushConfig,
  BrushMetrics,
  AffectedCell,
  BrushPreview,
} from '../types/brush';
import type { GridData } from '../types/grid';
import type { GridCoordinate } from '../types/canvas';
import { cmToPx, isGridInBounds } from '../utils/coordinateUtils';

/**
 * 画笔系统Composable
 * 负责画笔配置、大小计算和影响范围计算
 */
export function useBrush(gridData: GridData) {
  // 画笔配置
  const brushConfig = ref<BrushConfig>({
    sizeCm: 0.1, // 默认0.1cm
    shape: 'square', // 默认矩形
    hardness: 100, // 默认100%硬度
    opacity: 100, // 默认100%不透明度
    color: '#000000', // 默认黑色
  });

  // 画笔预览状态
  const brushPreview = ref<BrushPreview>({
    cells: [],
    centerX: -1,
    centerY: -1,
    visible: false,
  });

  /**
   * 计算画笔度量信息
   */
  const brushMetrics = computed<BrushMetrics>(() => {
    const brushSizePx = cmToPx(brushConfig.value.sizeCm);

    return {
      widthInGrids: Math.ceil(brushSizePx / gridData.cellWidth),
      heightInGrids: Math.ceil(brushSizePx / gridData.cellHeight),
      radiusInGrids: Math.ceil(
        brushSizePx / Math.min(gridData.cellWidth, gridData.cellHeight) / 2,
      ),
      affectedCells: 0, // 会在getAffectedCells中动态计算
      physicalSizePx: brushSizePx,
    };
  });

  /**
   * 获取画笔影响的格子
   * @param centerX 中心格子X坐标
   * @param centerY 中心格子Y坐标
   * @param gridWidth 网格总宽度
   * @param gridHeight 网格总高度
   * @returns 受影响的格子数组
   */
  const getAffectedCells = (
    centerX: number,
    centerY: number,
    gridWidth: number,
    gridHeight: number,
  ): AffectedCell[] => {
    const cells: AffectedCell[] = [];
    const { shape } = brushConfig.value;
    const { radiusInGrids } = brushMetrics.value;

    if (shape === 'circle') {
      // 圆形画笔
      for (let x = centerX - radiusInGrids; x <= centerX + radiusInGrids; x++) {
        for (
          let y = centerY - radiusInGrids;
          y <= centerY + radiusInGrids;
          y++
        ) {
          if (!isGridInBounds(x, y, gridWidth, gridHeight)) continue;

          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance <= radiusInGrids) {
            const opacity = calculateOpacity(distance, radiusInGrids);
            cells.push({ x, y, opacity, distance });
          }
        }
      }
    } else if (shape === 'square') {
      // 方形画笔
      const halfWidth = Math.floor(brushMetrics.value.widthInGrids / 2);
      const halfHeight = Math.floor(brushMetrics.value.heightInGrids / 2);

      for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
        for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
          if (!isGridInBounds(x, y, gridWidth, gridHeight)) continue;

          const distance = Math.max(
            Math.abs(x - centerX),
            Math.abs(y - centerY),
          );
          const opacity = calculateOpacity(
            distance,
            Math.max(halfWidth, halfHeight),
          );
          cells.push({ x, y, opacity, distance });
        }
      }
    }

    return cells;
  };

  /**
   * 计算像素点的不透明度
   * @param distance 距离中心的距离
   * @param maxRadius 最大半径
   * @returns 不透明度 (0-1)
   */
  const calculateOpacity = (distance: number, maxRadius: number): number => {
    const { hardness, opacity } = brushConfig.value;
    const baseOpacity = opacity / 100;

    if (hardness === 100) {
      // 硬边缘：距离在半径内为完全不透明
      return distance <= maxRadius ? baseOpacity : 0;
    } else {
      // 软边缘：根据距离计算渐变
      const softness = (100 - hardness) / 100;
      const fadeStart = maxRadius * (1 - softness);

      if (distance <= fadeStart) {
        return baseOpacity;
      } else if (distance <= maxRadius) {
        const fadeRatio = (maxRadius - distance) / (maxRadius - fadeStart);
        return baseOpacity * fadeRatio;
      } else {
        return 0;
      }
    }
  };

  /**
   * 设置画笔大小
   * @param sizeCm 画笔大小(厘米)
   */
  const setBrushSize = (sizeCm: number) => {
    brushConfig.value.sizeCm = Math.max(0.1, Math.min(2.0, sizeCm));
  };

  /**
   * 设置画笔形状
   * @param shape 画笔形状
   */
  const setBrushShape = (shape: 'circle' | 'square') => {
    brushConfig.value.shape = shape;
  };

  /**
   * 设置画笔硬度
   * @param hardness 硬度 (0-100)
   */
  const setBrushHardness = (hardness: number) => {
    brushConfig.value.hardness = Math.max(0, Math.min(100, hardness));
  };

  /**
   * 设置画笔不透明度
   * @param opacity 不透明度 (0-100)
   */
  const setBrushOpacity = (opacity: number) => {
    brushConfig.value.opacity = Math.max(0, Math.min(100, opacity));
  };

  /**
   * 设置画笔颜色
   * @param color 颜色值
   */
  const setBrushColor = (color: string) => {
    brushConfig.value.color = color;
  };

  /**
   * 更新画笔预览
   * @param centerX 中心格子X坐标
   * @param centerY 中心格子Y坐标
   * @param gridWidth 网格总宽度
   * @param gridHeight 网格总高度
   * @param visible 是否显示预览
   */
  const updateBrushPreview = (
    centerX: number,
    centerY: number,
    gridWidth: number,
    gridHeight: number,
    visible = true,
  ) => {
    if (visible && isGridInBounds(centerX, centerY, gridWidth, gridHeight)) {
      brushPreview.value = {
        cells: getAffectedCells(centerX, centerY, gridWidth, gridHeight),
        centerX,
        centerY,
        visible: true,
      };
    } else {
      brushPreview.value.visible = false;
    }
  };

  /**
   * 隐藏画笔预览
   */
  const hideBrushPreview = () => {
    brushPreview.value.visible = false;
  };

  /**
   * 绘制画笔预览到Canvas
   * @param ctx Canvas上下文
   * @param cellWidth 格子宽度
   * @param cellHeight 格子高度
   * @param viewportX 视口X偏移
   * @param viewportY 视口Y偏移
   */
  const drawBrushPreview = (
    ctx: CanvasRenderingContext2D,
    cellWidth: number,
    cellHeight: number,
    viewportX = 0,
    viewportY = 0,
  ) => {
    if (!brushPreview.value.visible) return;

    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    brushPreview.value.cells.forEach((cell) => {
      const x = cell.x * cellWidth + viewportX;
      const y = cell.y * cellHeight + viewportY;

      ctx.globalAlpha = 0.5 * (cell.opacity || 1);
      ctx.strokeRect(x, y, cellWidth, cellHeight);
    });

    ctx.restore();
  };

  /**
   * 获取画笔信息文本
   * @returns 画笔信息
   */
  const getBrushInfo = () => {
    const { sizeCm, shape, hardness, opacity } = brushConfig.value;
    const { widthInGrids, heightInGrids, physicalSizePx } = brushMetrics.value;

    return {
      size: `${sizeCm.toFixed(1)}cm`,
      sizeInPixels: `${physicalSizePx.toFixed(0)}px`,
      sizeInGrids: `${widthInGrids}×${heightInGrids}`,
      shape,
      hardness: `${hardness}%`,
      opacity: `${opacity}%`,
      affectedCells: brushPreview.value.cells.length,
    };
  };

  /**
   * 重置画笔配置为默认值
   */
  const resetBrushConfig = () => {
    brushConfig.value = {
      sizeCm: 0.1, // 默认0.1cm
      shape: 'square', // 默认矩形
      hardness: 100,
      opacity: 100,
      color: '#000000',
    };
  };

  return {
    // 响应式数据
    brushConfig,
    brushMetrics,
    brushPreview,

    // 方法
    getAffectedCells,
    setBrushSize,
    setBrushShape,
    setBrushHardness,
    setBrushOpacity,
    setBrushColor,
    updateBrushPreview,
    hideBrushPreview,
    drawBrushPreview,
    getBrushInfo,
    resetBrushConfig,
  };
}
