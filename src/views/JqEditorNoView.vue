<template>
  <div class="jq-editor-no-view">
    <h2>jqEditor No (旧版编辑器)</h2>
    <JqEditorNo
      :width="400"
      :height="500"
      :actual-width="50"
      :actual-height="50"
      bg-color="#ffffff"
      :source-type="1"
      :readonly="false"
      :max-undo-steps="50"
      @finish="handleFinish"
      @colors-updated="handleColorsUpdated"
      @size-changed="handleSizeChanged"
    />
  </div>
</template>

<script setup lang="ts" name="JqEditorNoView">
import JqEditorNo from './jqEditor_no/index.vue'
import type { CanvasExportData } from './jqEditor_no/types/canvas'

// 事件处理
const handleFinish = (data: CanvasExportData) => {
  console.log('编辑完成:', data)
}

const handleColorsUpdated = (colors: string[]) => {
  console.log('颜色更新:', colors)
}

const handleSizeChanged = (size: {
  width: number
  height: number
  actualWidth: number
  actualHeight: number
}) => {
  console.log('尺寸变化:', size)
}
</script>

<style scoped>
.jq-editor-no-view {
  padding: 20px;
  height: 100vh;
  overflow: hidden;
}

.jq-editor-no-view h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 24px;
}
</style>
