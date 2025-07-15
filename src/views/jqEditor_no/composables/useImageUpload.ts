import { ref, type Ref } from 'vue'
import type { ImageUploadOptions, ImageProcessResult } from '../types/canvas'
import { rgbToHex } from '../utils/colorUtils'

export function useImageUpload() {
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const fileInputRef: Ref<HTMLInputElement | null> = ref(null)

  /**
   * 触发文件选择
   */
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  /**
   * 处理文件选择
   */
  const handleFileSelect = async (
    event: Event,

    _options: ImageUploadOptions = {},

    _availableColors: string[] = [],
  ): Promise<ImageProcessResult> => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) {
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: '未选择文件',
      }
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: '请选择图片文件',
      }
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: '文件大小不能超过10MB',
      }
    }

    try {
      isUploading.value = true
      uploadProgress.value = 0

      const result = await processImageFile(file, _options, _availableColors)

      // 清空文件输入
      if (target) {
        target.value = ''
      }

      return result
    } catch (error) {
      console.error('图片处理失败:', error)
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: error instanceof Error ? error.message : '图片处理失败',
      }
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * 处理图片文件
   */
  const processImageFile = async (
    file: File,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: ImageUploadOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _availableColors: string[],
  ): Promise<ImageProcessResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'))
        return
      }

      img.onload = () => {
        try {
          uploadProgress.value = 25

          // 检查图片尺寸限制
          const { width, height } = img
          const totalPixels = width * height

          if (width > 4000 || height > 4000) {
            reject(new Error(`图片尺寸过大: ${width}x${height}，最大支持 4000x4000 像素`))
            return
          }

          // 限制总像素数量，防止Map超限 (最大1600万像素)
          if (totalPixels > 16000000) {
            reject(
              new Error(
                `图片像素总数过多: ${totalPixels.toLocaleString()}，最大支持 16,000,000 像素`,
              ),
            )
            return
          }

          console.log(
            `处理图片: ${width}x${height} 像素，总计 ${totalPixels.toLocaleString()} 像素`,
          )

          // 使用原始图片尺寸，不进行缩放

          canvas.width = width
          canvas.height = height

          uploadProgress.value = 50

          // 绘制图片 - 1:1 像素映射
          ctx.drawImage(img, 0, 0)

          uploadProgress.value = 75

          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, width, height)
          const pixels = imageData.data

          // 转换像素为网格数据 - 简化处理
          const gridData = new Map<string, string>()
          const usedColors = new Set<string>()

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const index = (y * width + x) * 4
              const r = pixels[index]
              const g = pixels[index + 1]
              const b = pixels[index + 2]
              const a = pixels[index + 3]

              // 跳过透明像素
              if (a < 128) continue

              const hexColor = rgbToHex(r, g, b)

              // 直接使用原始颜色，不进行颜色映射
              const finalColor = hexColor

              gridData.set(`${x},${y}`, finalColor)
              usedColors.add(finalColor)
            }
          }

          uploadProgress.value = 100

          resolve({
            success: true,
            width,
            height,
            gridData,
            colors: Array.from(usedColors),
          })
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }

      // 创建对象URL
      const objectUrl = URL.createObjectURL(file)

      // 保存原始的onload处理函数
      const originalOnload = img.onload

      // 设置图片源
      img.src = objectUrl

      // 在图片加载完成后清理对象URL
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl)
      }

      // 重新设置onload，确保清理逻辑在原始处理后执行
      img.onload = (event) => {
        cleanup()
        if (originalOnload) {
          originalOnload.call(img, event)
        }
      }

      // 错误时也要清理
      const originalOnerror = img.onerror
      img.onerror = (event) => {
        cleanup()
        if (originalOnerror) {
          originalOnerror.call(img, event)
        }
      }
    })
  }

  return {
    isUploading,
    uploadProgress,
    fileInputRef,
    triggerFileSelect,
    handleFileSelect,
  }
}
