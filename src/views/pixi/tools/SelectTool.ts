import type { PixiEditorApp, ITool, ToolEvent, Point, Rect } from '../types'
import { Graphics } from 'pixi.js'

/**
 * 选择工具实现
 * 用于选择和操作画布中的像素区域
 */
export class SelectTool implements ITool {
  public readonly name = 'select'
  public readonly cursor = 'crosshair'

  private app: PixiEditorApp
  private isSelecting = false
  private startPosition: Point | null = null
  private selectionRect: Graphics | null = null
  private selectedArea: Rect | null = null
  private selectedPixels: any[] = []

  constructor(app: PixiEditorApp) {
    this.app = app
  }

  /**
   * 开始选择
   */
  onStart(event: ToolEvent): void {
    this.isSelecting = true
    this.startPosition = this.screenToWorld(event.position)

    // 清除之前的选择
    this.clearSelection()

    // 创建选择框
    this.createSelectionRect()
  }

  /**
   * 选择过程
   */
  onMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.startPosition || !this.selectionRect) return

    const currentPos = this.screenToWorld(event.position)

    // 更新选择框
    this.updateSelectionRect(this.startPosition, currentPos)
  }

  /**
   * 结束选择
   */
  onEnd(event: ToolEvent): void {
    if (!this.isSelecting || !this.startPosition) return

    const endPos = this.screenToWorld(event.position)

    // 计算选择区域
    this.selectedArea = this.calculateSelectionArea(this.startPosition, endPos)

    // 选择区域内的像素
    this.selectPixelsInArea(this.selectedArea)

    this.isSelecting = false
    this.startPosition = null

    // 如果选择区域太小，清除选择
    if (this.selectedArea.width < 2 && this.selectedArea.height < 2) {
      this.clearSelection()
    }
  }

  /**
   * 取消选择
   */
  onCancel(): void {
    this.clearSelection()
    this.isSelecting = false
    this.startPosition = null
  }

  /**
   * 创建选择框
   */
  private createSelectionRect(): void {
    this.selectionRect = new Graphics()
    this.selectionRect.name = 'selection-rect'

    // 设置选择框样式
    this.selectionRect.lineStyle({
      width: 1,
      color: 0x0099ff,
      alpha: 1,
    })

    this.selectionRect.beginFill(0x0099ff, 0.1)

    // 添加到UI容器
    if (this.app.uiContainer) {
      this.app.uiContainer.addChild(this.selectionRect)
    }
  }

  /**
   * 更新选择框
   */
  private updateSelectionRect(start: Point, end: Point): void {
    if (!this.selectionRect) return

    const rect = this.calculateSelectionArea(start, end)

    this.selectionRect.clear()
    this.selectionRect.lineStyle({
      width: 1 / this.app.viewport.scale, // 保持线条粗细不变
      color: 0x0099ff,
      alpha: 1,
    })
    this.selectionRect.beginFill(0x0099ff, 0.1)
    this.selectionRect.drawRect(rect.x, rect.y, rect.width, rect.height)
    this.selectionRect.endFill()
  }

  /**
   * 计算选择区域
   */
  private calculateSelectionArea(start: Point, end: Point): Rect {
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)

    return { x, y, width, height }
  }

  /**
   * 选择区域内的像素
   */
  private selectPixelsInArea(area: Rect): void {
    this.selectedPixels = []

    if (!this.app.pixelContainer) return

    // 遍历所有像素，找出在选择区域内的
    for (const child of this.app.pixelContainer.children) {
      if (child.name === 'pixel') {
        const pixelX = Math.floor(child.x)
        const pixelY = Math.floor(child.y)

        if (this.isPointInRect({ x: pixelX, y: pixelY }, area)) {
          this.selectedPixels.push(child)
          this.highlightPixel(child)
        }
      }
    }

    console.log(`选择了 ${this.selectedPixels.length} 个像素`)
  }

  /**
   * 高亮显示选中的像素
   */
  private highlightPixel(pixel: any): void {
    // 添加高亮效果
    pixel.alpha = 0.8

    // 可以添加边框或其他视觉效果
    // 这里简化处理，只改变透明度
  }

  /**
   * 检查点是否在矩形内
   */
  private isPointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height
    )
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    // 移除选择框
    if (this.selectionRect && this.app.uiContainer) {
      this.app.uiContainer.removeChild(this.selectionRect)
      this.selectionRect.destroy()
      this.selectionRect = null
    }

    // 恢复选中像素的显示
    this.selectedPixels.forEach((pixel) => {
      pixel.alpha = 1
    })

    this.selectedPixels = []
    this.selectedArea = null
  }

  /**
   * 复制选中的像素
   */
  copySelection(): any[] | null {
    if (this.selectedPixels.length === 0) return null

    return this.selectedPixels.map((pixel) => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.tint,
      alpha: pixel.alpha,
    }))
  }

  /**
   * 删除选中的像素
   */
  deleteSelection(): void {
    if (this.selectedPixels.length === 0) return

    this.selectedPixels.forEach((pixel) => {
      if (this.app.pixelContainer) {
        this.app.pixelContainer.removeChild(pixel)
        pixel.destroy()
      }
    })

    this.selectedPixels = []
    this.clearSelection()
  }

  /**
   * 移动选中的像素
   */
  moveSelection(deltaX: number, deltaY: number): void {
    if (this.selectedPixels.length === 0) return

    this.selectedPixels.forEach((pixel) => {
      pixel.x += deltaX
      pixel.y += deltaY
    })

    // 更新选择区域
    if (this.selectedArea) {
      this.selectedArea.x += deltaX
      this.selectedArea.y += deltaY

      // 更新选择框位置
      if (this.selectionRect) {
        this.selectionRect.x += deltaX
        this.selectionRect.y += deltaY
      }
    }
  }

  /**
   * 填充选中区域
   */
  fillSelection(color: number): void {
    if (!this.selectedArea) return

    // 删除选中区域内的所有像素
    this.deleteSelection()

    // 用新颜色填充整个选中区域
    for (let x = this.selectedArea.x; x < this.selectedArea.x + this.selectedArea.width; x++) {
      for (let y = this.selectedArea.y; y < this.selectedArea.y + this.selectedArea.height; y++) {
        this.createPixelAt({ x, y }, color)
      }
    }
  }

  /**
   * 在指定位置创建像素
   */
  private createPixelAt(pos: Point, color: number): void {
    // 这里应该调用编辑器的像素创建方法
    // 简化实现，直接创建Sprite
    const sprite = new (window as any).PIXI.Sprite((window as any).PIXI.Texture.WHITE)
    sprite.name = 'pixel'
    sprite.width = 1
    sprite.height = 1
    sprite.x = pos.x
    sprite.y = pos.y
    sprite.tint = color

    if (this.app.pixelContainer) {
      this.app.pixelContainer.addChild(sprite)
    }
  }

  /**
   * 屏幕坐标转世界坐标
   */
  private screenToWorld(screenPos: Point): Point {
    const { x: viewX, y: viewY, scale } = this.app.viewport

    return {
      x: (screenPos.x - viewX) / scale,
      y: (screenPos.y - viewY) / scale,
    }
  }

  /**
   * 获取选择信息
   */
  getSelectionInfo() {
    return {
      hasSelection: this.selectedPixels.length > 0,
      selectedCount: this.selectedPixels.length,
      selectedArea: this.selectedArea,
      isSelecting: this.isSelecting,
    }
  }

  /**
   * 选择全部
   */
  selectAll(): void {
    if (!this.app.pixelContainer) return

    this.clearSelection()

    // 获取所有像素的边界
    const bounds = this.app.pixelContainer.getBounds()

    if (bounds.width > 0 && bounds.height > 0) {
      this.selectedArea = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }

      this.selectPixelsInArea(this.selectedArea)

      // 创建选择框显示
      this.createSelectionRect()
      if (this.selectionRect && this.selectedArea) {
        this.updateSelectionRect(
          { x: this.selectedArea.x, y: this.selectedArea.y },
          {
            x: this.selectedArea.x + this.selectedArea.width,
            y: this.selectedArea.y + this.selectedArea.height,
          },
        )
      }
    }
  }

  /**
   * 更新工具配置
   */
  updateConfig(config: any): void {
    // 选择工具通常不需要配置更新
  }

  /**
   * 获取工具状态
   */
  getState() {
    return {
      isSelecting: this.isSelecting,
      hasSelection: this.selectedPixels.length > 0,
      selectedCount: this.selectedPixels.length,
      selectedArea: this.selectedArea,
    }
  }
}
