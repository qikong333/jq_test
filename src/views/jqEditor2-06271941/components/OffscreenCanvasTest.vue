<template>
  <div class="offscreen-canvas-test">
    <div class="test-header">
      <h3>🎨 OffscreenCanvas 性能测试</h3>
      <div class="test-controls">
        <button :disabled="isTestRunning" @click="runPerformanceTest">
          {{ isTestRunning ? '测试中...' : '开始性能测试' }}
        </button>
        <button :disabled="isTestRunning" @click="switchStrategy">
          切换到{{ isUsingOffscreen ? '传统' : 'OffscreenCanvas' }}模式
        </button>
        <button @click="clearCanvas">清空画布</button>
      </div>
    </div>

    <div class="test-content">
      <!-- 画布容器 -->
      <div class="canvas-container">
        <canvas
          ref="testCanvas"
          class="test-canvas"
          width="800"
          height="600"
        ></canvas>
        <div class="canvas-overlay">
          <div
            class="status-indicator"
            :class="{
              ready: isReady,
              offscreen: isUsingOffscreen,
              error: hasErrors,
            }"
          >
            {{ renderingStrategy }}
          </div>
        </div>
      </div>

      <!-- 状态面板 -->
      <div class="status-panel">
        <div class="status-section">
          <h4>🔧 系统状态</h4>
          <div class="status-grid">
            <div class="status-item">
              <span class="label">渲染策略:</span>
              <span class="value" :class="renderingStrategy">
                {{ renderingStrategy }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">OffscreenCanvas 支持:</span>
              <span class="value" :class="{ supported: isOffscreenSupported }">
                {{ isOffscreenSupported ? '✅ 支持' : '❌ 不支持' }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">适配器状态:</span>
              <span class="value" :class="{ ready: isReady }">
                {{ isReady ? '✅ 就绪' : '⏳ 初始化中' }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">错误计数:</span>
              <span class="value" :class="{ error: hasErrors }">
                {{ errorCount }}
              </span>
            </div>
          </div>
        </div>

        <div class="status-section">
          <h4>📊 性能指标</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="label">绘制调用:</span>
              <span class="value">{{ performanceMetrics.drawCalls || 0 }}</span>
            </div>
            <div class="metric-item">
              <span class="label">批处理调用:</span>
              <span class="value">
                {{ performanceMetrics.batchedCalls || 0 }}
              </span>
            </div>
            <div class="metric-item">
              <span class="label">平均渲染时间:</span>
              <span class="value">{{ averageRenderTime.toFixed(2) }}ms</span>
            </div>
            <div class="metric-item">
              <span class="label">批处理队列:</span>
              <span class="value">
                {{ performanceMetrics.batchQueueSize || 0 }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="testResults.length > 0" class="status-section">
          <h4>🏆 测试结果</h4>
          <div class="test-results">
            <div
              v-for="(result, index) in testResults"
              :key="index"
              class="test-result"
            >
              <div class="result-header">
                <span class="strategy">{{ result.strategy }}</span>
                <span class="duration">{{ result.duration }}ms</span>
              </div>
              <div class="result-details">
                <span>操作数: {{ result.operations }}</span>
                <span>FPS: {{ result.fps.toFixed(1) }}</span>
                <span>效率: {{ result.efficiency.toFixed(2) }}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 兼容性报告 -->
    <div v-if="compatibilityReport.browser" class="compatibility-section">
      <h4>🔍 浏览器兼容性</h4>
      <div class="compatibility-grid">
        <div class="compat-item">
          <span class="label">浏览器:</span>
          <span class="value">
            {{ compatibilityReport.browser.name }}
            {{ compatibilityReport.browser.version }}
          </span>
        </div>
        <div class="compat-item">
          <span class="label">渲染引擎:</span>
          <span class="value">{{ compatibilityReport.browser.engine }}</span>
        </div>
        <div class="compat-item">
          <span class="label">推荐策略:</span>
          <span class="value">{{ compatibilityReport.fallbackStrategy }}</span>
        </div>
      </div>
      <div v-if="compatibilityReport.recommendations" class="recommendations">
        <h5>建议:</h5>
        <ul>
          <li
            v-for="(rec, index) in compatibilityReport.recommendations"
            :key="index"
          >
            {{ rec }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCanvasOffscreen } from '../composables/useCanvasOffscreen';

// 测试画布引用
const testCanvas = ref<HTMLCanvasElement | null>(null);

// 使用 OffscreenCanvas 组合式函数
const {
  isReady,
  isOffscreenSupported,
  renderingStrategy,
  performanceMetrics,
  compatibilityReport,
  errorCount,
  isUsingOffscreen,
  hasErrors,
  averageRenderTime,
  fillCell,
  eraseCell,
  drawLine,
  clear,
  flush,
  resetPerformanceMetrics,
  switchRenderingStrategy,
} = useCanvasOffscreen(testCanvas, {
  enableOffscreen: true,
  enableBatching: true,
  batchSize: 50,
  flushInterval: 16,
  gridWidth: 80,
  gridHeight: 60,
  cellSize: 10,
});

// 测试状态
const isTestRunning = ref(false);
const testResults = ref<
  Array<{
    strategy: string;
    duration: number;
    operations: number;
    fps: number;
    efficiency: number;
  }>
>([]);

/**
 * 生成随机颜色
 */
const getRandomColor = (): string => {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * 生成随机点
 */
const getRandomPoint = () => {
  return {
    x: Math.floor(Math.random() * 80),
    y: Math.floor(Math.random() * 60),
  };
};

/**
 * 生成随机线条
 */
const getRandomLine = (length: number = 10) => {
  const points = [];
  const start = getRandomPoint();

  for (let i = 0; i < length; i++) {
    points.push({
      x: Math.max(
        0,
        Math.min(79, start.x + Math.floor(Math.random() * 20) - 10),
      ),
      y: Math.max(
        0,
        Math.min(59, start.y + Math.floor(Math.random() * 20) - 10),
      ),
    });
  }

  return points;
};

/**
 * 运行性能测试
 */
const runPerformanceTest = async () => {
  if (isTestRunning.value || !isReady.value) return;

  isTestRunning.value = true;
  testResults.value = [];

  try {
    // 测试两种策略
    const strategies = [
      { name: 'OffscreenCanvas', useOffscreen: true },
      { name: 'Traditional', useOffscreen: false },
    ];

    for (const strategy of strategies) {
      console.log(`🧪 开始测试 ${strategy.name} 策略`);

      // 切换策略
      await switchRenderingStrategy(!strategy.useOffscreen);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 等待切换完成

      // 清空画布和性能指标
      await clear();
      resetPerformanceMetrics();

      // 执行测试
      const result = await runSingleTest(strategy.name);
      testResults.value.push(result);

      console.log(`✅ ${strategy.name} 测试完成:`, result);
    }

    // 计算效率比较
    if (testResults.value.length === 2) {
      const offscreenResult = testResults.value[0];
      const traditionalResult = testResults.value[1];

      offscreenResult.efficiency =
        traditionalResult.duration / offscreenResult.duration;
      traditionalResult.efficiency = 1.0;

      console.log('📈 性能对比完成');
      console.log(
        `OffscreenCanvas 效率提升: ${offscreenResult.efficiency.toFixed(2)}x`,
      );
    }
  } catch (error) {
    console.error('性能测试失败:', error);
  } finally {
    isTestRunning.value = false;
  }
};

/**
 * 运行单个测试
 */
const runSingleTest = async (strategyName: string) => {
  const startTime = performance.now();
  const operations = 1000;

  // 执行大量绘制操作
  for (let i = 0; i < operations; i++) {
    const operation = Math.random();

    if (operation < 0.6) {
      // 60% 概率填充单个格子
      const point = getRandomPoint();
      await fillCell(point.x, point.y, getRandomColor());
    } else if (operation < 0.8) {
      // 20% 概率绘制线条
      const line = getRandomLine(5);
      await drawLine(line, getRandomColor());
    } else {
      // 20% 概率擦除格子
      const point = getRandomPoint();
      await eraseCell(point.x, point.y);
    }

    // 每100次操作刷新一次
    if (i % 100 === 0) {
      await flush();
    }
  }

  // 最终刷新
  await flush();

  const endTime = performance.now();
  const duration = endTime - startTime;
  const fps = (operations / duration) * 1000;

  return {
    strategy: strategyName,
    duration: Math.round(duration),
    operations,
    fps,
    efficiency: 1.0, // 将在比较时计算
  };
};

/**
 * 切换渲染策略
 */
const switchStrategy = async () => {
  if (isTestRunning.value) return;

  try {
    await switchRenderingStrategy(isUsingOffscreen.value);
    console.log('🔄 渲染策略已切换');
  } catch (error) {
    console.error('切换渲染策略失败:', error);
  }
};

/**
 * 清空画布
 */
const clearCanvas = async () => {
  try {
    await clear();
    resetPerformanceMetrics();
    console.log('🧹 画布已清空');
  } catch (error) {
    console.error('清空画布失败:', error);
  }
};

// 组件挂载时的初始化
onMounted(() => {
  console.log('🎨 OffscreenCanvas 测试组件已挂载');
});
</script>

<style scoped>
.offscreen-canvas-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.test-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.5em;
}

.test-controls {
  display: flex;
  gap: 10px;
}

.test-controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.test-controls button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.test-controls button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.test-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 20px;
  margin-bottom: 20px;
}

.canvas-container {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #f9f9f9;
}

.test-canvas {
  display: block;
  width: 100%;
  height: auto;
  background: white;
}

.canvas-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
}

.status-indicator {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  background: #f0f0f0;
  color: #666;
  border: 2px solid #ddd;
}

.status-indicator.ready {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.status-indicator.offscreen {
  background: #cce7ff;
  color: #004085;
  border-color: #99d6ff;
}

.status-indicator.error {
  background: #f8d7da;
  color: #721c24;
  border-color: #f1aeb5;
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
}

.status-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1.1em;
}

.status-grid,
.metrics-grid {
  display: grid;
  gap: 8px;
}

.status-item,
.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child,
.metric-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  font-weight: bold;
  color: #333;
}

.value.offscreen-canvas {
  color: #007bff;
}

.value.traditional-canvas {
  color: #28a745;
}

.value.supported {
  color: #28a745;
}

.value.ready {
  color: #28a745;
}

.value.error {
  color: #dc3545;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-result {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.strategy {
  font-weight: bold;
  color: #495057;
}

.duration {
  font-size: 1.2em;
  font-weight: bold;
  color: #007bff;
}

.result-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
  color: #6c757d;
}

.compatibility-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.compatibility-section h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.compatibility-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 15px;
}

.compat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.recommendations {
  margin-top: 15px;
}

.recommendations h5 {
  margin: 0 0 10px 0;
  color: #495057;
}

.recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.recommendations li {
  margin-bottom: 5px;
  color: #6c757d;
}

@media (max-width: 768px) {
  .test-content {
    grid-template-columns: 1fr;
  }

  .test-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .test-controls {
    justify-content: center;
  }
}
</style>
