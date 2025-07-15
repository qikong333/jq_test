<template>
  <div class="test-page">
    <h1>基本画布组件测试 - 视图控制增强版</h1>

    <div class="test-controls">
      <button class="control-btn" @click="changeCanvasSize">
        改变画布尺寸
      </button>
      <button class="control-btn" @click="toggleReadonly">
        切换只读模式: {{ readonly ? '只读' : '可编辑' }}
      </button>
      <button class="control-btn" @click="showStats = !showStats">
        显示/隐藏统计: {{ showStats ? '显示中' : '隐藏中' }}
      </button>
    </div>

    <div class="canvas-container">
      <BasicCanvas
        ref="canvasRef"
        :width="canvasProps.width"
        :height="canvasProps.height"
        :actual-width="canvasProps.actualWidth"
        :actual-height="canvasProps.actualHeight"
        :bg-color="canvasProps.bgColor"
        :readonly="readonly"
        @finish="onFinish"
        @colors-updated="onColorsUpdated"
        @size-changed="onSizeChanged"
      />
    </div>

    <div v-if="showStats" class="stats-panel">
      <h3>画布统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">已使用颜色:</span>
          <span class="stat-value">{{ usedColors.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">格子总数:</span>
          <span class="stat-value">
            {{ canvasProps.width * canvasProps.height }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">物理尺寸:</span>
          <span class="stat-value">
            {{ canvasProps.actualWidth }}×{{ canvasProps.actualHeight }}cm
          </span>
        </div>
      </div>

      <div v-if="usedColors.length > 0" class="used-colors">
        <h4>使用的颜色:</h4>
        <div class="color-list">
          <div
            v-for="color in usedColors"
            :key="color"
            class="color-chip"
            :style="{ backgroundColor: color }"
            :title="color"
          ></div>
        </div>
      </div>
    </div>

    <div class="instructions">
      <h3>使用说明</h3>
      <ul>
        <li>鼠标拖拽进行绘制</li>
        <li>使用工具栏选择颜色和调整画笔大小</li>
        <li>
          <strong>新功能：</strong>
          <code>Ctrl+滚轮</code>
          缩放画布
        </li>
        <li>
          <strong>新功能：</strong>
          <code>Space+拖拽</code>
          平移画布
        </li>
        <li>
          <strong>新功能：</strong>
          使用缩略图导航器快速定位
        </li>
        <li>
          按
          <code>G</code>
          键切换网格显示
        </li>
        <li>
          按
          <code>T</code>
          键切换工具栏显示
        </li>
        <li>
          按
          <code>N</code>
          键切换缩略图显示
        </li>
        <li>
          按
          <code>0</code>
          键重置视图
        </li>
        <li>
          按
          <code>F</code>
          键适合窗口
        </li>
        <li>
          按
          <code>C</code>
          键清空画布
        </li>
        <li>
          按
          <code>Ctrl+S</code>
          导出图片
        </li>
        <li>
          按数字键
          <code>1-9</code>
          快速选择预设颜色
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import BasicCanvas from './index.vue';

// 组件引用
const canvasRef = ref();

// 组件状态
const readonly = ref(false);
const showStats = ref(true);
const usedColors = ref<string[]>([]);

// 画布配置
const canvasProps = reactive({
  width: 50, // 50个格子宽
  height: 40, // 40个格子高
  actualWidth: 20, // 20cm实际宽度
  actualHeight: 16, // 16cm实际高度
  bgColor: '#ffffff',
});

/**
 * 改变画布尺寸
 */
const changeCanvasSize = () => {
  const sizes = [
    { width: 50, height: 40, actualWidth: 20, actualHeight: 16 },
    { width: 100, height: 80, actualWidth: 30, actualHeight: 24 },
    { width: 30, height: 30, actualWidth: 15, actualHeight: 15 },
    { width: 200, height: 150, actualWidth: 40, actualHeight: 30 },
  ];

  const currentIndex = sizes.findIndex(
    (size) =>
      size.width === canvasProps.width && size.height === canvasProps.height,
  );

  const nextIndex = (currentIndex + 1) % sizes.length;
  const nextSize = sizes[nextIndex];

  Object.assign(canvasProps, nextSize);
};

/**
 * 切换只读模式
 */
const toggleReadonly = () => {
  readonly.value = !readonly.value;
};

/**
 * 完成事件处理
 */
const onFinish = (data: any) => {
  console.log('Canvas finished:', data);
  alert(
    `导出完成！使用了 ${data.metadata.colors.length} 种颜色，绘制了 ${data.metadata.paintedCells} 个格子。`,
  );
};

/**
 * 颜色更新事件处理
 */
const onColorsUpdated = (colors: string[]) => {
  console.log('Colors updated:', colors);
  usedColors.value = colors;
};

/**
 * 尺寸变化事件处理
 */
const onSizeChanged = (size: any) => {
  console.log('Size changed:', size);
};
</script>

<style scoped lang="scss">
.test-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.test-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;

  .control-btn {
    padding: 10px 16px;
    border: 1px solid #ddd;
    background: #f8f9fa;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;

    &:hover {
      border-color: #667eea;
      background: #f0f2ff;
    }
  }
}

.canvas-container {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  min-height: 600px;
}

.stats-panel {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;

  h3 {
    margin-top: 0;
    margin-bottom: 16px;
    color: #333;
  }

  h4 {
    margin: 16px 0 8px 0;
    color: #555;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 16px;

    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      border: 1px solid #eee;

      .stat-label {
        color: #666;
      }

      .stat-value {
        font-weight: 600;
        color: #333;
      }
    }
  }

  .used-colors {
    .color-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;

      .color-chip {
        width: 24px;
        height: 24px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.2);
        }
      }
    }
  }
}

.instructions {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;

  h3 {
    margin-top: 0;
    margin-bottom: 16px;
    color: #333;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      margin-bottom: 8px;
      color: #555;
      line-height: 1.5;

      &:last-child {
        margin-bottom: 0;
      }

      code {
        background: #f1f3f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .test-page {
    padding: 10px;
  }

  .test-controls {
    flex-direction: column;
    align-items: center;

    .control-btn {
      width: 100%;
      max-width: 300px;
    }
  }

  .stats-panel {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
