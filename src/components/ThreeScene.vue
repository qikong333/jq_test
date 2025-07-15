<template>
  <div ref="threeContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const threeContainer = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let cube: THREE.Mesh
let animationId: number

const initThree = () => {
  if (!threeContainer.value) return

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    threeContainer.value.clientWidth / threeContainer.value.clientHeight,
    0.1,
    1000,
  )
  camera.position.z = 5

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  threeContainer.value.appendChild(renderer.domElement)

  // 创建立方体
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    shininess: 100,
  })
  cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  // 添加光照
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  // 窗口大小变化处理
  const handleResize = () => {
    if (!threeContainer.value) return

    camera.aspect = threeContainer.value.clientWidth / threeContainer.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
  }

  window.addEventListener('resize', handleResize)

  // 动画循环
  const animate = () => {
    animationId = requestAnimationFrame(animate)

    // 旋转立方体
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01

    renderer.render(scene, camera)
  }

  animate()
}

const cleanup = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
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
.three-container {
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}
</style>
