export interface BBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface WordBox {
  id: string
  text: string
  bbox: BBox
  selected: boolean
  masked: boolean
}

export type OcrStatus = 'idle' | 'processing' | 'done' | 'error'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}
