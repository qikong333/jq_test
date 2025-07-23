<template>
  <div class="advanced-move-demo">
    <h2>🔄 高级移动功能演示</h2>

    <div class="demo-content">
      <div class="demo-section">
        <h3>功能介绍</h3>
        <p>高级移动功能为选中区域提供了两种移动方式：</p>
        <ul>
          <li>
            <strong>🔄 拖拽移动</strong>
            ：鼠标拖拽选中区域进行自由移动
          </li>
          <li>
            <strong>⬆️⬇️⬅️➡️ 精确移动</strong>
            ：按像素精确移动选中区域
          </li>
        </ul>
      </div>

      <div class="demo-section">
        <h3>使用步骤</h3>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>选择区域</h4>
              <p>使用矩形选择、圆形选择或套索选择工具选中要移动的区域</p>
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>选择移动方式</h4>
              <p>在"高级移动"面板中选择移动方式：</p>
              <ul>
                <li>
                  <strong>🔄 拖拽移动</strong>
                  ：激活拖拽模式，在选中区域内拖拽
                </li>
                <li>
                  <strong>方向按钮</strong>
                  ：⬆️上移、⬇️下移、⬅️左移、➡️右移（每次1像素）
                </li>
              </ul>
            </div>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>执行移动</h4>
              <p>根据选择的方式进行移动操作，支持撤销/重做</p>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>功能特点</h3>
        <div class="features">
          <div class="feature">
            <div class="feature-icon">🎯</div>
            <div class="feature-content">
              <h4>精确控制</h4>
              <p>支持像素级精确移动，满足精细编辑需求</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">🖱️</div>
            <div class="feature-content">
              <h4>拖拽操作</h4>
              <p>直观的鼠标拖拽操作，实时预览移动效果</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">🔒</div>
            <div class="feature-content">
              <h4>边界保护</h4>
              <p>自动检测画布边界，防止移动超出范围</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">↩️</div>
            <div class="feature-content">
              <h4>撤销支持</h4>
              <p>所有移动操作都支持撤销和重做</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">🎨</div>
            <div class="feature-content">
              <h4>多选择类型</h4>
              <p>支持矩形、圆形、套索等所有选择类型</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">⚡</div>
            <div class="feature-content">
              <h4>性能优化</h4>
              <p>高效的像素操作，流畅的移动体验</p>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>操作技巧</h3>
        <div class="tips">
          <div class="tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">
              拖拽移动时，鼠标指针会变为抓手形状，释放鼠标完成移动
            </span>
          </div>
          <div class="tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">
              精确移动按钮可以连续点击，实现多像素移动
            </span>
          </div>
          <div class="tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">
              移动操作会自动保存到历史记录，可以随时撤销
            </span>
          </div>
          <div class="tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">
              拖拽移动时会显示半透明预览，帮助精确定位
            </span>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>应用场景</h3>
        <div class="scenarios">
          <div class="scenario">
            <h4>🎨 图案设计</h4>
            <p>调整图案元素的位置，优化整体布局</p>
          </div>
          <div class="scenario">
            <h4>🔧 错误修正</h4>
            <p>快速移动错位的图案部分到正确位置</p>
          </div>
          <div class="scenario">
            <h4>📐 精确对齐</h4>
            <p>使用精确移动实现像素级的对齐效果</p>
          </div>
          <div class="scenario">
            <h4>🎯 细节调整</h4>
            <p>对选中区域进行微调，达到理想效果</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这是一个纯展示组件，无需额外逻辑
</script>

<style scoped>
.advanced-move-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h2 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 700;
}

h3 {
  color: #34495e;
  margin-bottom: 15px;
  font-size: 20px;
  font-weight: 600;
  border-bottom: 2px solid #e74c3c;
  padding-bottom: 5px;
}

.demo-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.demo-section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8e8e8;
}

.demo-section p {
  color: #555;
  line-height: 1.6;
  margin-bottom: 15px;
}

.demo-section ul {
  color: #555;
  line-height: 1.6;
  margin-left: 20px;
}

.demo-section li {
  margin-bottom: 8px;
}

/* 步骤样式 */
.steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #e74c3c;
}

.step-number {
  background: #e74c3c;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 16px;
}

.step-content p {
  margin: 0 0 10px 0;
  color: #555;
}

.step-content ul {
  margin: 0;
  padding-left: 20px;
}

/* 功能特点样式 */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.feature-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.feature-content h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.feature-content p {
  margin: 0;
  color: #666;
  font-size: 13px;
  line-height: 1.4;
}

/* 技巧样式 */
.tips {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tip-text {
  color: #856404;
  font-size: 14px;
  line-height: 1.4;
}

/* 应用场景样式 */
.scenarios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.scenario {
  padding: 15px;
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 8px;
}

.scenario h4 {
  margin: 0 0 8px 0;
  color: #2c5530;
  font-size: 14px;
  font-weight: 600;
}

.scenario p {
  margin: 0;
  color: #4a5c4a;
  font-size: 13px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .advanced-move-demo {
    padding: 15px;
  }

  .demo-section {
    padding: 20px;
  }

  .features {
    grid-template-columns: 1fr;
  }

  .scenarios {
    grid-template-columns: 1fr;
  }

  .step {
    flex-direction: column;
    text-align: center;
  }

  .step-number {
    align-self: center;
  }
}
</style>
