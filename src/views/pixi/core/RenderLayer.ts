import type { Container } from 'pixi.js'
import type { IRenderLayer, PixiEditorApp, Point } from '../types'

/**
 * 渲染层管理器
 * 负责管理不同类型的渲染层级和对象
 */
export class RenderLayer {
  private app: PixiEditorApp
  private layers: Map<string, Container> = new Map()
  private layerOrder: string[] = []

  constructor(app: PixiEditorApp) {
    this.app = app
    this.initializeLayers()
  }

  /**
   * 初始化默认层级
   */
  private initializeLayers(): void {
    // 创建默认层级
    const defaultLayers = [
      'background', // 背景层
      'grid', // 网格层
      'content', // 内容层
      'pixels', // 像素层
      'selection', // 选择层
      'ui', // UI层
      'overlay', // 覆盖层
    ]

    defaultLayers.forEach((layerName) => {
      this.createLayer(layerName)
    })
  }

  /**
   * 创建新层级
   */
  createLayer(name: string, index?: number): Container {
    if (this.layers.has(name)) {
      console.warn(`Layer '${name}' already exists`)
      return this.layers.get(name)!
    }

    const container = new (window as any).PIXI.Container()
    container.label = name
    container.sortableChildren = true

    this.layers.set(name, container)

    // 确定插入位置
    const insertIndex = index !== undefined ? index : this.layerOrder.length
    this.layerOrder.splice(insertIndex, 0, name)

    // 添加到主容器
    if (this.app.mainContainer) {
      this.app.mainContainer.addChildAt(container, insertIndex)
    }

    return container
  }

  /**
   * 获取层级
   */
  getLayer(name: string): Container | null {
    return this.layers.get(name) || null
  }

  /**
   * 删除层级
   */
  removeLayer(name: string): boolean {
    const layer = this.layers.get(name)
    if (!layer) return false

    // 从主容器中移除
    if (this.app.mainContainer && this.app.mainContainer.children.includes(layer)) {
      this.app.mainContainer.removeChild(layer)
    }

    // 销毁层级
    layer.destroy({ children: true })

    // 从映射和顺序中移除
    this.layers.delete(name)
    const index = this.layerOrder.indexOf(name)
    if (index > -1) {
      this.layerOrder.splice(index, 1)
    }

    return true
  }

  /**
   * 设置层级可见性
   */
  setLayerVisible(name: string, visible: boolean): void {
    const layer = this.getLayer(name)
    if (layer) {
      layer.visible = visible
    }
  }

  /**
   * 设置层级透明度
   */
  setLayerAlpha(name: string, alpha: number): void {
    const layer = this.getLayer(name)
    if (layer) {
      layer.alpha = Math.max(0, Math.min(1, alpha))
    }
  }

  /**
   * 设置层级深度
   */
  setLayerDepth(name: string, depth: number): void {
    const layer = this.getLayer(name)
    if (layer) {
      layer.zIndex = depth
    }
  }

  /**
   * 重新排序层级
   */
  reorderLayer(name: string, newIndex: number): void {
    const currentIndex = this.layerOrder.indexOf(name)
    if (currentIndex === -1) return

    // 更新顺序数组
    this.layerOrder.splice(currentIndex, 1)
    this.layerOrder.splice(newIndex, 0, name)

    // 重新排列主容器中的子对象
    this.rebuildLayerHierarchy()
  }

  /**
   * 重建层级结构
   */
  private rebuildLayerHierarchy(): void {
    if (!this.app.mainContainer) return

    // 移除所有层级
    this.layerOrder.forEach((layerName) => {
      const layer = this.layers.get(layerName)
      if (layer && this.app.mainContainer!.children.includes(layer)) {
        this.app.mainContainer!.removeChild(layer)
      }
    })

    // 按新顺序重新添加
    this.layerOrder.forEach((layerName) => {
      const layer = this.layers.get(layerName)
      if (layer) {
        this.app.mainContainer!.addChild(layer)
      }
    })
  }

  /**
   * 清空指定层级
   */
  clearLayer(name: string): void {
    const layer = this.getLayer(name)
    if (layer) {
      layer.removeChildren()
    }
  }

  /**
   * 清空所有层级
   */
  clearAllLayers(): void {
    this.layers.forEach((layer, name) => {
      if (name !== 'background' && name !== 'grid') {
        layer.removeChildren()
      }
    })
  }

  /**
   * 获取层级信息
   */
  getLayerInfo(name: string) {
    const layer = this.getLayer(name)
    if (!layer) return null

    return {
      name,
      visible: layer.visible,
      alpha: layer.alpha,
      zIndex: layer.zIndex,
      childCount: layer.children.length,
      bounds: layer.getBounds(),
    }
  }

  /**
   * 获取所有层级信息
   */
  getAllLayersInfo() {
    return this.layerOrder.map((name) => this.getLayerInfo(name)).filter(Boolean)
  }

  /**
   * 添加对象到指定层级
   */
  addToLayer(layerName: string, object: Container): void {
    const layer = this.getLayer(layerName)
    if (layer) {
      layer.addChild(object)
    } else {
      console.warn(`Layer '${layerName}' not found`)
    }
  }

  /**
   * 从指定层级移除对象
   */
  removeFromLayer(layerName: string, object: Container): void {
    const layer = this.getLayer(layerName)
    if (layer && layer.children.includes(object)) {
      layer.removeChild(object)
    }
  }

  /**
   * 在指定层级中查找对象
   */
  findInLayer(layerName: string, predicate: (child: Container) => boolean): Container | null {
    const layer = this.getLayer(layerName)
    if (!layer) return null

    return (layer.children.find(predicate) as Container) || null
  }

  /**
   * 获取指定位置的对象
   */
  getObjectsAtPoint(point: Point, layerName?: string): Array<{ object: Container; layer: string }> {
    const objects: Array<{ object: Container; layer: string }> = []

    const layersToCheck = layerName ? [layerName] : this.layerOrder

    layersToCheck.forEach((name) => {
      const layer = this.getLayer(name)
      if (!layer || !layer.visible) return

      layer.children.forEach((child) => {
        if (child.visible && this.isPointInObject(point, child as Container)) {
          objects.push({
            object: child as Container,
            layer: name,
          })
        }
      })
    })

    return objects
  }

  /**
   * 检查点是否在对象内
   */
  private isPointInObject(point: Point, object: Container): boolean {
    try {
      const bounds = object.getBounds()
      return bounds.contains(point.x, point.y)
    } catch {
      return false
    }
  }

  /**
   * 设置层级混合模式
   */
  setLayerBlendMode(name: string, blendMode: string): void {
    const layer = this.getLayer(name)
    if (layer) {
      // Note: blendMode is not directly available on Container
      // This would need to be implemented differently in PixiJS v7+
      console.warn('BlendMode setting not implemented for Container')
    }
  }

  /**
   * 设置层级滤镜
   */
  setLayerFilters(name: string, filters: unknown[]): void {
    const layer = this.getLayer(name)
    if (layer) {
      layer.filters = filters as any
    }
  }

  /**
   * 获取层级统计信息
   */
  getStats(): {
    totalLayers: number
    visibleLayers: number
    totalObjects: number
    layerDetails: Array<{
      name: string
      visible: boolean
      alpha: number
      objectCount: number
    }>
  } {
    const stats = {
      totalLayers: this.layers.size,
      visibleLayers: 0,
      totalObjects: 0,
      layerDetails: [] as Array<{
        name: string
        visible: boolean
        alpha: number
        objectCount: number
      }>,
    }

    this.layers.forEach((layer, name) => {
      if (layer.visible) stats.visibleLayers++
      stats.totalObjects += layer.children.length

      stats.layerDetails.push({
        name,
        visible: layer.visible,
        alpha: layer.alpha,
        objectCount: layer.children.length,
      })
    })

    return stats
  }

  /**
   * 销毁所有层级
   */
  destroy(): void {
    this.layers.forEach((layer) => {
      layer.destroy({ children: true })
    })

    this.layers.clear()
    this.layerOrder = []
  }
}
