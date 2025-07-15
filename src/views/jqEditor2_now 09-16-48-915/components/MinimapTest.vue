<template>
  <div class="minimap-test">
    <h2>缩略图功能测试</h2>
    <div class="test-controls">
      <button class="test-btn" @click="toggleMinimap">
        {{ showMinimap ? '隐藏缩略图' : '显示缩略图' }}
      </button>
      <button class="test-btn" @click="addTestData">添加测试数据</button>
      <button class="test-btn" @click="clearTestData">清除数据</button>
    </div>

    <div class="test-canvas-container">
      <canvas
        ref="testCanvas"
        :width="canvasSize.width * pixelSize"
        :height="canvasSize.height * pixelSize"
        :style="{
          width: canvasSize.width * pixelSize + 'px',
          height: canvasSize.height * pixelSize + 'px',
        }"
      ></canvas>
    </div>

    <!-- 缩略图组件 -->
    <MinimapNavigator
      :visible="showMinimap"
      :zoom="zoom"
      :offset="offset"
      :canvas-width="canvasSize.width"
      :canvas-height="canvasSize.height"
      :container-width="800"
      :container-height="600"
      :pixel-width="pixelSize"
      :pixel-height="pixelSize"
      :canvas-data="testData"
      @viewport-change="handleViewportChange"
      @reset-view="resetView"
      @fit-to-window="fitToWindow"
      @close="showMinimap = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import MinimapNavigator from './MinimapNavigator.vue';

// 测试数据
const showMinimap = ref(true);
const zoom = ref(1);
const offset = ref({ x: 0, y: 0 });
const canvasSize = ref({ width: 50, height: 40 });
const pixelSize = 8;
const testData = ref<string[][]>([]);
const testCanvas = ref<HTMLCanvasElement>();

// 初始化测试数据
const initTestData = () => {
  testData.value = Array(canvasSize.value.height)
    .fill(null)
    .map(() => Array(canvasSize.value.width).fill('transparent'));
};

// 添加测试数据
const addTestData = () => {
  const colors = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
  ];

  // 随机添加一些彩色像素
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(Math.random() * canvasSize.value.width);
    const y = Math.floor(Math.random() * canvasSize.value.height);
    const color = colors[Math.floor(Math.random() * colors.length)];
    testData.value[y][x] = color;
  }

  // 添加一些图案
  // 绘制一个红色方块
  for (let y = 5; y < 15; y++) {
    for (let x = 5; x < 15; x++) {
      testData.value[y][x] = '#ff0000';
    }
  }

  // 绘制一个蓝色圆形（简单版）
  const centerX = 35;
  const centerY = 20;
  const radius = 8;
  for (let y = centerY - radius; y < centerY + radius; y++) {
    for (let x = centerX - radius; x < centerX + radius; x++) {
      if (
        x >= 0 &&
        x < canvasSize.value.width &&
        y >= 0 &&
        y < canvasSize.value.height
      ) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          testData.value[y][x] = '#0000ff';
        }
      }
    }
  }

  renderTestCanvas();
};

// 清除测试数据
const clearTestData = () => {
  initTestData();
  renderTestCanvas();
};

// 渲染测试画布
const renderTestCanvas = () => {
  if (!testCanvas.value) return;

  const ctx = testCanvas.value.getContext('2d');
  if (!ctx) return;

  // 清除画布
  ctx.clearRect(0, 0, testCanvas.value.width, testCanvas.value.height);

  // 绘制背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, testCanvas.value.width, testCanvas.value.height);

  // 绘制像素数据
  for (let y = 0; y < canvasSize.value.height; y++) {
    for (let x = 0; x < canvasSize.value.width; x++) {
      const color = testData.value[y][x];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  // 绘制网格
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;

  // 垂直线
  for (let x = 0; x <= canvasSize.value.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * pixelSize, 0);
    ctx.lineTo(x * pixelSize, canvasSize.value.height * pixelSize);
    ctx.stroke();
  }

  // 水平线
  for (let y = 0; y <= canvasSize.value.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * pixelSize);
    ctx.lineTo(canvasSize.value.width * pixelSize, y * pixelSize);
    ctx.stroke();
  }
};

// 缩略图控制函数
const toggleMinimap = () => {
  showMinimap.value = !showMinimap.value;
};

const handleViewportChange = (newOffset: { x: number; y: number }) => {
  offset.value = newOffset;
  console.log('视口变化:', newOffset);
};

const resetView = () => {
  zoom.value = 1;
  offset.value = { x: 0, y: 0 };
  console.log('重置视图');
};

const fitToWindow = () => {
  zoom.value = 0.8;
  offset.value = { x: 0, y: 0 };
  console.log('适合窗口');
};

// 初始化
onMounted(() => {
  initTestData();
  nextTick(() => {
    addTestData(); // 默认添加一些测试数据
  });
});
</script>

<style scoped>
.minimap-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.minimap-test h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.test-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.test-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.test-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.test-canvas-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

canvas {
  border: 1px solid #ccc;
  cursor: crosshair;
}
</style>
