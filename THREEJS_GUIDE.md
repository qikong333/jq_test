# Three.js 在 Vue3 项目中的使用指南

## 📦 已安装的包

- `three` - Three.js 核心库 (最新版)
- `@types/three` - TypeScript 类型定义

## 🚀 快速开始

### 1. 基础用法

```typescript
import * as THREE from 'three'

// 创建场景、相机、渲染器
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
```

### 2. 使用 ThreeHelper 工具类

```typescript
import { ThreeHelper, COLORS } from '@/utils/threeHelper'

const threeHelper = new ThreeHelper()
threeHelper.init(containerElement)

// 创建对象
const cube = threeHelper.createBox(COLORS.GREEN)
const sphere = threeHelper.createSphere(COLORS.RED)
const plane = threeHelper.createPlane(COLORS.BLUE)

// 添加到场景
threeHelper.addToScene(cube)
threeHelper.addToScene(sphere)
threeHelper.addToScene(plane)

// 开始动画
threeHelper.startAnimation(() => {
  // 自定义动画逻辑
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
})
```

## 📁 项目结构

```
src/
├── components/
│   ├── ThreeScene.vue      # 基础Three.js场景组件
│   └── ThreeDemo.vue       # 交互式Three.js演示组件
├── utils/
│   └── threeHelper.ts      # Three.js工具类
└── views/
    └── HomeView.vue        # 主页面
```

## 🔧 核心功能

### ThreeHelper 类

#### 基础方法

- `init(container)` - 初始化Three.js场景
- `addToScene(object)` - 添加对象到场景
- `removeFromScene(object)` - 从场景移除对象
- `startAnimation(callback)` - 开始动画循环
- `stopAnimation()` - 停止动画
- `dispose()` - 清理资源

#### 创建对象

- `createBox(color, size)` - 创建立方体
- `createSphere(color, radius)` - 创建球体
- `createPlane(color, width, height)` - 创建平面

#### 预设颜色

```typescript
import { COLORS } from '@/utils/threeHelper'

COLORS.RED // 0xff0000
COLORS.GREEN // 0x00ff00
COLORS.BLUE // 0x0000ff
COLORS.YELLOW // 0xffff00
COLORS.PURPLE // 0xff00ff
COLORS.CYAN // 0x00ffff
COLORS.WHITE // 0xffffff
COLORS.BLACK // 0x000000
COLORS.ORANGE // 0xffa500
COLORS.PINK // 0xffc0cb
```

## 🎨 组件示例

### 基础场景组件

```vue
<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ThreeHelper, COLORS } from '@/utils/threeHelper'

const container = ref<HTMLDivElement>()
let threeHelper: ThreeHelper

onMounted(() => {
  if (!container.value) return

  threeHelper = new ThreeHelper()
  threeHelper.init(container.value)

  // 添加对象
  const cube = threeHelper.createBox(COLORS.GREEN)
  threeHelper.addToScene(cube)

  // 开始动画
  threeHelper.startAnimation(() => {
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
  })
})

onUnmounted(() => {
  if (threeHelper) {
    threeHelper.dispose()
  }
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 400px;
}
</style>
```

## 🎮 交互功能

### 鼠标控制

```typescript
// 添加鼠标交互控制
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
```

### 响应式设计

```typescript
// 窗口大小变化处理
const handleResize = () => {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

window.addEventListener('resize', handleResize)
```

## 📈 性能优化

1. **适当使用 dispose()** - 清理不再使用的几何体和材质
2. **合理使用 RAF** - 使用 requestAnimationFrame 进行动画
3. **避免频繁创建对象** - 重用几何体和材质
4. **适当的渲染设置** - 设置合适的 pixelRatio 和 antialias

## 🎯 高级功能

### 加载外部模型

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const loader = new GLTFLoader()
loader.load('/models/scene.gltf', (gltf) => {
  scene.add(gltf.scene)
})
```

### 后处理效果

```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new BloomPass(1, 25, 4, 256))
```

## 🚨 注意事项

1. **内存管理** - 记得在组件销毁时调用 `dispose()` 方法
2. **类型安全** - 充分利用 TypeScript 类型检查
3. **性能监控** - 使用 Three.js 的 stats 监控性能
4. **浏览器兼容** - 确保目标浏览器支持 WebGL

## 📚 学习资源

- [Three.js 官方文档](https://threejs.org/docs/)
- [Three.js 示例](https://threejs.org/examples/)
- [Vue3 官方文档](https://v3.vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

## 🛠️ 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm run test:unit

# 代码检查
npm run lint

# 格式化代码
npm run format
```
