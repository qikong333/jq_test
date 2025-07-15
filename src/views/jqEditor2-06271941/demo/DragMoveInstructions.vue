<template>
  <div class="drag-move-instructions">
    <div class="instruction-header">
      <h3>🎯 选择区域拖拽移动功能说明</h3>
    </div>

    <div class="instruction-content">
      <div class="step-card">
        <div class="step-icon">1️⃣</div>
        <div class="step-info">
          <h4>选择区域</h4>
          <p>使用选择工具选中要移动的区域：</p>
          <div class="tool-list">
            <span class="tool-item">⬚ 矩形选择</span>
            <span class="tool-item">⭕ 圆形选择</span>
            <span class="tool-item">🎯 套索选择</span>
          </div>
        </div>
      </div>

      <div class="step-card">
        <div class="step-icon">2️⃣</div>
        <div class="step-info">
          <h4>切换移动工具</h4>
          <p>点击工具栏中的移动工具：</p>
          <div class="tool-highlight">
            <span class="move-tool">✋ 移动</span>
            <small>
              或按快捷键
              <kbd>M</kbd>
            </small>
          </div>
        </div>
      </div>

      <div class="step-card">
        <div class="step-icon">3️⃣</div>
        <div class="step-info">
          <h4>拖拽移动</h4>
          <p>在选中区域内按住鼠标左键拖拽：</p>
          <div class="cursor-demo">
            <span class="cursor-item">
              <span class="cursor-icon">👆</span>
              悬停显示
              <code>grab</code>
              光标
            </span>
            <span class="cursor-item">
              <span class="cursor-icon">✊</span>
              拖拽时显示
              <code>grabbing</code>
              光标
            </span>
          </div>
        </div>
      </div>

      <div class="step-card">
        <div class="step-icon">4️⃣</div>
        <div class="step-info">
          <h4>确认移动</h4>
          <p>松开鼠标确认移动，支持撤销操作</p>
          <div class="feature-tags">
            <span class="tag">✅ 实时预览</span>
            <span class="tag">🔄 支持撤销</span>
            <span class="tag">🛡️ 边界保护</span>
          </div>
        </div>
      </div>
    </div>

    <div class="instruction-footer">
      <div class="tip">
        <span class="tip-icon">💡</span>
        <strong>提示：</strong>
        选择区域后，工具栏会显示"💡 使用移动工具可拖拽选中区域"的提示
      </div>
    </div>
  </div>
</template>

<script setup>
// 这是一个纯展示组件，不需要任何逻辑
</script>

<style scoped>
.drag-move-instructions {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.instruction-header {
  text-align: center;
  margin-bottom: 25px;
}

.instruction-header h3 {
  color: #495057;
  font-size: 1.5em;
  margin: 0;
  font-weight: 600;
}

.instruction-content {
  display: grid;
  gap: 16px;
}

.step-card {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.step-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.step-icon {
  font-size: 1.8em;
  flex-shrink: 0;
  width: 40px;
  text-align: center;
}

.step-info {
  flex: 1;
}

.step-info h4 {
  margin: 0 0 8px 0;
  color: #343a40;
  font-size: 1.1em;
  font-weight: 600;
}

.step-info p {
  margin: 0 0 10px 0;
  color: #6c757d;
  line-height: 1.4;
}

.tool-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-item {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.9em;
  color: #495057;
}

.tool-highlight {
  display: flex;
  align-items: center;
  gap: 10px;
}

.move-tool {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1em;
}

.tool-highlight small {
  color: #6c757d;
}

.tool-highlight kbd {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-family: monospace;
}

.cursor-demo {
  display: grid;
  gap: 8px;
}

.cursor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: #6c757d;
}

.cursor-icon {
  font-size: 1.2em;
}

.cursor-item code {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #e83e8c;
}

.feature-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 500;
}

.instruction-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

.tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(0, 123, 255, 0.1);
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.tip-icon {
  font-size: 1.2em;
  flex-shrink: 0;
}

.tip strong {
  color: #007bff;
}

@media (max-width: 768px) {
  .drag-move-instructions {
    padding: 15px;
  }

  .step-card {
    padding: 15px;
  }

  .tool-list {
    flex-direction: column;
    gap: 6px;
  }

  .tool-highlight {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .feature-tags {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
