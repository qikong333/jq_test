import { ref, computed } from 'vue'
import type { ITool, ToolState, ToolEvent, ToolType, ToolContext } from '../../../types/tools'
import { useBrush } from '../../../composables/useBrush'
import { useCanvas } from '../../../composables/useCanvas'

/**
 * 画笔工具适配器
 * 将现有的 useBrush 逻辑适配到 ITool 接口
 */
export class BrushToolAdapter implements ITool {
  readonly id: ToolType = 'brush'
  readonly name = '画笔工具'
  readonly icon = '🖌️'
  readonly cursor = 'crosshair'
  readonly version = '1.0.0'
  readonly author = 'System'
  readonly shortcut = 'B'

  // 组合式函数实例
  private canvasComposable: ReturnType<typeof useCanvas>
  private brushComposable: ReturnType<typeof useBrush>

  constructor(canvasComposable: ReturnType<typeof useCanvas>) {
    this.canvasComposable = canvasComposable
    this.brushComposable = useBrush(this.canvasComposable.gridSystem.gridData.value)
  }

  // 响应式状态
  private _isActive = ref(false)
  private _state = ref<ToolState>({
    isActive: false,
    config: {},
    lastUsed: undefined,
    usage: {
      usageCount: 0,
      totalTime: 0,
      lastUsed: undefined,
    },
  })

  get isActive() {
    return computed(() => this._isActive.value)
  }

  get lastUsed(): Date | undefined {
    return this._state.value.lastUsed
  }

  get state() {
    return this._state
  }

  // 生命周期方法
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onActivate(_context: ToolContext): Promise<void> {
    this._isActive.value = true
    this._state.value.isActive = true
    this._state.value.lastUsed = new Date()

    // 设置光标样式
    if (this.canvasComposable.canvasRef?.value) {
      this.canvasComposable.canvasRef.value.style.cursor = 'crosshair'
    }

    console.log('画笔工具已激活')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onDeactivate(_context: ToolContext): Promise<void> {
    this._isActive.value = false
    this._state.value.isActive = false

    // 恢复默认光标
    if (this.canvasComposable.canvasRef?.value) {
      this.canvasComposable.canvasRef.value.style.cursor = 'default'
    }

    console.log('画笔工具已停用')
  }

  onUpdate(): void {
    // 画笔工具的更新逻辑
  }

  // 事件处理
  handleEvent(event: ToolEvent): boolean {
    try {
      switch (event.type) {
        case 'mousedown':
          return this.handleMouseDown(event)
        case 'mousemove':
          return this.handleMouseMove(event)
        case 'mouseup':
          return this.handleMouseUp(event)
        case 'keydown':
          return this.handleKeyDown(event)
        default:
          return false
      }
    } catch (error) {
      console.error('处理画笔工具事件失败:', error)
      return false
    }
  }

  private handleMouseDown(event: ToolEvent): boolean {
    const mouseEvent = event.data as MouseEvent
    if (mouseEvent.button === 0) {
      // 左键
      // 开始绘制
      const { x, y } = { x: mouseEvent.clientX, y: mouseEvent.clientY }
      // 转换为网格坐标
      const gridData = this.canvasComposable.gridSystem.gridData.value
      const gridX = Math.floor(x / gridData.cellWidth)
      const gridY = Math.floor(y / gridData.cellHeight)
      this.brushComposable.updateBrushPreview(
        gridX,
        gridY,
        gridData.physicalSize.width,
        gridData.physicalSize.height,
      )
      console.log('Mouse down at:', x, y)
      return true
    }
    return false
  }

  private handleMouseMove(event: ToolEvent): boolean {
    const mouseEvent = event.data as MouseEvent
    const { x, y } = { x: mouseEvent.clientX, y: mouseEvent.clientY }
    // 继续绘制或更新预览
    const gridData = this.canvasComposable.gridSystem.gridData.value
    const gridX = Math.floor(x / gridData.cellWidth)
    const gridY = Math.floor(y / gridData.cellHeight)
    this.brushComposable.updateBrushPreview(
      gridX,
      gridY,
      gridData.physicalSize.width,
      gridData.physicalSize.height,
    )
    console.log('Mouse move at:', x, y)
    return true
  }

  private handleMouseUp(event: ToolEvent): boolean {
    const mouseEvent = event.data as MouseEvent
    if (mouseEvent.button === 0) {
      // 左键
      // 结束绘制
      return true
    }
    return false
  }

  private handleKeyDown(event: ToolEvent): boolean {
    const keyEvent = event.data as KeyboardEvent
    const key = keyEvent.key

    // 处理快捷键
    if (key === '[') {
      // 减小画笔大小
      const currentSize = this.brushComposable.brushConfig.value.sizeCm
      this.brushComposable.setBrushSize(Math.max(0.1, currentSize - 0.1))
      return true
    } else if (key === ']') {
      // 增大画笔大小
      const currentSize = this.brushComposable.brushConfig.value.sizeCm
      this.brushComposable.setBrushSize(currentSize + 0.1)
      return true
    }

    return false
  }

  // 配置管理
  getConfig(): Record<string, unknown> {
    return this._state.value.config
  }

  setConfig(config: Record<string, unknown>): void {
    this._state.value.config = { ...this._state.value.config, ...config }
  }

  // 画笔特定的配置方法
  setBrushSize(size: number): void {
    this.brushComposable.setBrushSize(size)
  }

  setBrushColor(color: string): void {
    this.brushComposable.setBrushColor(color)
  }

  setBrushOpacity(opacity: number): void {
    this.brushComposable.setBrushOpacity(opacity)
  }

  setBrushHardness(hardness: number): void {
    this.brushComposable.setBrushHardness(hardness)
  }

  getBrushInfo() {
    return this.brushComposable.getBrushInfo()
  }
}

// 注意：不再导出默认实例，而是通过工厂函数创建
// export const brushTool = new BrushToolAdapter()
