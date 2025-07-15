<template>
  <div class="three-demo">
    <h2>Three.js 演示</h2>
    <div ref="threeContainer" class="three-container"></div>
    <div class="controls">
      <button @click="addBox">添加立方体</button>
      <button @click="addSphere">添加球体</button>
      <button @click="addPlane">添加平面</button>
      <button @click="clearScene">清空场景</button>
      <button @click="toggleAnimation">{{ isAnimating ? '暂停' : '开始' }}动画</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ThreeHelper, COLORS } from '@/utils/threeHelper'
import * as THREE from 'three'

const threeContainer = ref<HTMLDivElement>()
const isAnimating = ref(true)

let threeHelper: ThreeHelper
let objects: THREE.Mesh[] = []

const initThree = () => {
  if (!threeContainer.value) return

  threeHelper = new ThreeHelper()
  threeHelper.init(threeContainer.value)

  // 添加初始立方体
  const initialCube = threeHelper.createBox(COLORS.GREEN)
  threeHelper.addToScene(initialCube)
  objects.push(initialCube)

  // 开始动画
  threeHelper.startAnimation(() => {
    if (isAnimating.value) {
      // 旋转所有物体
      objects.forEach((obj, index) => {
        obj.rotation.x += 0.01 + index * 0.002
        obj.rotation.y += 0.01 + index * 0.002
      })
    }
  })
}

const addBox = () => {
  const colors = Object.values(COLORS)
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const box = threeHelper.createBox(randomColor, Math.random() * 0.5 + 0.5)

  // 随机位置
  box.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4)

  threeHelper.addToScene(box)
  objects.push(box)
}

const addSphere = () => {
  const colors = Object.values(COLORS)
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const sphere = threeHelper.createSphere(randomColor, Math.random() * 0.5 + 0.3)

  // 随机位置
  sphere.position.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
  )

  threeHelper.addToScene(sphere)
  objects.push(sphere)
}

const addPlane = () => {
  const colors = Object.values(COLORS)
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const plane = threeHelper.createPlane(randomColor, 1, 1)

  // 随机位置和旋转
  plane.position.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
  )
  plane.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)

  threeHelper.addToScene(plane)
  objects.push(plane)
}

const clearScene = () => {
  objects.forEach((obj) => {
    threeHelper.removeFromScene(obj)
  })
  objects = []
}

const toggleAnimation = () => {
  isAnimating.value = !isAnimating.value
}

onMounted(() => {
  initThree()
})

onUnmounted(() => {
  if (threeHelper) {
    threeHelper.dispose()
  }
})
</script>

<style scoped>
.three-demo {
  padding: 20px;
}

.three-container {
  width: 100%;
  height: 500px;
  border: 2px solid #333;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  background: #1a1a1a;
}

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 10px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

button:hover {
  background: #005999;
}

button:active {
  transform: translateY(1px);
}

h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}
</style>
