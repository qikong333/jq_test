import { Sprite, Texture } from 'pixi.js'
import type { PixiEditorApp, ITool, ToolEvent, Point } from '../types'

/**
 * 填充工具实现
 * 使用洪水填充算法填充连通区域
 */
export class FillTool implements ITool {
  public readonly name = 'fill'
  public readonly cursor = 'crosshair'

  private app: PixiEditorApp
  private currentColor: Ref<string>
  private pixelTexture: Texture | null = null

  constructor(app: PixiEditorApp, currentColor: Ref<string>) {
    this.app = app
    this.currentColor = currentColor
    this.initializePixelTexture()
  }

  /**
   * 初始化像素纹理
   */
  private initializePixelTexture(): void {
    try {
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
   * 开始填充
   */
  onStart(event: ToolEvent): void {
    if (!this.app.pixelContainer) return

    const worldPos = this.screenToWorld(event.position)
    const gridPos = {
      x: Math.floor(worldPos.x),
      y: Math.floor(worldPos.y),
    }

    this.floodFill(gridPos)
  }

  /**
   * 移动时不执行操作
   */
  onMove(event: ToolEvent): void {
    // 填充工具在移动时不执行操作
  }

  /**
   * 结束填充
   */
  onEnd(event: ToolEvent): void {
    // 填充工具在结束时不需要特殊处理
  }

  /**
   * 取消填充
   */
  onCancel(): void {
    // 填充工具取消时不需要特殊处理
  }

  /**
   * 洪水填充算法
   */
  private floodFill(startPos: Point): void {
    const targetColor = this.getPixelColor(startPos)
    const fillColor = this.hexToNumber(this.currentColor.value)

    // 如果目标颜色和填充颜色相同，不需要填充
    if (targetColor === fillColor) return

    const visited = new Set<string>()
    const stack: Point[] = [startPos]
    const pixelsToAdd: Point[] = []

    while (stack.length > 0) {
      const pos = stack.pop()!
      const key = `${pos.x},${pos.y}`

      if (visited.has(key)) continue
      visited.add(key)

      // 检查当前位置的颜色
      const currentColor = this.getPixelColor(pos)
      if (currentColor !== targetColor) continue

      // 添加到填充列表
      pixelsToAdd.push({ ...pos })

      // 添加相邻像素到栈中
      const neighbors = [
        { x: pos.x + 1, y: pos.y },
        { x: pos.x - 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x, y: pos.y - 1 },
      ]

      neighbors.forEach((neighbor) => {
        const neighborKey = `${neighbor.x},${neighbor.y}`
        if (!visited.has(neighborKey) && this.isValidPosition(neighbor)) {
          stack.push(neighbor)
        }
      })
    }

    // 批量创建像素
    this.createPixels(pixelsToAdd, fillColor)
  }

  /**
   * 获取指定位置的像素颜色
   */
  private getPixelColor(pos: Point): number | null {
    // 查找该位置是否已有像素
    for (const child of this.app.pixelContainer.children) {
      if (
        child.name === 'pixel' &&
        Math.floor(child.x) === pos.x &&
        Math.floor(child.y) === pos.y
      ) {
        return child.tint as number
      }
    }

    // 如果没有像素，返回背景色（透明）
    return null
  }

  /**
   * 检查位置是否有效
   */
  private isValidPosition(pos: Point): boolean {
    // 检查是否在画布范围内
    return (
      pos.x >= 0 &&
      pos.y >= 0 &&
      pos.x < this.app.viewport.width &&
      pos.y < this.app.viewport.height
    )
  }

  /**
   * 批量创建像素
   */
  private createPixels(positions: Point[], color: number): void {
    if (!this.pixelTexture) return

    positions.forEach((pos) => {
      // 先移除该位置的现有像素
      this.removePixelAt(pos)

      // 创建新像素
      const pixel = new Sprite(this.pixelTexture)
      pixel.name = 'pixel'
      pixel.tint = color
      pixel.x = pos.x
      pixel.y = pos.y
      pixel.width = 1
      pixel.height = 1

      this.app.pixelContainer.addChild(pixel)
    })
  }

  /**
   * 移除指定位置的像素
   */
  private removePixelAt(pos: Point): void {
    const pixelsToRemove: any[] = []

    this.app.pixelContainer.children.forEach((child) => {
      if (
        child.name === 'pixel' &&
        Math.floor(child.x) === pos.x &&
        Math.floor(child.y) === pos.y
      ) {
        pixelsToRemove.push(child)
      }
    })

    pixelsToRemove.forEach((pixel) => {
      this.app.pixelContainer.removeChild(pixel)
      pixel.destroy()
    })
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
  updateConfig(config: { color?: string }): void {
    if (config.color) {
      this.currentColor.value = config.color
    }
  }

  /**
   * 获取工具状态
   */
  getState() {
    return {
      color: this.currentColor.value,
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.pixelTexture) {
      this.pixelTexture.destroy()
      this.pixelTexture = null
    }
  }
}
