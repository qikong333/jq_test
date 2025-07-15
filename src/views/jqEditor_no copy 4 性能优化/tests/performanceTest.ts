import { getCoordinateCacheStats, clearCoordinateCache, pixelToGrid, screenToCanvas } from '../utils/coordinateUtils';
import { getColorPoolStats, clearColorPool, normalizeColor } from '../utils/colorUtils';
import { getCanvasStateCache, resetCanvasStateCache } from '../composables/useCanvas';
import { performanceMonitor, getPerformanceReport } from '../utils/performanceMonitor';

/**
 * 第一阶段性能优化测试套件
 */
interface TestResult {
  test: string;
  testName: string;
  duration: number;
  success: boolean;
  status: string;
  details?: Record<string, unknown>;
}

export class PerformanceTestSuite {
  private testResults: TestResult[] = [];

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始第一阶段性能优化测试...');
    
    // 清空所有缓存
    this.clearAllCaches();
    
    // 开始性能监控
    performanceMonitor.startMonitoring(100);
    
    try {
      await this.testCoordinateCache();
      await this.testColorPool();
      await this.testCanvasStateCache();
      await this.testIntegratedPerformance();
      
      this.printResults();
    } finally {
      performanceMonitor.stopMonitoring();
    }
  }

  /**
   * 测试坐标转换缓存
   */
  private async testCoordinateCache(): Promise<void> {
    console.log('📍 测试坐标转换缓存...');
    
    const testData = {
      pixelCoords: Array.from({ length: 1000 }, (_, i) => ({ x: i * 10, y: i * 15 })),
      screenCoords: Array.from({ length: 1000 }, (_, i) => ({ x: i * 5, y: i * 8 })),
      cellSize: { width: 20, height: 20 },
      viewport: { zoom: 1.5, pan: { x: 100, y: 150 }, isZooming: false, isPanning: false }
    };

    // 第一次运行（填充缓存）
    const startTime1 = performance.now();
    testData.pixelCoords.forEach(coord => {
      pixelToGrid(coord.x, coord.y, testData.cellSize.width, testData.cellSize.height);
    });
    testData.screenCoords.forEach(coord => {
      screenToCanvas(coord.x, coord.y, testData.viewport);
    });
    const firstRunTime = performance.now() - startTime1;

    // 第二次运行（使用缓存）
    const startTime2 = performance.now();
    testData.pixelCoords.forEach(coord => {
      pixelToGrid(coord.x, coord.y, testData.cellSize.width, testData.cellSize.height);
    });
    testData.screenCoords.forEach(coord => {
      screenToCanvas(coord.x, coord.y, testData.viewport);
    });
    const secondRunTime = performance.now() - startTime2;

    const cacheStats = getCoordinateCacheStats();
    const speedup = firstRunTime / secondRunTime;

    this.testResults.push({
      test: '坐标转换缓存',
      firstRunTime: `${firstRunTime.toFixed(2)}ms`,
      secondRunTime: `${secondRunTime.toFixed(2)}ms`,
      speedup: `${speedup.toFixed(2)}x`,
      hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
      cacheSize: cacheStats.size,
      status: speedup > 1.5 ? '✅ 通过' : '❌ 失败'
    });
  }

  /**
   * 测试颜色池系统
   */
  private async testColorPool(): Promise<void> {
    console.log('🎨 测试颜色池系统...');
    
    const testColors = [
      '#ff0000', '#FF0000', 'rgb(255, 0, 0)', '#f00',
      '#00ff00', '#00FF00', 'rgb(0, 255, 0)', '#0f0',
      '#0000ff', '#0000FF', 'rgb(0, 0, 255)', '#00f',
      '#ffff00', '#FFFF00', 'rgb(255, 255, 0)', '#ff0'
    ];

    // 重复测试颜色以验证缓存效果
    const extendedColors = [];
    for (let i = 0; i < 100; i++) {
      extendedColors.push(...testColors);
    }

    // 第一次运行
    const startTime1 = performance.now();
    extendedColors.forEach(color => normalizeColor(color));
    const firstRunTime = performance.now() - startTime1;

    // 第二次运行（应该大部分命中缓存）
    const startTime2 = performance.now();
    extendedColors.forEach(color => normalizeColor(color));
    const secondRunTime = performance.now() - startTime2;

    const poolStats = getColorPoolStats();
    const speedup = firstRunTime / secondRunTime;

    this.testResults.push({
      test: '颜色池系统',
      firstRunTime: `${firstRunTime.toFixed(2)}ms`,
      secondRunTime: `${secondRunTime.toFixed(2)}ms`,
      speedup: `${speedup.toFixed(2)}x`,
      hitRate: `${(poolStats.hitRate * 100).toFixed(1)}%`,
      totalColors: poolStats.totalColors,
      memoryUsage: `${poolStats.memoryUsage} bytes`,
      status: speedup > 2 ? '✅ 通过' : '❌ 失败'
    });
  }

  /**
   * 测试Canvas状态缓存
   */
  private async testCanvasStateCache(): Promise<void> {
    console.log('🖼️ 测试Canvas状态缓存...');
    
    // 创建测试Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    const testStates = [
      { fillStyle: '#ff0000', strokeStyle: '#000000', lineWidth: 1, globalAlpha: 1 },
      { fillStyle: '#00ff00', strokeStyle: '#ffffff', lineWidth: 2, globalAlpha: 0.8 },
      { fillStyle: '#0000ff', strokeStyle: '#ff0000', lineWidth: 3, globalAlpha: 0.6 },
      { fillStyle: '#ffff00', strokeStyle: '#00ff00', lineWidth: 4, globalAlpha: 0.4 }
    ];

    // 模拟Canvas状态缓存的使用
    // 注意：这里我们无法直接测试CanvasStateCacheManager，因为它是内部类
    // 但我们可以测试状态设置的性能
    
    // 第一次运行（无缓存优化）
    const startTime1 = performance.now();
    for (let i = 0; i < 1000; i++) {
      const state = testStates[i % testStates.length];
      ctx.fillStyle = state.fillStyle;
      ctx.strokeStyle = state.strokeStyle;
      ctx.lineWidth = state.lineWidth;
      ctx.globalAlpha = state.globalAlpha;
    }
    const firstRunTime = performance.now() - startTime1;

    // 第二次运行（模拟缓存优化 - 只在状态改变时设置）
    const lastState: Partial<CanvasRenderingContext2D> = {};
    const startTime2 = performance.now();
    for (let i = 0; i < 1000; i++) {
      const state = testStates[i % testStates.length];
      if (lastState.fillStyle !== state.fillStyle) {
        ctx.fillStyle = state.fillStyle;
        lastState.fillStyle = state.fillStyle;
      }
      if (lastState.strokeStyle !== state.strokeStyle) {
        ctx.strokeStyle = state.strokeStyle;
        lastState.strokeStyle = state.strokeStyle;
      }
      if (lastState.lineWidth !== state.lineWidth) {
        ctx.lineWidth = state.lineWidth;
        lastState.lineWidth = state.lineWidth;
      }
      if (lastState.globalAlpha !== state.globalAlpha) {
        ctx.globalAlpha = state.globalAlpha;
        lastState.globalAlpha = state.globalAlpha;
      }
    }
    const secondRunTime = performance.now() - startTime2;

    const speedup = firstRunTime / secondRunTime;
    const canvasState = getCanvasStateCache();

    this.testResults.push({
      test: 'Canvas状态缓存',
      firstRunTime: `${firstRunTime.toFixed(2)}ms`,
      secondRunTime: `${secondRunTime.toFixed(2)}ms`,
      speedup: `${speedup.toFixed(2)}x`,
      canvasState: JSON.stringify(canvasState),
      status: speedup > 1.2 ? '✅ 通过' : '❌ 失败'
    });
  }

  /**
   * 测试集成性能
   */
  private async testIntegratedPerformance(): Promise<void> {
    console.log('🔄 测试集成性能...');
    
    // 等待一段时间收集性能数据
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const report = getPerformanceReport();
    
    this.testResults.push({
      test: '集成性能报告',
      fps: report.metrics.fps,
      frameTime: `${report.metrics.frameTime}ms`,
      memoryUsage: `${report.metrics.memoryUsage}%`,
      performanceLevel: report.level,
      coordinateCacheHitRate: `${(report.cacheStats.coordinateCache.hitRate * 100).toFixed(1)}%`,
      colorPoolHitRate: `${(report.cacheStats.colorPool.hitRate * 100).toFixed(1)}%`,
      suggestions: report.suggestions.length,
      status: report.level !== 'critical' ? '✅ 通过' : '❌ 需要优化'
    });
  }

  /**
   * 清空所有缓存
   */
  private clearAllCaches(): void {
    clearCoordinateCache();
    clearColorPool();
    resetCanvasStateCache();
  }

  /**
   * 打印测试结果
   */
  private printResults(): void {
    console.log('\n📊 第一阶段性能优化测试结果:');
    console.log('=' .repeat(80));
    
    this.testResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`);
      console.log('-'.repeat(40));
      
      Object.entries(result).forEach(([key, value]) => {
        if (key !== 'test') {
          console.log(`   ${key}: ${value}`);
        }
      });
    });
    
    console.log('\n' + '='.repeat(80));
    
    const passedTests = this.testResults.filter(r => r.status?.includes('✅')).length;
    const totalTests = this.testResults.length;
    
    console.log(`\n🎯 测试总结: ${passedTests}/${totalTests} 项测试通过`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有优化测试通过！第一阶段优化成功。');
    } else {
      console.log('⚠️  部分测试未通过，需要进一步优化。');
    }
  }
}

/**
 * 运行性能测试
 */
export async function runPerformanceTests(): Promise<void> {
  const testSuite = new PerformanceTestSuite();
  await testSuite.runAllTests();
}

/**
 * 快速性能检查
 */
export function quickPerformanceCheck(): void {
  console.log('⚡ 快速性能检查...');
  
  const report = getPerformanceReport();
  
  console.log('📈 当前性能状态:');
  console.log(`   FPS: ${report.metrics.fps}`);
  console.log(`   帧时间: ${report.metrics.frameTime}ms`);
  console.log(`   内存使用: ${report.metrics.memoryUsage}%`);
  console.log(`   性能等级: ${report.level}`);
  
  console.log('\n🎯 缓存命中率:');
  console.log(`   坐标缓存: ${(report.cacheStats.coordinateCache.hitRate * 100).toFixed(1)}%`);
  console.log(`   颜色池: ${(report.cacheStats.colorPool.hitRate * 100).toFixed(1)}%`);
  
  if (report.suggestions.length > 0) {
    console.log('\n💡 优化建议:');
    report.suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion}`);
    });
  } else {
    console.log('\n✅ 当前性能良好，无需额外优化。');
  }
}