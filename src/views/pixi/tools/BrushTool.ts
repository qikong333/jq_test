import { Graphics, Sprite, Texture } from 'pixi.js'
import type { PixiEditorApp, ITool, ToolEvent, Point } from '../types'

/**
 * 画笔工具实现
 * 支持像素级绘制和连续笔画
 */
export class BrushTool implements ITool {
  public readonly name = 'brush'
  public readonly cursor = 'crosshair'

  private app: PixiEditorApp
  private currentColor: Ref<string>
  private brushSize: Ref<number>
  private isDrawing = false
  private lastPosition: Point | null = null
  private currentStroke: Graphics | null = null
  private pixelTexture: Texture | null = null

  constructor(app: PixiEditorApp, currentColor: Ref<string>, brushSize: Ref<number>) {
    this.app = app
    this.currentColor = currentColor
    this.brushSize = brushSize
    this.initializePixelTexture()
  }

  /**
   * 初始化像素纹理
   */
  private initializePixelTexture(): void {
    try {
      // 创建1x1像素的白色纹理
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 1, 1)

      this.pixelTexture = Texture.from(canvas)
    } catch (error) {
      console.error('初始化像素纹理失败:', error)
    }
  }

  /**
   * 开始绘制
   */
  onStart(event: ToolEvent): void {
    if (!this.app.pixelContainer) return

    this.isDrawing = true
    this.lastPosition = event.position

    // 转换屏幕坐标到世界坐标
    const worldPos = this.screenToWorld(event.position)

    // 创建新的笔画
    this.currentStroke = new Graphics()
    this.currentStroke.name = 'stroke'
    this.app.pixelContainer.addChild(this.currentStroke)

    // 绘制起始点
    this.drawPixel(worldPos)
  }

  /**
   * 移动绘制
   */
  onMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.lastPosition || !this.currentStroke) return

    const worldPos = this.screenToWorld(event.position)
    const lastWorldPos = this.screenToWorld(this.lastPosition)

    // 绘制连接线
    this.drawLine(lastWorldPos, worldPos)

    this.lastPosition = event.position
  }

  /**
   * 结束绘制
   */
  onEnd(event: ToolEvent): void {
    if (!this.isDrawing) return

    this.isDrawing = false
    this.lastPosition = null
    this.currentStroke = null
  }

  /**
   * 取消绘制
   */
  onCancel(): void {
    if (this.currentStroke && this.app.pixelContainer) {
      this.app.pixelContainer.removeChild(this.currentStroke)
      this.currentStroke.destroy()
    }

    this.isDrawing = false
    this.lastPosition = null
    this.currentStroke = null
  }

  /**
   * 绘制单个像素
   */
  private drawPixel(position: Point): void {
    if (!this.currentStroke) return

    const size = this.brushSize.value
    const color = this.hexToNumber(this.currentColor.value)

    if (size === 1) {
      // 单像素绘制
      this.drawSinglePixel(position, color)
    } else {
      // 多像素画笔
      this.drawBrush(position, size, color)
    }
  }

  /**
   * 绘制单个像素点
   */
  private drawSinglePixel(position: Point, color: number): void {
    if (!this.currentStroke || !this.pixelTexture) return

    // 对齐到像素网格
    const x = Math.floor(position.x)
    const y = Math.floor(position.y)

    // 创建像素精灵
    const pixel = new Sprite(this.pixelTexture)
    pixel.name = 'pixel'
    pixel.tint = color
    pixel.x = x
    pixel.y = y
    pixel.width = 1
    pixel.height = 1

    this.app.pixelContainer.addChild(pixel)
  }

  /**
   * 绘制画笔（多像素）
   */
  private drawBrush(center: Point, size: number, color: number): void {
    if (!this.currentStroke) return

    const radius = Math.floor(size / 2)

    // 绘制圆形画笔
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance <= radius) {
          const x = Math.floor(center.x + dx)
          const y = Math.floor(center.y + dy)

          // 计算透明度（边缘渐变）
          const alpha = Math.max(0, 1 - distance / radius)

          if (alpha > 0.1) {
            // 避免绘制过于透明的像素
            this.drawSinglePixelWithAlpha({ x, y }, color, alpha)
          }
        }
      }
    }
  }

  /**
   * 绘制带透明度的像素
   */
  private drawSinglePixelWithAlpha(position: Point, color: number, alpha: number): void {
    if (!this.pixelTexture) return

    const pixel = new Sprite(this.pixelTexture)
    pixel.name = 'pixel'
    pixel.tint = color
    pixel.alpha = alpha
    pixel.x = position.x
    pixel.y = position.y
    pixel.width = 1
    pixel.height = 1

    this.app.pixelContainer.addChild(pixel)
  }

  /**
   * 绘制连接线
   */
  private drawLine(from: Point, to: Point): void {
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
      this.drawPixel({ x, y })
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
   * 十六进制颜色转数字
   */
  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16)
  }

  /**
   * 更新工具配置
   */
  updateConfig(config: { color?: string; size?: number }): void {
    if (config.color) {
      this.currentColor.value = config.color
    }
    if (config.size) {
      this.brushSize.value = config.size
    }
  }

  /**
   * 获取工具状态
   */
  getState() {
    return {
      isDrawing: this.isDrawing,
      color: this.currentColor.value,
      size: this.brushSize.value,
      hasStroke: this.currentStroke !== null,
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.onCancel()

    if (this.pixelTexture) {
      this.pixelTexture.destroy()
      this.pixelTexture = null
    }
  }
}
