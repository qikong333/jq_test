import { ref, computed, reactive, nextTick } from 'vue'
import type {
  ToolType,
  ITool,
  IToolManager,
  ToolState,
  ToolContext,
  ToolEvent,
  ToolConfig,
  ToolUsageStats,
} from '../types/tools'

/**
 * 工具管理器组合式函数
 * 提供统一的工具注册、切换、状态管理功能
 */
export function useToolManager(): IToolManager {
  // ========== 响应式状态 ==========
  const currentTool = ref<ToolType | null>(null)
  const toolRegistry = ref<Map<ToolType, ITool>>(new Map())
  const toolStates = ref<Record<ToolType, ToolState>>({} as Record<ToolType, ToolState>)
  const isTransitioning = ref(false)

  // ========== 计算属性 ==========
  const availableTools = computed(() => {
    return Array.from(toolRegistry.value.values())
  })

  // ========== 工具注册管理 ==========

  /**
   * 注册工具
   */
  function registerTool(tool: ITool): void {
    if (toolRegistry.value.has(tool.id)) {
      console.warn(`Tool ${tool.id} is already registered`)
      return
    }

    // 注册工具
    toolRegistry.value.set(tool.id, tool)

    // 初始化工具状态
    if (!toolStates.value[tool.id]) {
      toolStates.value[tool.id] = {
        isActive: false,
        config: tool.getConfig(),
        usage: {
          usageCount: 0,
          totalTime: 0,
        },
      }
    }

    console.log(`Tool ${tool.id} registered successfully`)
  }

  /**
   * 注销工具
   */
  function unregisterTool(toolId: ToolType): void {
    const tool = toolRegistry.value.get(toolId)
    if (!tool) {
      console.warn(`Tool ${toolId} is not registered`)
      return
    }

    // 如果是当前激活工具，先停用
    if (currentTool.value === toolId) {
      setActiveTool(null as any)
    }

    // 移除工具
    toolRegistry.value.delete(toolId)
    delete toolStates.value[toolId]

    console.log(`Tool ${toolId} unregistered successfully`)
  }

  // ========== 工具切换管理 ==========

  /**
   * 设置激活工具
   */
  async function setActiveTool(toolId: ToolType | null): Promise<boolean> {
    if (isTransitioning.value) {
      console.warn('Tool transition in progress, please wait')
      return false
    }

    // 如果是相同工具，直接返回
    if (currentTool.value === toolId) {
      return true
    }

    isTransitioning.value = true

    try {
      // 停用当前工具
      if (currentTool.value) {
        const currentToolInstance = toolRegistry.value.get(currentTool.value)
        if (currentToolInstance) {
          await deactivateTool(currentToolInstance)
        }
      }

      // 激活新工具
      if (toolId) {
        const newTool = toolRegistry.value.get(toolId)
        if (!newTool) {
          console.error(`Tool ${toolId} is not registered`)
          return false
        }

        const success = await activateTool(newTool)
        if (!success) {
          return false
        }
      }

      // 更新当前工具
      currentTool.value = toolId
      return true
    } catch (error) {
      console.error('Error during tool transition:', error)
      return false
    } finally {
      isTransitioning.value = false
    }
  }

  /**
   * 获取当前激活工具
   */
  function getActiveTool(): ITool | null {
    if (!currentTool.value) return null
    return toolRegistry.value.get(currentTool.value) || null
  }

  // ========== 工具生命周期管理 ==========

  /**
   * 激活工具
   */
  async function activateTool(tool: ITool): Promise<boolean> {
    try {
      const state = toolStates.value[tool.id]
      if (!state) {
        console.error(`Tool state not found for ${tool.id}`)
        return false
      }

      // 创建工具上下文（这里需要从外部传入实际的上下文）
      const context: ToolContext = createToolContext()

      // 调用工具激活方法
      await tool.onActivate(context)

      // 更新状态
      state.isActive = true
      state.lastUsed = new Date()
      state.usage.usageCount++

      console.log(`Tool ${tool.id} activated`)
      return true
    } catch (error) {
      console.error(`Error activating tool ${tool.id}:`, error)
      return false
    }
  }

  /**
   * 停用工具
   */
  async function deactivateTool(tool: ITool): Promise<void> {
    try {
      const state = toolStates.value[tool.id]
      if (!state) {
        console.error(`Tool state not found for ${tool.id}`)
        return
      }

      // 创建工具上下文
      const context: ToolContext = createToolContext()

      // 调用工具停用方法
      await tool.onDeactivate(context)

      // 更新状态
      state.isActive = false

      console.log(`Tool ${tool.id} deactivated`)
    } catch (error) {
      console.error(`Error deactivating tool ${tool.id}:`, error)
    }
  }

  // ========== 事件处理 ==========

  /**
   * 分发事件到当前激活工具
   */
  function dispatchEvent(event: ToolEvent): boolean {
    const activeTool = getActiveTool()
    if (!activeTool) {
      return false
    }

    try {
      return activeTool.handleEvent(event)
    } catch (error) {
      console.error(`Error handling event in tool ${activeTool.id}:`, error)
      return false
    }
  }

  // ========== 工具配置管理 ==========

  /**
   * 获取工具配置
   */
  function getToolConfig(toolId: ToolType): ToolConfig | null {
    const tool = toolRegistry.value.get(toolId)
    return tool ? tool.getConfig() : null
  }

  /**
   * 设置工具配置
   */
  function setToolConfig(toolId: ToolType, config: Partial<ToolConfig>): boolean {
    const tool = toolRegistry.value.get(toolId)
    if (!tool) {
      console.error(`Tool ${toolId} not found`)
      return false
    }

    try {
      tool.setConfig(config)

      // 更新状态中的配置
      const state = toolStates.value[toolId]
      if (state) {
        state.config = { ...state.config, ...config }
      }

      return true
    } catch (error) {
      console.error(`Error setting config for tool ${toolId}:`, error)
      return false
    }
  }

  // ========== 辅助函数 ==========

  /**
   * 创建工具上下文
   * 注意：这里需要从外部注入实际的上下文数据
   */
  function createToolContext(): ToolContext {
    // 这是一个占位实现，实际使用时需要从外部传入真实的上下文
    return {
      canvas: {} as CanvasRenderingContext2D,
      canvasState: {} as any,
      viewport: {
        zoom: 1,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      },
      gridStorage: {} as any,
    }
  }

  /**
   * 获取工具统计信息
   */
  function getToolStats(toolId: ToolType): ToolUsageStats | null {
    const state = toolStates.value[toolId]
    return state ? state.usage : null
  }

  /**
   * 重置工具统计
   */
  function resetToolStats(toolId: ToolType): void {
    const state = toolStates.value[toolId]
    if (state) {
      state.usage = {
        usageCount: 0,
        totalTime: 0,
      }
    }
  }

  // ========== 返回接口 ==========
  return {
    // 工具注册
    registerTool,
    unregisterTool,

    // 工具切换
    setActiveTool,
    getActiveTool,

    // 状态访问
    currentTool: readonly(currentTool),
    availableTools,
    toolStates: readonly(toolStates),

    // 扩展功能（非接口定义，但很有用）
    dispatchEvent,
    getToolConfig,
    setToolConfig,
    getToolStats,
    resetToolStats,
  } as IToolManager & {
    dispatchEvent: (event: ToolEvent) => boolean
    getToolConfig: (toolId: ToolType) => ToolConfig | null
    setToolConfig: (toolId: ToolType, config: Partial<ToolConfig>) => boolean
    getToolStats: (toolId: ToolType) => ToolUsageStats | null
    resetToolStats: (toolId: ToolType) => void
  }
}

/**
 * 全局工具管理器实例
 * 使用单例模式确保整个应用只有一个工具管理器
 */
let globalToolManager: ReturnType<typeof useToolManager> | null = null

export function getGlobalToolManager(): ReturnType<typeof useToolManager> {
  if (!globalToolManager) {
    globalToolManager = useToolManager()
  }
  return globalToolManager
}
