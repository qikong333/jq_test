<template>
  <nav class="navigation">
    <div class="nav-container">
      <router-link to="/" class="nav-brand">
        <span class="brand-icon">🔧</span>
        <span class="brand-text">CNC设计平台</span>
      </router-link>

      <div class="nav-links">
        <router-link to="/" class="nav-link">
          <span class="link-icon">🏠</span>
          <span>首页</span>
        </router-link>
        <router-link to="/cnc-design" class="nav-link">
          <span class="link-icon">⚙️</span>
          <span>CNC设计</span>
        </router-link>
        <router-link to="/cnc-3d" class="nav-link">
          <span class="link-icon">🎯</span>
          <span>3D模型</span>
        </router-link>
        <router-link to="/simulation" class="nav-link">
          <span class="link-icon">⚡</span>
          <span>加工模拟</span>
        </router-link>
        <router-link to="/threejs" class="nav-link">
          <span class="link-icon">🎮</span>
          <span>3D演示</span>
        </router-link>
        <router-link to="/glb-viewer" class="nav-link">
          <span class="link-icon">📦</span>
          <span>GLB查看器</span>
        </router-link>
        <router-link to="/foxpsd" class="nav-link">
          <span class="link-icon">🎨</span>
          <span>FoxPSD渲染</span>
        </router-link>
        <router-link to="/jq-editor-no" class="nav-link">
          <span class="link-icon">✏️</span>
          <span>像素编辑器(旧版)</span>
        </router-link>
        <router-link to="/jq-editor-now" class="nav-link">
          <span class="link-icon">🖌️</span>
          <span>像素编辑器(新版)</span>
        </router-link>
        <router-link to="/fullscreen-layer" class="nav-link">
          <span class="link-icon">🖥️</span>
          <span>全屏图层</span>
        </router-link>
        <router-link to="/canvas-editor" class="nav-link">
          <span class="link-icon">🎨</span>
          <span>Canvas编辑器</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
// 组件名称定义
defineOptions({
  name: 'AppNavigation',
})
</script>

<style scoped>
.navigation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.2rem;
  color: #1f2937;
  text-decoration: none;
  transition: all 0.3s ease;
}

.nav-brand:hover {
  transform: scale(1.05);
}

.brand-icon {
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 15px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  color: #4b5563;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  font-size: 14px;
}

.nav-link:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  transform: translateY(-1px);
}

.nav-link.router-link-active {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.link-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 10px 15px;
  }

  .nav-brand {
    font-size: 1rem;
  }

  .brand-text {
    display: none;
  }

  .nav-links {
    gap: 8px;
  }

  .nav-link span:not(.link-icon) {
    display: none;
  }

  .nav-link {
    padding: 8px;
    min-width: 36px;
    justify-content: center;
  }
}
</style>
