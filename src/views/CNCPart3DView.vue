<script setup lang="ts">
import CNCPart3D from '../components/CNCPart3D.vue'
import Navigation from '../components/Navigation.vue'
</script>

<template>
  <div>
    <Navigation />
    <main class="cnc-3d-page">
      <div class="page-header">
        <h1>6角螺丝帽3D模型</h1>
        <p>基于设计图纸的精确3D建模展示 - 不锈钢304</p>
      </div>

      <div class="model-showcase">
        <CNCPart3D />
      </div>

      <div class="model-info">
        <div class="info-section">
          <h3><i class="icon">📋</i>模型特征</h3>
          <div class="feature-grid">
            <div class="feature-item">
              <span class="feature-icon">🔧</span>
              <div class="feature-content">
                <h4>精确建模</h4>
                <p>严格按照技术图纸尺寸建模</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⚙️</span>
              <div class="feature-content">
                <h4>材质渲染</h4>
                <p>真实的6061铝合金材质效果</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💡</span>
              <div class="feature-content">
                <h4>光影效果</h4>
                <p>专业的工业照明模拟</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎮</span>
              <div class="feature-content">
                <h4>交互控制</h4>
                <p>360°旋转查看，线框模式切换</p>
              </div>
            </div>
          </div>
        </div>

        <div class="specifications">
          <h3><i class="icon">📏</i>技术规格</h3>
          <div class="spec-table">
            <div class="spec-row">
              <span class="spec-label">对边距离</span>
              <span class="spec-value">30 mm</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">厚度</span>
              <span class="spec-value">12 mm</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">螺纹规格</span>
              <span class="spec-value">M16 × 2.0</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">螺纹孔径</span>
              <span class="spec-value">Ø16 mm</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">材料</span>
              <span class="spec-value">不锈钢304</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">表面粗糙度</span>
              <span class="spec-value">Ra 1.6</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">硬度</span>
              <span class="spec-value">HRC 25-35</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.cnc-3d-page {
  padding: 100px 20px 20px 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 20px;
  background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
  border-radius: 20px;
  color: white;
  box-shadow: 0 10px 25px rgba(30, 64, 175, 0.3);
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-header p {
  font-size: 1.2rem;
  opacity: 0.9;
  font-weight: 300;
  letter-spacing: 1px;
}

.model-showcase {
  margin-bottom: 40px;
}

.model-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 30px;
}

.info-section {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.info-section h3 {
  color: #1f2937;
  margin: 0 0 25px 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #3b82f6;
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
}

.feature-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.feature-content h4 {
  margin: 0 0 5px 0;
  color: #1f2937;
  font-size: 1rem;
  font-weight: 600;
}

.feature-content p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.specifications {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.specifications h3 {
  color: #1f2937;
  margin: 0 0 25px 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.spec-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8fafc;
  border-radius: 10px;
  border-left: 4px solid #10b981;
}

.spec-label {
  font-weight: 600;
  color: #4b5563;
  font-size: 14px;
}

.spec-value {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.icon {
  font-size: 1.2em;
}

@media (max-width: 1200px) {
  .model-info {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}

@media (max-width: 768px) {
  .cnc-3d-page {
    padding: 90px 15px 15px 15px;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .page-header p {
    font-size: 1rem;
  }

  .info-section,
  .specifications {
    padding: 20px;
  }

  .feature-item {
    padding: 15px;
  }

  .feature-icon {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
}
</style>
