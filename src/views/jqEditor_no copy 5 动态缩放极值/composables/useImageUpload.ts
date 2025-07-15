import { ref, type Ref } from 'vue';
import type { ImageUploadOptions, ImageProcessResult } from '../types/canvas';
import { rgbToHex, findClosestColor } from '../utils/colorUtils';

export function useImageUpload() {
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const fileInputRef: Ref<HTMLInputElement | null> = ref(null);

  /**
   * 触发文件选择
   */
  const triggerFileSelect = () => {
    fileInputRef.value?.click();
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = async (
    event: Event,
    options: ImageUploadOptions = {},
    availableColors: string[] = []
  ): Promise<ImageProcessResult> => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: '未选择文件'
      };
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: '请选择图片文件'
      };
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: '文件大小不能超过10MB'
      };
    }

    try {
      isUploading.value = true;
      uploadProgress.value = 0;

      const result = await processImageFile(file, options, availableColors);
      
      // 清空文件输入
      if (target) {
        target.value = '';
      }

      return result;
    } catch (error) {
      console.error('图片处理失败:', error);
      return {
        success: false,
        width: 0,
        height: 0,
        gridData: new Map(),
        colors: [],
        error: error instanceof Error ? error.message : '图片处理失败'
      };
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  };

  /**
   * 处理图片文件
   */
  const processImageFile = async (
    file: File,
    options: ImageUploadOptions,
    availableColors: string[]
  ): Promise<ImageProcessResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      img.onload = () => {
        try {
          uploadProgress.value = 25;

          let { width, height } = img;
          const { maxWidth = 200, maxHeight = 200 } = options;

          // 计算缩放比例
          const scaleX = maxWidth / width;
          const scaleY = maxHeight / height;
          const scale = Math.min(scaleX, scaleY, 1);

          width = Math.floor(width * scale);
          height = Math.floor(height * scale);

          canvas.width = width;
          canvas.height = height;

          uploadProgress.value = 50;

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);
          
          uploadProgress.value = 75;

          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, width, height);
          const pixels = imageData.data;

          // 转换像素为网格数据
          const gridData = new Map<string, string>();
          const usedColors = new Set<string>();

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const index = (y * width + x) * 4;
              const r = pixels[index];
              const g = pixels[index + 1];
              const b = pixels[index + 2];
              const a = pixels[index + 3];

              // 跳过透明像素
              if (a < 128) continue;

              const hexColor = rgbToHex(r, g, b);
              
              // 如果有可用颜色列表，找到最接近的颜色
              const finalColor = availableColors.length > 0 
                ? findClosestColor(hexColor, availableColors)
                : hexColor;

              gridData.set(`${x},${y}`, finalColor);
              usedColors.add(finalColor);
            }
          }

          uploadProgress.value = 100;

          resolve({
            success: true,
            width,
            height,
            gridData,
            colors: Array.from(usedColors),
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      // 创建对象URL
      const objectUrl = URL.createObjectURL(file);
      
      // 保存原始的onload处理函数
      const originalOnload = img.onload;
      
      // 设置图片源
      img.src = objectUrl;
      
      // 在图片加载完成后清理对象URL
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      
      // 重新设置onload，确保清理逻辑在原始处理后执行
      img.onload = (event) => {
        cleanup();
        if (originalOnload) {
          originalOnload.call(img, event);
        }
      };
      
      // 错误时也要清理
      const originalOnerror = img.onerror;
      img.onerror = (event) => {
        cleanup();
        if (originalOnerror) {
          originalOnerror.call(img, event);
        }
      };
    });
  };

  return {
    isUploading,
    uploadProgress,
    fileInputRef,
    triggerFileSelect,
    handleFileSelect,
  };
}