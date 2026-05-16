<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { saveImage } from '@/utils/saveImage'

const store = useImageStore()
const fileInputRef = ref<HTMLInputElement | null>(null)

const VALID_TYPES = ['image/png', 'image/bmp', 'image/jpeg']

function onNewFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && VALID_TYPES.includes(file.type)) {
    store.loadImage(file)
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function onSave() {
  if (!store.src) return
  await saveImage(store.src, store.naturalWidth, store.naturalHeight, store.maskedWords)
}
</script>

<template>
  <div class="toolbar">
    <input
      ref="fileInputRef"
      type="file"
      accept=".png,.bmp,.jpg,.jpeg"
      class="toolbar__file-input"
      @change="onNewFileChange"
    />

    <button class="toolbar__btn toolbar__btn--secondary" @click="fileInputRef?.click()">
      開啟新圖片
    </button>

    <div class="toolbar__divider" />

    <div class="toolbar__ocr-status">
      <template v-if="store.ocrStatus === 'processing'">
        <div class="toolbar__progress-bar">
          <div class="toolbar__progress-fill" :style="{ width: store.ocrProgress + '%' }" />
        </div>
        <span class="toolbar__ocr-label">OCR 辨識中 {{ store.ocrProgress }}%</span>
      </template>
      <template v-else-if="store.ocrStatus === 'done'">
        <span class="toolbar__ocr-label toolbar__ocr-label--done">
          OCR 完成，共辨識 {{ store.words.length }} 個詞
        </span>
      </template>
      <template v-else-if="store.ocrStatus === 'error'">
        <span class="toolbar__ocr-label toolbar__ocr-label--error">OCR 失敗</span>
      </template>
      <template v-else>
        <span class="toolbar__ocr-label">等待圖片載入...</span>
      </template>
    </div>

    <div class="toolbar__divider" />

    <button
      class="toolbar__btn toolbar__btn--primary"
      :disabled="!store.anySelected"
      @click="store.maskSelected()"
    >
      遮罩
    </button>

    <button
      class="toolbar__btn"
      :disabled="!store.anySelected"
      @click="store.unmaskSelected()"
    >
      取消遮罩
    </button>

    <button
      class="toolbar__btn"
      :disabled="!store.anyMasked"
      @click="store.unmaskAll()"
    >
      全部取消遮罩
    </button>

    <div class="toolbar__spacer" />

    <button class="toolbar__btn toolbar__btn--save" @click="onSave">
      儲存圖片
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar__file-input {
  display: none;
}

.toolbar__divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 4px;
}

.toolbar__spacer {
  flex: 1;
}

.toolbar__btn {
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background-color 0.15s;
}

.toolbar__btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar__btn--primary {
  background: #4285f4;
  color: #fff;
  border-color: #3367d6;
}

.toolbar__btn--primary:hover:not(:disabled) {
  background: #3367d6;
}

.toolbar__btn--secondary {
  border-color: #aaa;
}

.toolbar__btn--save {
  background: #34a853;
  color: #fff;
  border-color: #2d9249;
}

.toolbar__btn--save:hover:not(:disabled) {
  background: #2d9249;
}

.toolbar__ocr-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__progress-bar {
  width: 120px;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.toolbar__progress-fill {
  height: 100%;
  background: #4285f4;
  border-radius: 3px;
  transition: width 0.2s;
}

.toolbar__ocr-label {
  font-size: 12px;
  color: #666;
}

.toolbar__ocr-label--done {
  color: #34a853;
}

.toolbar__ocr-label--error {
  color: #ea4335;
}
</style>
