import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class ThreeHelper {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  animationId: number | null = null
  container: HTMLElement | null = null

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
  }

  init(container: HTMLElement) {
    this.container = container

    // 设置场景背景
    this.scene.background = new THREE.Color(0x1a1a1a)

    // 设置相机
    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.camera.position.z = 5

    // 设置渲染器
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x1a1a1a)

    container.appendChild(this.renderer.domElement)

    // 添加基础光照
    this.addBasicLighting()

    // 监听窗口大小变化
    this.handleResize()
  }

  addBasicLighting() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    this.scene.add(directionalLight)
  }

  handleResize() {
    const resizeObserver = new ResizeObserver(() => {
      if (!this.container) return

      this.camera.aspect = this.container.clientWidth / this.container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    })

    if (this.container) {
      resizeObserver.observe(this.container)
    }
  }

  createBox(color: number = 0x00ff00, size: number = 1): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 100,
    })
    return new THREE.Mesh(geometry, material)
  }

  createSphere(color: number = 0xff0000, radius: number = 1): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 100,
    })
    return new THREE.Mesh(geometry, material)
  }

  createPlane(color: number = 0x0000ff, width: number = 5, height: number = 5): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.MeshPhongMaterial({
      color,
      side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geometry, material)
  }

  addToScene(object: THREE.Object3D) {
    this.scene.add(object)
  }

  removeFromScene(object: THREE.Object3D) {
    this.scene.remove(object)
  }

  startAnimation(animateCallback?: () => void) {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)

      if (animateCallback) {
        animateCallback()
      }

      this.renderer.render(this.scene, this.camera)
    }

    animate()
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  dispose() {
    this.stopAnimation()

    // 清理几何体和材质
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })

    // 清理渲染器
    this.renderer.dispose()

    // 移除DOM元素
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}

// 常用颜色常量
export const COLORS = {
  RED: 0xff0000,
  GREEN: 0x00ff00,
  BLUE: 0x0000ff,
  YELLOW: 0xffff00,
  PURPLE: 0xff00ff,
  CYAN: 0x00ffff,
  WHITE: 0xffffff,
  BLACK: 0x000000,
  ORANGE: 0xffa500,
  PINK: 0xffc0cb,
}

// 预设材质
export const createMaterial = (
  type: 'basic' | 'phong' | 'standard' = 'phong',
  color: number = 0x00ff00,
) => {
  switch (type) {
    case 'basic':
      return new THREE.MeshBasicMaterial({ color })
    case 'standard':
      return new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.5 })
    case 'phong':
    default:
      return new THREE.MeshPhongMaterial({ color, shininess: 100 })
  }
}

// FoxPSD Three.js渲染器
export interface ThreeRendererConfig {
  container: HTMLElement
  modelPath: string
  background: string
  quality: string
  controls: {
    enableRotation: boolean
    enableZoom: boolean
    autoRotate: boolean
  }
  onLoad: () => void
  onError: (error: string) => void
}

export const createThreeRenderer = async (config: ThreeRendererConfig) => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    75,
    config.container.clientWidth / config.container.clientHeight,
    0.1,
    1000,
  )
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })

  // 设置渲染器
  renderer.setSize(config.container.clientWidth, config.container.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // 设置背景
  const updateBackground = (bg: string) => {
    switch (bg) {
      case 'transparent':
        renderer.setClearColor(0x000000, 0)
        scene.background = null
        break
      case 'white':
        renderer.setClearColor(0xffffff, 1)
        scene.background = new THREE.Color(0xffffff)
        break
      case 'black':
        renderer.setClearColor(0x000000, 1)
        scene.background = new THREE.Color(0x000000)
        break
      case 'gradient':
        // 创建渐变背景
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')!
        const gradient = context.createLinearGradient(0, 0, 0, 256)
        gradient.addColorStop(0, '#667eea')
        gradient.addColorStop(1, '#764ba2')
        context.fillStyle = gradient
        context.fillRect(0, 0, 256, 256)
        const texture = new THREE.CanvasTexture(canvas)
        scene.background = texture
        break
      default:
        renderer.setClearColor(0xffffff, 1)
        scene.background = new THREE.Color(0xffffff)
    }
  }

  updateBackground(config.background)

  // 添加光照 - 改善整体照明
  // 增强环境光，让背面不会太暗
  const ambientLight = new THREE.AmbientLight(0x404040, 1.2)
  scene.add(ambientLight)

  // 主光源 - 从右上前方照射
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight1.position.set(5, 5, 5)
  directionalLight1.castShadow = true
  directionalLight1.shadow.mapSize.width = 2048
  directionalLight1.shadow.mapSize.height = 2048
  scene.add(directionalLight1)

  // 补光 - 从左后方照射，减少阴影
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
  directionalLight2.position.set(-3, 2, -3)
  scene.add(directionalLight2)

  // 底部补光 - 从下方照射，减少底部阴影
  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.3)
  directionalLight3.position.set(0, -5, 0)
  scene.add(directionalLight3)

  // 设置相机位置
  camera.position.set(0, 0, 5)

  // 添加控制器
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableRotate = config.controls.enableRotation
  controls.enableZoom = config.controls.enableZoom
  controls.autoRotate = config.controls.autoRotate
  controls.autoRotateSpeed = 2.0

  // 将渲染器添加到容器
  config.container.appendChild(renderer.domElement)

  // 加载GLB模型
  const loader = new GLTFLoader()
  let model: THREE.Group | null = null

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        config.modelPath,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error),
      )
    })

    model = gltf.scene
    scene.add(model)

    // 自动调整模型大小和位置
    if (model) {
      const box = new THREE.Box3().setFromObject(model as THREE.Object3D)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      // 将模型居中到原点
      model.position.sub(center)

      // 调整相机距离以适应模型
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
      cameraZ *= 1.5 // 添加一些边距
      camera.position.z = cameraZ

      // 设置控制器目标为原点（模型移动后的中心）
      controls.target.set(0, 0, 0)
      controls.update()

      console.log('模型中心点:', center.toArray())
      console.log('旋转中心设置为原点:', controls.target.toArray())
    }

    console.log('GLB模型加载成功')
    config.onLoad()
  } catch (error) {
    console.error('GLB模型加载失败:', error)
    config.onError('模型加载失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }

  // 动画循环
  let animationId: number
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // 窗口大小变化处理
  const handleResize = () => {
    camera.aspect = config.container.clientWidth / config.container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(config.container.clientWidth, config.container.clientHeight)
  }

  window.addEventListener('resize', handleResize)

  // 纹理管理
  const textureLoader = new THREE.TextureLoader()
  const originalMaterials = new Map<THREE.Material, THREE.Material>()
  let currentTexture: THREE.Texture | null = null

  // 保存原始材质
  const saveOriginalMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat, index) => {
            if (!originalMaterials.has(mat)) {
              originalMaterials.set(mat, mat.clone())
            }
          })
        } else {
          if (!originalMaterials.has(child.material)) {
            originalMaterials.set(child.material, child.material.clone())
          }
        }
      }
    })
  }

  // 应用纹理到材质
  const applyTextureToMaterial = (
    material: THREE.Material,
    texture: THREE.Texture,
    options: { repeatX: number; repeatY: number },
  ) => {
    if (
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhongMaterial ||
      material instanceof THREE.MeshLambertMaterial
    ) {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(options.repeatX, options.repeatY)

      material.map = texture
      material.needsUpdate = true
    }
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    model,
    updateQuality: (quality: string) => {
      console.log('更新渲染质量:', quality)
      // 根据质量调整渲染器设置
      switch (quality) {
        case 'low':
          renderer.setPixelRatio(0.5)
          break
        case 'medium':
          renderer.setPixelRatio(1)
          break
        case 'high':
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          break
        case 'ultra':
          renderer.setPixelRatio(window.devicePixelRatio)
          break
      }
    },
    updateBackground,
    updateControls: (newControls: any) => {
      controls.enableRotate = newControls.enableRotation
      controls.enableZoom = newControls.enableZoom
      controls.autoRotate = newControls.autoRotate
    },
    updateTexture: async (textureName: string, options: { repeatX: number; repeatY: number }) => {
      if (!model || !textureName) return

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

      const texturePath = textureMap[textureName]
      if (!texturePath) return

      try {
        currentTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(texturePath, resolve, undefined, reject)
        })

        // 保存原始材质（如果还没保存）
        if (originalMaterials.size === 0) {
          saveOriginalMaterials(model)
        }

        // 应用纹理到第一个找到的材质
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              if (child.material.length > 0) {
                applyTextureToMaterial(child.material[0], currentTexture!, options)
              }
            } else {
              applyTextureToMaterial(child.material, currentTexture!, options)
            }
            return // 只应用到第一个找到的网格
          }
        })

        console.log(`纹理 ${textureName} 已应用`)
      } catch (error) {
        console.error('纹理加载失败:', error)
      }
    },
    updateTextureRepeat: (repeatX: number, repeatY: number) => {
      if (currentTexture) {
        currentTexture.repeat.set(repeatX, repeatY)
        currentTexture.needsUpdate = true
      }
    },
    applyTextureToAll: async (
      textureName: string,
      options: { repeatX: number; repeatY: number },
    ) => {
      if (!model || !textureName) return

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

      const texturePath = textureMap[textureName]
      if (!texturePath) return

      try {
        currentTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(texturePath, resolve, undefined, reject)
        })

        // 保存原始材质（如果还没保存）
        if (originalMaterials.size === 0) {
          saveOriginalMaterials(model)
        }

        // 应用纹理到所有材质
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                applyTextureToMaterial(mat, currentTexture!, options)
              })
            } else {
              applyTextureToMaterial(child.material, currentTexture!, options)
            }
          }
        })

        console.log(`纹理 ${textureName} 已应用到所有材质`)
      } catch (error) {
        console.error('纹理加载失败:', error)
      }
    },
    resetMaterials: () => {
      if (!model) return

      // 恢复原始材质
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat, index) => {
              const original = originalMaterials.get(mat)
              if (original) {
                child.material[index] = original.clone()
              }
            })
          } else {
            const original = originalMaterials.get(child.material)
            if (original) {
              child.material = original.clone()
            }
          }
        }
      })

      currentTexture = null
      console.log('材质已重置为原始状态')
    },
    reset: () => {
      // 重置到原点（模型的实际中心位置）
      controls.target.set(0, 0, 0)
      controls.reset()
    },
    destroy: () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      renderer.dispose()
      if (config.container && renderer.domElement) {
        config.container.removeChild(renderer.domElement)
      }
    },
  }
}
