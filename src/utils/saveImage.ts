import type { WordBox } from '@/types/image'

export async function saveImage(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  maskedWords: WordBox[],
): Promise<void> {
  const img = new Image()
  img.src = src
  await new Promise<void>((resolve) => {
    img.onload = () => resolve()
  })

  const canvas = document.createElement('canvas')
  canvas.width = naturalWidth
  canvas.height = naturalHeight
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight)
  ctx.fillStyle = '#000000'
  for (const word of maskedWords) {
    const { x0, y0, x1, y1 } = word.bbox
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }

  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = 'masked-image.png'
  a.click()
}
