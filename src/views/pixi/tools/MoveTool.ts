import type { PixiEditorApp, ITool, ToolEvent, Point } from '../types'

/**
 * 移动工具实现
 * 用于平移视口和移动画布内容
 */
export class MoveTool implements ITool {
  public readonly name = 'move'
  public readonly cursor = 'grab'

  private app: PixiEditorApp
  private isDragging = false
  private lastPosition: Point | null = null
  private startViewport: { x: number; y: number } | null = null

  constructor(app: PixiEditorApp) {
    this.app = app
  }

  /**
   * 开始移动
   */
  onStart(event: ToolEvent): void {
    this.isDragging = true
    this.lastPosition = event.position
    this.startViewport = {
      x: this.app.viewport.x,
      y: this.app.viewport.y,
    }

    // 更改光标为抓取状态
    this.updateCursor('grabbing')
  }

  /**
   * 移动过程
   */
  onMove(event: ToolEvent): void {
    if (!this.isDragging || !this.lastPosition) return

    const deltaX = event.position.x - this.lastPosition.x
    const deltaY = event.position.y - this.lastPosition.y

    // 更新视口位置
    this.app.viewport.x += deltaX
    this.app.viewport.y += deltaY

    // 应用变换到主容器
    this.applyViewportTransform()

    this.lastPosition = event.position
  }

  /**
   * 结束移动
   */
  onEnd(event: ToolEvent): void {
    this.isDragging = false
    this.lastPosition = null
    this.startViewport = null

    // 恢复光标
    this.updateCursor('grab')
  }

  /**
   * 取消移动
   */
  onCancel(): void {
    if (this.startViewport) {
      // 恢复到开始位置
      this.app.viewport.x = this.startViewport.x
      this.app.viewport.y = this.startViewport.y
      this.applyViewportTransform()
    }

    this.isDragging = false
    this.lastPosition = null
    this.startViewport = null

    // 恢复光标
    this.updateCursor('grab')
  }

  /**
   * 应用视口变换
   */
  private applyViewportTransform(): void {
    if (!this.app.mainContainer) return

    const { x, y, scale } = this.app.viewport
    this.app.mainContainer.position.set(x, y)
    this.app.mainContainer.scale.set(scale)
  }

  /**
   * 更新鼠标光标
   */
  private updateCursor(cursor: string): void {
    if (this.app.canvas) {
      this.app.canvas.style.cursor = cursor
    }
  }

  /**
   * 平移到指定位置
   */
  panTo(x: number, y: number): void {
    this.app.viewport.x = x
    this.app.viewport.y = y
    this.applyViewportTransform()
  }

  /**
   * 相对平移
   */
  panBy(deltaX: number, deltaY: number): void {
    this.app.viewport.x += deltaX
    this.app.viewport.y += deltaY
    this.applyViewportTransform()
  }

  /**
   * 居中显示内容
   */
  centerContent(): void {
    if (!this.app.pixelContainer) return

    // 获取内容边界
    const bounds = this.app.pixelContainer.getBounds()

    if (bounds.width === 0 || bounds.height === 0) {
      // 如果没有内容，居中显示画布
      this.centerCanvas()
      return
    }

    // 计算居中位置
    const canvasWidth = this.app.screen.width
    const canvasHeight = this.app.screen.height
    const scale = this.app.viewport.scale

    const contentCenterX = bounds.x + bounds.width / 2
    const contentCenterY = bounds.y + bounds.height / 2

    const targetX = canvasWidth / 2 - contentCenterX * scale
    const targetY = canvasHeight / 2 - contentCenterY * scale

    this.panTo(targetX, targetY)
  }

  /**
   * 居中显示画布
   */
  centerCanvas(): void {
    const canvasWidth = this.app.screen.width
    const canvasHeight = this.app.screen.height
    const scale = this.app.viewport.scale

    const contentWidth = this.app.viewport.width
    const contentHeight = this.app.viewport.height

    const targetX = (canvasWidth - contentWidth * scale) / 2
    const targetY = (canvasHeight - contentHeight * scale) / 2

    this.panTo(targetX, targetY)
  }

  /**
   * 适应窗口大小
   */
  fitToWindow(): void {
    if (!this.app.pixelContainer) return

    const bounds = this.app.pixelContainer.getBounds()

    if (bounds.width === 0 || bounds.height === 0) {
      // 如果没有内容，使用画布尺寸
      this.fitCanvasToWindow()
      return
    }

    const canvasWidth = this.app.screen.width
    const canvasHeight = this.app.screen.height

    // 计算适应窗口的缩放比例
    const scaleX = (canvasWidth * 0.9) / bounds.width
    const scaleY = (canvasHeight * 0.9) / bounds.height
    const scale = Math.min(scaleX, scaleY)

    // 更新缩放
    this.app.viewport.scale = scale

    // 居中显示
    this.centerContent()
  }

  /**
   * 适应画布到窗口
   */
  fitCanvasToWindow(): void {
    const canvasWidth = this.app.screen.width
    const canvasHeight = this.app.screen.height
    const contentWidth = this.app.viewport.width
    const contentHeight = this.app.viewport.height

    // 计算适应窗口的缩放比例
    const scaleX = (canvasWidth * 0.9) / contentWidth
    const scaleY = (canvasHeight * 0.9) / contentHeight
    const scale = Math.min(scaleX, scaleY)

    // 更新缩放
    this.app.viewport.scale = scale

    // 居中显示
    this.centerCanvas()
  }

  /**
   * 平滑移动到指定位置
   */
  smoothPanTo(targetX: number, targetY: number, duration: number = 300): void {
    const startX = this.app.viewport.x
    const startY = this.app.viewport.y
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用 easeOutCubic 缓动函数
      const eased = 1 - Math.pow(1 - progress, 3)

      const currentX = startX + (targetX - startX) * eased
      const currentY = startY + (targetY - startY) * eased

      this.panTo(currentX, currentY)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  /**
   * 获取当前视口信息
   */
  getViewportInfo() {
    return {
      x: this.app.viewport.x,
      y: this.app.viewport.y,
      scale: this.app.viewport.scale,
      isDragging: this.isDragging,
    }
  }

  /**
   * 更新工具配置
   */
  updateConfig(config: any): void {
    // 移动工具通常不需要配置更新
  }

  /**
   * 获取工具状态
   */
  getState() {
    return {
      isDragging: this.isDragging,
      viewport: { ...this.app.viewport },
    }
  }
}
