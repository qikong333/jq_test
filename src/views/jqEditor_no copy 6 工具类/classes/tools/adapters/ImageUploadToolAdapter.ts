import type { ITool, ToolState, ToolContext, ToolEvent } from '../../../types/tools'
import { ref, computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

/**
 * 图片上传工具适配器
 * 将现有的图片上传逻辑适配到 ITool 接口
 */
export class ImageUploadToolAdapter implements ITool {
  readonly id = 'imageUpload' as const
  readonly name = '图片上传'
  readonly icon = 'upload'
  readonly cursor = 'pointer'
  readonly shortcut = 'U'
  
  private _isActive = ref(false)
  private _state = ref<ToolState>({
    isActive: false,
    config: {},
    lastUsed: new Date(),
    usage: {
      usageCount: 0,
      totalTime: 0,
      lastUsed: new Date()
    }
  })
  private fileInput = ref<HTMLInputElement | null>(null)
  
  // 响应式状态
  get isActive(): ComputedRef<boolean> {
    return computed(() => this._isActive.value)
  }
  
  get config() {
    return this._state.value.config
  }
  
  get lastUsed() {
    return this._state.value.lastUsed
  }
  
  get state(): Ref<ToolState> {
    return this._state
  }
  
  // 生命周期方法
  async onActivate(context: ToolContext): Promise<void> {
    this._isActive.value = true
    this._state.value.isActive = true
    this._state.value.lastUsed = new Date()
    
    // 激活图片上传功能
    console.log('图片上传工具已激活')
  }
  
  async onDeactivate(context: ToolContext): Promise<void> {
    this._isActive.value = false
    this._state.value.isActive = false
    
    // 清理图片上传状态
    console.log('图片上传工具已停用')
  }
  
  onUpdate(): void {
    // 图片上传工具通常不需要持续更新
  }
  
  // 事件处理
  handleEvent(event: ToolEvent): boolean {
    switch (event.type) {
      case 'mousedown':
        this.handleMouseDown(event)
        return true
      case 'keydown':
        this.handleKeyDown(event)
        return true
      default:
        return false
    }
  }
  
  private handleMouseDown(event: ToolEvent): void {
    // 触发文件选择对话框
    this.triggerFileSelect()
  }

  private handleKeyDown(event: ToolEvent): void {
    // 处理键盘事件
    if (event.data instanceof KeyboardEvent) {
      if (event.data.key === 'u' || event.data.key === 'U') {
        this.triggerFileSelect()
      }
    }
  }
  
  private triggerFileSelect(): void {
    // 创建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        this.handleFiles(Array.from(target.files))
      }
    }
    
    input.click()
  }

  private handleDrop(event: ToolEvent): void {
    if (event.data instanceof DataTransfer) {
      const files = Array.from(event.data.files)
      const imageFiles = files.filter(file => file.type.startsWith('image/'))
      
      if (imageFiles.length > 0) {
        this.handleFiles(imageFiles)
      }
    }
  }

  private handleDragOver(event: ToolEvent): void {
    // 阻止默认行为以允许拖放
    event.originalEvent?.preventDefault()
  }

  private handleFiles(files: File[]): void {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length > 0) {
      this.loadImages(imageFiles)
    }
  }

  // 图片处理方法
  private async loadImage(file: File): Promise<void> {
    try {
      const imageUrl = URL.createObjectURL(file)
      const img = new Image()
      
      img.onload = () => {
        // 在画布上绘制图片
        this.drawImageOnCanvas(img, imageUrl)
        URL.revokeObjectURL(imageUrl)
      }
      
      img.onerror = () => {
        console.error('图片加载失败:', file.name)
        URL.revokeObjectURL(imageUrl)
      }
      
      img.src = imageUrl
    } catch (error) {
      console.error('处理图片时出错:', error)
    }
  }

  private async loadImages(files: File[]): Promise<void> {
    for (const file of files) {
      await this.loadImage(file)
    }
  }

  private drawImageOnCanvas(img: HTMLImageElement, imageUrl: string): void {
    // 这里需要访问画布上下文来绘制图片
    // 实际实现需要根据具体的画布管理方式来调整
    console.log('绘制图片到画布:', img.width, 'x', img.height)
  }
  
  private async handlePaste(event: ToolEvent, context: ToolContext): Promise<boolean> {
    const clipboardData = event.data?.clipboardData
    if (clipboardData) {
      const items = Array.from(clipboardData.items)
      const imageItem = items.find(item => item.type.startsWith('image/'))
      
      if (imageItem) {
        const file = imageItem.getAsFile()
        if (file && this.validateFile(file)) {
          // 在画布中心放置粘贴的图片
          const centerX = context.viewport?.width ? context.viewport.width / 2 : 0
          const centerY = context.viewport?.height ? context.viewport.height / 2 : 0
          await this.processImageFile(file, { x: centerX, y: centerY }, context)
          return true
        }
      }
    }
    return false
  }
  
  // 私有方法
  private createFileInput(): void {
    if (!this.fileInput.value) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = this.config.acceptedFormats.join(',')
      input.style.display = 'none'
      
      input.addEventListener('change', async (event) => {
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]
        if (file && this.validateFile(file)) {
          // 在画布中心放置选择的图片
          await this.processImageFile(file, { x: 0, y: 0 })
        }
        // 清空输入值以允许重复选择同一文件
        target.value = ''
      })
      
      document.body.appendChild(input)
      this.fileInput.value = input
    }
  }
  
  private cleanupFileInput(): void {
    if (this.fileInput.value) {
      document.body.removeChild(this.fileInput.value)
      this.fileInput.value = null
    }
  }
  
  private validateFile(file: File): boolean {
    // 检查文件类型
    if (!this.config.acceptedFormats.includes(file.type)) {
      console.error('不支持的文件格式:', file.type)
      return false
    }
    
    // 检查文件大小
    if (file.size > this.config.maxFileSize) {
      console.error('文件大小超过限制:', file.size)
      return false
    }
    
    return true
  }
  
  private async processImageFile(
    file: File, 
    position: { x: number; y: number },
    context?: ToolContext
  ): Promise<void> {
    try {
      const imageUrl = await this.createImageUrl(file)
      const img = await this.loadImage(imageUrl)
      
      // 如果启用自动调整大小
      if (this.config.autoResize) {
        const resizedImage = this.resizeImage(img)
        await this.addImageToCanvas(resizedImage, position, context)
      } else {
        await this.addImageToCanvas(img, position, context)
      }
      
      console.log('图片处理完成:', file.name)
    } catch (error) {
      console.error('处理图片文件失败:', error)
      throw error
    }
  }
  
  private createImageUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }
  
  private resizeImage(img: HTMLImageElement): HTMLImageElement {
    const { maxWidth, maxHeight } = this.config
    
    if (img.width <= maxWidth && img.height <= maxHeight) {
      return img
    }
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // 计算新尺寸
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
    canvas.width = img.width * ratio
    canvas.height = img.height * ratio
    
    // 绘制调整后的图片
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // 创建新的图片元素
    const resizedImg = new Image()
    resizedImg.src = canvas.toDataURL()
    return resizedImg
  }
  
  private async addImageToCanvas(
    img: HTMLImageElement, 
    position: { x: number; y: number },
    context?: ToolContext
  ): Promise<void> {
    // 这里应该调用画布的添加图片方法
    // 具体实现取决于画布系统的API
    console.log('添加图片到画布:', {
      width: img.width,
      height: img.height,
      position
    })
    
    // 示例：如果有画布上下文，可以直接绘制
    if (context?.canvasContext) {
      context.canvasContext.drawImage(img, position.x, position.y)
    }
  }
  
  // 配置管理
  getConfig(): Record<string, unknown> {
    return this._state.value.config
  }
  
  setConfig(config: Partial<Record<string, unknown>>): void {
    this._state.value.config = { ...this._state.value.config, ...config }
  }
  
  // 工具特定方法
  getSupportedFormats(): string[] {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
  
  getMaxFileSize(): number {
    return 10 * 1024 * 1024 // 10MB
  }
}

// 注意：不再导出默认实例，而是通过工厂函数创建
// export const imageUploadTool = new ImageUploadToolAdapter()