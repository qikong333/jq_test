<template>
  <div class="selection-move-fix-demo">
    <h2>🔧 选中框位置偏移修复演示</h2>

    <div class="demo-content">
      <div class="demo-section">
        <h3>问题描述</h3>
        <p class="problem-desc">
          在使用高级移动功能时，发现选中框的位置会出现偏移，特别是对于圆形选择和套索选择。
          这是因为移动时只更新了选择区域的基础坐标，没有同步更新圆形的中心点坐标和套索的路径坐标。
        </p>
      </div>

      <div class="demo-section">
        <h3>修复方案</h3>
        <div class="fix-details">
          <div class="fix-item">
            <h4>🎯 矩形选择</h4>
            <p>
              只需更新 x, y 坐标即可，因为矩形选择只依赖于左上角坐标和宽高。
            </p>
            <div class="code-block">
              <pre><code>selectedArea.value.x = newX;
selectedArea.value.y = newY;</code></pre>
            </div>
          </div>

          <div class="fix-item">
            <h4>🔵 圆形选择</h4>
            <p>需要同时更新中心点坐标，确保选中框边界与实际选择区域一致。</p>
            <div class="code-block">
              <pre><code>// 更新基础坐标
selectedArea.value.x = newX;
selectedArea.value.y = newY;

// 更新圆形选择的中心点
if (selectedArea.value.type === 'circle' && 
    selectedArea.value.centerX !== undefined && 
    selectedArea.value.centerY !== undefined) {
  selectedArea.value.centerX += deltaX;
  selectedArea.value.centerY += deltaY;
}</code></pre>
            </div>
          </div>

          <div class="fix-item">
            <h4>🎨 套索选择</h4>
            <p>需要更新路径中的每个点坐标，保持选中框轮廓的正确显示。</p>
            <div class="code-block">
              <pre><code>// 更新基础坐标
selectedArea.value.x = newX;
selectedArea.value.y = newY;

// 更新套索选择的路径
if (selectedArea.value.type === 'lasso' && selectedArea.value.path) {
  selectedArea.value.path = selectedArea.value.path.map(point => ({
    x: point.x + deltaX,
    y: point.y + deltaY
  }));
}</code></pre>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>修复位置</h3>
        <div class="fix-locations">
          <div class="location-item">
            <h4>📍 精确移动函数 (moveSelection)</h4>
            <p>
              位置：
              <code>src/views/jqEditor2/index.vue:3400-3420</code>
            </p>
            <p>修复：在更新基础坐标后，同步更新圆形中心点和套索路径</p>
          </div>

          <div class="location-item">
            <h4>📍 拖拽移动函数 (applySelectionMove)</h4>
            <p>
              位置：
              <code>src/views/jqEditor2/index.vue:850-870</code>
            </p>
            <p>修复：在应用拖拽偏移时，同步更新所有相关坐标</p>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>测试步骤</h3>
        <div class="test-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>创建选择区域</h4>
              <p>使用不同的选择工具创建选择区域：</p>
              <ul>
                <li>矩形选择工具 - 测试基础移动</li>
                <li>圆形选择工具 - 测试中心点同步</li>
                <li>套索选择工具 - 测试路径同步</li>
              </ul>
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>执行移动操作</h4>
              <p>尝试两种移动方式：</p>
              <ul>
                <li>使用方向按钮进行精确移动</li>
                <li>使用拖拽移动进行自由移动</li>
              </ul>
            </div>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>验证修复效果</h4>
              <p>检查以下方面：</p>
              <ul>
                <li>选中框是否与实际内容位置一致</li>
                <li>圆形选择的边界是否正确显示</li>
                <li>套索选择的轮廓是否准确</li>
                <li>移动后是否可以正常进行二次操作</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>预期效果</h3>
        <div class="expected-results">
          <div class="result-item success">
            <span class="result-icon">✅</span>
            <div class="result-content">
              <h4>选中框位置准确</h4>
              <p>移动后选中框边界与实际选择内容完全吻合</p>
            </div>
          </div>

          <div class="result-item success">
            <span class="result-icon">✅</span>
            <div class="result-content">
              <h4>圆形边界正确</h4>
              <p>圆形选择移动后边界圆圈位置准确</p>
            </div>
          </div>

          <div class="result-item success">
            <span class="result-icon">✅</span>
            <div class="result-content">
              <h4>套索轮廓精确</h4>
              <p>套索选择移动后轮廓路径完全匹配</p>
            </div>
          </div>

          <div class="result-item success">
            <span class="result-icon">✅</span>
            <div class="result-content">
              <h4>操作连续性</h4>
              <p>移动后可以继续进行复制、剪切等操作</p>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h3>技术细节</h3>
        <div class="technical-details">
          <div class="detail-item">
            <h4>坐标系统</h4>
            <p>所有选择类型都使用统一的像素坐标系统，确保移动操作的一致性。</p>
          </div>

          <div class="detail-item">
            <h4>边界检查</h4>
            <p>移动前进行完整的边界检查，防止选择区域移出画布范围。</p>
          </div>

          <div class="detail-item">
            <h4>状态同步</h4>
            <p>确保所有相关坐标（基础坐标、中心点、路径点）同步更新。</p>
          </div>

          <div class="detail-item">
            <h4>渲染优化</h4>
            <p>修复后的坐标立即生效，无需额外的渲染处理。</p>
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
.selection-move-fix-demo {
  max-width: 900px;
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

h4 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
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

.problem-desc {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 15px;
  color: #856404;
  line-height: 1.6;
  margin: 0;
}

/* 修复方案样式 */
.fix-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fix-item {
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
}

.fix-item h4 {
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-block {
  background: #2d3748;
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-block code {
  color: #e2e8f0;
}

/* 修复位置样式 */
.fix-locations {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.location-item {
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 8px;
  padding: 15px;
}

.location-item h4 {
  margin-top: 0;
  color: #2c5530;
}

.location-item p {
  margin: 5px 0;
  color: #4a5c4a;
  font-size: 14px;
}

.location-item code {
  background: #d4edda;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #155724;
}

/* 测试步骤样式 */
.test-steps {
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
  border-left: 4px solid #007bff;
}

.step-number {
  background: #007bff;
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
}

.step-content p {
  margin: 0 0 10px 0;
  color: #555;
}

.step-content ul {
  margin: 0;
  padding-left: 20px;
  color: #555;
}

.step-content li {
  margin-bottom: 5px;
}

/* 预期效果样式 */
.expected-results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.result-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.result-item.success {
  background: #e8f5e8;
  border-color: #c3e6c3;
}

.result-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.result-content h4 {
  margin: 0 0 5px 0;
  color: #2c5530;
  font-size: 14px;
}

.result-content p {
  margin: 0;
  color: #4a5c4a;
  font-size: 13px;
  line-height: 1.4;
}

/* 技术细节样式 */
.technical-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.detail-item {
  background: #f0f8ff;
  border: 1px solid #b8daff;
  border-radius: 8px;
  padding: 15px;
}

.detail-item h4 {
  margin: 0 0 8px 0;
  color: #004085;
  font-size: 14px;
}

.detail-item p {
  margin: 0;
  color: #495057;
  font-size: 13px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .selection-move-fix-demo {
    padding: 15px;
  }

  .demo-section {
    padding: 20px;
  }

  .expected-results {
    grid-template-columns: 1fr;
  }

  .technical-details {
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
