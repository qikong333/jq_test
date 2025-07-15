<template>
  <div class="offscreen-canvas-demo">
    <div class="demo-header">
      <h2>🎨 OffscreenCanvas 技术演示</h2>
      <p class="demo-description">
        体验 OffscreenCanvas 技术带来的性能提升，对比传统 Canvas 和
        OffscreenCanvas 的渲染效果。
      </p>
    </div>

    <div class="demo-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        class="tab-button"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <div class="demo-content">
      <!-- 性能测试标签页 -->
      <div v-if="activeTab === 'performance'" class="tab-content">
        <OffscreenCanvasTest />
      </div>

      <!-- 实时绘制标签页 -->
      <div v-if="activeTab === 'realtime'" class="tab-content">
        <div class="realtime-demo">
          <div class="demo-controls">
            <div class="control-group">
              <label>绘制工具:</label>
              <select v-model="drawingTool">
                <option value="pen">画笔</option>
                <option value="eraser">橡皮擦</option>
                <option value="line">直线</option>
              </select>
            </div>
            <div class="control-group">
              <label>颜色:</label>
              <input v-model="drawingColor" type="color" />
            </div>
            <div class="control-group">
              <label>渲染模式:</label>
              <button class="mode-toggle" @click="toggleRenderingMode">
                {{ isUsingOffscreen ? 'OffscreenCanvas' : '传统Canvas' }}
              </button>
            </div>
            <button class="clear-btn" @click="clearRealtimeCanvas">
              清空画布
            </button>
          </div>

          <div class="canvas-wrapper">
            <canvas
              ref="realtimeCanvas"
              class="realtime-canvas"
              width="800"
              height="600"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
            ></canvas>
            <div class="canvas-info">
              <div class="info-item">
                <span class="label">渲染策略:</span>
                <span class="value" :class="realtimeRenderingStrategy">
                  {{ realtimeRenderingStrategy }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">FPS:</span>
                <span class="value">{{ currentFPS.toFixed(1) }}</span>
              </div>
              <div class="info-item">
                <span class="label">延迟:</span>
                <span class="value">{{ averageLatency.toFixed(1) }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 批量操作标签页 -->
      <div v-if="activeTab === 'batch'" class="tab-content">
        <div class="batch-demo">
          <div class="demo-controls">
            <div class="control-group">
              <label>批量大小:</label>
              <input
                v-model="batchSize"
                type="range"
                min="10"
                max="500"
                step="10"
              />
              <span>{{ batchSize }}</span>
            </div>
            <div class="control-group">
              <label>操作类型:</label>
              <select v-model="batchOperation">
                <option value="random">随机绘制</option>
                <option value="pattern">图案绘制</option>
                <option value="animation">动画效果</option>
              </select>
            </div>
            <button
              :disabled="isBatchRunning"
              class="batch-btn"
              @click="runBatchOperation"
            >
              {{ isBatchRunning ? '执行中...' : '执行批量操作' }}
            </button>
            <button class="clear-btn" @click="clearBatchCanvas">
              清空画布
            </button>
          </div>

          <div class="canvas-wrapper">
            <canvas
              ref="batchCanvas"
              class="batch-canvas"
              width="800"
              height="600"
            ></canvas>
            <div v-if="isBatchRunning" class="batch-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: batchProgress + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ batchProgress.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 兼容性检测标签页 -->
      <div v-if="activeTab === 'compatibility'" class="tab-content">
        <div class="compatibility-demo">
          <div class="compatibility-card">
            <h3>🔍 浏览器兼容性检测</h3>
            <div class="compatibility-results">
              <div class="result-section">
                <h4>基础支持</h4>
                <div class="support-grid">
                  <div
                    class="support-item"
                    :class="{ supported: compatibilityData.offscreenCanvas }"
                  >
                    <span class="icon">
                      {{ compatibilityData.offscreenCanvas ? '✅' : '❌' }}
                    </span>
                    <span class="text">OffscreenCanvas</span>
                  </div>
                  <div
                    class="support-item"
                    :class="{
                      supported: compatibilityData.transferControlToOffscreen,
                    }"
                  >
                    <span class="icon">
                      {{
                        compatibilityData.transferControlToOffscreen
                          ? '✅'
                          : '❌'
                      }}
                    </span>
                    <span class="text">transferControlToOffscreen</span>
                  </div>
                  <div
                    class="support-item"
                    :class="{ supported: compatibilityData.webWorkers }"
                  >
                    <span class="icon">
                      {{ compatibilityData.webWorkers ? '✅' : '❌' }}
                    </span>
                    <span class="text">Web Workers</span>
                  </div>
                  <div
                    class="support-item"
                    :class="{ supported: compatibilityData.imageData }"
                  >
                    <span class="icon">
                      {{ compatibilityData.imageData ? '✅' : '❌' }}
                    </span>
                    <span class="text">ImageData</span>
                  </div>
                </div>
              </div>

              <div class="result-section">
                <h4>浏览器信息</h4>
                <div class="browser-info">
                  <div class="info-row">
                    <span class="label">浏览器:</span>
                    <span class="value">
                      {{ browserInfo.name }} {{ browserInfo.version }}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="label">渲染引擎:</span>
                    <span class="value">{{ browserInfo.engine }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">推荐策略:</span>
                    <span class="value strategy" :class="recommendedStrategy">
                      {{ recommendedStrategy }}
                    </span>
                  </div>
                </div>
              </div>

              <div
                v-if="compatibilityRecommendations.length > 0"
                class="result-section"
              >
                <h4>优化建议</h4>
                <ul class="recommendations">
                  <li
                    v-for="(rec, index) in compatibilityRecommendations"
                    :key="index"
                  >
                    {{ rec }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import OffscreenCanvasTest from '../components/OffscreenCanvasTest.vue';
import { useCanvasOffscreen } from '../composables/useCanvasOffscreen';
import {
  detectOffscreenCanvasSupport,
  getBrowserInfo,
  getRecommendedRenderingStrategy,
} from '../utils/browserCompatibility.js';

// 标签页配置
const tabs = [
  { id: 'performance', name: '性能测试', icon: '🏆' },
  { id: 'realtime', name: '实时绘制', icon: '🎨' },
  { id: 'batch', name: '批量操作', icon: '⚡' },
  { id: 'compatibility', name: '兼容性检测', icon: '🔍' },
];

const activeTab = ref('performance');

// 实时绘制相关
const realtimeCanvas = ref<HTMLCanvasElement | null>(null);
const drawingTool = ref('pen');
const drawingColor = ref('#FF6B6B');
const isDrawing = ref(false);
const lastPoint = ref<{ x: number; y: number } | null>(null);
const currentFPS = ref(0);
const averageLatency = ref(0);
const frameCount = ref(0);
const lastFrameTime = ref(0);

// 批量操作相关
const batchCanvas = ref<HTMLCanvasElement | null>(null);
const batchSize = ref(100);
const batchOperation = ref('random');
const isBatchRunning = ref(false);
const batchProgress = ref(0);

// 兼容性检测数据
const compatibilityData = ref({
  offscreenCanvas: false,
  transferControlToOffscreen: false,
  webWorkers: false,
  imageData: false,
});
const browserInfo = ref({
  name: 'Unknown',
  version: 'Unknown',
  engine: 'Unknown',
});
const recommendedStrategy = ref('traditional-canvas');
const compatibilityRecommendations = ref<string[]>([]);

// 使用 OffscreenCanvas 组合式函数 - 实时绘制
const {
  isReady: realtimeReady,
  renderingStrategy: realtimeRenderingStrategy,
  isUsingOffscreen: realtimeUsingOffscreen,
  fillCell: realtimeFillCell,
  clear: clearRealtimeCanvas,
  switchRenderingStrategy: switchRealtimeStrategy,
} = useCanvasOffscreen(realtimeCanvas, {
  gridWidth: 80,
  gridHeight: 60,
  cellSize: 10,
});

// 使用 OffscreenCanvas 组合式函数 - 批量操作
const {
  isReady: batchReady,
  fillCell: batchFillCell,
  drawLine: batchDrawLine,
  clear: clearBatchCanvas,
  flush: flushBatch,
} = useCanvasOffscreen(batchCanvas, {
  gridWidth: 80,
  gridHeight: 60,
  cellSize: 10,
  batchSize: computed(() => batchSize.value),
});

/**
 * 初始化兼容性检测
 */
const initCompatibilityCheck = () => {
  const support = detectOffscreenCanvasSupport();
  compatibilityData.value = support;

  browserInfo.value = getBrowserInfo();
  recommendedStrategy.value = getRecommendedRenderingStrategy();

  // 生成建议
  const recommendations = [];
  if (!support.overall) {
    if (!support.offscreenCanvas) {
      recommendations.push(
        '浏览器不支持 OffscreenCanvas API，建议升级到最新版本',
      );
    }
    if (!support.webWorkers) {
      recommendations.push('浏览器不支持 Web Workers，无法使用后台渲染');
    }
    recommendations.push('当前将使用传统 Canvas 渲染模式');
  } else {
    recommendations.push('浏览器完全支持 OffscreenCanvas 技术');
    recommendations.push('建议启用 OffscreenCanvas 以获得最佳性能');
  }

  compatibilityRecommendations.value = recommendations;
};

/**
 * 获取鼠标在画布上的坐标
 */
const getCanvasCoordinates = (event: MouseEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: Math.floor(((event.clientX - rect.left) * scaleX) / 10), // 转换为网格坐标
    y: Math.floor(((event.clientY - rect.top) * scaleY) / 10),
  };
};

/**
 * 开始绘制
 */
const startDrawing = (event: MouseEvent) => {
  if (!realtimeCanvas.value || !realtimeReady.value) return;

  isDrawing.value = true;
  const coords = getCanvasCoordinates(event, realtimeCanvas.value);
  lastPoint.value = coords;

  // 绘制起始点
  if (drawingTool.value === 'pen') {
    realtimeFillCell(coords.x, coords.y, drawingColor.value);
  }
};

/**
 * 绘制过程
 */
const draw = async (event: MouseEvent) => {
  if (
    !isDrawing.value ||
    !realtimeCanvas.value ||
    !realtimeReady.value ||
    !lastPoint.value
  )
    return;

  const startTime = performance.now();
  const coords = getCanvasCoordinates(event, realtimeCanvas.value);

  if (drawingTool.value === 'pen') {
    // 绘制从上一点到当前点的线条
    const line = getLinePoints(lastPoint.value, coords);
    for (const point of line) {
      await realtimeFillCell(point.x, point.y, drawingColor.value);
    }
  } else if (drawingTool.value === 'eraser') {
    // 擦除功能（这里简化为白色填充）
    await realtimeFillCell(coords.x, coords.y, '#FFFFFF');
  }

  lastPoint.value = coords;

  // 计算延迟和FPS
  const endTime = performance.now();
  averageLatency.value =
    averageLatency.value * 0.9 + (endTime - startTime) * 0.1;

  updateFPS();
};

/**
 * 停止绘制
 */
const stopDrawing = () => {
  isDrawing.value = false;
  lastPoint.value = null;
};

/**
 * 获取两点之间的线条点集
 */
const getLinePoints = (
  start: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const points = [];
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;

  let x = start.x;
  let y = start.y;

  while (true) {
    points.push({ x, y });

    if (x === end.x && y === end.y) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
};

/**
 * 更新FPS
 */
const updateFPS = () => {
  const now = performance.now();
  frameCount.value++;

  if (now - lastFrameTime.value >= 1000) {
    currentFPS.value = frameCount.value;
    frameCount.value = 0;
    lastFrameTime.value = now;
  }
};

/**
 * 切换渲染模式
 */
const toggleRenderingMode = async () => {
  try {
    await switchRealtimeStrategy(realtimeUsingOffscreen.value);
  } catch (error) {
    console.error('切换渲染模式失败:', error);
  }
};

/**
 * 执行批量操作
 */
const runBatchOperation = async () => {
  if (!batchReady.value || isBatchRunning.value) return;

  isBatchRunning.value = true;
  batchProgress.value = 0;

  try {
    const operations = batchSize.value;

    for (let i = 0; i < operations; i++) {
      if (batchOperation.value === 'random') {
        await executeRandomOperation();
      } else if (batchOperation.value === 'pattern') {
        await executePatternOperation(i, operations);
      } else if (batchOperation.value === 'animation') {
        await executeAnimationOperation(i, operations);
      }

      batchProgress.value = ((i + 1) / operations) * 100;

      // 每50次操作刷新一次
      if (i % 50 === 0) {
        await flushBatch();
        await nextTick(); // 让UI有机会更新
      }
    }

    await flushBatch();
  } catch (error) {
    console.error('批量操作失败:', error);
  } finally {
    isBatchRunning.value = false;
    batchProgress.value = 100;
  }
};

/**
 * 执行随机操作
 */
const executeRandomOperation = async () => {
  const x = Math.floor(Math.random() * 80);
  const y = Math.floor(Math.random() * 60);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await batchFillCell(x, y, color);
};

/**
 * 执行图案操作
 */
const executePatternOperation = async (index: number, total: number) => {
  const progress = index / total;
  const centerX = 40;
  const centerY = 30;
  const radius = 20 * progress;

  const angle = (index / total) * Math.PI * 4;
  const x = Math.floor(centerX + Math.cos(angle) * radius);
  const y = Math.floor(centerY + Math.sin(angle) * radius);

  if (x >= 0 && x < 80 && y >= 0 && y < 60) {
    const hue = (progress * 360) % 360;
    const color = `hsl(${hue}, 70%, 60%)`;
    await batchFillCell(x, y, color);
  }
};

/**
 * 执行动画操作
 */
const executeAnimationOperation = async (index: number, total: number) => {
  const wave = Math.sin((index / total) * Math.PI * 8) * 10;
  const x = Math.floor((index / total) * 80);
  const y = Math.floor(30 + wave);

  if (x >= 0 && x < 80 && y >= 0 && y < 60) {
    const intensity = Math.abs(wave) / 10;
    const color = `rgba(255, ${Math.floor(intensity * 255)}, 100, 1)`;
    await batchFillCell(x, y, color);
  }
};

// 组件挂载时初始化
onMounted(() => {
  initCompatibilityCheck();
  console.log('🎨 OffscreenCanvas 演示页面已加载');
});
</script>

<style scoped>
.offscreen-canvas-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
}

.demo-header h2 {
  color: #333;
  margin-bottom: 10px;
}

.demo-description {
  color: #666;
  font-size: 1.1em;
  max-width: 600px;
  margin: 0 auto;
}

.demo-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 15px;
}

.tab-button {
  padding: 10px 20px;
  border: none;
  background: #f8f9fa;
  color: #666;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #e9ecef;
  color: #333;
}

.tab-button.active {
  background: #007bff;
  color: white;
  transform: translateY(2px);
}

.tab-content {
  min-height: 600px;
}

.demo-controls {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-weight: 500;
  color: #495057;
}

.control-group select,
.control-group input {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.mode-toggle {
  padding: 6px 12px;
  border: 1px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.mode-toggle:hover {
  background: #007bff;
  color: white;
}

.clear-btn,
.batch-btn {
  padding: 8px 16px;
  border: none;
  background: #dc3545;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.batch-btn {
  background: #28a745;
}

.clear-btn:hover {
  background: #c82333;
}

.batch-btn:hover:not(:disabled) {
  background: #218838;
}

.batch-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.canvas-wrapper {
  position: relative;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.realtime-canvas,
.batch-canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.canvas-info {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item .label {
  font-weight: 500;
  color: #6c757d;
}

.info-item .value {
  font-weight: bold;
  color: #495057;
}

.info-item .value.offscreen-canvas {
  color: #007bff;
}

.info-item .value.traditional-canvas {
  color: #28a745;
}

.batch-progress {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.2s;
}

.progress-text {
  font-size: 12px;
  color: #6c757d;
  text-align: center;
  display: block;
}

.compatibility-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.compatibility-card h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.result-section {
  margin-bottom: 25px;
}

.result-section h4 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1.1em;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.support-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: #f8f9fa;
}

.support-item.supported {
  background: #d4edda;
  border-color: #c3e6cb;
}

.support-item .icon {
  font-size: 1.2em;
}

.support-item .text {
  font-weight: 500;
  color: #495057;
}

.browser-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  font-weight: 500;
  color: #6c757d;
}

.info-row .value {
  font-weight: bold;
  color: #495057;
}

.info-row .value.strategy.offscreen-canvas {
  color: #007bff;
}

.info-row .value.strategy.traditional-canvas {
  color: #28a745;
}

.recommendations {
  margin: 0;
  padding-left: 20px;
}

.recommendations li {
  margin-bottom: 8px;
  color: #6c757d;
}

@media (max-width: 768px) {
  .demo-tabs {
    flex-wrap: wrap;
  }

  .demo-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-group {
    justify-content: space-between;
  }

  .support-grid {
    grid-template-columns: 1fr;
  }
}
</style>
