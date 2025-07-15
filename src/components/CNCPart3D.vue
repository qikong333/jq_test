<template>
  <div class="cnc-part-3d">
    <div class="controls-panel">
      <h3><i class="icon">🎮</i>3D模型控制</h3>
      <div class="control-buttons">
        <button @click="resetView" class="control-btn">
          <span class="btn-icon">🔄</span>
          <span>重置视角</span>
        </button>
        <button @click="toggleWireframe" class="control-btn">
          <span class="btn-icon">📐</span>
          <span>{{ wireframe ? '实体模式' : '线框模式' }}</span>
        </button>
        <button @click="toggleAnimation" class="control-btn">
          <span class="btn-icon">{{ isAnimating ? '⏸️' : '▶️' }}</span>
          <span>{{ isAnimating ? '停止旋转' : '开始旋转' }}</span>
        </button>
      </div>
      <div class="info-display">
        <div class="info-item">
          <span class="label">材料:</span>
          <span class="value">不锈钢304</span>
        </div>
        <div class="info-item">
          <span class="label">尺寸:</span>
          <span class="value">对边30mm×厚12mm</span>
        </div>
      </div>
    </div>

    <div class="canvas-container">
      <canvas ref="canvasRef" class="threejs-canvas"></canvas>
      <div class="loading" v-if="isLoading">
        <div class="spinner"></div>
        <p>正在加载3D模型...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvasRef = ref<HTMLCanvasElement>()
const isLoading = ref(true)
const wireframe = ref(false)
const isAnimating = ref(true)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let partGroup: THREE.Group
let animationId: number

const initThreeJS = () => {
  if (!canvasRef.value) return

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f9ff)

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    canvasRef.value.clientWidth / canvasRef.value.clientHeight,
    0.1,
    1000,
  )
  camera.position.set(80, 60, 80) // 调整到适合六角螺丝帽的观察角度

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  })
  renderer.setSize(canvasRef.value.clientWidth, canvasRef.value.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // 创建控制器 - 调整控制范围
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 40 // 更近的最小距离
  controls.maxDistance = 200 // 更近的最大距离
  controls.target.set(0, 6, 0) // 目标点设在螺丝帽中心

  // 添加光源
  setupLights()

  // 创建零件3D模型
  createCNCPart()

  // 添加网格和坐标轴
  addGridAndAxes()

  isLoading.value = false
  animate()
}

const setupLights = () => {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  // 主光源 - 调整到适合小尺寸零件
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
  directionalLight.position.set(80, 80, 40)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 200
  directionalLight.shadow.camera.left = -60
  directionalLight.shadow.camera.right = 60
  directionalLight.shadow.camera.top = 60
  directionalLight.shadow.camera.bottom = -60
  scene.add(directionalLight)

  // 补充光源
  const fillLight = new THREE.DirectionalLight(0x4080ff, 0.4)
  fillLight.position.set(-40, 40, -40)
  scene.add(fillLight)

  // 顶部光源
  const topLight = new THREE.DirectionalLight(0xffffff, 0.3)
  topLight.position.set(0, 100, 0)
  scene.add(topLight)
}

const createCNCPart = () => {
  partGroup = new THREE.Group()

  // 不锈钢304材料定义
  const stainlessSteelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0f0f0,
    metalness: 0.95,
    roughness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.02,
    reflectivity: 0.9,
    envMapIntensity: 1.0,
  })

  // 创建6角螺丝帽形状 - 与SVG设计图完全匹配
  const hexShape = new THREE.Shape()

  // 六角形外轮廓 - 精确匹配SVG中的坐标
  // SVG中的六角形坐标: "26,-15 26,15 0,30 -26,15 -26,-15 0,-30"
  const hexPoints = [
    new THREE.Vector2(26, -15), // 右上
    new THREE.Vector2(26, 15), // 右下
    new THREE.Vector2(0, 30), // 底部
    new THREE.Vector2(-26, 15), // 左下
    new THREE.Vector2(-26, -15), // 左上
    new THREE.Vector2(0, -30), // 顶部
  ]

  hexShape.moveTo(hexPoints[0].x, hexPoints[0].y)
  for (let i = 1; i < hexPoints.length; i++) {
    hexShape.lineTo(hexPoints[i].x, hexPoints[i].y)
  }
  hexShape.lineTo(hexPoints[0].x, hexPoints[0].y) // 闭合路径

  // 中央螺纹孔 (M16螺纹，与SVG中的孔径匹配)
  const threadHole = new THREE.Path()
  threadHole.absarc(0, 0, 8, 0, Math.PI * 2, false) // 半径8mm对应直径16mm
  hexShape.holes.push(threadHole)

  // 挤出设置 (厚度12mm)
  const extrudeSettings = {
    depth: 12,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 2,
    bevelSize: 0.8,
    bevelThickness: 0.5,
  }

  // 创建主体六角螺丝帽
  const hexNutGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings)
  const hexNut = new THREE.Mesh(hexNutGeometry, stainlessSteelMaterial)
  hexNut.rotation.x = -Math.PI / 2
  hexNut.position.y = 0
  hexNut.castShadow = true
  hexNut.receiveShadow = true
  partGroup.add(hexNut)

  // 添加顶部倒角边缘 - 匹配六角形尺寸
  const chamferGeometry = new THREE.CylinderGeometry(28, 30, 1, 6)
  const chamfer = new THREE.Mesh(chamferGeometry, stainlessSteelMaterial)
  chamfer.position.y = 12.5
  chamfer.castShadow = true
  partGroup.add(chamfer)

  // 底部倒角
  const bottomChamferGeometry = new THREE.CylinderGeometry(30, 28, 1, 6)
  const bottomChamfer = new THREE.Mesh(bottomChamferGeometry, stainlessSteelMaterial)
  bottomChamfer.position.y = -0.5
  bottomChamfer.castShadow = true
  partGroup.add(bottomChamfer)

  // 螺纹孔细节
  const threadDetailMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe0e0e0,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8,
  })

  // 螺纹线圈效果
  for (let i = 0; i < 6; i++) {
    const threadRingGeometry = new THREE.TorusGeometry(6 + i * 0.3, 0.2, 8, 16)
    const threadRing = new THREE.Mesh(threadRingGeometry, threadDetailMaterial)
    threadRing.position.y = 2 + i * 1.5
    threadRing.rotation.x = Math.PI / 2
    partGroup.add(threadRing)
  }

  // 表面纹理细节 - 调整到匹配六角形尺寸
  const surfaceTextureGeometry = new THREE.RingGeometry(10, 25, 6) // 六角形，内径10，外径25
  const surfaceTextureMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf8f8f8,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.3,
  })
  const surfaceTexture = new THREE.Mesh(surfaceTextureGeometry, surfaceTextureMaterial)
  surfaceTexture.position.y = 12.1
  surfaceTexture.rotation.x = -Math.PI / 2
  partGroup.add(surfaceTexture)

  // 制造商标记（装饰性）- 调整位置
  const markGeometry = new THREE.RingGeometry(2, 4, 8)
  const markMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4080ff,
    metalness: 0.3,
    roughness: 0.7,
    transparent: true,
    opacity: 0.6,
  })
  const mark = new THREE.Mesh(markGeometry, markMaterial)
  mark.position.set(15, 12.1, 15) // 调整到六角形边缘附近
  mark.rotation.x = -Math.PI / 2
  partGroup.add(mark)

  // 六角形边缘加强筋 - 精确匹配六角形顶点位置
  const hexVertices = [
    { x: 26, z: -15 }, // 右上
    { x: 26, z: 15 }, // 右下
    { x: 0, z: 30 }, // 底部
    { x: -26, z: 15 }, // 左下
    { x: -26, z: -15 }, // 左上
    { x: 0, z: -30 }, // 顶部
  ]

  for (let i = 0; i < 6; i++) {
    const vertex = hexVertices[i]
    const nextVertex = hexVertices[(i + 1) % 6]

    // 计算边的中点和角度
    const midX = (vertex.x + nextVertex.x) / 2
    const midZ = (vertex.z + nextVertex.z) / 2
    const angle = Math.atan2(nextVertex.z - vertex.z, nextVertex.x - vertex.x)

    const edgeGeometry = new THREE.BoxGeometry(0.8, 12, 0.4)
    const edge = new THREE.Mesh(
      edgeGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0xf5f5f5,
        metalness: 0.9,
        roughness: 0.03,
        clearcoat: 0.9,
      }),
    )
    edge.position.set(midX * 0.9, 6, midZ * 0.9) // 稍微向内偏移
    edge.rotation.y = angle
    edge.castShadow = true
    partGroup.add(edge)
  }

  scene.add(partGroup)
}

const addGridAndAxes = () => {
  // 添加网格
  const gridHelper = new THREE.GridHelper(600, 30, 0x888888, 0xdddddd)
  gridHelper.position.y = -10
  scene.add(gridHelper)

  // 添加坐标轴
  const axesHelper = new THREE.AxesHelper(150)
  axesHelper.position.y = 0
  scene.add(axesHelper)

  // 添加工作台
  const workbenchGeometry = new THREE.BoxGeometry(400, 20, 400)
  const workbenchMaterial = new THREE.MeshLambertMaterial({
    color: 0xf5f5f5,
    transparent: true,
    opacity: 0.8,
  })
  const workbench = new THREE.Mesh(workbenchGeometry, workbenchMaterial)
  workbench.position.y = -20
  workbench.receiveShadow = true
  scene.add(workbench)

  // 添加工作台边框
  const frameGeometry = new THREE.EdgesGeometry(workbenchGeometry)
  const frameMaterial = new THREE.LineBasicMaterial({ color: 0x666666 })
  const frame = new THREE.LineSegments(frameGeometry, frameMaterial)
  frame.position.y = -20
  scene.add(frame)
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (isAnimating.value && partGroup) {
    partGroup.rotation.y += 0.003
  }

  controls.update()
  renderer.render(scene, camera)
}

const resetView = () => {
  if (camera && controls) {
    camera.position.set(200, 150, 200)
    controls.target.set(0, 12.5, 0)
    controls.update()
  }
}

const toggleWireframe = () => {
  wireframe.value = !wireframe.value
  if (partGroup) {
    partGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshPhysicalMaterial
        if (material && 'wireframe' in material) {
          material.wireframe = wireframe.value
        }
      }
    })
  }
}

const toggleAnimation = () => {
  isAnimating.value = !isAnimating.value
}

const handleResize = () => {
  if (!canvasRef.value || !camera || !renderer) return

  const width = canvasRef.value.clientWidth
  const height = canvasRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(() => {
  initThreeJS()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)

  // 清理Three.js资源
  if (renderer) {
    renderer.dispose()
  }
  if (scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
})
</script>

<style scoped>
.cnc-part-3d {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.controls-panel h3 {
  color: #1f2937;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.btn-icon {
  font-size: 1.1em;
}

.info-display {
  display: flex;
  gap: 20px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  border-left: 4px solid #3b82f6;
}

.info-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.label {
  font-weight: 600;
  color: #4b5563;
  font-size: 14px;
}

.value {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.threejs-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  color: #4b5563;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
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

.icon {
  font-size: 1.2em;
}

@media (max-width: 768px) {
  .cnc-part-3d {
    padding: 20px;
  }

  .control-buttons {
    flex-direction: column;
  }

  .control-btn {
    justify-content: center;
  }

  .info-display {
    flex-direction: column;
    gap: 10px;
  }

  .canvas-container {
    height: 400px;
  }
}
</style>
