/**
 * PixiJS 编辑器核心模块
 * 导出所有核心管理器和工具类
 */

import { RenderLayer } from './RenderLayer'
import { PixelStorage } from './PixelStorage'
import { HistoryManager } from './HistoryManager'
import type { PixiEditorConfig, Point, Size, Rect, PixelData, HistoryItem } from '../types'
import type { Application } from 'pixi.js'

// 导出核心类
export { RenderLayer, PixelStorage, HistoryManager }

// 导出类型
export type { PixiEditorConfig, Point, Size, Rect, PixelData, HistoryItem }

// 核心管理器配置选项
export interface CoreManagerOptions {
  renderLayer?: {
    defaultLayers?: string[]
    enableSorting?: boolean
  }
  pixelStorage?: {
    width?: number
    height?: number
    enableSpatialIndex?: boolean
  }
  historyManager?: {
    maxSize?: number
    enableCompression?: boolean
  }
}

// 默认配置
export const defaultCoreOptions: CoreManagerOptions = {
  renderLayer: {
    defaultLayers: ['background', 'grid', 'content', 'pixels', 'selection', 'ui', 'overlay'],
    enableSorting: true,
  },
  pixelStorage: {
    width: 1024,
    height: 1024,
    enableSpatialIndex: true,
  },
  historyManager: {
    maxSize: 100,
    enableCompression: false,
  },
}

// 工厂函数：创建核心管理器
export function createCoreManagers(
  app: Application,
  options: CoreManagerOptions = {},
): {
  renderLayer: RenderLayer
  pixelStorage: PixelStorage
  historyManager: HistoryManager
} {
  const config = { ...defaultCoreOptions, ...options }

  // 创建渲染层管理器
  const renderLayer = new RenderLayer(app)

  // 创建像素存储管理器
  const pixelStorage = new PixelStorage(config.pixelStorage?.width, config.pixelStorage?.height)

  // 创建历史记录管理器
  const historyManager = new HistoryManager(config.historyManager?.maxSize)

  return {
    renderLayer,
    pixelStorage,
    historyManager,
  }
}

// 核心事件类型
export interface CoreEvents {
  'layer:created': { name: string }
  'layer:removed': { name: string }
  'layer:visibility-changed': { name: string; visible: boolean }
  'pixel:set': { x: number; y: number; color: number }
  'pixel:removed': { x: number; y: number }
  'history:state-saved': { action: string }
  'history:undo': { action: string }
  'history:redo': { action: string }
}

// 核心状态接口
export interface CoreState {
  renderLayer: {
    layers: string[]
    activeLayer: string | null
    layerStats: { [key: string]: unknown }
  }
  pixelStorage: {
    pixelCount: number
    isDirty: boolean
    bounds: Rect | null
  }
  historyManager: {
    canUndo: boolean
    canRedo: boolean
    currentIndex: number
    totalItems: number
  }
}

// 核心工具函数
export const CoreUtils = {
  // 连接像素存储和历史管理器
  connectPixelStorageToHistory(pixelStorage: PixelStorage, historyManager: HistoryManager): void {
    // 监听像素变化并保存到历史记录
    const originalSetPixel = pixelStorage.setPixel.bind(pixelStorage)
    pixelStorage.setPixel = (x: number, y: number, color: number, alpha?: number) => {
      const oldPixel = pixelStorage.getPixel(x, y)
      originalSetPixel(x, y, color, alpha)

      historyManager.saveState('setPixel', {
        x,
        y,
        color,
        alpha,
        oldPixel,
      })
    }
  },

  // 连接渲染层和像素存储
  connectRenderLayerToPixelStorage(renderLayer: RenderLayer, pixelStorage: PixelStorage): void {
    // 当像素存储发生变化时，更新渲染层
    // 这里可以添加具体的连接逻辑
  },

  // 批量操作工具
  createBatchOperation(managers: { pixelStorage: PixelStorage; historyManager: HistoryManager }) {
    return {
      start(description: string) {
        managers.pixelStorage.startBatch()
        // Note: HistoryManager doesn't have startBatch method in current implementation
        console.log('Starting batch operation:', description)
      },

      end() {
        managers.pixelStorage.endBatch()
        // Note: HistoryManager doesn't have endBatch method in current implementation
        console.log('Ending batch operation')
      },
    }
  },

  // 获取所有管理器的状态
  getCoreState(
    renderLayer: RenderLayer,
    pixelStorage: PixelStorage,
    historyManager: HistoryManager,
  ): CoreState {
    const renderStats = renderLayer.getStats()
    const pixelStats = pixelStorage.getStats()
    const historyStats = historyManager.getStats()

    return {
      renderLayer: {
        layers: renderLayer.getLayerNames(),
        activeLayer: null, // 需要从渲染层获取
        layerStats: renderStats as { [key: string]: unknown },
      },
      pixelStorage: {
        pixelCount: pixelStats.pixelCount || 0,
        isDirty: false, // 需要从像素存储获取
        bounds: pixelStats.bounds || null,
      },
      historyManager: {
        canUndo: historyStats.canUndo,
        canRedo: historyStats.canRedo,
        currentIndex: historyStats.currentIndex,
        totalItems: historyStats.totalItems,
      },
    }
  },
}
