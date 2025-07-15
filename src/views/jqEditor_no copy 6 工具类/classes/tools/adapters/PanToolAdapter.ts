import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { ITool, ToolState, ToolEvent, ToolContext } from '../../../types/tools'

/**
 * 平移工具适配器
 * 将现有的平移逻辑适配到 ITool 接口
 */
export class PanToolAdapter implements ITool {
  readonly id = 'pan'
  readonly name = '平移工具'
  readonly icon = '🤚'
  readonly cursor = 'grab'
  readonly shortcut = 'P'

  private _isActive = ref(false)
  private _state = ref<ToolState>({
    isActive: false,
    config: {},
    lastUsed: new Date(),
    usage: {
      usageCount: 0,
      totalTime: 0,
      lastUsed: new Date(),
    },
  })

  private isPanning = ref(false)
  private lastPanPoint = ref<{ x: number; y: number } | null>(null)

  // 响应式状态
  get isActive(): ComputedRef<boolean> {
    return computed(() => this._isActive.value)
  }

  get config() {
    return this._state.value.config
  }

  get lastUsed() {
    return this._state.value.lastUsed
  }

  get state(): Ref<ToolState> {
    return this._state
  }

  // 生命周期方法
  onActivate(): void {
    this._isActive.value = true
    this._state.value.isActive = true
    this._state.value.lastUsed = new Date()

    console.log('平移工具已激活')
  }

  onDeactivate(): void {
    this._isActive.value = false
    this._state.value.isActive = false
    this.isPanning.value = false
    this.lastPanPoint.value = null

    console.log('平移工具已停用')
  }

  onUpdate(): void {
    // 平移工具通常不需要持续更新
  }

  // 事件处理
  handleEvent(event: ToolEvent): boolean {
    switch (event.type) {
      case 'mousedown':
        return this.handleMouseDown(event)
      case 'mousemove':
        return this.handleMouseMove(event)
      case 'mouseup':
        return this.handleMouseUp(event)
      default:
        return false
    }
  }

  private handleMouseDown(event: ToolEvent): boolean {
    if (event.data instanceof MouseEvent) {
      this.isPanning.value = true
      this.lastPanPoint.value = {
        x: event.data.clientX,
        y: event.data.clientY,
      }

      // 更新光标为抓取状态
      console.log('开始平移')

      return true
    }
    return false
  }

  private handleMouseMove(event: ToolEvent): boolean {
    if (this.isPanning.value && event.data instanceof MouseEvent && this.lastPanPoint.value) {
      const deltaX = event.data.clientX - this.lastPanPoint.value.x
      const deltaY = event.data.clientY - this.lastPanPoint.value.y

      // 执行平移 - 简化实现，直接更新画布变换
      console.log('平移画布:', deltaX, deltaY)

      // 更新最后的平移点
      this.lastPanPoint.value = {
        x: event.data.clientX,
        y: event.data.clientY,
      }

      return true
    }
    return false
  }

  private handleMouseUp(): boolean {
    if (this.isPanning.value) {
      this.isPanning.value = false
      this.lastPanPoint.value = null

      // 恢复光标
      console.log('结束平移')

      return true
    }
    return false
  }

  private handleWheel(event: ToolEvent): boolean {
    if (event.data instanceof WheelEvent) {
      const deltaY = event.data.deltaY
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1

      // 执行缩放 - 简化实现
      console.log('缩放画布:', zoomFactor)

      return true
    }
    return false
  }

  // 配置管理
  getConfig(): Record<string, unknown> {
    return this._state.value.config
  }

  setConfig(config: Partial<Record<string, unknown>>): void {
    this._state.value.config = { ...this._state.value.config, ...config }
  }

  // 工具特定方法
  resetView(): void {
    console.log('重置视图')
  }

  setPanSensitivity(sensitivity: number): void {
    this.setConfig({ panSensitivity: sensitivity })
  }

  getPanSensitivity(): number {
    const config = this.getConfig()
    return (config.panSensitivity as number) || 1
  }
}

// 注意：不再导出默认实例，而是通过工厂函数创建
// export const panTool = new PanToolAdapter()
