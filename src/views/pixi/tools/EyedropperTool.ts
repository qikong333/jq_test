import type { PixiEditorApp, ITool, ToolEvent, Point } from '../types'

/**
 * 吸管工具实现
 * 从画布中提取颜色
 */
export class EyedropperTool implements ITool {
  public readonly name = 'eyedropper'
  public readonly cursor = 'crosshair'

  private app: PixiEditorApp
  private currentColor: Ref<string>

  constructor(app: PixiEditorApp, currentColor: Ref<string>) {
    this.app = app
    this.currentColor = currentColor
  }

  /**
   * 开始取色
   */
  onStart(event: ToolEvent): void {
    if (!this.app.pixelContainer) return

    const worldPos = this.screenToWorld(event.position)
    const gridPos = {
      x: Math.floor(worldPos.x),
      y: Math.floor(worldPos.y),
    }

    this.pickColor(gridPos)
  }

  /**
   * 移动时实时取色（可选）
   */
  onMove(event: ToolEvent): void {
    // 可以在这里实现实时取色预览
    // 暂时不实现，避免过于频繁的颜色更新
  }

  /**
   * 结束取色
   */
  onEnd(event: ToolEvent): void {
    // 吸管工具在结束时不需要特殊处理
  }

  /**
   * 取消取色
   */
  onCancel(): void {
    // 吸管工具取消时不需要特殊处理
  }

  /**
   * 从指定位置提取颜色
   */
  private pickColor(pos: Point): void {
    const color = this.getPixelColor(pos)

    if (color !== null) {
      const hexColor = this.numberToHex(color)
      this.currentColor.value = hexColor
      console.log(`取色成功: ${hexColor} at (${pos.x}, ${pos.y})`)
    } else {
      // 如果没有像素，可以设置为背景色或保持当前颜色
      console.log(`位置 (${pos.x}, ${pos.y}) 没有像素`)
    }
  }

  /**
   * 获取指定位置的像素颜色
   */
  private getPixelColor(pos: Point): number | null {
    // 查找该位置的像素
    for (const child of this.app.pixelContainer.children) {
      if (child.name === 'pixel') {
        const pixelX = Math.floor(child.x)
        const pixelY = Math.floor(child.y)

        if (pixelX === pos.x && pixelY === pos.y) {
          return child.tint as number
        }
      }
    }

    // 如果没有找到像素，尝试从笔画中获取颜色
    for (const child of this.app.pixelContainer.children) {
      if (child.name === 'stroke') {
        // 检查笔画是否包含该位置
        const bounds = child.getBounds()
        if (bounds.contains(pos.x, pos.y)) {
          // 尝试获取笔画的颜色
          // 这里需要根据具体的笔画实现来获取颜色
          return this.getStrokeColorAt(child, pos)
        }
      }
    }

    return null
  }

  /**
   * 从笔画对象中获取指定位置的颜色
   */
  private getStrokeColorAt(stroke: any, pos: Point): number | null {
    // 这是一个简化的实现
    // 实际情况下可能需要更复杂的逻辑来从Graphics对象中提取颜色

    // 如果笔画有tint属性，直接返回
    if (stroke.tint !== undefined) {
      return stroke.tint as number
    }

    // 否则尝试从子对象中获取
    for (const child of stroke.children) {
      if (child.tint !== undefined) {
        return child.tint as number
      }
    }

    return null
  }

  /**
   * 使用渲染器提取颜色（更精确的方法）
   */
  private pickColorFromRenderer(screenPos: Point): string | null {
    try {
      // 这是一个更精确的取色方法，直接从渲染器中提取像素
      const renderer = this.app.renderer

      // 创建1x1的渲染纹理
      const renderTexture = renderer.generateTexture(this.app.stage, {
        region: {
          x: screenPos.x,
          y: screenPos.y,
          width: 1,
          height: 1,
        },
      })

      // 提取像素数据
      const pixels = renderer.extract.pixels(renderTexture)

      if (pixels && pixels.length >= 4) {
        const r = pixels[0]
        const g = pixels[1]
        const b = pixels[2]
        const a = pixels[3]

        // 如果像素是透明的，返回null
        if (a === 0) {
          return null
        }

        // 转换为十六进制颜色
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        return hex
      }

      renderTexture.destroy()
    } catch (error) {
      console.error('从渲染器提取颜色失败:', error)
    }

    return null
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
   * 数字颜色转十六进制
   */
  private numberToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }

  /**
   * 获取颜色预览
   * 返回指定位置的颜色，但不设置为当前颜色
   */
  getColorPreview(screenPos: Point): string | null {
    const worldPos = this.screenToWorld(screenPos)
    const gridPos = {
      x: Math.floor(worldPos.x),
      y: Math.floor(worldPos.y),
    }

    const color = this.getPixelColor(gridPos)
    return color !== null ? this.numberToHex(color) : null
  }

  /**
   * 更新工具配置
   */
  updateConfig(config: any): void {
    // 吸管工具通常不需要配置更新
  }

  /**
   * 获取工具状态
   */
  getState() {
    return {
      currentColor: this.currentColor.value,
    }
  }
}
