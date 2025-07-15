<script setup lang="ts">
import TheWelcome from '../components/TheWelcome.vue'
import ThreeDemo from '../components/ThreeDemo.vue'
import ThreeScene from '../components/ThreeScene.vue'
import MachiningDesign from '../components/MachiningDesign.vue'
import Navigation from '../components/Navigation.vue'
</script>

<template>
  <div>
    <Navigation />
    <main>
      <!-- CNC精加工零件设计 -->
      <section class="main-section">
        <MachiningDesign />
      </section>
    </main>
  </div>
</template>

<style scoped>
main {
  padding: 80px 0 0 0; /* 为固定导航栏留出空间 */
  max-width: 100%;
  margin: 0 auto;
  min-height: 100vh;
}

.main-section {
  width: 100%;
}

@media (max-width: 768px) {
  main {
    padding: 70px 0 0 0;
  }
}
</style>
