<template>
  <div class="glb-viewer">
    <div ref="threeContainer" class="three-container"></div>
    <div class="controls">
      <button @click="resetCamera" class="control-btn">重置视角</button>
      <button @click="toggleWireframe" class="control-btn">线框模式</button>
      <button @click="toggleAutoRotate" class="control-btn">
        {{ autoRotate ? '停止旋转' : '自动旋转' }}
      </button>

      <!-- 纹理选择控件 -->
      <div class="texture-controls">
        <h4>纹理测试</h4>
        <select @change="changeTexture" v-model="selectedTexture" class="texture-select">
          <option value="">原始材质</option>
          <option value="metal_diffuse.jpg">金属纹理</option>
          <option value="wood_diffuse.jpg">木材纹理</option>
          <option value="fabric_diffuse.jpg">布料纹理</option>
          <option value="marble_diffuse.jpg">大理石纹理</option>
          <option value="brick_diffuse.jpg">砖块纹理</option>
          <option value="leather_diffuse.jpg">皮革纹理</option>
          <option value="stone_diffuse.jpg">石材纹理</option>
          <option value="paper_diffuse.jpg">纸张纹理</option>
        </select>

        <div class="texture-settings">
          <label>纹理重复X:</label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            v-model="textureRepeatX"
            @input="updateTextureRepeat"
            class="range-input"
          />
          <span>{{ textureRepeatX }}</span>

          <label>纹理重复Y:</label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            v-model="textureRepeatY"
            @input="updateTextureRepeat"
            class="range-input"
          />
          <span>{{ textureRepeatY }}</span>
        </div>

        <button @click="applyToAllMaterials" class="control-btn">应用到所有材质</button>
        <button @click="resetMaterials" class="control-btn">重置材质</button>
      </div>
    </div>
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载模型...</p>
    </div>
    <div v-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <!-- 纹理预览面板 -->
    <div class="texture-preview" v-if="selectedTexture">
      <h4>当前纹理预览</h4>
      <img :src="`/textures/${selectedTexture}`" alt="纹理预览" class="texture-thumbnail" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const threeContainer = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref('')
const autoRotate = ref(false)
const selectedTexture = ref('')
const textureRepeatX = ref(1)
const textureRepeatY = ref(1)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let model: THREE.Group
let animationId: number
let mixer: THREE.AnimationMixer | null = null
let originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map()
let currentTexture: THREE.Texture | null = null

// GLB文件路径 - 将文件从src/assets移动到public目录
const modelPath = '/816fd13e-1ab8-478e-bc83-5cbda868ba20.glb'

const initThree = () => {
  if (!threeContainer.value) return

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2c3e50)

  // 创建相机
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(5, 5, 5)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  threeContainer.value.appendChild(renderer.domElement)

  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableZoom = true
  controls.autoRotate = false
  controls.autoRotateSpeed = 2.0

  // 添加光照
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  const pointLight = new THREE.PointLight(0xffffff, 0.5)
  pointLight.position.set(-10, 10, -10)
  scene.add(pointLight)

  // 添加网格地板
  const gridHelper = new THREE.GridHelper(20, 20)
  scene.add(gridHelper)

  // 加载GLB模型
  loadGLBModel()

  // 窗口大小变化处理
  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', handleResize)

  // 动画循环
  const animate = () => {
    animationId = requestAnimationFrame(animate)

    controls.update()

    if (mixer) {
      mixer.update(0.016) // 60fps
    }

    renderer.render(scene, camera)
  }
  animate()
}

const loadGLBModel = () => {
  const loader = new GLTFLoader()

  loader.load(
    modelPath,
    (gltf) => {
      model = gltf.scene
      scene.add(model)

      // 保存原始材质
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          // 保存原始材质
          originalMaterials.set(child, child.material)
        }
      })

      // 调整模型大小和位置
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 3 / maxDim
      model.scale.setScalar(scale)

      model.position.x = -center.x * scale
      model.position.y = -center.y * scale
      model.position.z = -center.z * scale

      // 设置动画
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model)
        gltf.animations.forEach((clip) => {
          mixer?.clipAction(clip).play()
        })
      }

      loading.value = false
    },
    (progress) => {
      console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%')
    },
    (error) => {
      console.error('Error loading GLB model:', error)
      error.value = '模型加载失败，请检查文件路径'
      loading.value = false
    },
  )
}

const changeTexture = async () => {
  if (!model) return

  if (selectedTexture.value === '') {
    resetMaterials()
    return
  }

  try {
    // 加载新纹理
    const loader = new THREE.TextureLoader()
    currentTexture = await new Promise((resolve, reject) => {
      loader.load(`/textures/${selectedTexture.value}`, resolve, undefined, reject)
    })

    // 设置纹理属性
    currentTexture.wrapS = THREE.RepeatWrapping
    currentTexture.wrapT = THREE.RepeatWrapping
    currentTexture.repeat.set(textureRepeatX.value, textureRepeatY.value)

    // 应用纹理到第一个找到的mesh
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const newMaterial = new THREE.MeshStandardMaterial({
          map: currentTexture,
          metalness: 0.3,
          roughness: 0.7,
        })
        child.material = newMaterial
        return // 只应用到第一个mesh，避免全部替换
      }
    })
  } catch (err) {
    console.error('Failed to load texture:', err)
    error.value = '纹理加载失败'
  }
}

const updateTextureRepeat = () => {
  if (currentTexture) {
    currentTexture.repeat.set(textureRepeatX.value, textureRepeatY.value)
  }
}

const applyToAllMaterials = () => {
  if (!model || !currentTexture) return

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const newMaterial = new THREE.MeshStandardMaterial({
        map: currentTexture,
        metalness: 0.3,
        roughness: 0.7,
      })
      child.material = newMaterial
    }
  })
}

const resetMaterials = () => {
  if (!model) return

  // 恢复原始材质
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalMaterial = originalMaterials.get(child)
      if (originalMaterial) {
        child.material = originalMaterial
      }
    }
  })

  selectedTexture.value = ''
  currentTexture = null
}

const resetCamera = () => {
  camera.position.set(5, 5, 5)
  controls.reset()
}

const toggleWireframe = () => {
  if (model) {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = !mat.wireframe
          })
        } else {
          child.material.wireframe = !child.material.wireframe
        }
      }
    })
  }
}

const toggleAutoRotate = () => {
  autoRotate.value = !autoRotate.value
  controls.autoRotate = autoRotate.value
}

const cleanup = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  if (mixer) {
    mixer.stopAllAction()
  }

  if (renderer) {
    renderer.dispose()
    if (threeContainer.value && renderer.domElement) {
      threeContainer.value.removeChild(renderer.domElement)
    }
  }

  window.removeEventListener('resize', () => {})
}

onMounted(() => {
  initThree()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.glb-viewer {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #2c3e50;
}

.three-container {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  max-width: 280px;
}

.control-btn {
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.texture-controls {
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  margin-top: 10px;
}

.texture-controls h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 16px;
}

.texture-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 15px;
}

.texture-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.texture-settings label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.range-input {
  width: 100%;
  margin: 2px 0;
}

.texture-settings span {
  font-size: 12px;
  color: #333;
  font-weight: bold;
}

.texture-preview {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  z-index: 100;
  max-width: 200px;
}

.texture-preview h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.texture-thumbnail {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  border: 2px solid #ddd;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 100;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #e74c3c;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 10px;
  z-index: 100;
}

@media (max-width: 768px) {
  .controls {
    top: 10px;
    left: 10px;
    gap: 8px;
    max-width: 250px;
  }

  .control-btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .texture-controls {
    padding: 12px;
  }

  .texture-preview {
    bottom: 10px;
    right: 10px;
    max-width: 150px;
  }

  .texture-thumbnail {
    width: 80px;
    height: 80px;
  }
}
</style>
