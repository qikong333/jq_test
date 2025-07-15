import { ref, computed, watch } from 'vue'
import type { PixiEditorApp, HistoryItem, UsePixiHistoryReturn } from '../types'

/**
 * PixiJS 历史记录管理 Composable
 * 负责撤销/重做功能的实现
 */
export function usePixiHistory(app: Ref<PixiEditorApp | null>): UsePixiHistoryReturn {
  // 历史记录状态
  const historyStack = ref<HistoryItem[]>([])
  const currentIndex = ref(-1)
  const maxHistorySize = ref(50)
  const isRecording = ref(true)

  // 计算属性
  const canUndo = computed(() => currentIndex.value >= 0)
  const canRedo = computed(() => currentIndex.value < historyStack.value.length - 1)
  const historySize = computed(() => historyStack.value.length)

  /**
   * 生成唯一ID
   */
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 序列化画布状态
   */
  const serializeCanvasState = (): any => {
    if (!app.value?.pixelContainer) return null

    try {
      // 序列化像素容器中的所有对象
      const pixelData: any[] = []

      app.value.pixelContainer.children.forEach((child, index) => {
        // 根据对象类型进行序列化
        if (child.name === 'pixel') {
          pixelData.push({
            type: 'pixel',
            x: child.x,
            y: child.y,
            tint: child.tint,
            alpha: child.alpha,
            visible: child.visible,
            scale: { x: child.scale.x, y: child.scale.y },
            rotation: child.rotation,
          })
        } else if (child.name === 'stroke') {
          // 处理笔画对象
          pixelData.push({
            type: 'stroke',
            x: child.x,
            y: child.y,
            // 添加其他笔画相关属性
          })
        }
      })

      return {
        pixels: pixelData,
        viewport: { ...app.value.viewport },
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('序列化画布状态失败:', error)
      return null
    }
  }

  /**
   * 反序列化画布状态
   */
  const deserializeCanvasState = (state: any): boolean => {
    if (!app.value?.pixelContainer || !state) return false

    try {
      // 清空当前像素容器
      app.value.pixelContainer.removeChildren()

      // 重建像素对象
      state.pixels?.forEach((pixelData: any) => {
        if (pixelData.type === 'pixel') {
          // TODO: 重建像素对象
          // 这里需要与像素渲染系统集成
          // const pixel = createPixelSprite(pixelData.x, pixelData.y, pixelData.tint)
          // app.value.pixelContainer.addChild(pixel)
        } else if (pixelData.type === 'stroke') {
          // TODO: 重建笔画对象
        }
      })

      // 恢复视口状态（可选）
      if (state.viewport) {
        app.value.viewport = { ...state.viewport }
      }

      return true
    } catch (error) {
      console.error('反序列化画布状态失败:', error)
      return false
    }
  }

  /**
   * 生成预览图
   */
  const generatePreview = (): string | undefined => {
    if (!app.value) return undefined

    try {
      // 生成小尺寸预览图
      const preview = app.value.renderer.extract.base64(
        app.value.pixelContainer,
        'image/png',
        0.1, // 低质量以减少存储空间
      )
      return preview
    } catch (error) {
      console.error('生成预览图失败:', error)
      return undefined
    }
  }

  /**
   * 保存当前状态到历史记录
   */
  const saveState = (action: string = 'unknown'): void => {
    if (!isRecording.value || !app.value) return

    const state = serializeCanvasState()
    if (!state) return

    const historyItem: HistoryItem = {
      id: generateId(),
      timestamp: Date.now(),
      action,
      data: state,
      preview: generatePreview(),
    }

    // 如果当前不在历史记录末尾，删除后续记录
    if (currentIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, currentIndex.value + 1)
    }

    // 添加新记录
    historyStack.value.push(historyItem)
    currentIndex.value = historyStack.value.length - 1

    // 限制历史记录大小
    if (historyStack.value.length > maxHistorySize.value) {
      const removeCount = historyStack.value.length - maxHistorySize.value
      historyStack.value.splice(0, removeCount)
      currentIndex.value -= removeCount
    }

    console.log(`保存历史状态: ${action}, 当前索引: ${currentIndex.value}`)
  }

  /**
   * 撤销操作
   */
  const undo = (): void => {
    if (!canUndo.value) return

    currentIndex.value--

    if (currentIndex.value >= 0) {
      const historyItem = historyStack.value[currentIndex.value]
      const success = deserializeCanvasState(historyItem.data)

      if (success) {
        console.log(`撤销到: ${historyItem.action}, 索引: ${currentIndex.value}`)
      } else {
        console.error('撤销失败，状态恢复失败')
        currentIndex.value++ // 恢复索引
      }
    } else {
      // 撤销到初始状态（空画布）
      app.value?.pixelContainer?.removeChildren()
      console.log('撤销到初始状态')
    }
  }

  /**
   * 重做操作
   */
  const redo = (): void => {
    if (!canRedo.value) return

    currentIndex.value++
    const historyItem = historyStack.value[currentIndex.value]
    const success = deserializeCanvasState(historyItem.data)

    if (success) {
      console.log(`重做到: ${historyItem.action}, 索引: ${currentIndex.value}`)
    } else {
      console.error('重做失败，状态恢复失败')
      currentIndex.value-- // 恢复索引
    }
  }

  /**
   * 清空历史记录
   */
  const clearHistory = (): void => {
    historyStack.value = []
    currentIndex.value = -1
    console.log('历史记录已清空')
  }

  /**
   * 获取历史记录列表
   */
  const getHistory = (): HistoryItem[] => {
    return [...historyStack.value]
  }

  /**
   * 跳转到指定历史记录
   */
  const jumpToHistory = (index: number): boolean => {
    if (index < -1 || index >= historyStack.value.length) {
      console.warn('无效的历史记录索引:', index)
      return false
    }

    if (index === -1) {
      // 跳转到初始状态
      app.value?.pixelContainer?.removeChildren()
      currentIndex.value = -1
      return true
    }

    const historyItem = historyStack.value[index]
    const success = deserializeCanvasState(historyItem.data)

    if (success) {
      currentIndex.value = index
      console.log(`跳转到历史记录: ${historyItem.action}, 索引: ${index}`)
      return true
    }

    return false
  }

  /**
   * 获取当前历史记录项
   */
  const getCurrentHistoryItem = (): HistoryItem | null => {
    if (currentIndex.value >= 0 && currentIndex.value < historyStack.value.length) {
      return historyStack.value[currentIndex.value]
    }
    return null
  }

  /**
   * 设置历史记录录制状态
   */
  const setRecording = (recording: boolean): void => {
    isRecording.value = recording
  }

  /**
   * 批量操作（暂停录制）
   */
  const batchOperation = async (
    operation: () => Promise<void> | void,
    action: string,
  ): Promise<void> => {
    const wasRecording = isRecording.value
    setRecording(false)

    try {
      await operation()
      if (wasRecording) {
        setRecording(true)
        saveState(action)
      }
    } catch (error) {
      console.error('批量操作失败:', error)
      setRecording(wasRecording)
      throw error
    }
  }

  /**
   * 获取内存使用情况
   */
  const getMemoryUsage = () => {
    const totalSize = historyStack.value.reduce((size, item) => {
      return size + JSON.stringify(item).length
    }, 0)

    return {
      totalItems: historyStack.value.length,
      currentIndex: currentIndex.value,
      estimatedSize: totalSize,
      maxSize: maxHistorySize.value,
    }
  }

  // 监听应用变化
  watch(
    () => app.value,
    (newApp) => {
      if (newApp) {
        // 应用初始化后保存初始状态
        setTimeout(() => {
          saveState('初始化')
        }, 100)
      }
    },
  )

  return {
    canUndo,
    canRedo,
    historySize,
    saveState,
    undo,
    redo,
    clearHistory,
    getHistory,
    jumpToHistory,
    getCurrentHistoryItem,
    setRecording,
    batchOperation,
    getMemoryUsage,
  }
}
