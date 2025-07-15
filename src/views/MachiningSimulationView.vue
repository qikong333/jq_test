<template>
  <div class="machining-simulation-view">
    <div class="page-header">
      <div class="header-content">
        <h1><i class="icon">⚡</i>CNC加工模拟系统</h1>
        <p class="subtitle">实时可视化CNC加工过程，从G代码到成品的全程模拟</p>
      </div>
    </div>

    <div class="simulation-container">
      <MachiningSimulation />
    </div>

    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">🛠️</div>
        <h3>刀具系统</h3>
        <p>支持多种刀具类型：立铣刀、钻头、丝锥等，精确模拟刀具几何形状和切削参数</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>G代码解析</h3>
        <p>实时解析G代码指令，生成精确的刀具路径，支持直线插补和圆弧插补</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3>材料移除</h3>
        <p>基于CSG布尔运算的精确材料移除算法，实时计算切削体积和加工进度</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⏱️</div>
        <h3>时间控制</h3>
        <p>灵活的播放控制：播放/暂停、速度调节、单步执行、进度跳转等功能</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">💎</div>
        <h3>切屑效果</h3>
        <p>真实的切屑粒子系统，模拟金属切削过程中的切屑飞溅和堆积效果</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🌊</div>
        <h3>冷却系统</h3>
        <p>可选的冷却液效果模拟，展示现代CNC加工中的冷却液喷射过程</p>
      </div>
    </div>

    <div class="technical-specs">
      <h2>技术规格</h2>
      <div class="specs-grid">
        <div class="spec-section">
          <h4>支持的G代码</h4>
          <ul>
            <li>G00 - 快速定位</li>
            <li>G01 - 直线插补</li>
            <li>G02/G03 - 圆弧插补</li>
            <li>G21 - 公制单位</li>
            <li>G90/G91 - 绝对/增量坐标</li>
            <li>M03/M05 - 主轴控制</li>
          </ul>
        </div>

        <div class="spec-section">
          <h4>刀具参数</h4>
          <ul>
            <li>直径：1-50mm</li>
            <li>长度：10-200mm</li>
            <li>材质：硬质合金、高速钢</li>
            <li>转速：100-10000 RPM</li>
            <li>进给：10-2000 mm/min</li>
          </ul>
        </div>

        <div class="spec-section">
          <h4>材料支持</h4>
          <ul>
            <li>不锈钢304/316</li>
            <li>铝合金6061/7075</li>
            <li>碳钢Q235/45#</li>
            <li>铜合金H62/H68</li>
            <li>工程塑料POM/PEEK</li>
          </ul>
        </div>

        <div class="spec-section">
          <h4>精度指标</h4>
          <ul>
            <li>定位精度：±0.01mm</li>
            <li>重复精度：±0.005mm</li>
            <li>表面粗糙度：Ra0.8-6.3</li>
            <li>几何公差：IT6-IT9</li>
            <li>刀具寿命预测：95%准确率</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="usage-guide">
      <h2>使用指南</h2>
      <div class="guide-steps">
        <div class="step-card">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>加载G代码</h4>
            <p>系统会自动加载当前零件的G代码程序，解析刀具路径和加工参数</p>
          </div>
        </div>

        <div class="step-card">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>选择刀具</h4>
            <p>根据加工需求选择合适的刀具类型，系统会显示刀具的详细参数</p>
          </div>
        </div>

        <div class="step-card">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>开始模拟</h4>
            <p>点击播放按钮开始加工模拟，可以调节速度或使用单步模式观察细节</p>
          </div>
        </div>

        <div class="step-card">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>分析结果</h4>
            <p>查看加工统计信息：材料移除量、加工时间、刀具路径长度等数据</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MachiningSimulation from '../components/MachiningSimulation.vue'
</script>

<style scoped>
.machining-simulation-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 0 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 0 20px;
}

.header-content h1 {
  color: white;
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  margin: 0;
  font-weight: 300;
  max-width: 600px;
  margin: 0 auto;
}

.simulation-container {
  max-width: 1400px;
  margin: 0 auto 60px auto;
  padding: 0 20px;
}

.feature-grid {
  max-width: 1200px;
  margin: 0 auto 60px auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  display: block;
}

.feature-card h3 {
  color: #1f2937;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 15px 0;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

.technical-specs {
  max-width: 1200px;
  margin: 0 auto 60px auto;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.technical-specs h2 {
  text-align: center;
  color: #1f2937;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 40px 0;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.spec-section h4 {
  color: #3b82f6;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 15px 0;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
}

.spec-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.spec-section li {
  color: #4b5563;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  position: relative;
  padding-left: 20px;
}

.spec-section li:before {
  content: '▶';
  color: #3b82f6;
  position: absolute;
  left: 0;
  font-size: 10px;
}

.usage-guide {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.usage-guide h2 {
  text-align: center;
  color: #1f2937;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 40px 0;
}

.guide-steps {
  display: grid;
  gap: 20px;
}

.step-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 25px;
  background: #f8fafc;
  border-radius: 15px;
  border-left: 5px solid #3b82f6;
}

.step-number {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.step-content h4 {
  color: #1f2937;
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.step-content p {
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

.icon {
  font-size: 1em;
}

@media (max-width: 768px) {
  .header-content h1 {
    font-size: 2rem;
    flex-direction: column;
    gap: 10px;
  }

  .subtitle {
    font-size: 1rem;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .specs-grid {
    grid-template-columns: 1fr;
  }

  .step-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
