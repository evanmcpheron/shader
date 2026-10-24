import type { Size2 } from '../domain/settings'

export type PixelBounds = Readonly<{ x: number; y: number; width: number; height: number }>

export type FramingReport = Readonly<{
  mode: 'pixel-fit' | 'manual' | 'manual-fallback'
  requested: Size2
  effective: Size2
  actual: PixelBounds | null
  clipped: boolean
  converged: boolean
  iterations: number
  notice: string
}>

export function measureSubjectBounds(categories: Uint8Array, width: number, height: number): PixelBounds | null {
  if (categories.length !== width * height * 4) throw new Error('Subject measurement requires native RGBA category bytes.')
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (categories[(y * width + x) * 4 + 3] !== 255) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}
