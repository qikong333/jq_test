<template>
  <div class="selection-drag-demo">
    <div class="demo-header">
      <h2>🎯 选择区域拖拽移动演示</h2>
      <p>选择工具现在支持拖拽移动功能！</p>
    </div>

    <div class="demo-content">
      <div class="demo-info">
        <h3>🚀 新增功能</h3>
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">🔄</span>
            <div class="feature-desc">
              <strong>智能拖拽移动</strong>
              <p>使用移动工具点击选中区域，即可拖拽移动选中的像素内容</p>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">👁️</span>
            <div class="feature-desc">
              <strong>实时预览</strong>
              <p>拖拽过程中实时显示半透明预览，松开鼠标确认移动</p>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">🎯</span>
            <div class="feature-desc">
              <strong>精确定位</strong>
              <p>基于像素级精确定位，支持矩形、圆形、套索三种选择类型</p>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">🛡️</span>
            <div class="feature-desc">
              <strong>边界保护</strong>
              <p>自动检测画布边界，防止移动超出可视区域</p>
            </div>
          </div>
        </div>

        <h3>📖 使用说明</h3>
        <div class="instructions">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <strong>选择区域</strong>
              <p>使用矩形选择、圆形选择或套索选择工具选中要移动的区域</p>
            </div>
          </div>

          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <strong>切换移动工具</strong>
              <p>
                点击工具栏中的"移动工具"或按快捷键
                <kbd>M</kbd>
              </p>
            </div>
          </div>

          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <strong>拖拽移动</strong>
              <p>在选中区域内按住鼠标左键并拖拽到目标位置</p>
            </div>
          </div>

          <div class="step">
            <span class="step-number">4</span>
            <div class="step-content">
              <strong>确认移动</strong>
              <p>松开鼠标左键确认移动，系统会自动应用变更并支持撤销</p>
            </div>
          </div>
        </div>

        <h3>💡 高级技巧</h3>
        <div class="tips">
          <div class="tip">
            <span class="tip-icon">💡</span>
            <div>
              <strong>组合操作：</strong>
              先复制选中区域，然后移动，可以实现复制+移动的效果
            </div>
          </div>

          <div class="tip">
            <span class="tip-icon">⚡</span>
            <div>
              <strong>快速取消：</strong>
              拖拽过程中将鼠标移出画布区域可以取消本次移动操作
            </div>
          </div>

          <div class="tip">
            <span class="tip-icon">🎨</span>
            <div>
              <strong>精细操作：</strong>
              放大画布后进行移动操作，可以实现像素级的精确定位
            </div>
          </div>

          <div class="tip">
            <span class="tip-icon">🔄</span>
            <div>
              <strong>撤销支持：</strong>
              所有移动操作都支持撤销（Ctrl+Z）和重做（Ctrl+Y）
            </div>
          </div>
        </div>

        <h3>🎯 支持的选择类型</h3>
        <div class="selection-types">
          <div class="selection-type">
            <div class="type-icon">▭</div>
            <div class="type-info">
              <strong>矩形选择</strong>
              <p>选择矩形区域内的所有像素</p>
            </div>
          </div>

          <div class="selection-type">
            <div class="type-icon">●</div>
            <div class="type-info">
              <strong>圆形选择</strong>
              <p>选择圆形区域内的所有像素</p>
            </div>
          </div>

          <div class="selection-type">
            <div class="type-icon">🎨</div>
            <div class="type-info">
              <strong>套索选择</strong>
              <p>自由绘制选择区域轮廓</p>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-controls">
        <h3>🛠️ 相关工具</h3>
        <div class="tool-buttons">
          <button class="tool-btn" @click="setTool('select')">
            <span class="tool-icon">▭</span>
            矩形选择
          </button>
          <button class="tool-btn" @click="setTool('circleSelect')">
            <span class="tool-icon">●</span>
            圆形选择
          </button>
          <button class="tool-btn" @click="setTool('lassoSelect')">
            <span class="tool-icon">🎨</span>
            套索选择
          </button>
          <button class="tool-btn primary" @click="setTool('move')">
            <span class="tool-icon">✋</span>
            移动工具
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['tool-change']);

const setTool = (tool: string) => {
  emit('tool-change', tool);
};
</script>

<style scoped>
.selection-drag-demo {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
}

.demo-header h2 {
  font-size: 2.2em;
  margin: 0 0 10px 0;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.demo-header p {
  font-size: 1.1em;
  opacity: 0.9;
  margin: 0;
}

.demo-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  align-items: start;
}

.demo-info h3 {
  font-size: 1.4em;
  margin: 0 0 15px 0;
  color: #fff;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 8px;
}

.feature-list {
  display: grid;
  gap: 15px;
  margin-bottom: 30px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.feature-icon {
  font-size: 1.8em;
  flex-shrink: 0;
}

.feature-desc strong {
  display: block;
  font-size: 1.1em;
  margin-bottom: 5px;
  color: #fff;
}

.feature-desc p {
  margin: 0;
  opacity: 0.9;
  line-height: 1.4;
}

.instructions {
  display: grid;
  gap: 15px;
  margin-bottom: 30px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 12px;
}

.step-number {
  background: #fff;
  color: #667eea;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content strong {
  display: block;
  margin-bottom: 5px;
  color: #fff;
}

.step-content p {
  margin: 0;
  opacity: 0.9;
  line-height: 1.4;
}

.step-content kbd {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.tips {
  display: grid;
  gap: 12px;
  margin-bottom: 30px;
}

.tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255, 255, 255, 0.08);
  padding: 12px;
  border-radius: 8px;
}

.tip-icon {
  font-size: 1.2em;
  flex-shrink: 0;
}

.tip strong {
  color: #fff;
}

.selection-types {
  display: grid;
  gap: 15px;
}

.selection-type {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 12px;
}

.type-icon {
  font-size: 1.8em;
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.type-info strong {
  display: block;
  margin-bottom: 5px;
  color: #fff;
}

.type-info p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9em;
}

.demo-controls {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  height: fit-content;
}

.demo-controls h3 {
  font-size: 1.4em;
  margin: 0 0 20px 0;
  color: #fff;
  text-align: center;
}

.tool-buttons {
  display: grid;
  gap: 12px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid transparent;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.tool-btn.primary {
  background: linear-gradient(135deg, #ff6b6b, #ffa500);
  border-color: rgba(255, 255, 255, 0.3);
}

.tool-btn.primary:hover {
  background: linear-gradient(135deg, #ff5252, #ff9500);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
}

.tool-icon {
  font-size: 1.2em;
}

@media (max-width: 768px) {
  .demo-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .demo-header h2 {
    font-size: 1.8em;
  }

  .feature-item,
  .step {
    padding: 12px;
  }
}
</style>
