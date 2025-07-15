import { Graphics, Sprite } from 'pixi.js'
import type { PixiEditorApp, ITool, ToolEvent, Point } from '../types'

/**
 * 橡皮擦工具实现
 * 删除指定区域的像素
 */
export class EraserTool implements ITool {
  public readonly name = 'eraser'
  public readonly cursor = 'crosshair'

  private app: PixiEditorApp
  private brushSize: Ref<number>
  private isErasing = false
  private lastPosition: Point | null = null

  constructor(app: PixiEditorApp, brushSize: Ref<number>) {
    this.app = app
    this.brushSize = brushSize
  }

  /**
   * 开始擦除
   */
  onStart(event: ToolEvent): void {
    if (!this.app.pixelContainer) return

    this.isErasing = true
    this.lastPosition = event.position

    // 转换屏幕坐标到世界坐标
    const worldPos = this.screenToWorld(event.position)

    // 擦除起始点
    this.erasePixels(worldPos)
  }

  /**
   * 移动擦除
   */
  onMove(event: ToolEvent): void {
    if (!this.isErasing || !this.lastPosition) return

    const worldPos = this.screenToWorld(event.position)
    const lastWorldPos = this.screenToWorld(this.lastPosition)

    // 擦除连接线
    this.eraseLine(lastWorldPos, worldPos)

    this.lastPosition = event.position
  }

  /**
   * 结束擦除
   */
  onEnd(event: ToolEvent): void {
    this.isErasing = false
    this.lastPosition = null
  }

  /**
   * 取消擦除
   */
  onCancel(): void {
    this.isErasing = false
    this.lastPosition = null
  }

  /**
   * 擦除指定位置的像素
   */
  private erasePixels(position: Point): void {
    const size = this.brushSize.value
    const radius = Math.floor(size / 2)

    // 获取擦除区域内的所有像素
    const pixelsToRemove: any[] = []

    this.app.pixelContainer.children.forEach((child) => {
      if (child.name === 'pixel' || child.name === 'stroke') {
        const dx = child.x - position.x
        const dy = child.y - position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= radius) {
          pixelsToRemove.push(child)
        }
      }
    })

    // 移除像素
    pixelsToRemove.forEach((pixel) => {
      this.app.pixelContainer.removeChild(pixel)
      pixel.destroy()
    })
  }

  /**
   * 擦除连接线
   */
  private eraseLine(from: Point, to: Point): void {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 1) return

    const steps = Math.ceil(distance)
    const stepX = dx / steps
    const stepY = dy / steps

    for (let i = 0; i <= steps; i++) {
      const x = from.x + stepX * i
      const y = from.y + stepY * i
      this.erasePixels({ x, y })
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
   * 更新工具配置
   */
  updateConfig(config: { size?: number }): void {
    if (config.size) {
      this.brushSize.value = config.size
    }
  }

  /**
   * 获取工具状态
   */
  getState() {
    return {
      isErasing: this.isErasing,
      size: this.brushSize.value,
    }
  }
}
