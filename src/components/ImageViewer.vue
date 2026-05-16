<script setup lang="ts">
import { ref, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import type { SelectionRect } from '@/types/image'

const store = useImageStore()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const displayScale = ref(1)

const isDragging = ref(false)
const dragStart = ref<{ x: number; y: number } | null>(null)
const dragRect = ref<SelectionRect | null>(null)

function computeScale() {
  if (!containerRef.value || !canvasRef.value) return
  const containerW = containerRef.value.clientWidth
  const containerH = containerRef.value.clientHeight
  const scale = Math.min(containerW / store.naturalWidth, containerH / store.naturalHeight, 1)
  displayScale.value = scale
  canvasRef.value.width = Math.round(store.naturalWidth * scale)
  canvasRef.value.height = Math.round(store.naturalHeight * scale)
}

function render() {
  if (!canvasRef.value || !imageEl.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  const w = canvasRef.value.width
  const h = canvasRef.value.height
  const scale = displayScale.value

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(imageEl.value, 0, 0, w, h)

  ctx.fillStyle = '#000000'
  for (const word of store.words) {
    if (!word.masked) continue
    ctx.fillRect(
      word.bbox.x0 * scale,
      word.bbox.y0 * scale,
      (word.bbox.x1 - word.bbox.x0) * scale,
      (word.bbox.y1 - word.bbox.y0) * scale,
    )
  }

  ctx.fillStyle = 'rgba(66, 133, 244, 0.35)'
  for (const word of store.words) {
    if (!word.selected) continue
    ctx.fillRect(
      word.bbox.x0 * scale,
      word.bbox.y0 * scale,
      (word.bbox.x1 - word.bbox.x0) * scale,
      (word.bbox.y1 - word.bbox.y0) * scale,
    )
  }

  const rect = dragRect.value
  if (rect) {
    ctx.strokeStyle = 'rgba(66, 133, 244, 0.8)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.strokeRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(66, 133, 244, 0.08)'
    ctx.fillRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
  }
}

watchEffect(() => {
  void store.words.map((w) => [w.selected, w.masked])
  void dragRect.value
  void displayScale.value
  requestAnimationFrame(render)
})

function screenToImage(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvasRef.value!.getBoundingClientRect()
  const scale = displayScale.value
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  }
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStart.value = screenToImage(e.clientX, e.clientY)
  dragRect.value = null
  store.clearSelection()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !dragStart.value) return
  const current = screenToImage(e.clientX, e.clientY)
  const x = Math.min(dragStart.value.x, current.x)
  const y = Math.min(dragStart.value.y, current.y)
  const width = Math.abs(current.x - dragStart.value.x)
  const height = Math.abs(current.y - dragStart.value.y)
  dragRect.value = { x, y, width, height }
  store.setWordsSelectedByRect(dragRect.value)
}

function endDrag() {
  isDragging.value = false
  dragStart.value = null
  dragRect.value = null
}

watch(
  () => store.src,
  (newSrc) => {
    if (!newSrc) {
      imageEl.value = null
      return
    }
    const img = new Image()
    img.onload = () => {
      store.setImageDimensions(img.naturalWidth, img.naturalHeight)
      imageEl.value = img
      computeScale()
      store.runOcr()
    }
    img.src = newSrc
  },
  { immediate: true },
)

onMounted(() => {
  const ro = new ResizeObserver(() => {
    if (isDragging.value) endDrag()
    computeScale()
    requestAnimationFrame(render)
  })
  if (containerRef.value) ro.observe(containerRef.value)
  onUnmounted(() => ro.disconnect())
})
</script>

<template>
  <div ref="containerRef" class="viewer-container">
    <canvas ref="canvasRef" class="display-canvas" />
    <div
      class="event-overlay"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="endDrag"
      @mouseleave="endDrag"
    />
    <div v-if="store.ocrStatus === 'processing'" class="viewer-overlay-message">
      OCR 辨識中，請稍候...
    </div>
  </div>
</template>

<style scoped>
.viewer-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #888;
}

.display-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: block;
}

.event-overlay {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  user-select: none;
}

.viewer-overlay-message {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  pointer-events: none;
}
</style>
