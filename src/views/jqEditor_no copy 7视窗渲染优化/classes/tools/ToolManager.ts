import { ref, computed, type Ref } from 'vue'
import type { ITool, ToolEvent, ToolConfig, ToolContext } from '../../types/tools'
import { createToolAdapterList } from './adapters'
import { useCanvas } from '../../composables/useCanvas'

/**
 * 工具管理器类
 * 负责管理所有工具的生命周期和状态
 */
export class ToolManager {
  private _currentTool: Ref<ITool | null> = ref(null)
  private _tools: Map<string, ITool> = new Map()
  private _lastUpdateTime = 0
  private canvasComposable: ReturnType<typeof useCanvas>

  constructor(canvasComposable: ReturnType<typeof useCanvas>) {
    this.canvasComposable = canvasComposable
    this.initializeTools()
  }

  /**
   * 初始化所有工具
   */
  private initializeTools(): void {
    const toolAdapterList = createToolAdapterList(this.canvasComposable)
    toolAdapterList.forEach((tool) => {
      this._tools.set(tool.id, tool)
    })
  }

  /**
   * 获取当前活动工具
   */
  get currentTool(): ITool | null {
    return this._currentTool.value
  }

  /**
   * 获取当前工具ID
   */
  get currentToolId(): string | null {
    return this._currentTool.value?.id || null
  }

  /**
   * 获取所有可用工具
   */
  get availableTools(): ITool[] {
    return Array.from(this._tools.values())
  }

  /**
   * 设置活动工具
   */
  async setActiveTool(toolId: string): Promise<boolean> {
    const tool = this._tools.get(toolId)
    if (!tool) {
      console.warn(`Tool with id '${toolId}' not found`)
      return false
    }

    // 停用当前工具
    if (this._currentTool.value) {
      await this._currentTool.value.onDeactivate(this.getToolContext())
    }

    // 激活新工具
    this._currentTool.value = tool
    await tool.onActivate(this.getToolContext())

    return true
  }

  /**
   * 停用当前工具
   */
  async deactivateCurrentTool(): Promise<void> {
    if (this._currentTool.value) {
      await this._currentTool.value.onDeactivate(this.getToolContext())
      this._currentTool.value = null
    }
  }

  /**
   * 处理工具事件
   */
  handleEvent(event: ToolEvent): boolean {
    if (!this._currentTool.value) {
      return false
    }

    try {
      this._currentTool.value.handleEvent(event)
      return true
    } catch (error) {
      console.error('Error handling tool event:', error)
      return false
    }
  }

  /**
   * 更新工具状态
   */
  update(): void {
    const currentTime = performance.now()
    const deltaTime = currentTime - this._lastUpdateTime
    this._lastUpdateTime = currentTime

    if (this._currentTool.value) {
      this._currentTool.value.onUpdate(deltaTime)
    }
  }

  /**
   * 获取工具配置
   */
  getToolConfig(toolId: string): ToolConfig | null {
    const tool = this._tools.get(toolId)
    return tool ? tool.getConfig() : null
  }

  /**
   * 设置工具配置
   */
  setToolConfig(toolId: string, config: Partial<ToolConfig>): boolean {
    const tool = this._tools.get(toolId)
    if (tool) {
      tool.setConfig(config)
      return true
    }
    return false
  }

  /**
   * 销毁工具管理器
   */
  async dispose(): Promise<void> {
    await this.deactivateCurrentTool()
    this._tools.clear()
  }

  /**
   * 获取工具上下文
   */
  private getToolContext(): ToolContext {
    // 返回一个基本的上下文对象
    // 这里可以根据实际需要扩展
    const canvas = this.canvasComposable.canvasRef.value;
     if (!canvas) {
       throw new Error('Canvas reference is not available');
     }
     
     const ctx = canvas.getContext('2d');
     if (!ctx) {
       throw new Error('Failed to get 2D context from canvas');
     }
     
     return {
       canvas: ctx,
       canvasState: this.canvasComposable.canvasState.value,
       viewport: {
         zoom: 1,
         pan: { x: 0, y: 0 },
         width: canvas.width,
         height: canvas.height
       },
       gridStorage: this.canvasComposable.gridStorage.value
     }
  }
}

/**
 * 工具管理器组合式函数
 */
export function useToolManager(canvasComposable: ReturnType<typeof useCanvas>) {
  const toolManager = new ToolManager(canvasComposable)

  return {
    toolManager,
    currentTool: computed(() => toolManager.currentTool),
    currentToolId: computed(() => toolManager.currentToolId),
    availableTools: computed(() => toolManager.availableTools),
    setActiveTool: (toolId: string) => toolManager.setActiveTool(toolId),
    deactivateCurrentTool: () => toolManager.deactivateCurrentTool(),
    handleEvent: (event: ToolEvent) => toolManager.handleEvent(event),
    update: () => toolManager.update(),
    getToolConfig: (toolId: string) => toolManager.getToolConfig(toolId),
    setToolConfig: (toolId: string, config: Partial<ToolConfig>) =>
      toolManager.setToolConfig(toolId, config),
  }
}
