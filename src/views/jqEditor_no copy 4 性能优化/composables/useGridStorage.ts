import { ref } from 'vue'
import type { Ref } from 'vue'
import { CompressedGridStorage } from '../classes/GridStorage'

/**
 * 网格存储系统Composable
 * 提供网格数据存储和管理功能
 */
export function useGridStorage() {
  // 网格存储实例
  const gridStorage = ref<CompressedGridStorage>()

  /**
   * 初始化存储系统
   * @param width 网格宽度
   * @param height 网格高度
   */
  const initStorage = (width: number, height: number) => {
    gridStorage.value = new CompressedGridStorage(width, height)
  }

  /**
   * 获取存储统计信息
   */
  const getStorageStats = () => {
    return gridStorage.value?.getStats() || null
  }

  /**
   * 清空存储
   */
  const clearStorage = () => {
    gridStorage.value?.clear()
  }

  /**
   * 清空指定区域
   */
  const clearRegion = (startX: number, startY: number, endX: number, endY: number) => {
    gridStorage.value?.clearRegion(startX, startY, endX, endY)
  }

  /**
   * 获取所有已绘制的格子
   */
  const getAllPaintedCells = () => {
    return gridStorage.value?.getAllPaintedCells() || []
  }

  /**
   * 获取指定区域的格子
   */
  const getCellsInRegion = (startX: number, startY: number, endX: number, endY: number) => {
    return gridStorage.value?.getCellsInRegion(startX, startY, endX, endY) || []
  }

  return {
    gridStorage,
    initStorage,
    getStorageStats,
    clearStorage,
    clearRegion,
    getAllPaintedCells,
    getCellsInRegion,
  }
}
