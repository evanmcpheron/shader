import type { SrgbColor } from '../domain/settings'
import { colorBytes } from '../domain/shading'
import { nativeByteLength } from './nativeFrame'
import { measureSubjectBounds } from './subjectBounds'
import type { PixelBounds } from './subjectBounds'

export type OutlineGeometry = Readonly<{
  extent: PixelBounds | null
  visible: PixelBounds | null
  clipped: boolean
  pixelCount: number
}>

export type OutlineReport = OutlineGeometry & Readonly<{ color: SrgbColor; thickness: number }>

export function dilateSubjectRing(categories: Uint8Array, width: number, height: number, thickness: number, ring: Uint8Array, horizontal: Uint8Array): OutlineGeometry {
  if (categories.length !== nativeByteLength(width, height) || ring.length !== width * height || horizontal.length !== ring.length) {
    throw new Error('Outline masks require exactly sized native category and work buffers.')
  }
  if (categories.buffer === ring.buffer || categories.buffer === horizontal.buffer || ring.buffer === horizontal.buffer) {
    throw new Error('Outline category, ring and scratch buffers must have separate ownership.')
  }
  if (!Number.isInteger(thickness) || thickness < 1 || thickness > 8) throw new Error('Outline thickness must be an integer from 1 to 8.')
  ring.fill(0)
  horizontal.fill(0)
  const subject = measureSubjectBounds(categories, width, height)
  if (!subject) return { extent: null, visible: null, clipped: false, pixelCount: 0 }
  const extent = { x: subject.x - thickness, y: subject.y - thickness, width: subject.width + thickness * 2, height: subject.height + thickness * 2 }
  const left = Math.max(0, extent.x)
  const top = Math.max(0, extent.y)
  const right = Math.min(width, extent.x + extent.width)
  const bottom = Math.min(height, extent.y + extent.height)

  // A square dilation separates into horizontal and vertical passes; both read an unchanged source.
  for (let y = subject.y; y < subject.y + subject.height; y++) {
    for (let x = left; x < right; x++) {
      for (let sx = Math.max(0, x - thickness); sx <= Math.min(width - 1, x + thickness); sx++) {
        if (categories[(y * width + sx) * 4 + 3] === 255) { horizontal[y * width + x] = 1; break }
      }
    }
  }
  let pixelCount = 0
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (categories[(y * width + x) * 4 + 3] === 255) continue
      for (let sy = Math.max(0, y - thickness); sy <= Math.min(height - 1, y + thickness); sy++) {
        if (horizontal[sy * width + x]) { ring[y * width + x] = 1; pixelCount++; break }
      }
    }
  }
  return {
    extent, visible: { x: left, y: top, width: right - left, height: bottom - top }, pixelCount,
    clipped: left !== extent.x || top !== extent.y || right !== extent.x + extent.width || bottom !== extent.y + extent.height,
  }
}

export function compositeOutline(categories: Uint8Array, ring: Uint8Array, underlay: Uint8ClampedArray, output: Uint8ClampedArray, color: SrgbColor): void {
  if (categories.length !== underlay.length || output.length !== underlay.length || ring.length * 4 !== output.length) {
    throw new Error('Outline compositing requires matching native buffers.')
  }
  output.set(underlay)
  const rgb = colorBytes(color)
  for (let pixel = 0; pixel < ring.length; pixel++) {
    const offset = pixel * 4
    if (!ring[pixel] || categories[offset + 3] === 255) continue
    output[offset] = rgb[0]
    output[offset + 1] = rgb[1]
    output[offset + 2] = rgb[2]
    output[offset + 3] = 255
  }
}
