<template>
  <div class="image-upload-test">
    <h2>图片上传测试页面</h2>
    
    <div class="upload-section">
      <input 
        ref="fileInputRef" 
        type="file" 
        accept="image/*" 
        @change="handleFileSelect"
      />
    </div>
    
    <div v-if="isUploading" class="progress-section">
      <p>上传进度: {{ uploadProgress }}%</p>
    </div>
    
    <div v-if="result" class="result-section">
      <h3>上传结果:</h3>
      <div>
        <p><strong>成功:</strong> {{ result.success }}</p>
        <p><strong>尺寸:</strong> {{ result.width }}x{{ result.height }}</p>
        <p><strong>颜色数量:</strong> {{ result.colors.length }}</p>
        <p><strong>像素数量:</strong> {{ result.gridData.size }}</p>
        <p v-if="result.error"><strong>错误:</strong> {{ result.error }}</p>
      </div>
    </div>
    
    <div v-if="error" class="error-section">
      <h3>错误信息:</h3>
      <p class="error-text">{{ error }}</p>
    </div>
    
    <div class="logs-section">
      <h3>日志:</h3>
      <div class="logs">
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useImageUpload } from './jqEditor_no/composables/useImageUpload'
import type { ImageUploadOptions } from './jqEditor_no/types/canvas'

const { isUploading, uploadProgress, fileInputRef, handleFileSelect: originalHandleFileSelect } = useImageUpload()

const result = ref(null)
const error = ref('')
const logs = ref<string[]>([])

const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.push(`[${timestamp}] ${message}`)
  console.log(message)
}

const handleFileSelect = async (event: Event) => {
  try {
    error.value = ''
    result.value = null
    logs.value = []
    
    addLog('开始处理文件选择事件')
    
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (!file) {
      addLog('未选择文件')
      return
    }
    
    addLog(`选择的文件: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB, 类型: ${file.type}`)
    
    const options: ImageUploadOptions = {
      maxWidth: 100,
      maxHeight: 100,
      autoResize: true,
      quality: 0.8,
      fillMode: 'contain'
    }
    
    addLog('开始调用 handleFileSelect')
    const uploadResult = await originalHandleFileSelect(event, options, [])
    addLog('handleFileSelect 调用完成')
    
    result.value = uploadResult
    
    if (uploadResult.success) {
      addLog(`上传成功: ${uploadResult.width}x${uploadResult.height}, ${uploadResult.colors.length} 种颜色`)
    } else {
      error.value = uploadResult.error || '上传失败'
      addLog(`上传失败: ${uploadResult.error}`)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误'
    error.value = errorMessage
    addLog(`捕获异常: ${errorMessage}`)
    console.error('上传测试失败:', err)
  }
}
</script>

<style scoped>
.image-upload-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.upload-section {
  margin: 20px 0;
}

.progress-section {
  margin: 20px 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.result-section {
  margin: 20px 0;
  padding: 10px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
}

.error-section {
  margin: 20px 0;
  padding: 10px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.error-text {
  color: #721c24;
  margin: 0;
}

.logs-section {
  margin: 20px 0;
}

.logs {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  font-family: monospace;
  font-size: 12px;
  margin: 2px 0;
  padding: 2px 0;
  border-bottom: 1px solid #eee;
}

.log-item:last-child {
  border-bottom: none;
}
</style>