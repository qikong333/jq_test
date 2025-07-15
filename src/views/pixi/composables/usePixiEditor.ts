import { ref, reactive, onUnmounted } from 'vue'
import { Application, Container, Graphics } from 'pixi.js'
import type {
  PixiEditorConfig,
  PixiEditorApp,
  Size,
  ViewportState,
  ExportConfig,
  ImportConfig,
  UsePixiEditorReturn,
} from '../types'

/**
 * PixiJS 编辑器核心 Composable
 * 负责初始化 PixiJS 应用、管理主要容器和基础功能
 */
export function usePixiEditor(config: PixiEditorConfig): UsePixiEditorReturn {
  // 响应式状态
  const app = ref<PixiEditorApp | null>(null)
  const canvasSize = ref<Size>({
    width: config.width,
    height: config.height,
  })
  const isInitialized = ref(false)

  /**
   * 初始化 PixiJS 编辑器
   */
  const initializeEditor = async (container: HTMLElement): Promise<void> => {
    try {
      // 创建 PixiJS 应用
      const pixiApp = new Application({
        width: config.width,
        height: config.height,
        backgroundColor: config.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        powerPreference: 'high-performance',
      }) as PixiEditorApp

      // 等待应用初始化完成
      await pixiApp.init()

      // 将画布添加到容器
      container.appendChild(pixiApp.canvas)

      // 创建主要容器层级
      setupContainers(pixiApp)

      // 初始化网格
      setupGrid(pixiApp, config)

      // 设置视口状态
      pixiApp.viewport = {
        x: 0,
        y: 0,
        scale: 1,
        width: config.width,
        height: config.height,
      }

      // 设置初始工具状态
      pixiApp.currentTool = 'brush'
      pixiApp.currentColor = '#000000'
      pixiApp.brushSize = 1

      // 启动渲染循环
      pixiApp.ticker.start()

      app.value = pixiApp
      isInitialized.value = true

      console.log('PixiJS 编辑器初始化完成')
    } catch (error) {
      console.error('PixiJS 编辑器初始化失败:', error)
      throw error
    }
  }

  /**
   * 设置容器层级结构
   */
  const setupContainers = (pixiApp: PixiEditorApp) => {
    // 主容器 - 所有内容的根容器
    pixiApp.mainContainer = new Container()
    pixiApp.mainContainer.name = 'mainContainer'
    pixiApp.stage.addChild(pixiApp.mainContainer)

    // 网格容器 - 背景网格
    pixiApp.gridContainer = new Container()
    pixiApp.gridContainer.name = 'gridContainer'
    pixiApp.mainContainer.addChild(pixiApp.gridContainer)

    // 像素容器 - 用户绘制的像素
    pixiApp.pixelContainer = new Container()
    pixiApp.pixelContainer.name = 'pixelContainer'
    pixiApp.mainContainer.addChild(pixiApp.pixelContainer)

    // UI 容器 - 界面元素（如选择框、预览等）
    pixiApp.uiContainer = new Container()
    pixiApp.uiContainer.name = 'uiContainer'
    pixiApp.mainContainer.addChild(pixiApp.uiContainer)

    // 设置容器的交互性
    pixiApp.mainContainer.eventMode = 'static'
    pixiApp.pixelContainer.eventMode = 'static'
  }

  /**
   * 设置网格系统
   */
  const setupGrid = (pixiApp: PixiEditorApp, config: PixiEditorConfig) => {
    pixiApp.gridGraphics = new Graphics()
    pixiApp.gridGraphics.name = 'gridGraphics'
    pixiApp.gridContainer.addChild(pixiApp.gridGraphics)

    // 绘制网格
    drawGrid(pixiApp, config)
  }

  /**
   * 绘制网格
   */
  const drawGrid = (pixiApp: PixiEditorApp, config: PixiEditorConfig) => {
    const { gridGraphics } = pixiApp
    const { gridSize, width, height } = config

    gridGraphics.clear()

    if (!config.showGrid) return

    // 设置网格样式
    gridGraphics.stroke({ width: 1, color: 0xcccccc, alpha: 0.5 })

    // 绘制垂直线
    for (let x = 0; x <= width; x += gridSize) {
      gridGraphics.moveTo(x, 0)
      gridGraphics.lineTo(x, height)
    }

    // 绘制水平线
    for (let y = 0; y <= height; y += gridSize) {
      gridGraphics.moveTo(0, y)
      gridGraphics.lineTo(width, y)
    }

    gridGraphics.stroke()
  }

  /**
   * 销毁编辑器
   */
  const destroyEditor = () => {
    if (app.value) {
      app.value.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      })
      app.value = null
      isInitialized.value = false
      console.log('PixiJS 编辑器已销毁')
    }
  }

  /**
   * 导出画布
   */
  const exportCanvas = (exportConfig?: ExportConfig): string => {
    if (!app.value) {
      throw new Error('编辑器未初始化')
    }

    const config = {
      format: 'png',
      quality: 1,
      scale: 1,
      transparent: true,
      ...exportConfig,
    } as ExportConfig

    try {
      // 使用 PixiJS 的 extract 插件导出
      const dataUrl = app.value.renderer.extract.base64(
        app.value.stage,
        config.format,
        config.quality,
      )
      return dataUrl
    } catch (error) {
      console.error('导出画布失败:', error)
      throw error
    }
  }

  /**
   * 导入画布
   */
  const importCanvas = async (file: File, importConfig?: ImportConfig): Promise<void> => {
    if (!app.value) {
      throw new Error('编辑器未初始化')
    }

    const config = {
      preserveAspectRatio: true,
      resizeToFit: true,
      position: { x: 0, y: 0 },
      scale: 1,
      ...importConfig,
    }

    try {
      // 创建图片元素
      const img = new Image()
      const url = URL.createObjectURL(file)

      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // 创建 canvas 来处理图片
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!

            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)

            // 获取像素数据
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            // TODO: 将像素数据转换为编辑器格式并添加到像素容器
            // 这里需要与像素存储系统集成

            URL.revokeObjectURL(url)
            resolve()
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('图片加载失败'))
        }

        img.src = url
      })
    } catch (error) {
      console.error('导入画布失败:', error)
      throw error
    }
  }

  /**
   * 清空画布
   */
  const clearCanvas = () => {
    if (!app.value) return

    // 清空像素容器
    app.value.pixelContainer.removeChildren()

    // 清空 UI 容器
    app.value.uiContainer.removeChildren()

    console.log('画布已清空')
  }

  /**
   * 更新画布大小
   */
  const resizeCanvas = (width: number, height: number) => {
    if (!app.value) return

    app.value.renderer.resize(width, height)
    canvasSize.value = { width, height }

    // 更新视口
    app.value.viewport.width = width
    app.value.viewport.height = height

    // 重新绘制网格
    drawGrid(app.value, { ...config, width, height })
  }

  /**
   * 切换网格显示
   */
  const toggleGrid = (visible: boolean) => {
    if (!app.value) return

    app.value.gridContainer.visible = visible
  }

  // 清理资源
  onUnmounted(() => {
    destroyEditor()
  })

  return {
    app,
    canvasSize,
    isInitialized,
    initializeEditor,
    destroyEditor,
    exportCanvas,
    importCanvas,
    clearCanvas,
  }
}
