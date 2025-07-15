/**
 * OffscreenCanvas 性能测试脚本
 * 用于测试和验证 OffscreenCanvas 技术的性能提升效果
 */

class PerformanceTestSuite {
  constructor() {
    this.results = [];
    this.testConfig = {
      gridWidth: 80,
      gridHeight: 60,
      cellSize: 10,
      testOperations: 1000,
      warmupOperations: 100,
    };
  }

  /**
   * 运行完整的性能测试套件
   */
  async runFullTestSuite() {
    console.log('🚀 开始 OffscreenCanvas 性能测试套件');
    console.log('='.repeat(60));

    // 1. 基础渲染性能测试
    await this.testBasicRenderingPerformance();

    // 2. 批处理性能测试
    await this.testBatchingPerformance();

    // 3. 内存使用测试
    await this.testMemoryUsage();

    // 4. CPU 使用率测试
    await this.testCPUUsage();

    // 5. 响应性测试
    await this.testResponsiveness();

    // 6. 浏览器兼容性测试
    await this.testBrowserCompatibility();

    // 生成测试报告
    this.generateTestReport();

    console.log('✅ 性能测试套件完成');
    return this.results;
  }

  /**
   * 基础渲染性能测试
   */
  async testBasicRenderingPerformance() {
    console.log('📊 测试 1: 基础渲染性能');

    const canvas = this.createTestCanvas();
    const operations = this.generateRandomOperations(
      this.testConfig.testOperations,
    );

    // 测试传统 Canvas
    const traditionalResult = await this.testTraditionalCanvas(
      canvas,
      operations,
    );

    // 测试 OffscreenCanvas
    const offscreenResult = await this.testOffscreenCanvas(canvas, operations);

    const improvement = (
      ((traditionalResult.renderTime - offscreenResult.renderTime) /
        traditionalResult.renderTime) *
      100
    ).toFixed(1);

    const result = {
      testName: '基础渲染性能',
      traditional: traditionalResult,
      offscreen: offscreenResult,
      improvement: `${improvement}%`,
      passed: improvement > 0,
    };

    this.results.push(result);
    this.logTestResult(result);
  }

  /**
   * 批处理性能测试
   */
  async testBatchingPerformance() {
    console.log('📊 测试 2: 批处理性能');

    const canvas = this.createTestCanvas();
    const operations = this.generateRandomOperations(
      this.testConfig.testOperations,
    );

    // 测试无批处理
    const noBatchResult = await this.testWithoutBatching(canvas, operations);

    // 测试有批处理
    const batchResult = await this.testWithBatching(canvas, operations);

    const improvement = (
      ((noBatchResult.renderTime - batchResult.renderTime) /
        noBatchResult.renderTime) *
      100
    ).toFixed(1);

    const result = {
      testName: '批处理性能',
      noBatch: noBatchResult,
      withBatch: batchResult,
      improvement: `${improvement}%`,
      passed: improvement > 0,
    };

    this.results.push(result);
    this.logTestResult(result);
  }

  /**
   * 内存使用测试
   */
  async testMemoryUsage() {
    console.log('📊 测试 3: 内存使用');

    if (!performance.memory) {
      console.log('⚠️  浏览器不支持内存监控，跳过此测试');
      return;
    }

    const canvas = this.createTestCanvas();
    const operations = this.generateRandomOperations(
      this.testConfig.testOperations * 2,
    ); // 更多操作以测试内存

    // 测试传统 Canvas 内存使用
    const traditionalMemory = await this.testMemoryUsageTraditional(
      canvas,
      operations,
    );

    // 测试 OffscreenCanvas 内存使用
    const offscreenMemory = await this.testMemoryUsageOffscreen(
      canvas,
      operations,
    );

    const memoryReduction = (
      ((traditionalMemory.peakMemory - offscreenMemory.peakMemory) /
        traditionalMemory.peakMemory) *
      100
    ).toFixed(1);

    const result = {
      testName: '内存使用',
      traditional: traditionalMemory,
      offscreen: offscreenMemory,
      memoryReduction: `${memoryReduction}%`,
      passed: memoryReduction > 0,
    };

    this.results.push(result);
    this.logTestResult(result);
  }

  /**
   * CPU 使用率测试
   */
  async testCPUUsage() {
    console.log('📊 测试 4: CPU 使用率');

    const canvas = this.createTestCanvas();
    const operations = this.generateRandomOperations(
      this.testConfig.testOperations,
    );

    // 测试传统 Canvas CPU 使用
    const traditionalCPU = await this.testCPUUsageTraditional(
      canvas,
      operations,
    );

    // 测试 OffscreenCanvas CPU 使用
    const offscreenCPU = await this.testCPUUsageOffscreen(canvas, operations);

    const cpuReduction = (
      ((traditionalCPU.avgCPU - offscreenCPU.avgCPU) / traditionalCPU.avgCPU) *
      100
    ).toFixed(1);

    const result = {
      testName: 'CPU 使用率',
      traditional: traditionalCPU,
      offscreen: offscreenCPU,
      cpuReduction: `${cpuReduction}%`,
      passed: cpuReduction > 0,
    };

    this.results.push(result);
    this.logTestResult(result);
  }

  /**
   * 响应性测试
   */
  async testResponsiveness() {
    console.log('📊 测试 5: UI 响应性');

    const canvas = this.createTestCanvas();
    const operations = this.generateRandomOperations(
      this.testConfig.testOperations,
    );

    // 测试传统 Canvas 响应性
    const traditionalResponse = await this.testResponsivenessTraditional(
      canvas,
      operations,
    );

    // 测试 OffscreenCanvas 响应性
    const offscreenResponse = await this.testResponsivenessOffscreen(
      canvas,
      operations,
    );

    const responseImprovement = (
      ((traditionalResponse.blockingTime - offscreenResponse.blockingTime) /
        traditionalResponse.blockingTime) *
      100
    ).toFixed(1);

    const result = {
      testName: 'UI 响应性',
      traditional: traditionalResponse,
      offscreen: offscreenResponse,
      responseImprovement: `${responseImprovement}%`,
      passed: responseImprovement > 0,
    };

    this.results.push(result);
    this.logTestResult(result);
  }

  /**
   * 浏览器兼容性测试
   */
  async testBrowserCompatibility() {
    console.log('📊 测试 6: 浏览器兼容性');

    // 动态导入兼容性检测模块
    const { detectOffscreenCanvasSupport, getBrowserInfo } = await import(
      '../utils/browserCompatibility.js'
    );

    const support = detectOffscreenCanvasSupport();
    const browserInfo = getBrowserInfo();

    const result = {
      testName: '浏览器兼容性',
      browserInfo,
      support,
      passed: support.overall || support.webWorkers, // 至少支持 Worker
    };

    this.results.push(result);
    this.logTestResult(result);
  }

  /**
   * 测试传统 Canvas 渲染
   */
  async testTraditionalCanvas(canvas, operations) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 预热
    await this.runOperations(
      ctx,
      this.generateRandomOperations(this.testConfig.warmupOperations),
      'traditional',
    );

    // 正式测试
    const startTime = performance.now();
    const startMemory = performance.memory
      ? performance.memory.usedJSHeapSize
      : 0;

    await this.runOperations(ctx, operations, 'traditional');

    const endTime = performance.now();
    const endMemory = performance.memory
      ? performance.memory.usedJSHeapSize
      : 0;

    return {
      renderTime: endTime - startTime,
      memoryUsed: endMemory - startMemory,
      operationsPerSecond: (
        (operations.length / (endTime - startTime)) *
        1000
      ).toFixed(0),
    };
  }

  /**
   * 测试 OffscreenCanvas 渲染
   */
  async testOffscreenCanvas(canvas, operations) {
    // 动态导入 OffscreenCanvas 渲染器
    const { default: OffscreenCanvasRenderer } = await import(
      '../utils/offscreenCanvasRenderer.js'
    );

    const renderer = new OffscreenCanvasRenderer(canvas, {
      gridWidth: this.testConfig.gridWidth,
      gridHeight: this.testConfig.gridHeight,
      cellSize: this.testConfig.cellSize,
    });

    await renderer.init();

    // 预热
    await this.runOperationsOffscreen(
      renderer,
      this.generateRandomOperations(this.testConfig.warmupOperations),
    );

    // 正式测试
    const startTime = performance.now();
    const startMemory = performance.memory
      ? performance.memory.usedJSHeapSize
      : 0;

    await this.runOperationsOffscreen(renderer, operations);

    const endTime = performance.now();
    const endMemory = performance.memory
      ? performance.memory.usedJSHeapSize
      : 0;

    renderer.destroy();

    return {
      renderTime: endTime - startTime,
      memoryUsed: endMemory - startMemory,
      operationsPerSecond: (
        (operations.length / (endTime - startTime)) *
        1000
      ).toFixed(0),
    };
  }

  /**
   * 运行传统 Canvas 操作
   */
  async runOperations(ctx, operations, mode) {
    const { gridWidth, gridHeight, cellSize } = this.testConfig;

    for (const op of operations) {
      switch (op.type) {
        case 'fill':
          ctx.fillStyle = op.color;
          ctx.fillRect(op.x * cellSize, op.y * cellSize, cellSize, cellSize);
          break;
        case 'erase':
          ctx.clearRect(op.x * cellSize, op.y * cellSize, cellSize, cellSize);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(op.x * cellSize, op.y * cellSize, cellSize, cellSize);
          break;
        case 'line':
          ctx.strokeStyle = op.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(
            op.points[0].x * cellSize + cellSize / 2,
            op.points[0].y * cellSize + cellSize / 2,
          );
          for (let i = 1; i < op.points.length; i++) {
            ctx.lineTo(
              op.points[i].x * cellSize + cellSize / 2,
              op.points[i].y * cellSize + cellSize / 2,
            );
          }
          ctx.stroke();
          break;
      }
    }
  }

  /**
   * 运行 OffscreenCanvas 操作
   */
  async runOperationsOffscreen(renderer, operations) {
    for (const op of operations) {
      switch (op.type) {
        case 'fill':
          await renderer.fillCell(op.x, op.y, op.color);
          break;
        case 'erase':
          await renderer.eraseCell(op.x, op.y);
          break;
        case 'line':
          await renderer.drawLine(op.points, op.color);
          break;
      }
    }

    // 确保所有操作都完成
    await renderer.flush();
  }

  /**
   * 生成随机测试操作
   */
  generateRandomOperations(count) {
    const operations = [];
    const { gridWidth, gridHeight } = this.testConfig;

    for (let i = 0; i < count; i++) {
      const rand = Math.random();

      if (rand < 0.6) {
        // 60% 填充操作
        operations.push({
          type: 'fill',
          x: Math.floor(Math.random() * gridWidth),
          y: Math.floor(Math.random() * gridHeight),
          color: this.getRandomColor(),
        });
      } else if (rand < 0.8) {
        // 20% 线条操作
        const pointCount = Math.floor(Math.random() * 5) + 2;
        const points = [];
        for (let j = 0; j < pointCount; j++) {
          points.push({
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight),
          });
        }
        operations.push({
          type: 'line',
          points,
          color: this.getRandomColor(),
        });
      } else {
        // 20% 擦除操作
        operations.push({
          type: 'erase',
          x: Math.floor(Math.random() * gridWidth),
          y: Math.floor(Math.random() * gridHeight),
        });
      }
    }

    return operations;
  }

  /**
   * 获取随机颜色
   */
  getRandomColor() {
    const colors = [
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#FF00FF',
      '#00FFFF',
      '#FFA500',
      '#800080',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 创建测试画布
   */
  createTestCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.testConfig.gridWidth * this.testConfig.cellSize;
    canvas.height = this.testConfig.gridHeight * this.testConfig.cellSize;
    canvas.style.position = 'absolute';
    canvas.style.left = '-9999px'; // 隐藏测试画布
    document.body.appendChild(canvas);
    return canvas;
  }

  /**
   * 测试无批处理性能
   */
  async testWithoutBatching(canvas, operations) {
    // 动态导入适配器
    const { default: CanvasAdapter } = await import(
      '../utils/canvasAdapter.js'
    );

    const adapter = new CanvasAdapter(canvas, {
      enableBatching: false,
      gridWidth: this.testConfig.gridWidth,
      gridHeight: this.testConfig.gridHeight,
      cellSize: this.testConfig.cellSize,
    });

    await adapter.init();

    const startTime = performance.now();

    for (const op of operations) {
      switch (op.type) {
        case 'fill':
          await adapter.fillCell(op.x, op.y, op.color);
          break;
        case 'erase':
          await adapter.eraseCell(op.x, op.y);
          break;
        case 'line':
          await adapter.drawLine(op.points, op.color);
          break;
      }
    }

    const endTime = performance.now();
    adapter.destroy();

    return {
      renderTime: endTime - startTime,
      batchCount: 0,
    };
  }

  /**
   * 测试有批处理性能
   */
  async testWithBatching(canvas, operations) {
    // 动态导入适配器
    const { default: CanvasAdapter } = await import(
      '../utils/canvasAdapter.js'
    );

    const adapter = new CanvasAdapter(canvas, {
      enableBatching: true,
      batchSize: 50,
      gridWidth: this.testConfig.gridWidth,
      gridHeight: this.testConfig.gridHeight,
      cellSize: this.testConfig.cellSize,
    });

    await adapter.init();

    const startTime = performance.now();

    for (const op of operations) {
      switch (op.type) {
        case 'fill':
          await adapter.fillCell(op.x, op.y, op.color);
          break;
        case 'erase':
          await adapter.eraseCell(op.x, op.y);
          break;
        case 'line':
          await adapter.drawLine(op.points, op.color);
          break;
      }
    }

    const endTime = performance.now();
    const metrics = adapter.getPerformanceMetrics();
    adapter.destroy();

    return {
      renderTime: endTime - startTime,
      batchCount: metrics.batchedCalls,
    };
  }

  /**
   * 测试内存使用 - 传统模式
   */
  async testMemoryUsageTraditional(canvas, operations) {
    const ctx = canvas.getContext('2d');
    const memorySnapshots = [];

    // 记录初始内存
    memorySnapshots.push(performance.memory.usedJSHeapSize);

    // 分批执行操作并记录内存
    const batchSize = 100;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await this.runOperations(ctx, batch, 'traditional');
      memorySnapshots.push(performance.memory.usedJSHeapSize);
    }

    return {
      initialMemory: memorySnapshots[0],
      peakMemory: Math.max(...memorySnapshots),
      finalMemory: memorySnapshots[memorySnapshots.length - 1],
      memoryGrowth:
        memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0],
    };
  }

  /**
   * 测试内存使用 - OffscreenCanvas 模式
   */
  async testMemoryUsageOffscreen(canvas, operations) {
    const { default: OffscreenCanvasRenderer } = await import(
      '../utils/offscreenCanvasRenderer.js'
    );

    const renderer = new OffscreenCanvasRenderer(canvas, {
      gridWidth: this.testConfig.gridWidth,
      gridHeight: this.testConfig.gridHeight,
      cellSize: this.testConfig.cellSize,
    });

    await renderer.init();

    const memorySnapshots = [];
    memorySnapshots.push(performance.memory.usedJSHeapSize);

    // 分批执行操作并记录内存
    const batchSize = 100;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await this.runOperationsOffscreen(renderer, batch);
      memorySnapshots.push(performance.memory.usedJSHeapSize);
    }

    renderer.destroy();

    return {
      initialMemory: memorySnapshots[0],
      peakMemory: Math.max(...memorySnapshots),
      finalMemory: memorySnapshots[memorySnapshots.length - 1],
      memoryGrowth:
        memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0],
    };
  }

  /**
   * 测试 CPU 使用率 - 传统模式
   */
  async testCPUUsageTraditional(canvas, operations) {
    const ctx = canvas.getContext('2d');
    const cpuSamples = [];

    // 使用 requestIdleCallback 来估算 CPU 使用率
    const sampleCPU = () => {
      return new Promise((resolve) => {
        const start = performance.now();
        requestIdleCallback(() => {
          const idle = performance.now() - start;
          cpuSamples.push(Math.max(0, 100 - idle));
          resolve();
        });
      });
    };

    // 开始 CPU 监控
    const cpuMonitor = setInterval(sampleCPU, 100);

    await this.runOperations(ctx, operations, 'traditional');

    clearInterval(cpuMonitor);

    return {
      avgCPU: cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length,
      maxCPU: Math.max(...cpuSamples),
      samples: cpuSamples.length,
    };
  }

  /**
   * 测试 CPU 使用率 - OffscreenCanvas 模式
   */
  async testCPUUsageOffscreen(canvas, operations) {
    const { default: OffscreenCanvasRenderer } = await import(
      '../utils/offscreenCanvasRenderer.js'
    );

    const renderer = new OffscreenCanvasRenderer(canvas, {
      gridWidth: this.testConfig.gridWidth,
      gridHeight: this.testConfig.gridHeight,
      cellSize: this.testConfig.cellSize,
    });

    await renderer.init();

    const cpuSamples = [];

    const sampleCPU = () => {
      return new Promise((resolve) => {
        const start = performance.now();
        requestIdleCallback(() => {
          const idle = performance.now() - start;
          cpuSamples.push(Math.max(0, 100 - idle));
          resolve();
        });
      });
    };

    const cpuMonitor = setInterval(sampleCPU, 100);

    await this.runOperationsOffscreen(renderer, operations);

    clearInterval(cpuMonitor);
    renderer.destroy();

    return {
      avgCPU: cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length,
      maxCPU: Math.max(...cpuSamples),
      samples: cpuSamples.length,
    };
  }

  /**
   * 测试响应性 - 传统模式
   */
  async testResponsivenessTraditional(canvas, operations) {
    const ctx = canvas.getContext('2d');
    const blockingTimes = [];

    // 模拟用户交互
    const simulateUserInteraction = () => {
      return new Promise((resolve) => {
        const start = performance.now();
        setTimeout(() => {
          const delay = performance.now() - start;
          blockingTimes.push(delay);
          resolve();
        }, 0);
      });
    };

    // 在渲染过程中定期检查响应性
    const batchSize = 50;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await this.runOperations(ctx, batch, 'traditional');
      await simulateUserInteraction();
    }

    return {
      avgDelay: blockingTimes.reduce((a, b) => a + b, 0) / blockingTimes.length,
      maxDelay: Math.max(...blockingTimes),
      blockingTime: blockingTimes.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * 测试响应性 - OffscreenCanvas 模式
   */
  async testResponsivenessOffscreen(canvas, operations) {
    const { default: OffscreenCanvasRenderer } = await import(
      '../utils/offscreenCanvasRenderer.js'
    );

    const renderer = new OffscreenCanvasRenderer(canvas, {
      gridWidth: this.testConfig.gridWidth,
      gridHeight: this.testConfig.gridHeight,
      cellSize: this.testConfig.cellSize,
    });

    await renderer.init();

    const blockingTimes = [];

    const simulateUserInteraction = () => {
      return new Promise((resolve) => {
        const start = performance.now();
        setTimeout(() => {
          const delay = performance.now() - start;
          blockingTimes.push(delay);
          resolve();
        }, 0);
      });
    };

    const batchSize = 50;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await this.runOperationsOffscreen(renderer, batch);
      await simulateUserInteraction();
    }

    renderer.destroy();

    return {
      avgDelay: blockingTimes.reduce((a, b) => a + b, 0) / blockingTimes.length,
      maxDelay: Math.max(...blockingTimes),
      blockingTime: blockingTimes.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * 记录测试结果
   */
  logTestResult(result) {
    console.log(`\n${result.passed ? '✅' : '❌'} ${result.testName}`);

    if (result.testName === '基础渲染性能') {
      console.log(
        `   传统 Canvas: ${result.traditional.renderTime.toFixed(1)}ms (${
          result.traditional.operationsPerSecond
        } ops/s)`,
      );
      console.log(
        `   OffscreenCanvas: ${result.offscreen.renderTime.toFixed(1)}ms (${
          result.offscreen.operationsPerSecond
        } ops/s)`,
      );
      console.log(`   性能提升: ${result.improvement}`);
    } else if (result.testName === '批处理性能') {
      console.log(`   无批处理: ${result.noBatch.renderTime.toFixed(1)}ms`);
      console.log(
        `   有批处理: ${result.withBatch.renderTime.toFixed(1)}ms (${
          result.withBatch.batchCount
        } 批次)`,
      );
      console.log(`   性能提升: ${result.improvement}`);
    } else if (result.testName === '内存使用') {
      console.log(
        `   传统模式峰值: ${(
          result.traditional.peakMemory /
          1024 /
          1024
        ).toFixed(1)}MB`,
      );
      console.log(
        `   OffscreenCanvas 峰值: ${(
          result.offscreen.peakMemory /
          1024 /
          1024
        ).toFixed(1)}MB`,
      );
      console.log(`   内存节省: ${result.memoryReduction}`);
    } else if (result.testName === 'CPU 使用率') {
      console.log(`   传统模式平均: ${result.traditional.avgCPU.toFixed(1)}%`);
      console.log(
        `   OffscreenCanvas 平均: ${result.offscreen.avgCPU.toFixed(1)}%`,
      );
      console.log(`   CPU 节省: ${result.cpuReduction}`);
    } else if (result.testName === 'UI 响应性') {
      console.log(
        `   传统模式阻塞: ${result.traditional.blockingTime.toFixed(1)}ms`,
      );
      console.log(
        `   OffscreenCanvas 阻塞: ${result.offscreen.blockingTime.toFixed(
          1,
        )}ms`,
      );
      console.log(`   响应性提升: ${result.responseImprovement}`);
    } else if (result.testName === '浏览器兼容性') {
      console.log(
        `   浏览器: ${result.browserInfo.name} ${result.browserInfo.version}`,
      );
      console.log(
        `   OffscreenCanvas: ${result.support.offscreenCanvas ? '✅' : '❌'}`,
      );
      console.log(`   Web Workers: ${result.support.webWorkers ? '✅' : '❌'}`);
      console.log(`   整体支持: ${result.support.overall ? '✅' : '❌'}`);
    }
  }

  /**
   * 生成测试报告
   */
  generateTestReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 OffscreenCanvas 性能测试报告');
    console.log('='.repeat(60));

    const passedTests = this.results.filter((r) => r.passed).length;
    const totalTests = this.results.length;

    console.log(`\n📊 测试概览:`);
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过测试: ${passedTests}`);
    console.log(`   通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    console.log(`\n🚀 性能提升总结:`);

    const renderingTest = this.results.find(
      (r) => r.testName === '基础渲染性能',
    );
    if (renderingTest && renderingTest.passed) {
      console.log(`   ✅ 渲染性能提升: ${renderingTest.improvement}`);
    }

    const batchingTest = this.results.find((r) => r.testName === '批处理性能');
    if (batchingTest && batchingTest.passed) {
      console.log(`   ✅ 批处理优化: ${batchingTest.improvement}`);
    }

    const memoryTest = this.results.find((r) => r.testName === '内存使用');
    if (memoryTest && memoryTest.passed) {
      console.log(`   ✅ 内存节省: ${memoryTest.memoryReduction}`);
    }

    const cpuTest = this.results.find((r) => r.testName === 'CPU 使用率');
    if (cpuTest && cpuTest.passed) {
      console.log(`   ✅ CPU 节省: ${cpuTest.cpuReduction}`);
    }

    const responseTest = this.results.find((r) => r.testName === 'UI 响应性');
    if (responseTest && responseTest.passed) {
      console.log(`   ✅ 响应性提升: ${responseTest.responseImprovement}`);
    }

    const compatTest = this.results.find((r) => r.testName === '浏览器兼容性');
    if (compatTest) {
      console.log(
        `   ${compatTest.passed ? '✅' : '⚠️'} 浏览器兼容性: ${
          compatTest.support.overall ? '完全支持' : '部分支持'
        }`,
      );
    }

    console.log(`\n💡 建议:`);
    if (passedTests === totalTests) {
      console.log(
        `   🎉 所有测试通过！OffscreenCanvas 技术在当前环境下表现优秀。`,
      );
      console.log(
        `   🚀 建议在生产环境中启用 OffscreenCanvas 以获得最佳性能。`,
      );
    } else {
      console.log(`   ⚠️  部分测试未通过，建议检查浏览器兼容性或降级策略。`);
      if (compatTest && !compatTest.support.overall) {
        console.log(
          `   📱 当前浏览器不完全支持 OffscreenCanvas，将自动降级到传统模式。`,
        );
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * 导出测试结果为 JSON
   */
  exportResults() {
    return {
      timestamp: new Date().toISOString(),
      testConfig: this.testConfig,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter((r) => r.passed).length,
        passRate:
          (
            (this.results.filter((r) => r.passed).length /
              this.results.length) *
            100
          ).toFixed(1) + '%',
      },
    };
  }
}

// 导出测试套件
export default PerformanceTestSuite;

// 如果直接运行此脚本，执行测试
if (typeof window !== 'undefined' && window.location) {
  // 浏览器环境
  window.PerformanceTestSuite = PerformanceTestSuite;

  // 提供全局函数来运行测试
  window.runOffscreenCanvasTests = async () => {
    const testSuite = new PerformanceTestSuite();
    const results = await testSuite.runFullTestSuite();
    return testSuite.exportResults();
  };
}
