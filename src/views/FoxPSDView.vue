<template>
  <div class="foxpsd-viewer">
    <div class="header-controls">
      <h1>FoxPSD 3D渲染</h1>
      <div class="control-buttons">
        <button @click="resetView" class="btn primary">重置视角</button>
        <button @click="toggleControls" class="btn secondary">
          {{ showControls ? '隐藏控件' : '显示控件' }}
        </button>
        <button @click="goBack" class="btn outline">返回</button>
      </div>
    </div>

    <!-- FoxPSD 渲染容器 -->
    <div
      ref="foxpsdContainer"
      class="foxpsd-container"
      :class="{ 'controls-hidden': !showControls }"
    >
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>正在加载FoxPSD渲染器...</p>
      </div>

      <div v-if="error" class="error-overlay">
        <div class="error-content">
          <h3>渲染错误</h3>
          <p>{{ error }}</p>
          <button @click="retryLoad" class="btn primary">重试</button>
        </div>
      </div>
    </div>

    <!-- 渲染控制面板 -->
    <div v-if="showControls" class="control-panel">
      <div class="panel-section">
        <h3>交互设置</h3>
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="enableRotation" @change="updateControls" />
            启用旋转
          </label>
        </div>

        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="enableZoom" @change="updateControls" />
            启用缩放
          </label>
        </div>

        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="autoRotate" @change="updateControls" />
            自动旋转
          </label>
        </div>
      </div>

      <div class="panel-section">
        <h3>纹理设置</h3>
        <div class="setting-group">
          <label>选择纹理:</label>
          <select v-model="selectedTexture" @change="updateTexture" class="select-field">
            <option value="">原始材质</option>
            <option value="cotton">棉布</option>
            <option value="denim">牛仔布</option>
            <option value="silk">丝绸</option>
            <option value="wool">羊毛</option>
            <option value="linen">亚麻</option>
            <option value="knit">针织</option>
            <option value="velvet">天鹅绒</option>
            <option value="canvas">帆布</option>
            <option value="lace">蕾丝</option>
          </select>
        </div>

        <div class="setting-group" v-if="selectedTexture">
          <label>纹理重复 (X轴):</label>
          <input
            type="range"
            min="1"
            max="10"
            v-model="textureRepeatX"
            @input="updateTextureRepeat"
            class="range-slider"
          />
          <span class="range-value">{{ textureRepeatX }}</span>
        </div>

        <div class="setting-group" v-if="selectedTexture">
          <label>纹理重复 (Y轴):</label>
          <input
            type="range"
            min="1"
            max="10"
            v-model="textureRepeatY"
            @input="updateTextureRepeat"
            class="range-slider"
          />
          <span class="range-value">{{ textureRepeatY }}</span>
        </div>

        <div class="setting-group" v-if="selectedTexture">
          <button @click="applyToAllMaterials" class="btn secondary small">应用到所有材质</button>
          <button @click="resetMaterials" class="btn outline small">重置材质</button>
        </div>

        <!-- 纹理预览 -->
        <div class="texture-preview" v-if="selectedTexture">
          <img :src="getTexturePreviewUrl(selectedTexture)" :alt="selectedTexture" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式状态
const foxpsdContainer = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref('')
const showControls = ref(true)
const renderStatus = ref('初始化中')
const renderTime = ref(0)

// FoxPSD 配置
const currentGoodsSku = ref('1689662363816701034')
const token = ref('Basic d68d51cfca94f9d1e43a6537b61268069a8474f47be8a182ff77e7f8a316d7cc')

// 渲染设置
const renderQuality = ref('high')
const background = ref('white')
const enableRotation = ref(true)
const enableZoom = ref(true)
const autoRotate = ref(false)

// 纹理设置
const selectedTexture = ref('')
const textureRepeatX = ref(1)
const textureRepeatY = ref(1)

// FoxPSD SDK 实例
let foxpsdInstance: any = null

// 调试信息
const sdkLoaded = ref(false)
const isOnline = ref(navigator.onLine)
const browserInfo = ref(navigator.userAgent.split(' ')[0])

const initFoxPSD = async () => {
  if (!foxpsdContainer.value) return

  try {
    const startTime = Date.now()
    renderStatus.value = '正在加载SDK'

    // 动态加载 FoxPSD SDK (不会抛出错误，会优雅降级)
    await loadFoxPSDSDK()

    renderStatus.value = '初始化渲染器'

    // 初始化 FoxPSD 渲染器
    const config = {
      container: foxpsdContainer.value,
      goodsSku: currentGoodsSku.value,
      token: token.value,
      width: foxpsdContainer.value.clientWidth,
      height: foxpsdContainer.value.clientHeight,
      quality: renderQuality.value,
      background: background.value,
      controls: {
        enableRotation: enableRotation.value,
        enableZoom: enableZoom.value,
        autoRotate: autoRotate.value,
      },
      onLoad: () => {
        loading.value = false
        renderStatus.value = '渲染完成'
        renderTime.value = Date.now() - startTime
      },
      onError: (err: string) => {
        error.value = err
        loading.value = false
        renderStatus.value = '渲染失败'
      },
    }

    // 创建FoxPSD渲染器实例
    foxpsdInstance = await createFoxPSDRenderer(config)
  } catch (err) {
    console.error('FoxPSD initialization failed:', err)
    error.value = `初始化失败: ${err instanceof Error ? err.message : '未知错误'}`
    loading.value = false
    renderStatus.value = '初始化失败'
  }
}

// 动态加载 FoxPSD SDK
const loadFoxPSDSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (window.FoxPSD) {
      resolve()
      return
    }

    // 尝试加载多个可能的SDK地址
    const sdkUrls = [
      'https://cdn.foxpsd.com/sdk/foxpsd-sdk.min.js',
      'https://sdk.foxpsd.com/js/foxpsd-sdk.min.js',
      'https://assets.foxpsd.com/sdk/latest/foxpsd.min.js',
    ]

    let currentUrlIndex = 0

    const tryLoadSDK = () => {
      if (currentUrlIndex >= sdkUrls.length) {
        // 所有URL都尝试过了，跳过SDK加载，直接使用API模式
        console.log('所有SDK URL都无法访问，将使用API调用模式')
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = sdkUrls[currentUrlIndex]

      script.onload = () => {
        console.log(`FoxPSD SDK 成功加载: ${script.src}`)
        sdkLoaded.value = true
        resolve()
      }

      script.onerror = () => {
        console.log(`SDK加载失败: ${script.src}`)
        document.head.removeChild(script)
        currentUrlIndex++
        // 尝试下一个URL
        setTimeout(tryLoadSDK, 100)
      }

      document.head.appendChild(script)
    }

    tryLoadSDK()
  })
}

// 创建FoxPSD渲染器（基于真实SDK模式）
const createFoxPSDRenderer = async (config: any) => {
  try {
    // 如果有真实的FoxPSD SDK，使用以下方式初始化
    if (window.FoxPSD) {
      const renderer = new window.FoxPSD.Renderer({
        container: config.container,
        goodsSku: config.goodsSku,
        token: config.token,
        width: config.width,
        height: config.height,
        options: {
          quality: config.quality,
          background: config.background,
          controls: config.controls,
        },
      })

      renderer.on('load', config.onLoad)
      renderer.on('error', config.onError)

      await renderer.init()
      return renderer
    }

    // 如果SDK不可用，创建HTTP API调用示例
    const renderResponse = await fetch('https://api.foxpsd.com/render', {
      method: 'POST',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goodsSku: config.goodsSku,
        quality: config.quality,
        width: config.width,
        height: config.height,
        background: config.background,
      }),
    })

    if (!renderResponse.ok) {
      throw new Error(`FoxPSD API Error: ${renderResponse.status}`)
    }

    const renderData = await renderResponse.json()

    // 创建渲染容器
    const iframe = document.createElement('iframe')
    iframe.src =
      renderData.renderUrl ||
      `https://viewer.foxpsd.com/embed?sku=${config.goodsSku}&token=${encodeURIComponent(config.token)}`
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'

    config.container.appendChild(iframe)

    // 模拟加载完成
    setTimeout(() => {
      config.onLoad()
    }, 1000)

    return {
      iframe,
      updateQuality: (quality: string) => {
        // 通过postMessage与iframe通信
        iframe.contentWindow?.postMessage(
          {
            type: 'updateQuality',
            quality: quality,
          },
          '*',
        )
      },
      updateBackground: (bg: string) => {
        iframe.contentWindow?.postMessage(
          {
            type: 'updateBackground',
            background: bg,
          },
          '*',
        )
      },
      updateControls: (controls: any) => {
        iframe.contentWindow?.postMessage(
          {
            type: 'updateControls',
            controls: controls,
          },
          '*',
        )
      },
      reset: () => {
        iframe.contentWindow?.postMessage(
          {
            type: 'resetView',
          },
          '*',
        )
      },
    }
  } catch (apiError) {
    console.log('FoxPSD API不可用，使用本地Three.js渲染器')

    // 使用Three.js渲染GLB模型
    const { createThreeRenderer } = await import('../utils/threeHelper.ts')

    const threeRenderer = await createThreeRenderer({
      container: config.container,
      modelPath: '/816fd13e-1ab8-478e-bc83-5cbda868ba20.glb',
      background: config.background,
      quality: config.quality,
      controls: config.controls,
      onLoad: config.onLoad,
      onError: config.onError,
    })

    console.log('Three.js GLB渲染器初始化完成')

    return threeRenderer
  }
}

const getBackgroundStyle = (bg: string): string => {
  switch (bg) {
    case 'transparent':
      return 'transparent'
    case 'white':
      return '#ffffff'
    case 'black':
      return '#000000'
    case 'gradient':
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    default:
      return '#ffffff'
  }
}

// 控制方法
const resetView = () => {
  if (foxpsdInstance && foxpsdInstance.reset) {
    foxpsdInstance.reset()
  }
}

const toggleControls = () => {
  showControls.value = !showControls.value
}

const updateRender = () => {
  // 重新初始化渲染器
  if (foxpsdContainer.value) {
    foxpsdContainer.value.innerHTML = ''
    loading.value = true
    error.value = ''
    initFoxPSD()
  }
}

const updateQuality = () => {
  if (foxpsdInstance && foxpsdInstance.updateQuality) {
    foxpsdInstance.updateQuality(renderQuality.value)
  }
}

const updateBackground = () => {
  if (foxpsdInstance && foxpsdInstance.updateBackground) {
    foxpsdInstance.updateBackground(background.value)
  }
}

const updateControls = () => {
  if (foxpsdInstance && foxpsdInstance.updateControls) {
    foxpsdInstance.updateControls({
      enableRotation: enableRotation.value,
      enableZoom: enableZoom.value,
      autoRotate: autoRotate.value,
    })
  }
}

const retryLoad = () => {
  error.value = ''
  loading.value = true
  initFoxPSD()
}

const goBack = () => {
  router.push('/glb-viewer')
}

// 纹理相关方法
const updateTexture = () => {
  if (foxpsdInstance && foxpsdInstance.updateTexture) {
    foxpsdInstance.updateTexture(selectedTexture.value, {
      repeatX: textureRepeatX.value,
      repeatY: textureRepeatY.value,
    })
  }
}

const updateTextureRepeat = () => {
  if (foxpsdInstance && foxpsdInstance.updateTextureRepeat) {
    foxpsdInstance.updateTextureRepeat(textureRepeatX.value, textureRepeatY.value)
  }
}

const applyToAllMaterials = () => {
  if (foxpsdInstance && foxpsdInstance.applyTextureToAll) {
    foxpsdInstance.applyTextureToAll(selectedTexture.value, {
      repeatX: textureRepeatX.value,
      repeatY: textureRepeatY.value,
    })
  }
}

const resetMaterials = () => {
  if (foxpsdInstance && foxpsdInstance.resetMaterials) {
    foxpsdInstance.resetMaterials()
    selectedTexture.value = ''
    textureRepeatX.value = 1
    textureRepeatY.value = 1
  }
}

const getTexturePreviewUrl = (texture: string): string => {
  const textureMap: { [key: string]: string } = {
    cotton: '/textures/cotton_diffuse.jpg',
    denim: '/textures/denim_diffuse.jpg',
    silk: '/textures/silk_diffuse.jpg',
    wool: '/textures/wool_diffuse.jpg',
    linen: '/textures/linen_diffuse.jpg',
    knit: '/textures/knit_diffuse.jpg',
    velvet: '/textures/velvet_diffuse.jpg',
    canvas: '/textures/canvas_diffuse.jpg',
    lace: '/textures/lace_diffuse.jpg',
  }
  return textureMap[texture] || ''
}

// 窗口大小变化处理
const handleResize = () => {
  if (foxpsdContainer.value && foxpsdInstance) {
    const canvas = foxpsdInstance.canvas
    if (canvas) {
      canvas.width = foxpsdContainer.value.clientWidth
      canvas.height = foxpsdContainer.value.clientHeight
    }
  }
}

onMounted(() => {
  initFoxPSD()
  window.addEventListener('resize', handleResize)

  // 监听网络状态变化
  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)

  // 清理网络状态监听器
  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine
  }
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)

  if (foxpsdInstance && foxpsdInstance.destroy) {
    foxpsdInstance.destroy()
  }
})

// 类型声明
declare global {
  interface Window {
    FoxPSD: any
  }
}
</script>

<style scoped>
.foxpsd-viewer {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-controls h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn.primary {
  background: #4caf50;
  color: white;
}

.btn.primary:hover {
  background: #45a049;
}

.btn.secondary {
  background: #2196f3;
  color: white;
}

.btn.secondary:hover {
  background: #1976d2;
}

.btn.outline {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
}

.btn.outline:hover {
  background: #f9f9f9;
}

.foxpsd-container {
  flex: 1;
  position: relative;
  background: white;
  margin: 0 20px 20px 280px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: margin 0.3s ease;
}

.foxpsd-container.controls-hidden {
  margin-left: 20px;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-content {
  text-align: center;
  padding: 20px;
}

.error-content h3 {
  color: #f44336;
  margin-bottom: 10px;
}

.control-panel {
  position: fixed;
  left: 20px;
  top: 80px;
  bottom: 20px;
  width: 240px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 30px;
}

.panel-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 2px solid #4caf50;
  padding-bottom: 5px;
}

.setting-group {
  margin-bottom: 15px;
}

.setting-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.input-field,
.select-field {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-field:focus,
.select-field:focus {
  outline: none;
  border-color: #4caf50;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 8px;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debug-info {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}

.debug-info h4 {
  margin: 0 0 10px 0;
  color: #856404;
  font-size: 14px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-item .label {
  color: #666;
  font-size: 13px;
}

.status-item .value {
  font-weight: 500;
  font-size: 13px;
}

.status-item .value.初始化中 {
  color: #ff9800;
}

.status-item .value.正在加载 {
  color: #2196f3;
}

.status-item .value.渲染完成 {
  color: #4caf50;
}

.status-item .value.渲染失败 {
  color: #f44336;
}

@media (max-width: 768px) {
  .foxpsd-container {
    margin: 0 10px 10px 10px;
  }

  .control-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    width: auto;
    height: 200px;
    border-radius: 8px 8px 0 0;
  }

  .header-controls {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }

  .control-buttons {
    width: 100%;
    justify-content: center;
  }
}

/* 纹理控件样式 */
.range-slider {
  width: 100%;
  margin: 5px 0;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4caf50;
  cursor: pointer;
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4caf50;
  cursor: pointer;
  border: none;
}

.range-value {
  display: inline-block;
  margin-left: 10px;
  min-width: 20px;
  color: #333;
  font-weight: 500;
}

.btn.small {
  padding: 6px 12px;
  font-size: 12px;
  margin-right: 8px;
}

.texture-preview {
  margin-top: 10px;
  text-align: center;
}

.texture-preview img {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 2px solid #ddd;
  object-fit: cover;
  transition: border-color 0.3s ease;
}

.texture-preview img:hover {
  border-color: #4caf50;
}
</style>
