<script setup lang="ts">
import MachiningDesign from '../components/MachiningDesign.vue'
import Navigation from '../components/Navigation.vue'
</script>

<template>
  <div>
    <Navigation />
    <main class="cnc-page">
      <MachiningDesign />
    </main>
  </div>
</template>

<style scoped>
.cnc-page {
  padding-top: 80px; /* 为固定导航栏留出空间 */
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}
</style>
