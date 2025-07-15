import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/cnc-design',
      name: 'cnc-design',
      component: () => import('../views/CNCDesignView.vue'),
    },
    {
      path: '/cnc-3d',
      name: 'cnc-3d',
      component: () => import('../views/CNCPart3DView.vue'),
    },
    {
      path: '/threejs',
      name: 'threejs',
      component: () => import('../views/ThreeJsView.vue'),
    },
    {
      path: '/simulation',
      name: 'simulation',
      component: () => import('../views/MachiningSimulationView.vue'),
    },
    {
      path: '/glb-viewer',
      name: 'glb-viewer',
      component: () => import('../views/GLBModelView.vue'),
    },
    {
      path: '/foxpsd',
      name: 'foxpsd',
      component: () => import('../views/FoxPSDView.vue'),
    },
    {
      path: '/jq-editor-no',
      name: 'jq-editor-no',
      component: () => import('../views/JqEditorNoView.vue'),
    },
    {
      path: '/jq-editor-now',
      name: 'jq-editor-now',
      component: () => import('../views/JqEditorNowView.vue'),
    },
    {
      path: '/jq-editor2-test',
      name: 'jq-editor2-test',
      component: () => import('../views/JqEditor2TestView.vue'),
    },
    {
      path: '/image-upload-test',
      name: 'image-upload-test',
      component: () => import('../views/ImageUploadTestView.vue'),
    },
    {
      path: '/fullscreen-layer',
      name: 'fullscreen-layer',
      component: () => import('../views/FullscreenLayerView.vue'),
    },
    {
      path: '/canvas-pro',
      name: 'canvas-pro',
      component: () => import('../views/canvasPro/index.vue'),
    },
    {
      path: '/canvas-pro-fullscreen',
      name: 'canvas-pro-fullscreen',
      component: () => import('../views/CanvasProFullscreenView.vue'),
    },
    {
      path: '/pixi-editor',
      name: 'pixi-editor',
      component: () => import('../views/pixi/demo.vue'),
    },
    {
      path: '/',
      name: 'canvas-editor',
      component: () => import('../views/canvasEditor/index.vue'),
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
