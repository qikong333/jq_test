import { ref, computed, watch } from 'vue'
import type { PixiEditorApp, Tool, ITool, ToolEvent, Point, UsePixiToolsReturn } from '../types'
import { BrushTool } from '../tools/BrushTool'
import { EraserTool } from '../tools/EraserTool'
import { FillTool } from '../tools/FillTool'
import { EyedropperTool } from '../tools/EyedropperTool'
import { MoveTool } from '../tools/MoveTool'
import { SelectTool } from '../tools/SelectTool'

/**
 * PixiJS 工具管理 Composable
 * 负责工具的注册、切换和事件处理
 */
export function usePixiTools(
  app: Ref<PixiEditorApp | null>,
  currentTool: Ref<Tool>,
  currentColor: Ref<string>,
  brushSize: Ref<number>,
): UsePixiToolsReturn {
  // 工具注册表
  const tools = ref(new Map<Tool, ITool>())
  const activeTool = ref<ITool | null>(null)

  // 工具状态
  const isDrawing = ref(false)
  const lastPosition = ref<Point | null>(null)

  /**
   * 初始化默认工具
   */
  const initializeTools = () => {
    if (!app.value) return

    // 注册所有工具
    const toolInstances = [
      new BrushTool(app.value, currentColor, brushSize),
      new EraserTool(app.value, brushSize),
      new FillTool(app.value, currentColor),
      new EyedropperTool(app.value, currentColor),
      new MoveTool(app.value),
      new SelectTool(app.value),
    ]

    toolInstances.forEach((tool) => {
      tools.value.set(tool.name, tool)
    })

    // 设置默认工具
    setTool(currentTool.value)
  }

  /**
   * 注册工具
   */
  const registerTool = (tool: ITool) => {
    tools.value.set(tool.name, tool)
  }

  /**
   * 注销工具
   */
  const unregisterTool = (toolName: Tool) => {
    const tool = tools.value.get(toolName)
    if (tool && activeTool.value === tool) {
      activeTool.value = null
    }
    tools.value.delete(toolName)
  }

  /**
   * 切换工具
   */
  const setTool = (toolName: Tool) => {
    const tool = tools.value.get(toolName)
    if (!tool) {
      console.warn(`工具 ${toolName} 未找到`)
      return
    }

    // 取消当前工具的操作
    if (activeTool.value && isDrawing.value) {
      activeTool.value.onCancel()
      isDrawing.value = false
    }

    activeTool.value = tool
    currentTool.value = toolName

    // 更新光标
    updateCursor()

    console.log(`切换到工具: ${toolName}`)
  }

  /**
   * 更新鼠标光标
   */
  const updateCursor = () => {
    if (!app.value?.canvas || !activeTool.value) return

    app.value.canvas.style.cursor = activeTool.value.cursor
  }

  /**
   * 处理工具事件
   */
  const handleToolAction = (type: ToolEvent['type'], position: Point, event?: MouseEvent) => {
    if (!activeTool.value || !app.value) return

    const toolEvent: ToolEvent = {
      type,
      position,
      pressure: 1, // TODO: 支持压感
      shiftKey: event?.shiftKey || false,
      ctrlKey: event?.ctrlKey || false,
      altKey: event?.altKey || false,
    }

    try {
      switch (type) {
        case 'start':
          activeTool.value.onStart(toolEvent)
          isDrawing.value = true
          lastPosition.value = position
          break

        case 'move':
          if (isDrawing.value) {
            activeTool.value.onMove(toolEvent)
            lastPosition.value = position
          }
          break

        case 'end':
          if (isDrawing.value) {
            activeTool.value.onEnd(toolEvent)
            isDrawing.value = false
            lastPosition.value = null
          }
          break

        case 'cancel':
          activeTool.value.onCancel()
          isDrawing.value = false
          lastPosition.value = null
          break
      }
    } catch (error) {
      console.error(`工具 ${activeTool.value.name} 处理事件失败:`, error)
      // 重置状态
      isDrawing.value = false
      lastPosition.value = null
    }
  }

  /**
   * 获取当前工具信息
   */
  const getCurrentToolInfo = () => {
    if (!activeTool.value) return null

    return {
      name: activeTool.value.name,
      cursor: activeTool.value.cursor,
      isDrawing: isDrawing.value,
      lastPosition: lastPosition.value,
    }
  }

  /**
   * 获取所有可用工具
   */
  const getAvailableTools = (): Tool[] => {
    return Array.from(tools.value.keys())
  }

  /**
   * 检查工具是否可用
   */
  const isToolAvailable = (toolName: Tool): boolean => {
    return tools.value.has(toolName)
  }

  /**
   * 处理键盘快捷键
   */
  const handleKeyboardShortcut = (event: KeyboardEvent) => {
    // 防止在输入框中触发快捷键
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    const key = event.key.toLowerCase()

    // 工具快捷键
    const toolShortcuts: Record<string, Tool> = {
      b: 'brush',
      e: 'eraser',
      f: 'fill',
      i: 'eyedropper',
      m: 'move',
      s: 'select',
    }

    if (toolShortcuts[key] && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      setTool(toolShortcuts[key])
    }

    // 其他快捷键
    if (event.ctrlKey || event.metaKey) {
      switch (key) {
        case 'z':
          event.preventDefault()
          if (event.shiftKey) {
            // Ctrl+Shift+Z: 重做
            // TODO: 触发重做事件
          } else {
            // Ctrl+Z: 撤销
            // TODO: 触发撤销事件
          }
          break
      }
    }
  }

  /**
   * 临时切换工具（按住键时）
   */
  const temporaryToolSwitch = (toolName: Tool) => {
    // TODO: 实现临时工具切换逻辑
    // 例如按住空格键临时切换到移动工具
  }

  // 计算属性
  const currentToolName = computed(() => activeTool.value?.name || null)
  const hasActiveTool = computed(() => activeTool.value !== null)

  // 监听应用初始化
  watch(
    () => app.value,
    (newApp) => {
      if (newApp) {
        initializeTools()
      }
    },
    { immediate: true },
  )

  // 监听工具切换
  watch(currentTool, (newTool) => {
    if (newTool && tools.value.has(newTool)) {
      setTool(newTool)
    }
  })

  // 监听颜色和画笔大小变化，更新工具配置
  watch([currentColor, brushSize], () => {
    // 通知工具配置已更改
    tools.value.forEach((tool) => {
      if ('updateConfig' in tool && typeof tool.updateConfig === 'function') {
        tool.updateConfig({
          color: currentColor.value,
          size: brushSize.value,
        })
      }
    })
  })

  return {
    activeTool,
    setTool,
    handleToolAction,
    registerTool,
    unregisterTool,
    getCurrentToolInfo,
    getAvailableTools,
    isToolAvailable,
    handleKeyboardShortcut,
    temporaryToolSwitch,
    currentToolName,
    hasActiveTool,
    isDrawing,
  }
}
