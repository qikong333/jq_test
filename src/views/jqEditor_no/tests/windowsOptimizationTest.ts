/**
 * Windows优化功能测试
 * 测试Windows系统检测和优化配置
 */

import {
  detectSystemCapabilities,
  getWindowsCanvasConfig,
  getWindowsEventConfig,
} from '../utils/systemDetection'
import { useWindowsOptimization } from '../composables/useWindowsOptimization'

/**
 * 测试系统能力检测
 */
export function testSystemCapabilities() {
  console.log('=== Windows系统能力检测测试 ===')

  const capabilities = detectSystemCapabilities()

  console.log('系统检测结果:', {
    isWindows: capabilities.isWindows,
    memoryMB: Math.round(capabilities.memoryMB),
    cores: capabilities.cores,
    devicePixelRatio: capabilities.devicePixelRatio,
    supportsTouch: capabilities.supportsTouch,
    supportsGPUAcceleration: capabilities.supportsGPUAcceleration,
    windowsOptimizations: capabilities.windowsOptimizations,
  })

  return capabilities
}

/**
 * 测试Windows Canvas配置
 */
export function testWindowsCanvasConfig() {
  console.log('=== Windows Canvas配置测试 ===')

  const capabilities = detectSystemCapabilities()
  const canvasConfig = getWindowsCanvasConfig(capabilities)

  console.log('Canvas配置:', canvasConfig)

  return canvasConfig
}

/**
 * 测试Windows事件配置
 */
export function testWindowsEventConfig() {
  console.log('=== Windows事件配置测试 ===')

  const capabilities = detectSystemCapabilities()
  const eventConfig = getWindowsEventConfig(capabilities)

  console.log('事件配置:', eventConfig)

  return eventConfig
}

/**
 * 测试Windows优化Composable
 */
export function testWindowsOptimizationComposable() {
  console.log('=== Windows优化Composable测试 ===')

  const windowsOptimization = useWindowsOptimization()

  // 初始化系统检测
  windowsOptimization.initializeSystemDetection()

  console.log('Composable状态:', {
    isWindowsSystem: windowsOptimization.isWindowsSystem.value,
    systemCapabilities: windowsOptimization.systemCapabilities.value,
    windowsConfig: windowsOptimization.windowsConfig.value,
    eventConfig: windowsOptimization.eventConfig.value,
    supportsTouchOptimization: windowsOptimization.supportsTouchOptimization.value,
  })

  // 测试性能配置获取
  const perfConfig = windowsOptimization.getOptimizedPerformanceConfig()
  console.log('优化性能配置:', perfConfig)

  return windowsOptimization
}

/**
 * 测试Canvas样式应用
 */
export function testCanvasStyleApplication() {
  console.log('=== Canvas样式应用测试 ===')

  // 创建测试Canvas元素
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 800
  document.body.appendChild(canvas)

  const windowsOptimization = useWindowsOptimization()
  windowsOptimization.initializeSystemDetection()

  if (windowsOptimization.isWindowsSystem.value) {
    console.log('应用Windows Canvas优化...')
    windowsOptimization.applyCanvasOptimizations(canvas)

    console.log('Canvas样式已应用:', {
      imageRendering: canvas.style.imageRendering,
      willChange: canvas.style.willChange,
      transform: canvas.style.transform,
    })
  } else {
    console.log('非Windows系统，跳过Canvas优化')
  }

  // 清理测试元素
  document.body.removeChild(canvas)
}

/**
 * 运行所有Windows优化测试
 */
export function runAllWindowsOptimizationTests() {
  console.log('🚀 开始Windows优化功能测试')
  console.log('当前用户代理:', navigator.userAgent)
  console.log('当前平台:', navigator.platform)

  try {
    // 系统能力检测测试
    const capabilities = testSystemCapabilities()

    // Canvas配置测试
    const canvasConfig = testWindowsCanvasConfig()

    // 事件配置测试
    const eventConfig = testWindowsEventConfig()

    // Composable测试
    const windowsOptimization = testWindowsOptimizationComposable()

    // Canvas样式应用测试
    testCanvasStyleApplication()

    console.log('✅ 所有Windows优化测试完成')

    return {
      success: true,
      capabilities,
      canvasConfig,
      eventConfig,
      windowsOptimization,
    }
  } catch (error) {
    console.error('❌ Windows优化测试失败:', error)
    return {
      success: false,
      error,
    }
  }
}

/**
 * 性能基准测试
 */
export function runPerformanceBenchmark() {
  console.log('=== Windows优化性能基准测试 ===')

  const windowsOptimization = useWindowsOptimization()
  windowsOptimization.initializeSystemDetection()

  // 创建测试Canvas
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!

  // 测试渲染性能
  const iterations = 1000
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    ctx.fillStyle = `hsl(${i % 360}, 50%, 50%)`
    ctx.fillRect(i % canvas.width, (i * 2) % canvas.height, 10, 10)
  }

  const endTime = performance.now()
  const renderTime = endTime - startTime

  console.log(`渲染性能测试结果:`, {
    iterations,
    totalTime: `${renderTime.toFixed(2)}ms`,
    averageTime: `${(renderTime / iterations).toFixed(4)}ms`,
    fps: Math.round(1000 / (renderTime / iterations)),
  })

  // 清理
  document.body.removeChild(canvas)

  return {
    iterations,
    totalTime: renderTime,
    averageTime: renderTime / iterations,
    fps: Math.round(1000 / (renderTime / iterations)),
  }
}
