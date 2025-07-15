<template>
  <div class="jq-editor-now-view">
    <JqEditorNowIndex />
  </div>
</template>

<script setup lang="ts">
import JqEditorNowIndex from './jqEditor2-06271941/index.vue'
</script>

<style scoped>
.jq-editor-now-view {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a;
}

/* 确保编辑器占满全屏 */
.jq-editor-now-view :deep(.pixel-editor) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
