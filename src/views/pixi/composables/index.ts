/**
 * PixiJS 编辑器 Composables 模块
 * 导出所有 Vue 组合式函数
 */

import { ref, computed, onMounted, onUnmounted, watch, readonly, type Ref } from 'vue'
import type { PixiEditorConfig, Point, Size, ViewportState, PerformanceStats } from '../types'
import { createCoreManagers, RenderLayer, PixelStorage, HistoryManager } from '../core'
import type { Application } from 'pixi.js'

// 导出所有组合式函数
// export { usePixiEditor } from './usePixiEditor'
// export { usePixiViewport } from './usePixiViewport'
// export { usePixiTools } from './usePixiTools'
// export { usePixiHistory } from './usePixiHistory'

// 导出相关类型
export type { PixiEditorConfig, Point, Size, ViewportState, PerformanceStats }

// 组合所有核心功能的完整编辑器
export function usePixiEditorComplete(config?: PixiEditorConfig) {
  const app = ref<Application | null>(null)
  const managers = ref<{
    renderLayer: RenderLayer
    pixelStorage: PixelStorage
    historyManager: HistoryManager
  } | null>(null)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  // 初始化编辑器
  const initialize = async (canvas: HTMLCanvasElement) => {
    try {
      error.value = null

      // 创建 PixiJS 应用
      const pixiApp = new (window as any).PIXI.Application({
        view: canvas,
        width: config?.width || 800,
        height: config?.height || 600,
        backgroundColor: config?.backgroundColor || 0xffffff,
        antialias: config?.antialias !== false,
        resolution: config?.resolution || window.devicePixelRatio || 1,
      })

      app.value = pixiApp

      // 创建核心管理器
      managers.value = createCoreManagers(pixiApp, {
        historyManager: {
          maxSize: config?.history?.maxSize || 100,
        },
        pixelStorage: {
          width: config?.width || 800,
          height: config?.height || 600,
        },
      })

      isInitialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to initialize PixiJS editor:', err)
    }
  }

  // 销毁编辑器
  const destroy = () => {
    if (app.value) {
      app.value.destroy(true)
    }

    managers.value = null
    app.value = null
    isInitialized.value = false
    error.value = null
  }

  // 清空画布
  const clear = () => {
    if (managers.value) {
      managers.value.pixelStorage.clear()
      managers.value.historyManager.saveState('clear', { type: 'clear_canvas' })
    }
  }

  // 获取编辑器状态
  const state = computed(() => {
    if (!managers.value || !isInitialized.value) {
      return null
    }

    return {
      app: app.value,
      managers: managers.value,
      isInitialized: isInitialized.value,
    }
  })

  return {
    // 状态
    app: readonly(app),
    managers: readonly(managers),
    isInitialized: readonly(isInitialized),
    error: readonly(error),
    state: readonly(state),

    // 方法
    initialize,
    destroy,
    clear,
  }
}

// 轻量级编辑器（仅核心功能）
export function usePixiEditorLite(config?: Partial<PixiEditorConfig>) {
  const app = ref<Application | null>(null)
  const managers = ref<{
    renderLayer: RenderLayer
    pixelStorage: PixelStorage
    historyManager: HistoryManager
  } | null>(null)
  const isInitialized = ref(false)

  const initialize = async (canvas: HTMLCanvasElement) => {
    const pixiApp = new (window as any).PIXI.Application({
      view: canvas,
      width: config?.width || 400,
      height: config?.height || 300,
      backgroundColor: config?.backgroundColor || 0xffffff,
    })

    app.value = pixiApp
    managers.value = createCoreManagers(pixiApp)
    isInitialized.value = true
  }

  const destroy = () => {
    if (app.value) {
      app.value.destroy(true)
    }
    app.value = null
    managers.value = null
    isInitialized.value = false
  }

  return {
    app: readonly(app),
    managers: readonly(managers),
    isInitialized: readonly(isInitialized),
    initialize,
    destroy,
  }
}

// 只读查看器
export function usePixiViewer(config?: Partial<PixiEditorConfig>) {
  const app = ref<Application | null>(null)
  const renderLayer = ref<any>(null)
  const isInitialized = ref(false)

  const initialize = async (canvas: HTMLCanvasElement) => {
    const pixiApp = new (window as any).PIXI.Application({
      view: canvas,
      width: config?.width || 400,
      height: config?.height || 300,
      backgroundColor: config?.backgroundColor || 0xffffff,
    })

    app.value = pixiApp
    renderLayer.value = new (window as any).PIXI.Container()
    pixiApp.stage.addChild(renderLayer.value)
    isInitialized.value = true
  }

  const loadImage = async (url: string) => {
    if (!app.value || !renderLayer.value) return

    const texture = await (window as any).PIXI.Texture.fromURL(url)
    const sprite = new (window as any).PIXI.Sprite(texture)

    // 适应画布大小
    const scale = Math.min(
      app.value.screen.width / texture.width,
      app.value.screen.height / texture.height,
    )

    sprite.scale.set(scale)
    sprite.x = (app.value.screen.width - sprite.width) / 2
    sprite.y = (app.value.screen.height - sprite.height) / 2

    renderLayer.value.removeChildren()
    renderLayer.value.addChild(sprite)
  }

  const destroy = () => {
    if (app.value) {
      app.value.destroy(true)
    }
    app.value = null
    renderLayer.value = null
    isInitialized.value = false
  }

  return {
    app: readonly(app),
    isInitialized: readonly(isInitialized),
    initialize,
    loadImage,
    destroy,
  }
}

// 性能监控
export function usePixiPerformance() {
  const stats = ref<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    drawCalls: 0,
    triangles: 0,
  })

  const isMonitoring = ref(false)
  let animationId: number | null = null
  let lastTime = 0
  let frameCount = 0

  const startMonitoring = () => {
    if (isMonitoring.value) return

    isMonitoring.value = true
    lastTime = performance.now()
    frameCount = 0

    const updateStats = (currentTime: number) => {
      frameCount++
      const deltaTime = currentTime - lastTime

      if (deltaTime >= 1000) {
        // 每秒更新一次
        stats.value.fps = Math.round((frameCount * 1000) / deltaTime)
        stats.value.frameTime = deltaTime / frameCount

        // 获取内存使用情况（如果可用）
        if ('memory' in performance) {
          const memory = (performance as any).memory
          stats.value.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
        }

        lastTime = currentTime
        frameCount = 0
      }

      if (isMonitoring.value) {
        animationId = requestAnimationFrame(updateStats)
      }
    }

    animationId = requestAnimationFrame(updateStats)
  }

  const stopMonitoring = () => {
    isMonitoring.value = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  const initialize = () => {
    startMonitoring()
  }

  const destroy = () => {
    stopMonitoring()
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    stats: readonly(stats),
    isMonitoring: readonly(isMonitoring),
    startMonitoring,
    stopMonitoring,
    initialize,
    destroy,
  }
}

// 键盘快捷键管理
export function usePixiShortcuts() {
  const shortcuts = ref<Map<string, () => void>>(new Map())
  const isEnabled = ref(true)

  const registerShortcut = (key: string, callback: () => void) => {
    shortcuts.value.set(key.toLowerCase(), callback)
  }

  const unregisterShortcut = (key: string) => {
    shortcuts.value.delete(key.toLowerCase())
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value) return

    const key = event.key.toLowerCase()
    const modifiers = []

    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl')
    if (event.shiftKey) modifiers.push('shift')
    if (event.altKey) modifiers.push('alt')

    const shortcutKey = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key

    const callback = shortcuts.value.get(shortcutKey)
    if (callback) {
      event.preventDefault()
      callback()
    }
  }

  const enable = () => {
    isEnabled.value = true
  }

  const disable = () => {
    isEnabled.value = false
  }

  const initialize = () => {
    document.addEventListener('keydown', handleKeyDown)

    // 注册默认快捷键
    registerShortcut('ctrl+z', () => console.log('Undo'))
    registerShortcut('ctrl+y', () => console.log('Redo'))
    registerShortcut('ctrl+s', () => console.log('Save'))
    registerShortcut('escape', () => console.log('Cancel'))
  }

  const destroy = () => {
    document.removeEventListener('keydown', handleKeyDown)
    shortcuts.value.clear()
  }

  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    shortcuts: readonly(shortcuts),
    isEnabled: readonly(isEnabled),
    registerShortcut,
    unregisterShortcut,
    enable,
    disable,
    initialize,
    destroy,
  }
}
