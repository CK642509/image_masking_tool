<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'

const store = useImageStore()
const inputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const VALID_TYPES = ['image/png', 'image/bmp', 'image/jpeg']

function isValidType(file: File): boolean {
  return VALID_TYPES.includes(file.type)
}

function handleFile(file: File | undefined) {
  if (file && isValidType(file)) {
    store.loadImage(file)
  }
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  handleFile(e.dataTransfer?.files[0])
}

function onChange(e: Event) {
  handleFile((e.target as HTMLInputElement).files?.[0])
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}
</script>

<template>
  <div
    class="uploader"
    :class="{ 'uploader--dragover': isDragOver }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @click="inputRef?.click()"
  >
    <input
      ref="inputRef"
      type="file"
      accept=".png,.bmp,.jpg,.jpeg"
      class="uploader__input"
      @change="onChange"
    />
    <div class="uploader__content">
      <div class="uploader__icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p class="uploader__title">拖曳圖片至此，或點擊選擇檔案</p>
      <p class="uploader__subtitle">支援格式：PNG、BMP、JPG</p>
    </div>
  </div>
</template>

<style scoped>
.uploader {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed #ccc;
  border-radius: 8px;
  margin: 24px;
  width: calc(100% - 48px);
  height: calc(100% - 48px);
  transition: border-color 0.2s, background-color 0.2s;
}

.uploader:hover,
.uploader--dragover {
  border-color: #4285f4;
  background-color: rgba(66, 133, 244, 0.05);
}

.uploader__input {
  display: none;
}

.uploader__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #666;
  pointer-events: none;
}

.uploader__icon {
  color: #999;
}

.uploader__title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.uploader__subtitle {
  font-size: 14px;
  color: #999;
}
</style>
