<script setup lang="ts">
import ThreeDemo from '../components/ThreeDemo.vue'
import ThreeScene from '../components/ThreeScene.vue'
import Navigation from '../components/Navigation.vue'
</script>

<template>
  <div>
    <Navigation />
    <main class="threejs-page">
      <div class="page-header">
        <h1>Three.js 3D展示</h1>
        <p>基于Vue3的Three.js 3D图形演示</p>
      </div>

      <!-- Three.js 演示区域 -->
      <section class="three-section">
        <ThreeDemo />
      </section>

      <!-- 基础Three.js场景 -->
      <section class="three-section">
        <h2>基础 Three.js 场景</h2>
        <ThreeScene />
      </section>
    </main>
  </div>
</template>

<style scoped>
.threejs-page {
  padding: 100px 20px 20px 20px; /* 为固定导航栏留出空间 */
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 20px;
  background: white;
  border-radius: 20px;
  color: #1f2937;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-header p {
  font-size: 1.2rem;
  opacity: 0.7;
  font-weight: 300;
}

.three-section {
  margin-bottom: 60px;
  padding: 30px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.three-section h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 1.5rem;
  font-weight: 700;
}

@media (max-width: 768px) {
  .threejs-page {
    padding: 90px 15px 15px 15px;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .page-header p {
    font-size: 1rem;
  }

  .three-section {
    padding: 20px;
    margin-bottom: 40px;
  }
}
</style>
