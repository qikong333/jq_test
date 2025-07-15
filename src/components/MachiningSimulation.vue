<template>
  <div class="machining-simulation">
    <div class="simulation-header">
      <h3><i class="icon">⚡</i>CNC加工模拟</h3>
      <div class="status-badge" :class="simulationStatus">{{ statusText }}</div>
    </div>

    <!-- 3D场景容器 -->
    <div class="simulation-viewport">
      <canvas ref="simulationCanvas" class="simulation-canvas"></canvas>

      <!-- 加载指示器 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>初始化加工模拟...</p>
      </div>

      <!-- 刀具信息显示 -->
      <div class="tool-info" v-if="currentTool">
        <div class="tool-detail">
          <span class="tool-label">当前刀具:</span>
          <span class="tool-value">{{ currentTool.name }}</span>
        </div>
        <div class="tool-detail">
          <span class="tool-label">转速:</span>
          <span class="tool-value">{{ currentSpindle }}RPM</span>
        </div>
        <div class="tool-detail">
          <span class="tool-label">进给:</span>
          <span class="tool-value">{{ currentFeed }}mm/min</span>
        </div>
      </div>

      <!-- G代码显示 -->
      <div class="gcode-display" v-if="currentGCodeLine">
        <div class="gcode-line">
          <span class="line-number">行{{ currentLineNumber }}:</span>
          <span class="gcode-text">{{ currentGCodeLine }}</span>
        </div>
      </div>

      <!-- 动画状态指示器 -->
      <div class="animation-status" v-if="isPlaying">
        <div class="status-indicator">
          <div class="pulse-dot"></div>
          <span>动画运行中...</span>
        </div>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="simulation-controls">
      <div class="playback-controls">
        <button @click="togglePlayback" class="control-btn primary" :disabled="!isReady">
          <span class="btn-icon">{{ isPlaying ? '⏸️' : '▶️' }}</span>
          <span>{{ isPlaying ? '暂停' : '播放' }}</span>
        </button>

        <button @click="reset" class="control-btn secondary">
          <span class="btn-icon">🔄</span>
          <span>重置</span>
        </button>

        <button @click="stepForward" class="control-btn info" :disabled="!isReady">
          <span class="btn-icon">⏭️</span>
          <span>单步</span>
        </button>
      </div>

      <div class="speed-control">
        <label>速度: {{ speed }}x</label>
        <input v-model="speed" type="range" min="0.1" max="10" step="0.1" class="speed-slider" />
      </div>

      <div class="progress-control">
        <label>进度: {{ Math.round(progress * 100) }}%</label>
        <div class="progress-bar" @click="seekToPosition">
          <div class="progress-fill" :style="{ width: progress * 100 + '%' }"></div>
        </div>
        <div class="time-info">
          <span>{{ formatTime(currentTime) }} / {{ formatTime(totalTime) }}</span>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="simulation-stats">
      <div class="stat-item">
        <span class="stat-label">材料移除量:</span>
        <span class="stat-value">{{ materialRemoved.toFixed(2) }}mm³</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">加工时间:</span>
        <span class="stat-value">{{ formatTime(estimatedTime) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">刀具路径长度:</span>
        <span class="stat-value">{{ toolPathLength.toFixed(1) }}mm</span>
      </div>
    </div>

    <!-- 选项面板 -->
    <div class="simulation-options">
      <div class="option-group">
        <label>
          <input v-model="showToolPath" type="checkbox" />
          显示刀具路径
        </label>
        <label>
          <input v-model="showChips" type="checkbox" />
          显示切屑效果
        </label>
        <label>
          <input v-model="showCoolant" type="checkbox" />
          显示冷却液
        </label>
        <label>
          <input v-model="showCoordinates" type="checkbox" />
          显示坐标轴
        </label>
        <label>
          <input v-model="showWorkpieceWireframe" type="checkbox" />
          工件线框模式
        </label>
      </div>
    </div>

    <!-- 相机控制面板 -->
    <div class="camera-controls">
      <h4>视角控制</h4>
      <div class="camera-buttons">
        <button @click="setCameraView('front')" class="view-btn">前视图</button>
        <button @click="setCameraView('side')" class="view-btn">侧视图</button>
        <button @click="setCameraView('top')" class="view-btn">俯视图</button>
        <button @click="setCameraView('iso')" class="view-btn">等轴测</button>
        <button @click="resetCamera" class="view-btn">重置视角</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as TWEEN from '@tweenjs/tween.js'

// 响应式数据
const simulationCanvas = ref<HTMLCanvasElement>()
const isLoading = ref(true)
const isReady = ref(false)
const isPlaying = ref(false)
const speed = ref(1.0)
const progress = ref(0)
const currentTime = ref(0)
const totalTime = ref(120) // 预估总时间（秒）
const materialRemoved = ref(0)
const toolPathLength = ref(0)
const estimatedTime = ref(0)

// 定义刀具类型
interface Tool {
  name: string
  diameter: number
  length: number
  type: string
  material: string
}

// 当前状态
const currentTool = ref<Tool | null>(null)
const currentSpindle = ref(1200)
const currentFeed = ref(200)
const currentGCodeLine = ref('')
const currentLineNumber = ref(0)
const simulationStatus = ref('ready')
const statusText = ref('就绪')

// 显示选项
const showToolPath = ref(true)
const showChips = ref(true)
const showCoolant = ref(false)
const showCoordinates = ref(true)
const showWorkpieceWireframe = ref(false)

// Three.js 对象
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

// 加工相关对象
let workpiece: THREE.Mesh
let currentToolMesh: THREE.Mesh
let toolPath: THREE.Line
let coordinateAxes: THREE.Group
let animationId: number

// G代码数据 - 六角螺丝帽加工程序
const gCodeLines = [
  'G21 ; 公制单位',
  'G90 ; 绝对坐标',
  'M03 S1200 ; 主轴启动',
  'G00 X30.0 Y0.0 Z25.0 ; 快速定位到起始点',
  'G01 X26.0 Y-15.0 Z25.0 F200 ; 移动到第一边',
  'G01 Z-2.0 F100 ; 下刀',
  'G01 X0.0 Y-30.0 F200 ; 第二边',
  'G01 X-26.0 Y-15.0 F200 ; 第三边',
  'G01 X-26.0 Y15.0 F200 ; 第四边',
  'G01 X0.0 Y30.0 F200 ; 第五边',
  'G01 X26.0 Y15.0 F200 ; 第六边',
  'G01 X26.0 Y-15.0 F200 ; 回到起始边',
  'G00 Z25.0 ; 退刀到安全高度',
  'G00 X0.0 Y0.0 ; 移动到中心',
  'G01 Z-12.0 F50 ; 钻中央孔',
  'G00 Z25.0 ; 退刀',
  'G00 X30.0 Y0.0 Z50.0 ; 退到最终安全位置',
  'M05 ; 主轴停止',
]

// 刀具定义
const tools = {
  endMill10: {
    name: 'Φ10立铣刀',
    diameter: 10,
    length: 50,
    type: 'endmill',
    material: 'carbide',
  },
  drill16: {
    name: 'Φ16钻头',
    diameter: 16,
    length: 80,
    type: 'drill',
    material: 'hss',
  },
}

onMounted(() => {
  initSimulation()
})

onUnmounted(() => {
  cleanup()
})

// 监听速度变化
watch(speed, (newSpeed) => {
  // 更新动画速度
  if (isPlaying.value) {
    updateAnimationSpeed(newSpeed)
  }
})

const initSimulation = async () => {
  try {
    await setupThreeJS()
    await createWorkpiece()
    await createTools()
    await parseGCode()
    await generateToolPath()

    isLoading.value = false
    isReady.value = true
    statusText.value = '就绪'

    animate()
  } catch (error) {
    console.error('模拟初始化失败:', error)
    statusText.value = '初始化失败'
    simulationStatus.value = 'error'
  }
}

const setupThreeJS = async () => {
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f9ff)

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    simulationCanvas.value!.clientWidth / simulationCanvas.value!.clientHeight,
    0.1,
    1000,
  )
  camera.position.set(100, 80, 100)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    canvas: simulationCanvas.value,
    antialias: true,
    alpha: true,
  })
  renderer.setSize(simulationCanvas.value!.clientWidth, simulationCanvas.value!.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 10, 0)

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(50, 50, 30)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // 创建坐标轴
  coordinateAxes = new THREE.Group()

  // X轴（红色）
  const xGeometry = new THREE.CylinderGeometry(1, 1, 80, 8)
  const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const xAxis = new THREE.Mesh(xGeometry, xMaterial)
  xAxis.rotation.z = -Math.PI / 2
  xAxis.position.x = 40
  coordinateAxes.add(xAxis)

  // Y轴（绿色）
  const yGeometry = new THREE.CylinderGeometry(1, 1, 80, 8)
  const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const yAxis = new THREE.Mesh(yGeometry, yMaterial)
  yAxis.position.y = 40
  coordinateAxes.add(yAxis)

  // Z轴（蓝色）
  const zGeometry = new THREE.CylinderGeometry(1, 1, 80, 8)
  const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
  const zAxis = new THREE.Mesh(zGeometry, zMaterial)
  zAxis.rotation.x = Math.PI / 2
  zAxis.position.z = 40
  coordinateAxes.add(zAxis)

  coordinateAxes.visible = showCoordinates.value
  scene.add(coordinateAxes)
}

const createWorkpiece = async () => {
  // 创建原始毛坯 - 六角棒材
  const hexShape = new THREE.Shape()

  // 比最终零件大的六角形毛坯
  const hexRadius = 35 // 比30mm对边距离大一些
  const hexPoints = []
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3
    const x = hexRadius * Math.cos(angle)
    const y = hexRadius * Math.sin(angle)
    hexPoints.push(new THREE.Vector2(x, y))
  }

  hexShape.moveTo(hexPoints[0].x, hexPoints[0].y)
  for (let i = 1; i < 6; i++) {
    hexShape.lineTo(hexPoints[i].x, hexPoints[i].y)
  }
  hexShape.lineTo(hexPoints[0].x, hexPoints[0].y)

  const extrudeSettings = {
    depth: 20, // 比12mm厚度大一些
    bevelEnabled: false,
  }

  const workpieceGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings)
  const workpieceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0f0f0,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8,
  })

  workpiece = new THREE.Mesh(workpieceGeometry, workpieceMaterial)
  workpiece.rotation.x = -Math.PI / 2
  workpiece.position.y = 0
  workpiece.castShadow = true
  workpiece.receiveShadow = true
  scene.add(workpiece)
}

const createTools = async () => {
  // 创建立铣刀模型
  const toolGeometry = new THREE.CylinderGeometry(5, 5, 50, 16)
  const toolMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x404040,
    metalness: 0.9,
    roughness: 0.1,
  })

  currentToolMesh = new THREE.Mesh(toolGeometry, toolMaterial)
  currentToolMesh.position.set(30, 50, 0) // 设置到初始安全位置
  currentToolMesh.visible = true // 默认显示刀具
  currentToolMesh.castShadow = true
  scene.add(currentToolMesh)

  currentTool.value = tools.endMill10
}

const parseGCode = async () => {
  // 解析G代码，提取刀具路径点
  totalTime.value = gCodeLines.length * 2 // 简化的时间估算
  estimatedTime.value = totalTime.value
}

const generateToolPath = async () => {
  // 生成六角螺丝帽的刀具路径
  const pathPoints = [
    new THREE.Vector3(30, 25, 0), // 起始点（安全高度）
    new THREE.Vector3(26, 25, -15), // 下刀到第一边
    new THREE.Vector3(0, 25, -30), // 第二边
    new THREE.Vector3(-26, 25, -15), // 第三边
    new THREE.Vector3(-26, 25, 15), // 第四边
    new THREE.Vector3(0, 25, 30), // 第五边
    new THREE.Vector3(26, 25, 15), // 第六边
    new THREE.Vector3(26, 25, -15), // 回到起始边
    new THREE.Vector3(30, 25, 0), // 退刀到安全高度
    new THREE.Vector3(0, 25, 0), // 移动到中心
    new THREE.Vector3(0, 13, 0), // 钻孔到底部
    new THREE.Vector3(0, 25, 0), // 退刀
    new THREE.Vector3(30, 50, 0), // 退到最终安全位置
  ]

  const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints)
  const pathMaterial = new THREE.LineBasicMaterial({
    color: 0xff6b6b,
    linewidth: 3,
  })

  toolPath = new THREE.Line(pathGeometry, pathMaterial)
  toolPath.visible = showToolPath.value
  scene.add(toolPath)

  // 计算路径长度
  let length = 0
  for (let i = 1; i < pathPoints.length; i++) {
    length += pathPoints[i].distanceTo(pathPoints[i - 1])
  }
  toolPathLength.value = length
}

const togglePlayback = () => {
  if (isPlaying.value) {
    pauseSimulation()
  } else {
    startSimulation()
  }
}

const startSimulation = () => {
  if (!isReady.value || !currentToolMesh) return

  isPlaying.value = true
  simulationStatus.value = 'running'
  statusText.value = '加工中'
  currentToolMesh.visible = true

  // 重置到起始位置
  currentToolMesh.position.set(30, 50, 0)
  progress.value = 0
  currentTime.value = 0
  materialRemoved.value = 0
  currentLineNumber.value = 0
  currentGCodeLine.value = gCodeLines[0] || ''

  // 开始动画
  animateToolPath()
}

const pauseSimulation = () => {
  isPlaying.value = false
  simulationStatus.value = 'paused'
  statusText.value = '已暂停'

  // 暂停所有动画
  TWEEN.removeAll()
}

const reset = () => {
  isPlaying.value = false
  progress.value = 0
  currentTime.value = 0
  materialRemoved.value = 0
  currentLineNumber.value = 0
  currentGCodeLine.value = ''
  simulationStatus.value = 'ready'
  statusText.value = '就绪'

  // 重置刀具位置
  if (currentToolMesh) {
    currentToolMesh.position.set(30, 50, 0)
    currentToolMesh.visible = true
  }

  // 停止所有动画
  TWEEN.removeAll()
}

const stepForward = () => {
  if (!isReady.value || isPlaying.value) return

  // 单步执行动画
  const animationPath = [
    { pos: new THREE.Vector3(30, 50, 0), gcode: 'G21 ; 公制单位' },
    { pos: new THREE.Vector3(30, 25, 0), gcode: 'G00 X30.0 Y0.0 Z25.0 ; 快速定位到起始点' },
    { pos: new THREE.Vector3(26, 25, -15), gcode: 'G01 X26.0 Y-15.0 Z25.0 F200 ; 移动到第一边' },
    { pos: new THREE.Vector3(26, 15, -15), gcode: 'G01 Z-2.0 F100 ; 下刀' },
    { pos: new THREE.Vector3(0, 15, -30), gcode: 'G01 X0.0 Y-30.0 F200 ; 第二边' },
    { pos: new THREE.Vector3(-26, 15, -15), gcode: 'G01 X-26.0 Y-15.0 F200 ; 第三边' },
    { pos: new THREE.Vector3(-26, 15, 15), gcode: 'G01 X-26.0 Y15.0 F200 ; 第四边' },
    { pos: new THREE.Vector3(0, 15, 30), gcode: 'G01 X0.0 Y30.0 F200 ; 第五边' },
    { pos: new THREE.Vector3(26, 15, 15), gcode: 'G01 X26.0 Y15.0 F200 ; 第六边' },
    { pos: new THREE.Vector3(26, 15, -15), gcode: 'G01 X26.0 Y-15.0 F200 ; 回到起始边' },
    { pos: new THREE.Vector3(26, 25, -15), gcode: 'G00 Z25.0 ; 退刀到安全高度' },
    { pos: new THREE.Vector3(0, 25, 0), gcode: 'G00 X0.0 Y0.0 ; 移动到中心' },
    { pos: new THREE.Vector3(0, 5, 0), gcode: 'G01 Z-12.0 F50 ; 钻中央孔' },
    { pos: new THREE.Vector3(0, 25, 0), gcode: 'G00 Z25.0 ; 退刀' },
    { pos: new THREE.Vector3(30, 50, 0), gcode: 'G00 X30.0 Y0.0 Z50.0 ; 退到最终安全位置' },
  ]

  if (currentLineNumber.value < animationPath.length - 1) {
    currentLineNumber.value++
    const currentStep = animationPath[currentLineNumber.value]
    currentGCodeLine.value = currentStep.gcode
    progress.value = currentLineNumber.value / (animationPath.length - 1)

    console.log(`单步执行第${currentLineNumber.value}步:`, currentStep.gcode)

    // 执行单步动画
    new TWEEN.Tween(currentToolMesh.position)
      .to(
        {
          x: currentStep.pos.x,
          y: currentStep.pos.y,
          z: currentStep.pos.z,
        },
        800,
      ) // 单步动画较快
      .onUpdate(() => {
        currentTime.value = progress.value * totalTime.value
        materialRemoved.value = progress.value * 450
      })
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  }
}

const animateToolPath = () => {
  if (!currentToolMesh || !isPlaying.value) {
    console.log('动画条件不满足:', { hasToolMesh: !!currentToolMesh, isPlaying: isPlaying.value })
    return
  }

  // 定义完整的动画路径
  const animationPath = [
    { pos: new THREE.Vector3(30, 50, 0), gcode: 'G21 ; 公制单位' },
    { pos: new THREE.Vector3(30, 25, 0), gcode: 'G00 X30.0 Y0.0 Z25.0 ; 快速定位到起始点' },
    { pos: new THREE.Vector3(26, 25, -15), gcode: 'G01 X26.0 Y-15.0 Z25.0 F200 ; 移动到第一边' },
    { pos: new THREE.Vector3(26, 15, -15), gcode: 'G01 Z-2.0 F100 ; 下刀' },
    { pos: new THREE.Vector3(0, 15, -30), gcode: 'G01 X0.0 Y-30.0 F200 ; 第二边' },
    { pos: new THREE.Vector3(-26, 15, -15), gcode: 'G01 X-26.0 Y-15.0 F200 ; 第三边' },
    { pos: new THREE.Vector3(-26, 15, 15), gcode: 'G01 X-26.0 Y15.0 F200 ; 第四边' },
    { pos: new THREE.Vector3(0, 15, 30), gcode: 'G01 X0.0 Y30.0 F200 ; 第五边' },
    { pos: new THREE.Vector3(26, 15, 15), gcode: 'G01 X26.0 Y15.0 F200 ; 第六边' },
    { pos: new THREE.Vector3(26, 15, -15), gcode: 'G01 X26.0 Y-15.0 F200 ; 回到起始边' },
    { pos: new THREE.Vector3(26, 25, -15), gcode: 'G00 Z25.0 ; 退刀到安全高度' },
    { pos: new THREE.Vector3(0, 25, 0), gcode: 'G00 X0.0 Y0.0 ; 移动到中心' },
    { pos: new THREE.Vector3(0, 5, 0), gcode: 'G01 Z-12.0 F50 ; 钻中央孔' },
    { pos: new THREE.Vector3(0, 25, 0), gcode: 'G00 Z25.0 ; 退刀' },
    { pos: new THREE.Vector3(30, 50, 0), gcode: 'G00 X30.0 Y0.0 Z50.0 ; 退到最终安全位置' },
  ]

  let currentStepIndex = 0

  // 设置初始位置
  currentToolMesh.position.copy(animationPath[0].pos)
  currentGCodeLine.value = animationPath[0].gcode
  currentLineNumber.value = 0

  console.log('开始动画，总步数:', animationPath.length)

  const executeNextStep = () => {
    if (!isPlaying.value) {
      console.log('动画被停止')
      return
    }

    if (currentStepIndex >= animationPath.length - 1) {
      // 动画完成
      console.log('动画完成')
      isPlaying.value = false
      simulationStatus.value = 'completed'
      statusText.value = '加工完成'
      progress.value = 1.0
      return
    }

    currentStepIndex++
    const currentStep = animationPath[currentStepIndex]
    const duration = 1000 / speed.value // 每步1秒

    console.log(`执行第${currentStepIndex}步:`, currentStep.gcode)

    // 更新G代码显示
    currentLineNumber.value = currentStepIndex
    currentGCodeLine.value = currentStep.gcode

    // 创建动画
    new TWEEN.Tween(currentToolMesh.position)
      .to(
        {
          x: currentStep.pos.x,
          y: currentStep.pos.y,
          z: currentStep.pos.z,
        },
        duration,
      )
      .onUpdate(() => {
        // 更新进度
        progress.value = currentStepIndex / (animationPath.length - 1)
        currentTime.value = progress.value * totalTime.value
        materialRemoved.value = progress.value * 450
      })
      .onComplete(() => {
        console.log(`第${currentStepIndex}步完成`)
        if (isPlaying.value) {
          setTimeout(executeNextStep, 200) // 200ms间隔
        }
      })
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  }

  // 开始执行动画
  executeNextStep()
}

const executeGCodeLine = (line: string) => {
  // 解析并执行单行G代码
  console.log('执行G代码:', line)

  // 这里可以添加具体的G代码解析逻辑
  if (line.includes('M03')) {
    currentSpindle.value = 1200
  } else if (line.includes('M05')) {
    currentSpindle.value = 0
  }
}

const seekToPosition = (event: MouseEvent) => {
  if (!isReady.value || isPlaying.value) return

  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const newProgress = clickX / rect.width

  // 限制在0-1范围内
  const clampedProgress = Math.max(0, Math.min(1, newProgress))

  console.log('跳转到进度:', clampedProgress)

  // 定义动画路径
  const animationPath = [
    { pos: new THREE.Vector3(30, 50, 0), gcode: 'G21 ; 公制单位' },
    { pos: new THREE.Vector3(30, 25, 0), gcode: 'G00 X30.0 Y0.0 Z25.0 ; 快速定位到起始点' },
    { pos: new THREE.Vector3(26, 25, -15), gcode: 'G01 X26.0 Y-15.0 Z25.0 F200 ; 移动到第一边' },
    { pos: new THREE.Vector3(26, 15, -15), gcode: 'G01 Z-2.0 F100 ; 下刀' },
    { pos: new THREE.Vector3(0, 15, -30), gcode: 'G01 X0.0 Y-30.0 F200 ; 第二边' },
    { pos: new THREE.Vector3(-26, 15, -15), gcode: 'G01 X-26.0 Y-15.0 F200 ; 第三边' },
    { pos: new THREE.Vector3(-26, 15, 15), gcode: 'G01 X-26.0 Y15.0 F200 ; 第四边' },
    { pos: new THREE.Vector3(0, 15, 30), gcode: 'G01 X0.0 Y30.0 F200 ; 第五边' },
    { pos: new THREE.Vector3(26, 15, 15), gcode: 'G01 X26.0 Y15.0 F200 ; 第六边' },
    { pos: new THREE.Vector3(26, 15, -15), gcode: 'G01 X26.0 Y-15.0 F200 ; 回到起始边' },
    { pos: new THREE.Vector3(26, 25, -15), gcode: 'G00 Z25.0 ; 退刀到安全高度' },
    { pos: new THREE.Vector3(0, 25, 0), gcode: 'G00 X0.0 Y0.0 ; 移动到中心' },
    { pos: new THREE.Vector3(0, 5, 0), gcode: 'G01 Z-12.0 F50 ; 钻中央孔' },
    { pos: new THREE.Vector3(0, 25, 0), gcode: 'G00 Z25.0 ; 退刀' },
    { pos: new THREE.Vector3(30, 50, 0), gcode: 'G00 X30.0 Y0.0 Z50.0 ; 退到最终安全位置' },
  ]

  // 计算目标步骤
  const targetStepIndex = Math.floor(clampedProgress * (animationPath.length - 1))
  const targetStep = animationPath[targetStepIndex]

  // 更新状态
  progress.value = clampedProgress
  currentTime.value = clampedProgress * totalTime.value
  materialRemoved.value = clampedProgress * 450
  currentLineNumber.value = targetStepIndex
  currentGCodeLine.value = targetStep.gcode

  // 移动刀具到目标位置
  if (currentToolMesh) {
    new TWEEN.Tween(currentToolMesh.position)
      .to(
        {
          x: targetStep.pos.x,
          y: targetStep.pos.y,
          z: targetStep.pos.z,
        },
        500,
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  }
}

const updateAnimationSpeed = (newSpeed: number) => {
  // 更新动画速度
  TWEEN.getAll().forEach((tween) => {
    // 调整动画时间比例
    const currentDuration = (tween as any).duration()
    if (typeof currentDuration === 'number') {
      ;(tween as any).duration(currentDuration / newSpeed)
    }
  })
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 相机控制函数
const setCameraView = (view: string) => {
  if (!camera || !controls) return

  console.log('切换到视角:', view)

  switch (view) {
    case 'front':
      camera.position.set(0, 20, 150)
      controls.target.set(0, 10, 0)
      break
    case 'side':
      camera.position.set(150, 20, 0)
      controls.target.set(0, 10, 0)
      break
    case 'top':
      camera.position.set(0, 150, 0)
      controls.target.set(0, 0, 0)
      break
    case 'iso':
      camera.position.set(100, 80, 100)
      controls.target.set(0, 10, 0)
      break
  }

  controls.update()
}

const resetCamera = () => {
  if (!camera || !controls) return

  console.log('重置相机视角')
  camera.position.set(100, 80, 100)
  controls.target.set(0, 10, 0)
  controls.update()
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  controls.update()

  // 确保TWEEN正确更新
  if (typeof TWEEN !== 'undefined') {
    TWEEN.update()
  }

  // 更新刀具路径显示
  if (toolPath) {
    toolPath.visible = showToolPath.value
  }

  renderer.render(scene, camera)
}

const cleanup = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  TWEEN.removeAll()

  if (renderer) {
    renderer.dispose()
  }
}

// 监听显示选项变化
watch(showToolPath, (show) => {
  if (toolPath) {
    toolPath.visible = show
  }
})

watch(showCoordinates, (show) => {
  if (coordinateAxes) {
    coordinateAxes.visible = show
  }
})

watch(showWorkpieceWireframe, (wireframe) => {
  if (workpiece && workpiece.material) {
    ;(workpiece.material as THREE.MeshPhysicalMaterial).wireframe = wireframe
  }
})

// 监听速度变化
watch(speed, (newSpeed) => {
  console.log('速度调整为:', newSpeed)
  // 如果有正在运行的动画，调整其速度
  updateAnimationSpeed(newSpeed)
})

// 删除重复的生命周期钩子，使用上面已有的
</script>

<style scoped>
.machining-simulation {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.simulation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.simulation-header h3 {
  color: #1f2937;
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.ready {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.running {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.paused {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.simulation-viewport {
  position: relative;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  background: #f8fafc;
  margin-bottom: 20px;
}

.simulation-canvas {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
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

.tool-info {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  border-radius: 10px;
  font-size: 14px;
}

.tool-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  gap: 15px;
}

.tool-label {
  opacity: 0.8;
}

.tool-value {
  font-weight: 600;
}

.gcode-display {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  border-radius: 10px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.gcode-line {
  display: flex;
  gap: 10px;
}

.line-number {
  color: #60a5fa;
  font-weight: 600;
}

.gcode-text {
  color: #fbbf24;
}

.simulation-controls {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 30px;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
}

.playback-controls {
  display: flex;
  gap: 10px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.control-btn.secondary {
  background: linear-gradient(135deg, #6b7280, #374151);
  color: white;
}

.control-btn.info {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.speed-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.speed-control label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.speed-slider {
  width: 150px;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  cursor: pointer;
}

.progress-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.progress-control label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: height 0.2s ease;
}

.progress-bar:hover {
  height: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #10b981, #047857);
  transition: width 0.3s ease;
}

.time-info {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.simulation-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: #f8fafc;
  border-radius: 10px;
  border-left: 4px solid #3b82f6;
}

.stat-label {
  font-weight: 500;
  color: #6b7280;
}

.stat-value {
  font-weight: 700;
  color: #1f2937;
}

.simulation-options {
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
}

.option-group {
  display: flex;
  gap: 30px;
}

.option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.option-group input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.camera-controls {
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  margin-top: 20px;
}

.camera-controls h4 {
  margin: 0 0 15px 0;
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
}

.camera-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.view-btn {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
}

.icon {
  font-size: 1.2em;
}

.animation-status {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .simulation-controls {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .playback-controls {
    justify-content: center;
  }

  .option-group {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
