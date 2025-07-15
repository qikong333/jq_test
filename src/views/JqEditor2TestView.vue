<template>
  <div class="jq-editor2-test-view">
    <!-- 全屏测试页面 -->
    <div class="test-container">
      <JqEditor2Now
        :width="100"
        :height="150"
        :actual-width="78"
        :actual-height="90"
        @finish="handleFinish"
        @colors-updated="handleColorsUpdated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import JqEditor2Now from './jqEditor2_now 09-16-48-915/index.vue'

// 处理完成事件
const handleFinish = (canvasData: unknown) => {
  console.log('编辑完成:', canvasData)
}

// 处理颜色更新事件
const handleColorsUpdated = (colors: string[]) => {
  console.log('颜色更新:', colors)
}
</script>

<style scoped>
.jq-editor2-test-view {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #f5f5f5;
}

.test-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
