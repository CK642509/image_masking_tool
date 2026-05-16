import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createWorker } from 'tesseract.js'
import type { WordBox, OcrStatus, SelectionRect } from '@/types/image'

export const useImageStore = defineStore('image', () => {
  const file = ref<File | null>(null)
  const src = ref<string | null>(null)
  const naturalWidth = ref(0)
  const naturalHeight = ref(0)
  const ocrStatus = ref<OcrStatus>('idle')
  const ocrProgress = ref(0)
  const ocrError = ref<string | null>(null)
  const words = ref<WordBox[]>([])

  const hasImage = computed(() => src.value !== null)
  const isOcrDone = computed(() => ocrStatus.value === 'done')
  const anySelected = computed(() => words.value.some((w) => w.selected))
  const anyMasked = computed(() => words.value.some((w) => w.masked))
  const maskedWords = computed(() => words.value.filter((w) => w.masked))

  function loadImage(newFile: File) {
    if (src.value) URL.revokeObjectURL(src.value)
    file.value = newFile
    src.value = URL.createObjectURL(newFile)
    naturalWidth.value = 0
    naturalHeight.value = 0
    ocrStatus.value = 'idle'
    ocrProgress.value = 0
    ocrError.value = null
    words.value = []
  }

  function setImageDimensions(w: number, h: number) {
    naturalWidth.value = w
    naturalHeight.value = h
  }

  function isCjk(char: string): boolean {
    const code = char.codePointAt(0) ?? 0
    return (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x20000 && code <= 0x2a6df)
    )
  }

  function buildOcrCanvas(): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const longSide = Math.max(img.naturalWidth, img.naturalHeight)
        // Target 2400px on the long side — Tesseract's sweet spot for accuracy.
        // Allow both upscale (small images) and downscale (large/4K images).
        // Cap: 4x upscale max, 0.25x downscale min.
        const scale = Math.min(4, Math.max(0.25, 2400 / longSide))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        const ctx = canvas.getContext('2d')!
        // Increase contrast and convert to grayscale — both improve OCR accuracy
        ctx.filter = 'contrast(160%) saturate(0%)'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.filter = 'none'
        resolve({ canvas, scale })
      }
      img.onerror = reject
      img.src = src.value!
    })
  }

  async function runOcr() {
    if (!src.value) return
    ocrStatus.value = 'processing'
    ocrProgress.value = 0

    const worker = await createWorker(['eng', 'chi_tra'], 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          ocrProgress.value = Math.round(m.progress * 100)
        }
      },
    })

    try {
      const { canvas, scale } = await buildOcrCanvas()

      // PSM 11 = SPARSE_TEXT: find as much text as possible in any layout
      await worker.setParameters({ user_defined_dpi: '300', tessedit_pageseg_mode: '11' } as any)

      const result = await worker.recognize(canvas, {}, { tsv: true })
      const tsv = result.data.tsv ?? ''
      const lines = tsv.split('\n').slice(1)
      const PAD = 3
      const imgW = naturalWidth.value
      const imgH = naturalHeight.value

      const rawBoxes = lines
        .map((line) => line.split('\t'))
        .filter((cols) => cols[0] === '5' && (cols[11] ?? '').trim().length > 0 && Number(cols[10]) > 0)
        .flatMap((cols) => {
          // Divide by scale to convert from upscaled coords back to original image space
          const left = Number(cols[6]) / scale
          const top = Number(cols[7]) / scale
          const w = Number(cols[8]) / scale
          const h = Number(cols[9]) / scale
          const text = (cols[11] ?? '').trim()
          const chars = [...text]

          const pad = (x0: number, y0: number, x1: number, y1: number) => ({
            x0: Math.max(0, x0 - PAD),
            y0: Math.max(0, y0 - PAD),
            x1: Math.min(imgW, x1 + PAD),
            y1: Math.min(imgH, y1 + PAD),
          })

          // Split purely-CJK words into individual characters (equal-width split)
          if (chars.length > 1 && chars.every((c) => isCjk(c))) {
            const charW = w / chars.length
            return chars.map((char, j) => ({
              text: char,
              bbox: pad(
                left + Math.round(j * charW),
                top,
                left + Math.round((j + 1) * charW),
                top + h,
              ),
            }))
          }

          return [{ text, bbox: pad(left, top, left + w, top + h) }]
        })

      words.value = rawBoxes.map((entry, i) => ({
        id: `word-${i}`,
        text: entry.text,
        bbox: entry.bbox,
        selected: false,
        masked: false,
      }))
      ocrStatus.value = 'done'
    } catch (err) {
      ocrStatus.value = 'error'
      ocrError.value = String(err)
    } finally {
      await worker.terminate()
    }
  }

  function setWordsSelectedByRect(rect: SelectionRect) {
    for (const word of words.value) {
      word.selected =
        rect.x < word.bbox.x1 &&
        rect.x + rect.width > word.bbox.x0 &&
        rect.y < word.bbox.y1 &&
        rect.y + rect.height > word.bbox.y0
    }
  }

  function clearSelection() {
    for (const word of words.value) {
      word.selected = false
    }
  }

  function maskSelected() {
    for (const word of words.value) {
      if (word.selected) {
        word.masked = true
        word.selected = false
      }
    }
  }

  function unmaskSelected() {
    for (const word of words.value) {
      if (word.selected) {
        word.masked = false
        word.selected = false
      }
    }
  }

  function unmaskAll() {
    for (const word of words.value) {
      word.masked = false
    }
  }

  return {
    file,
    src,
    naturalWidth,
    naturalHeight,
    ocrStatus,
    ocrProgress,
    ocrError,
    words,
    hasImage,
    isOcrDone,
    anySelected,
    anyMasked,
    maskedWords,
    loadImage,
    setImageDimensions,
    runOcr,
    setWordsSelectedByRect,
    clearSelection,
    maskSelected,
    unmaskSelected,
    unmaskAll,
  }
})
