<template>
  <div class="floating-toolbar-demo">
    <div class="demo-header">
      <h2>🛠️ 浮动工具栏演示</h2>
      <p>工具栏现在浮动在右上角，可以折叠/展开</p>
    </div>

    <div class="demo-content">
      <div class="demo-info">
        <h3>特性说明</h3>
        <ul>
          <li>📍 固定在屏幕右上角位置</li>
          <li>🔄 支持折叠/展开切换</li>
          <li>📱 响应式设计，适配移动设备</li>
          <li>🎨 半透明背景，毛玻璃效果</li>
          <li>🌙 支持深色主题</li>
          <li>📜 内容过多时自动滚动</li>
        </ul>

        <h3>快捷键</h3>
        <div class="shortcuts">
          <div class="shortcut-item">
            <span class="key">M</span>
            <span>移动工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">P</span>
            <span>画笔</span>
          </div>
          <div class="shortcut-item">
            <span class="key">E</span>
            <span>橡皮擦</span>
          </div>
          <div class="shortcut-item">
            <span class="key">F</span>
            <span>填充</span>
          </div>
          <div class="shortcut-item">
            <span class="key">L</span>
            <span>直线</span>
          </div>
          <div class="shortcut-item">
            <span class="key">R</span>
            <span>矩形</span>
          </div>
          <div class="shortcut-item">
            <span class="key">S</span>
            <span>矩形选择</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl+Z</span>
            <span>撤销</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl+Y</span>
            <span>重做</span>
          </div>
        </div>

        <h3>使用说明</h3>
        <ol>
          <li>点击右上角的 ❌ 按钮可以折叠工具栏</li>
          <li>折叠后显示为 📋 图标，点击可展开</li>
          <li>工具按钮采用垂直布局，节省空间</li>
          <li>每个工具组都有明确的分类标签</li>
          <li>支持触屏设备的touch操作</li>
        </ol>
      </div>

      <div class="demo-canvas">
        <h3>模拟画布区域</h3>
        <div class="mock-canvas">
          <div class="canvas-info">
            <p>这里是编辑区域</p>
            <p>工具栏浮动在右上角</p>
            <p>不会占用画布空间</p>
            <div class="demo-pixels">
              <div
                v-for="i in 64"
                :key="i"
                class="pixel"
                :style="{ backgroundColor: getRandomColor() }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动工具栏 -->
    <PixelEditorToolbar
      :current-tool="currentTool"
      :current-color="currentColor"
      :brush-size="brushSize"
      :show-grid="showGrid"
      :zoom="zoom"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :selected-area="selectedArea"
      :width="canvasWidth"
      :height="canvasHeight"
      :actual-width="actualWidth"
      :actual-height="actualHeight"
      :dynamic-canvas-width="dynamicCanvasWidth"
      :dynamic-canvas-height="dynamicCanvasHeight"
      :cell-size-cm="cellSizeCm"
      :cell-size-px="cellSizePx"
      :grid-cell-width="gridCellWidth"
      :grid-cell-height="gridCellHeight"
      :grid-count="gridCount"
      :needle-count="needleCount"
      :row-count="rowCount"
      :canvas-colors="canvasColors"
      :hidden-colors="hiddenColors"
      @tool-change="handleToolChange"
      @color-change="handleColorChange"
      @brush-size-change="handleBrushSizeChange"
      @undo="handleUndo"
      @redo="handleRedo"
      @toggle-grid="handleToggleGrid"
      @clear-canvas="handleClearCanvas"
      @flip-canvas-x="handleFlipCanvasX"
      @flip-canvas-y="handleFlipCanvasY"
      @reset-view="handleResetView"
      @copy-selection="handleCopySelection"
      @cut-selection="handleCutSelection"
      @delete-selection="handleDeleteSelection"
      @clear-selection="handleClearSelection"
      @paste-selection="handlePasteSelection"
      @trigger-image-upload="handleImageUpload"
      @reset-canvas-size="handleResetCanvasSize"
      @get-canvas-colors="handleGetCanvasColors"
      @test-draw="handleTestDraw"
      @test-multi-screen="handleTestMultiScreen"
      @diagnose="handleDiagnose"
      @finish-editing="handleFinishEditing"
      @grid-cell-width-change="handleGridCellWidthChange"
      @grid-cell-height-change="handleGridCellHeightChange"
      @grid-count-width-change="handleGridCountWidthChange"
      @grid-count-height-change="handleGridCountHeightChange"
      @needle-count-change="handleNeedleCountChange"
      @row-count-change="handleRowCountChange"
      @auto-calculate-grid="handleAutoCalculateGrid"
      @reset-grid-to-default="handleResetGridToDefault"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @set-color="handleSetColor"
      @toggle-color-visibility="handleToggleColorVisibility"
      @delete-color="handleDeleteColor"
      @clear-color-filters="handleClearColorFilters"
      @clear-colors-list="handleClearColorsList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// import PixelEditorToolbar from '../../../components/PixelEditorToolbar.vue';

// 工具栏状态
const currentTool = ref('pen' as any);
const currentColor = ref('#ff0000');
const brushSize = ref(2);
const showGrid = ref(true);
const zoom = ref(1);
const canUndo = ref(true);
const canRedo = ref(false);
const selectedArea = ref(null);

// 画布信息
const canvasWidth = ref(64);
const canvasHeight = ref(64);
const actualWidth = ref(10);
const actualHeight = ref(10);
const dynamicCanvasWidth = ref(128);
const dynamicCanvasHeight = ref(96);

// 网格信息
const cellSizeCm = ref({ width: 0.15625, height: 0.15625 });
const cellSizePx = ref({ width: 8, height: 8 });
const gridCellWidth = ref(8);
const gridCellHeight = ref(8);
const gridCount = ref({ width: 64, height: 64 });
const needleCount = ref(64);
const rowCount = ref(64);

// 颜色管理
const canvasColors = ref([
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#00ffff',
]);
const hiddenColors = ref(new Set<string>());

// 事件处理
const handleToolChange = (tool: any) => {
  currentTool.value = tool;
  console.log('工具切换:', tool);
};

const handleColorChange = (color: string) => {
  currentColor.value = color;
  console.log('颜色改变:', color);
};

const handleBrushSizeChange = (size: number) => {
  brushSize.value = size;
  console.log('画笔大小:', size);
};

const handleUndo = () => {
  console.log('撤销操作');
  canRedo.value = true;
};

const handleRedo = () => {
  console.log('重做操作');
  canRedo.value = false;
};

const handleToggleGrid = () => {
  showGrid.value = !showGrid.value;
  console.log('网格显示:', showGrid.value);
};

const handleClearCanvas = () => {
  console.log('清空画布');
};

const handleFlipCanvasX = () => {
  console.log('水平翻转画布');
};

const handleFlipCanvasY = () => {
  console.log('垂直翻转画布');
};

const handleResetView = () => {
  zoom.value = 1;
  console.log('重置视图');
};

const handleCopySelection = () => {
  console.log('复制选择');
};

const handleCutSelection = () => {
  console.log('剪切选择');
};

const handleDeleteSelection = () => {
  console.log('删除选择');
};

const handleClearSelection = () => {
  selectedArea.value = null;
  console.log('清除选择');
};

const handlePasteSelection = () => {
  console.log('粘贴选择');
};

const handleImageUpload = () => {
  console.log('上传图片');
};

const handleResetCanvasSize = () => {
  dynamicCanvasWidth.value = canvasWidth.value;
  dynamicCanvasHeight.value = canvasHeight.value;
  console.log('重置画布尺寸');
};

const handleGetCanvasColors = () => {
  console.log('获取画布颜色');
};

const handleTestDraw = () => {
  console.log('测试绘制');
};

const handleTestMultiScreen = () => {
  console.log('多屏测试');
};

const handleDiagnose = () => {
  console.log('诊断');
};

const handleFinishEditing = () => {
  console.log('完成编辑');
};

const handleGridCellWidthChange = (width: number) => {
  gridCellWidth.value = width;
  console.log('网格宽度:', width);
};

const handleGridCellHeightChange = (height: number) => {
  gridCellHeight.value = height;
  console.log('网格高度:', height);
};

const handleGridCountWidthChange = (width: number) => {
  gridCount.value.width = width;
  console.log('网格数量宽度:', width);
};

const handleGridCountHeightChange = (height: number) => {
  gridCount.value.height = height;
  console.log('网格数量高度:', height);
};

const handleNeedleCountChange = (count: number) => {
  needleCount.value = count;
  console.log('针数:', count);
};

const handleRowCountChange = (count: number) => {
  rowCount.value = count;
  console.log('行数:', count);
};

const handleAutoCalculateGrid = () => {
  console.log('自动计算网格');
};

const handleResetGridToDefault = () => {
  gridCellWidth.value = 8;
  gridCellHeight.value = 8;
  console.log('重置网格默认值');
};

const handleZoomIn = () => {
  zoom.value = Math.min(zoom.value * 1.2, 5);
  console.log('放大:', zoom.value);
};

const handleZoomOut = () => {
  zoom.value = Math.max(zoom.value / 1.2, 0.1);
  console.log('缩小:', zoom.value);
};

const handleSetColor = (color: string) => {
  currentColor.value = color;
  console.log('设置颜色:', color);
};

const handleToggleColorVisibility = (color: string) => {
  if (hiddenColors.value.has(color)) {
    hiddenColors.value.delete(color);
  } else {
    hiddenColors.value.add(color);
  }
  console.log('切换颜色可见性:', color);
};

const handleDeleteColor = (color: string) => {
  const index = canvasColors.value.indexOf(color);
  if (index > -1) {
    canvasColors.value.splice(index, 1);
  }
  console.log('删除颜色:', color);
};

const handleClearColorFilters = () => {
  hiddenColors.value.clear();
  console.log('清除颜色过滤器');
};

const handleClearColorsList = () => {
  canvasColors.value = [];
  console.log('清除颜色列表');
};

// 生成随机颜色用于演示
const getRandomColor = () => {
  const colors = [
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#feca57',
    '#ff9ff3',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};
</script>

<style scoped>
.floating-toolbar-demo {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.demo-header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.demo-header h2 {
  font-size: 2.5em;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.demo-header p {
  font-size: 1.2em;
  opacity: 0.9;
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-info {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 30px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.demo-info h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.4em;
  border-bottom: 2px solid #667eea;
  padding-bottom: 5px;
}

.demo-info ul {
  list-style: none;
  padding: 0;
}

.demo-info li {
  margin-bottom: 10px;
  padding-left: 30px;
  position: relative;
}

.demo-info li::before {
  content: '✨';
  position: absolute;
  left: 0;
  top: 0;
}

.demo-info ol {
  padding-left: 20px;
}

.demo-info ol li {
  padding-left: 10px;
}

.demo-info ol li::before {
  display: none;
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.key {
  background: #343a40;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
}

.demo-canvas {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 30px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.demo-canvas h3 {
  color: #333;
  margin-bottom: 20px;
  font-size: 1.4em;
  border-bottom: 2px solid #667eea;
  padding-bottom: 5px;
}

.mock-canvas {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.canvas-info {
  text-align: center;
  color: #6c757d;
}

.canvas-info p {
  margin-bottom: 10px;
  font-size: 1.1em;
}

.demo-pixels {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  margin-top: 20px;
  max-width: 200px;
}

.pixel {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  transition: transform 0.2s;
}

.pixel:hover {
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .demo-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .demo-header h2 {
    font-size: 2em;
  }

  .demo-info,
  .demo-canvas {
    padding: 20px;
  }

  .shortcuts {
    grid-template-columns: 1fr;
  }

  .mock-canvas {
    height: 300px;
  }
}
</style>
