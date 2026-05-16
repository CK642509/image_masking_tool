<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'
import ImageUploader from '@/components/ImageUploader.vue'
import ImageViewer from '@/components/ImageViewer.vue'
import Toolbar from '@/components/Toolbar.vue'

const store = useImageStore()
</script>

<template>
  <div class="app">
    <template v-if="store.hasImage">
      <Toolbar />
      <ImageViewer />
    </template>
    <ImageUploader v-else />
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
}

.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>
