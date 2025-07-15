<template>
  <div class="grid-example">
    <h1>网格组件示例</h1>

    <div class="example-controls">
      <div class="control-section">
        <h3>网格配置</h3>
        <div class="control-row">
          <label>宽度 (格子数):</label>
          <input
            type="number"
            v-model.number="gridWidth"
            min="10"
            max="1000"
            @change="updateGridSize"
          />
        </div>

        <div class="control-row">
          <label>高度 (格子数):</label>
          <input
            type="number"
            v-model.number="gridHeight"
            min="10"
            max="1000"
            @change="updateGridSize"
          />
        </div>

        <div class="control-row">
          <label>实际宽度 (cm):</label>
          <input
            type="number"
            v-model.number="actualWidth"
            min="1"
            max="100"
            step="0.1"
            @change="updateGridSize"
          />
        </div>

        <div class="control-row">
          <label>实际高度 (cm):</label>
          <input
            type="number"
            v-model.number="actualHeight"
            min="1"
            max="100"
            step="0.1"
            @change="updateGridSize"
          />
        </div>
      </div>

      <div class="control-section">
        <h3>外观配置</h3>
        <div class="control-row">
          <label>主网格颜色:</label>
          <input type="color" v-model="gridConfig.color" @change="updateGridConfig" />
        </div>

        <div class="control-row">
          <label>子网格颜色:</label>
          <input type="color" v-model="gridConfig.subGridColor" @change="updateGridConfig" />
        </div>

        <div class="control-row">
          <label>主网格透明度:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            v-model.number="gridConfig.opacity"
            @change="updateGridConfig"
          />
          <span>{{ gridConfig.opacity.toFixed(1) }}</span>
        </div>

        <div class="control-row">
          <label>子网格透明度:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            v-model.number="gridConfig.subGridOpacity"
            @change="updateGridConfig"
          />
          <span>{{ gridConfig.subGridOpacity.toFixed(1) }}</span>
        </div>
      </div>

      <div class="control-section">
        <h3>操作</h3>
        <div class="control-row">
          <button @click="toggleGrid">切换网格显示</button>
          <button @click="resetView">重置视图</button>
          <button @click="fitToView">适应视图</button>
          <button @click="exportImage">导出图片</button>
        </div>

        <div class="control-row">
          <label>预设缩放:</label>
          <button @click="setZoom(0.5)">50%</button>
          <button @click="setZoom(1)">100%</button>
          <button @click="setZoom(2)">200%</button>
          <button @click="setZoom(5)">500%</button>
        </div>
      </div>
    </div>

    <!-- 网格组件 -->
    <div class="grid-wrapper">
      <GridComponent
        ref="gridRef"
        :width="gridWidth"
        :height="gridHeight"
        :actual-width="actualWidth"
        :actual-height="actualHeight"
        :grid-config="gridConfig"
        @grid-click="handleGridClick"
        @grid-hover="handleGridHover"
        @zoom-change="handleZoomChange"
      />
    </div>

    <!-- 信息面板 -->
    <div class="info-panel">
      <h3>信息</h3>
      <div class="info-row">
        <span>网格尺寸:</span>
        <span>{{ gridWidth }} × {{ gridHeight }}</span>
      </div>
      <div class="info-row">
        <span>实际尺寸:</span>
        <span>{{ actualWidth }}cm × {{ actualHeight }}cm</span>
      </div>
      <div class="info-row">
        <span>格子大小:</span>
        <span>{{ cellSize.width.toFixed(2) }}px × {{ cellSize.height.toFixed(2) }}px</span>
      </div>
      <div class="info-row">
        <span>当前缩放:</span>
        <span>{{ (currentZoom * 100).toFixed(0) }}%</span>
      </div>
      <div class="info-row" v-if="hoveredCell">
        <span>悬停格子:</span>
        <span>({{ hoveredCell.x }}, {{ hoveredCell.y }})</span>
      </div>
      <div class="info-row" v-if="clickedCell">
        <span>点击格子:</span>
        <span>({{ clickedCell.x }}, {{ clickedCell.y }})</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import GridComponent from './index.vue'
import type { GridCoordinate } from './types/grid'
import { cmToPx } from './utils/coordinateUtils'

// 响应式数据
const gridWidth = ref(100)
const gridHeight = ref(200)
const actualWidth = ref(10)
const actualHeight = ref(20)
const currentZoom = ref(1)
const hoveredCell = ref<GridCoordinate | null>(null)
const clickedCell = ref<GridCoordinate | null>(null)

// 网格配置
const gridConfig = reactive({
  color: '#cccccc',
  subGridColor: '#eeeeee',
  opacity: 0.6,
  subGridOpacity: 0.3,
  lineWidth: 1,
  subGridLineWidth: 0.5,
})

// 模板引用
const gridRef = ref<InstanceType<typeof GridComponent>>()

// 计算属性
const cellSize = computed(() => {
  const actualWidthPx = cmToPx(actualWidth.value)
  const actualHeightPx = cmToPx(actualHeight.value)

  return {
    width: actualWidthPx / gridWidth.value,
    height: actualHeightPx / gridHeight.value,
  }
})

// 事件处理
const updateGridSize = () => {
  // 网格尺寸变化时的处理
  console.log('网格尺寸更新:', {
    width: gridWidth.value,
    height: gridHeight.value,
    actualWidth: actualWidth.value,
    actualHeight: actualHeight.value,
  })
}

const updateGridConfig = () => {
  // 网格配置变化时的处理
  console.log('网格配置更新:', gridConfig)
}

const handleGridClick = (coord: GridCoordinate) => {
  clickedCell.value = coord
  console.log('网格点击:', coord)
}

const handleGridHover = (coord: GridCoordinate | null) => {
  hoveredCell.value = coord
}

const handleZoomChange = (zoom: number) => {
  currentZoom.value = zoom
}

// 操作方法
const toggleGrid = () => {
  gridRef.value?.toggleGrid()
}

const resetView = () => {
  gridRef.value?.resetView()
}

const fitToView = () => {
  // 这里可以添加适应视图的逻辑
  console.log('适应视图')
}

const setZoom = (zoom: number) => {
  gridRef.value?.setZoom(zoom)
}

const exportImage = () => {
  const imageData = gridRef.value?.exportImage()
  if (imageData) {
    // 创建下载链接
    const link = document.createElement('a')
    link.download = 'grid-export.png'
    link.href = imageData
    link.click()
  }
}
</script>

<style scoped>
.grid-example {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.example-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.control-section {
  background: white;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-section h3 {
  margin: 0 0 15px 0;
  color: #555;
  font-size: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.control-row label {
  min-width: 120px;
  font-size: 14px;
  color: #666;
}

.control-row input[type='number'],
.control-row input[type='color'],
.control-row input[type='range'] {
  flex: 1;
}

.control-row input[type='number'] {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.control-row input[type='color'] {
  width: 50px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.control-row button {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.control-row button:hover {
  background: #0056b3;
}

.control-row span {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.grid-wrapper {
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  background: white;
}

.info-panel {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.info-panel h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 14px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row span:first-child {
  color: #6c757d;
  font-weight: 500;
}

.info-row span:last-child {
  color: #495057;
  font-family: 'Courier New', monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .example-controls {
    grid-template-columns: 1fr;
  }

  .control-row {
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
  }

  .control-row label {
    min-width: auto;
  }
}

/* 深色主题 */
@media (prefers-color-scheme: dark) {
  .grid-example {
    background: #1a1a1a;
    color: #e0e0e0;
  }

  h1 {
    color: #e0e0e0;
  }

  .example-controls {
    background: #2d2d2d;
  }

  .control-section {
    background: #3a3a3a;
    color: #e0e0e0;
  }

  .control-section h3 {
    color: #e0e0e0;
    border-bottom-color: #555;
  }

  .control-row label {
    color: #ccc;
  }

  .control-row input[type='number'] {
    background: #4a4a4a;
    border-color: #666;
    color: #e0e0e0;
  }

  .grid-wrapper {
    border-color: #555;
    background: #2d2d2d;
  }

  .info-panel {
    background: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  .info-panel h3 {
    color: #e0e0e0;
  }

  .info-row {
    border-bottom-color: #555;
  }

  .info-row span:first-child {
    color: #aaa;
  }

  .info-row span:last-child {
    color: #e0e0e0;
  }
}
</style>
