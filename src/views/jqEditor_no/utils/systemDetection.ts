// 系统检测工具

/**
 * 系统能力检测结果
 */
export interface SystemCapabilities {
  isWindows: boolean
  memoryMB: number
  cores: number
  devicePixelRatio: number
  supportsTouch: boolean
  supportsGPUAcceleration: boolean
  windowsOptimizations?: WindowsOptimizations
}

/**
 * Windows特定优化配置
 */
export interface WindowsOptimizations {
  eventThrottling: number
  batchSize: number
  enableGPUAcceleration: boolean
  highDPIOptimization: boolean
  touchOptimization: boolean
  performanceProfile: 'high-performance' | 'balanced' | 'power-saving'
}

/**
 * 检测操作系统和硬件能力
 */
export function detectSystemCapabilities(): SystemCapabilities {
  const isWindows = navigator.platform.includes('Win') || navigator.userAgent.includes('Windows')

  // 内存检测
  const memory =
    (performance as Performance & { memory?: { jsHeapSizeLimit: number } }).memory
      ?.jsHeapSizeLimit || 0
  const memoryMB = memory / (1024 * 1024)

  // CPU核心数
  const cores = navigator.hardwareConcurrency || 4

  // 设备像素比
  const devicePixelRatio = window.devicePixelRatio || 1

  // 触摸支持检测
  const msMaxTouchPoints = (navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints
  const supportsTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (msMaxTouchPoints !== undefined && msMaxTouchPoints > 0)

  // GPU加速检测
  const supportsGPUAcceleration = detectGPUAcceleration()

  const capabilities: SystemCapabilities = {
    isWindows,
    memoryMB,
    cores,
    devicePixelRatio,
    supportsTouch,
    supportsGPUAcceleration,
  }

  // Windows特定优化
  if (isWindows) {
    capabilities.windowsOptimizations = getWindowsOptimizations(capabilities)
  }

  return capabilities
}

/**
 * 检测GPU加速支持
 */
function detectGPUAcceleration(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null

    if (!gl) return false

    // 检查WebGL扩展
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string
      // 检查是否为软件渲染
      return !renderer.toLowerCase().includes('software')
    }

    return true
  } catch {
    return false
  }
}

/**
 * 获取Windows性能配置文件
 */
function getWindowsPerformanceProfile(
  memoryMB: number,
  cores: number,
): WindowsOptimizations['performanceProfile'] {
  const memoryGB = memoryMB / 1024

  if (memoryGB > 8 && cores > 4) {
    return 'high-performance'
  } else if (memoryGB > 4 && cores > 2) {
    return 'balanced'
  } else {
    return 'power-saving'
  }
}

/**
 * 获取Windows特定优化配置
 */
function getWindowsOptimizations(capabilities: SystemCapabilities): WindowsOptimizations {
  const profile = getWindowsPerformanceProfile(capabilities.memoryMB, capabilities.cores)

  const baseConfig: WindowsOptimizations = {
    eventThrottling: 16,
    batchSize: 100,
    enableGPUAcceleration: capabilities.supportsGPUAcceleration,
    highDPIOptimization: capabilities.devicePixelRatio > 1,
    touchOptimization: capabilities.supportsTouch,
    performanceProfile: profile,
  }

  // 根据性能配置文件调整参数
  switch (profile) {
    case 'high-performance':
      return {
        ...baseConfig,
        eventThrottling: 8, // 更高的响应性
        batchSize: 200, // 更大的批处理
      }

    case 'balanced':
      return {
        ...baseConfig,
        eventThrottling: 12,
        batchSize: 150,
      }

    case 'power-saving':
      return {
        ...baseConfig,
        eventThrottling: 24, // 更保守的节流
        batchSize: 50, // 更小的批处理
      }

    default:
      return baseConfig
  }
}

/**
 * 获取Windows特定的Canvas优化配置
 */
export function getWindowsCanvasConfig(capabilities: SystemCapabilities) {
  if (!capabilities.isWindows || !capabilities.windowsOptimizations) {
    return null
  }

  const opts = capabilities.windowsOptimizations

  return {
    // 高DPI优化
    pixelRatio: opts.highDPIOptimization ? capabilities.devicePixelRatio : 1,

    // GPU加速
    willReadFrequently: !opts.enableGPUAcceleration,
    alpha: opts.enableGPUAcceleration,

    // 触摸优化
    touchAction: opts.touchOptimization ? 'none' : 'auto',

    // 性能配置
    eventThrottling: opts.eventThrottling,
    batchSize: opts.batchSize,

    // 渲染优化
    renderingOptimizations: {
      useOffscreenCanvas: opts.enableGPUAcceleration && 'OffscreenCanvas' in window,
      enableImageSmoothing: opts.performanceProfile !== 'power-saving',
      maxTextureSize: opts.performanceProfile === 'high-performance' ? 4096 : 2048,
    },
  }
}

/**
 * 应用Windows特定的样式优化
 */
export function applyWindowsStyles(canvas: HTMLCanvasElement, capabilities: SystemCapabilities) {
  if (!capabilities.isWindows || !capabilities.windowsOptimizations) {
    return
  }

  const opts = capabilities.windowsOptimizations

  // 高DPI优化
  if (opts.highDPIOptimization && capabilities.devicePixelRatio > 1) {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * capabilities.devicePixelRatio
    canvas.height = rect.height * capabilities.devicePixelRatio
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(capabilities.devicePixelRatio, capabilities.devicePixelRatio)
    }
  }

  // 触摸优化
  if (opts.touchOptimization) {
    canvas.style.touchAction = 'none'
    canvas.style.userSelect = 'none'
    canvas.style.webkitUserSelect = 'none'
  }

  // GPU加速提示
  if (opts.enableGPUAcceleration) {
    canvas.style.willChange = 'transform'
    canvas.style.transform = 'translateZ(0)' // 强制硬件加速
  }
}

/**
 * 获取Windows特定的事件处理配置
 */
export function getWindowsEventConfig(capabilities: SystemCapabilities) {
  if (!capabilities.isWindows || !capabilities.windowsOptimizations) {
    return null
  }

  const opts = capabilities.windowsOptimizations

  return {
    // 鼠标事件优化
    mouseEvents: {
      throttle: opts.eventThrottling,
      passive: opts.performanceProfile === 'power-saving',
    },

    // 触摸事件优化
    touchEvents: opts.touchOptimization
      ? {
          preventDefault: true,
          passive: false,
          capture: true,
        }
      : null,

    // 滚轮事件优化
    wheelEvents: {
      throttle: opts.eventThrottling / 2, // 滚轮事件更频繁
      passive: false,
    },

    // 键盘事件优化
    keyboardEvents: {
      throttle: opts.eventThrottling * 2, // 键盘事件较少
      passive: true,
    },
  }
}

/**
 * 检测Windows版本（如果可能）
 */
export function detectWindowsVersion(): string | null {
  if (!navigator.userAgent.includes('Windows')) {
    return null
  }

  const userAgent = navigator.userAgent

  if (userAgent.includes('Windows NT 10.0')) {
    return 'Windows 10/11'
  } else if (userAgent.includes('Windows NT 6.3')) {
    return 'Windows 8.1'
  } else if (userAgent.includes('Windows NT 6.2')) {
    return 'Windows 8'
  } else if (userAgent.includes('Windows NT 6.1')) {
    return 'Windows 7'
  }

  return 'Windows (Unknown Version)'
}
