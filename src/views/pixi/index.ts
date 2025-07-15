/**
 * PixiJS 编辑器主入口文件
 * 导出所有模块和功能
 */

// 核心类型
export * from './types'

// 核心管理器
export * from './core'

// 工具系统
export * from './tools'

// Vue 组合式函数
export * from './composables'

// 主要组件
export { default as PixiEditor } from './index.vue'

// 版本信息
export const version = '1.0.0'

// 默认配置
export const defaultConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0xffffff,
  gridSize: 20,
  gridColor: 0xcccccc,
  showGrid: true,
  pixelPerfect: true,
  antialias: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance' as WebGLPowerPreference,
}

// 工具函数
export const PixiEditorUtils = {
  /**
   * 检查 WebGL 支持
   */
  checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  },

  /**
   * 获取最佳渲染器类型
   */
  getBestRendererType(): 'webgl' | 'canvas' {
    return this.checkWebGLSupport() ? 'webgl' : 'canvas'
  },

  /**
   * 颜色转换工具
   */
  colorUtils: {
    hexToNumber(hex: string): number {
      return parseInt(hex.replace('#', ''), 16)
    },

    numberToHex(num: number): string {
      return `#${num.toString(16).padStart(6, '0')}`
    },

    rgbToNumber(r: number, g: number, b: number): number {
      return (r << 16) | (g << 8) | b
    },

    numberToRgb(num: number): { r: number; g: number; b: number } {
      return {
        r: (num >> 16) & 0xff,
        g: (num >> 8) & 0xff,
        b: num & 0xff,
      }
    },
  },

  /**
   * 坐标转换工具
   */
  coordUtils: {
    screenToWorld(screenX: number, screenY: number, viewport: any): { x: number; y: number } {
      return {
        x: (screenX - viewport.x) / viewport.scale,
        y: (screenY - viewport.y) / viewport.scale,
      }
    },

    worldToScreen(worldX: number, worldY: number, viewport: any): { x: number; y: number } {
      return {
        x: worldX * viewport.scale + viewport.x,
        y: worldY * viewport.scale + viewport.y,
      }
    },

    snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
      return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize,
      }
    },
  },

  /**
   * 性能优化工具
   */
  performanceUtils: {
    throttle<T extends (...args: unknown[]) => unknown>(func: T, delay: number): T {
      let timeoutId: number | null = null
      let lastExecTime = 0

      return ((...args: unknown[]) => {
        const currentTime = Date.now()

        if (currentTime - lastExecTime > delay) {
          func(...args)
          lastExecTime = currentTime
        } else {
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = window.setTimeout(
            () => {
              func(...args)
              lastExecTime = Date.now()
            },
            delay - (currentTime - lastExecTime),
          )
        }
      }) as T
    },

    debounce<T extends (...args: unknown[]) => unknown>(func: T, delay: number): T {
      let timeoutId: number | null = null

      return ((...args: unknown[]) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = window.setTimeout(() => func(...args), delay)
      }) as T
    },

    createObjectPool<T>(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10) {
      const pool: T[] = []

      // 预填充池
      for (let i = 0; i < initialSize; i++) {
        pool.push(createFn())
      }

      return {
        get(): T {
          return pool.pop() || createFn()
        },

        release(obj: T): void {
          resetFn(obj)
          pool.push(obj)
        },

        size(): number {
          return pool.length
        },
      }
    },
  },

  /**
   * 文件处理工具
   */
  fileUtils: {
    async loadImage(file: File): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
    },

    downloadCanvas(canvas: HTMLCanvasElement, filename: string = 'pixi-editor-export.png'): void {
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL()
      link.click()
    },

    async canvasToBlob(
      canvas: HTMLCanvasElement,
      type: string = 'image/png',
      quality?: number,
    ): Promise<Blob> {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob from canvas'))
            }
          },
          type,
          quality,
        )
      })
    },
  },
}

// 预设配置
export const presets = {
  // 像素艺术配置
  pixelArt: {
    ...defaultConfig,
    antialias: false,
    pixelPerfect: true,
    gridSize: 1,
    showGrid: false,
  },

  // 高性能配置
  performance: {
    ...defaultConfig,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance' as WebGLPowerPreference,
  },

  // 高质量配置
  quality: {
    ...defaultConfig,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'default' as WebGLPowerPreference,
  },

  // 移动设备配置
  mobile: {
    ...defaultConfig,
    width: 400,
    height: 300,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power' as WebGLPowerPreference,
  },
}

// 插件系统接口
export interface PixiEditorPlugin {
  name: string
  version: string
  install(editor: any): void
  uninstall?(editor: any): void
}

// 插件管理器
export class PluginManager {
  private plugins = new Map<string, PixiEditorPlugin>()
  private editor: any

  constructor(editor: any) {
    this.editor = editor
  }

  install(plugin: PixiEditorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already installed`)
      return
    }

    plugin.install(this.editor)
    this.plugins.set(plugin.name, plugin)
    console.log(`Plugin ${plugin.name} v${plugin.version} installed`)
  }

  uninstall(pluginName: string): void {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      console.warn(`Plugin ${pluginName} is not installed`)
      return
    }

    if (plugin.uninstall) {
      plugin.uninstall(this.editor)
    }

    this.plugins.delete(pluginName)
    console.log(`Plugin ${pluginName} uninstalled`)
  }

  getPlugin(name: string): PixiEditorPlugin | undefined {
    return this.plugins.get(name)
  }

  getInstalledPlugins(): PixiEditorPlugin[] {
    return Array.from(this.plugins.values())
  }
}

// 导出常用常量
export const CONSTANTS = {
  // 工具名称
  TOOLS: {
    BRUSH: 'brush',
    ERASER: 'eraser',
    FILL: 'fill',
    EYEDROPPER: 'eyedropper',
    MOVE: 'move',
    SELECT: 'select',
  },

  // 层级名称
  LAYERS: {
    BACKGROUND: 'background',
    GRID: 'grid',
    CONTENT: 'content',
    PIXELS: 'pixels',
    SELECTION: 'selection',
    UI: 'ui',
    OVERLAY: 'overlay',
  },

  // 事件名称
  EVENTS: {
    TOOL_CHANGED: 'tool:changed',
    PIXEL_ADDED: 'pixel:added',
    PIXEL_REMOVED: 'pixel:removed',
    HISTORY_CHANGED: 'history:changed',
    VIEWPORT_CHANGED: 'viewport:changed',
  },

  // 默认值
  DEFAULTS: {
    BRUSH_SIZE: 1,
    BRUSH_COLOR: '#000000',
    GRID_SIZE: 20,
    ZOOM_MIN: 0.1,
    ZOOM_MAX: 50,
    HISTORY_SIZE: 50,
  },
}
