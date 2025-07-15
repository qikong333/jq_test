<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import CanvasEditor from './jqEditor_no/index.vue'

const router = useRouter()
const isFullscreen = ref(false)

// 扩展Document接口以支持浏览器前缀
interface ExtendedDocument extends Document {
  webkitFullscreenElement?: Element | null
  mozFullScreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
  mozCancelFullScreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
}

interface ExtendedElement extends Element {
  webkitRequestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

// 检查是否处于全屏状态
const checkFullscreen = () => {
  const extDoc = document as ExtendedDocument
  isFullscreen.value = !!(
    document.fullscreenElement ||
    extDoc.webkitFullscreenElement ||
    extDoc.mozFullScreenElement ||
    extDoc.msFullscreenElement
  )
}

// 进入全屏
const enterFullscreen = async () => {
  try {
    const element = document.documentElement as ExtendedElement
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen()
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen()
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen()
    }
  } catch (error) {
    console.error('进入全屏失败:', error)
  }
}

// 退出全屏
const exitFullscreen = async () => {
  try {
    const extDoc = document as ExtendedDocument
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (extDoc.webkitExitFullscreen) {
      await extDoc.webkitExitFullscreen()
    } else if (extDoc.mozCancelFullScreen) {
      await extDoc.mozCancelFullScreen()
    } else if (extDoc.msExitFullscreen) {
      await extDoc.msExitFullscreen()
    }
  } catch (error) {
    console.error('退出全屏失败:', error)
  }
}

// 切换全屏状态
const toggleFullscreen = () => {
  if (isFullscreen.value) {
    exitFullscreen()
  } else {
    enterFullscreen()
  }
}

// 返回首页
const goHome = () => {
  router.push('/')
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  checkFullscreen()
}

// 监听ESC键退出
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    goHome()
  }
}

onMounted(() => {
  // 页面加载时自动进入全屏
  enterFullscreen()

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)

  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)

  checkFullscreen()
})

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
  document.removeEventListener('keydown', handleKeydown)

  // 组件卸载时退出全屏
  if (isFullscreen.value) {
    exitFullscreen()
  }
})
</script>

<template>
  <div class="fullscreen-layer">
    <!-- 控制面板 -->
    <div class="control-panel">
      <button class="control-btn home-btn" @click="goHome" title="返回首页 (ESC)">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9,22 9,12 15,12 15,22"></polyline>
        </svg>
        <span>首页</span>
      </button>

      <button
        class="control-btn fullscreen-btn"
        @click="toggleFullscreen"
        :title="isFullscreen ? '退出全屏' : '进入全屏'"
      >
        <svg
          v-if="!isFullscreen"
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
          ></path>
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
          ></path>
        </svg>
        <span>{{ isFullscreen ? '退出全屏' : '进入全屏' }}</span>
      </button>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-area">
      <div class="editor-container">
        <CanvasEditor
          :horizontalGridCount="949"
          :verticalGridCount="1230"
          :width="300"
          :height="400"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
  z-index: 9999;
}

.control-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 10px;
  z-index: 10000;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-size: 14px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.control-btn .icon {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.content-area {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px 20px;
  box-sizing: border-box;
}

.editor-container {
  width: 100%;
  height: calc(100vh - 120px);
  max-width: 1400px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

kbd {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.9em;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    top: 10px;
    left: 10px;
    flex-direction: column;
  }

  .control-btn {
    padding: 10px 12px;
    font-size: 12px;
  }

  .control-btn span {
    display: none;
  }

  .content-area {
    padding: 60px 10px 10px;
  }

  .editor-container {
    height: calc(100vh - 80px);
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .content-area {
    padding: 60px 5px 5px;
  }

  .editor-container {
    height: calc(100vh - 70px);
    padding: 5px;
  }
}
</style>
