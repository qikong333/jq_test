import { ref, computed, onMounted, onUnmounted, readonly } from 'vue'
import {
  detectSystemCapabilities,
  getWindowsCanvasConfig,
  applyWindowsStyles,
  getWindowsEventConfig,
  type SystemCapabilities,
} from '../utils/systemDetection'
import type { PerformanceConfig } from '../types/performance'

/**
 * Windows系统优化Composable
 */
export function useWindowsOptimization() {
  const systemCapabilities = ref<SystemCapabilities | null>(null)
  const isWindowsSystem = computed(() => systemCapabilities.value?.isWindows ?? false)
  const windowsConfig = computed(() => {
    if (!systemCapabilities.value) return null
    return getWindowsCanvasConfig(systemCapabilities.value)
  })

  const eventConfig = computed(() => {
    if (!systemCapabilities.value) return null
    return getWindowsEventConfig(systemCapabilities.value)
  })

  /**
   * 初始化系统检测
   */
  const initializeSystemDetection = () => {
    systemCapabilities.value = detectSystemCapabilities()

    if (systemCapabilities.value.isWindows) {
      console.log('检测到Windows系统，启用Windows特定优化:', {
        performanceProfile: systemCapabilities.value.windowsOptimizations?.performanceProfile,
        memoryMB: Math.round(systemCapabilities.value.memoryMB),
        cores: systemCapabilities.value.cores,
        devicePixelRatio: systemCapabilities.value.devicePixelRatio,
        supportsTouch: systemCapabilities.value.supportsTouch,
        supportsGPUAcceleration: systemCapabilities.value.supportsGPUAcceleration,
      })
    }
  }

  /**
   * 应用Windows Canvas优化
   */
  const applyCanvasOptimizations = (canvas: HTMLCanvasElement) => {
    if (!systemCapabilities.value?.isWindows) return

    applyWindowsStyles(canvas, systemCapabilities.value)

    // 应用Windows特定的Canvas上下文优化
    const config = windowsConfig.value
    if (config) {
      const ctx = canvas.getContext('2d', {
        willReadFrequently: config.willReadFrequently,
        alpha: config.alpha,
      })

      if (ctx && config.renderingOptimizations) {
        ctx.imageSmoothingEnabled = config.renderingOptimizations.enableImageSmoothing
      }
    }
  }

  /**
   * 获取Windows优化的性能配置
   */
  const getOptimizedPerformanceConfig = (): Partial<PerformanceConfig> => {
    if (!systemCapabilities.value?.isWindows || !systemCapabilities.value.windowsOptimizations) {
      return {}
    }

    const opts = systemCapabilities.value.windowsOptimizations

    return {
      eventThrottling: opts.eventThrottling,
      batchSize: opts.batchSize,
      enableGrid: true,
      enablePreview: opts.performanceProfile !== 'power-saving',
      enableAnimation: opts.performanceProfile === 'high-performance',
      maxMemoryMB:
        opts.performanceProfile === 'high-performance'
          ? 200
          : opts.performanceProfile === 'balanced'
            ? 150
            : 100,
    }
  }

  /**
   * 创建Windows优化的事件监听器
   */
  const createOptimizedEventListener = (
    element: HTMLElement,
    eventType: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions,
  ) => {
    if (!systemCapabilities.value?.isWindows || !eventConfig.value) {
      element.addEventListener(eventType, handler, options)
      return () => element.removeEventListener(eventType, handler, options)
    }

    const config = eventConfig.value
    let optimizedOptions = { ...options }

    // 根据事件类型应用Windows特定配置
    switch (eventType) {
      case 'mousemove':
      case 'mousedown':
      case 'mouseup':
        optimizedOptions = {
          ...optimizedOptions,
          passive: config.mouseEvents.passive,
        }
        break

      case 'touchstart':
      case 'touchmove':
      case 'touchend':
        if (config.touchEvents) {
          optimizedOptions = {
            ...optimizedOptions,
            passive: config.touchEvents.passive,
            capture: config.touchEvents.capture,
          }
        }
        break

      case 'wheel':
        optimizedOptions = {
          ...optimizedOptions,
          passive: config.wheelEvents.passive,
        }
        break

      case 'keydown':
      case 'keyup':
        optimizedOptions = {
          ...optimizedOptions,
          passive: config.keyboardEvents.passive,
        }
        break
    }

    // 应用节流
    let throttledHandler = handler
    const throttleTime = getEventThrottleTime(eventType, config)

    if (throttleTime > 0) {
      let lastTime = 0
      throttledHandler = (event: Event) => {
        const now = performance.now()
        if (now - lastTime >= throttleTime) {
          lastTime = now
          handler(event)
        }
      }
    }

    element.addEventListener(eventType, throttledHandler, optimizedOptions)
    return () => element.removeEventListener(eventType, throttledHandler, optimizedOptions)
  }

  /**
   * 获取事件节流时间
   */
  const getEventThrottleTime = (
    eventType: string,
    config: NonNullable<typeof eventConfig.value>,
  ): number => {
    switch (eventType) {
      case 'mousemove':
        return config.mouseEvents.throttle
      case 'wheel':
        return config.wheelEvents.throttle
      case 'keydown':
      case 'keyup':
        return config.keyboardEvents.throttle
      default:
        return 0
    }
  }

  /**
   * 检查是否支持高DPI优化
   */
  const supportsHighDPI = computed(() => {
    return systemCapabilities.value?.windowsOptimizations?.highDPIOptimization ?? false
  })

  /**
   * 检查是否支持触摸优化
   */
  const supportsTouchOptimization = computed(() => {
    return systemCapabilities.value?.windowsOptimizations?.touchOptimization ?? false
  })

  /**
   * 检查是否支持GPU加速
   */
  const supportsGPUAcceleration = computed(() => {
    return systemCapabilities.value?.windowsOptimizations?.enableGPUAcceleration ?? false
  })

  /**
   * 获取性能配置文件
   */
  const performanceProfile = computed(() => {
    return systemCapabilities.value?.windowsOptimizations?.performanceProfile ?? 'balanced'
  })

  /**
   * 动态调整性能设置
   */
  const adjustPerformanceSettings = (currentFPS: number, memoryUsage: number) => {
    if (!systemCapabilities.value?.isWindows || !systemCapabilities.value.windowsOptimizations) {
      return
    }

    const opts = systemCapabilities.value.windowsOptimizations

    // 根据当前性能动态调整
    if (currentFPS < 30 && opts.performanceProfile !== 'power-saving') {
      // 降级到节能模式
      opts.eventThrottling = 24
      opts.batchSize = 50
      opts.enableGPUAcceleration = false
      console.log('性能不足，切换到节能模式')
    } else if (
      currentFPS > 55 &&
      memoryUsage < 50 &&
      opts.performanceProfile !== 'high-performance'
    ) {
      // 升级到高性能模式
      opts.eventThrottling = 8
      opts.batchSize = 200
      opts.enableGPUAcceleration = true
      console.log('性能充足，切换到高性能模式')
    }
  }

  // 生命周期
  onMounted(() => {
    initializeSystemDetection()
  })

  return {
    // 状态
    systemCapabilities: readonly(systemCapabilities),
    isWindowsSystem,
    windowsConfig,
    eventConfig,

    // 功能检测
    supportsHighDPI,
    supportsTouchOptimization,
    supportsGPUAcceleration,
    performanceProfile,

    // 方法
    initializeSystemDetection,
    applyCanvasOptimizations,
    getOptimizedPerformanceConfig,
    createOptimizedEventListener,
    adjustPerformanceSettings,
  }
}

/**
 * Windows触摸手势支持
 */
export function useWindowsTouchGestures(canvas: HTMLCanvasElement) {
  const { supportsTouchOptimization } = useWindowsOptimization()

  const touchState = ref({
    isActive: false,
    startPoints: [] as { x: number; y: number }[],
    currentPoints: [] as { x: number; y: number }[],
    gesture: null as 'pan' | 'zoom' | 'rotate' | null,
  })

  const handleTouchStart = (event: TouchEvent) => {
    if (!supportsTouchOptimization.value) return

    event.preventDefault()
    touchState.value.isActive = true
    touchState.value.startPoints = Array.from(event.touches).map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
    }))
    touchState.value.currentPoints = [...touchState.value.startPoints]
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (!supportsTouchOptimization.value || !touchState.value.isActive) return

    event.preventDefault()
    touchState.value.currentPoints = Array.from(event.touches).map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
    }))

    // 检测手势类型
    if (event.touches.length === 1) {
      touchState.value.gesture = 'pan'
    } else if (event.touches.length === 2) {
      touchState.value.gesture = 'zoom'
    }
  }

  const handleTouchEnd = (event: TouchEvent) => {
    if (!supportsTouchOptimization.value) return

    event.preventDefault()
    touchState.value.isActive = false
    touchState.value.gesture = null
    touchState.value.startPoints = []
    touchState.value.currentPoints = []
  }

  onMounted(() => {
    if (supportsTouchOptimization.value) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    }
  })

  onUnmounted(() => {
    if (supportsTouchOptimization.value) {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  })

  return {
    touchState: readonly(touchState),
    isGestureActive: computed(() => touchState.value.isActive),
    currentGesture: computed(() => touchState.value.gesture),
  }
}
