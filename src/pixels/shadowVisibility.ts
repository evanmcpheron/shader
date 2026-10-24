import type { ShadowSettings } from '../domain/settings'
import { bayerThreshold } from '../domain/orderedDither'

export function directionalVisibility(visibility: number, shadows: ShadowSettings, category: number): number {
  if (shadows.kind === 'none' || (category === 255 ? !shadows.self : category !== 128 || !shadows.ground)) return 1
  return 1 - shadows.strength * (1 - Math.max(0, Math.min(1, visibility)))
}

export function shadowCovered(amount: number, x: number, y: number): boolean {
  return amount > bayerThreshold(x, y, 4, 1)
}

export type VisibilityFilter = Readonly<{
  width: number
  height: number
  radius: number
  depthSpan: number
  depthStep: number
}>

const kernels = Array.from({ length: 5 }, (_, radius) => {
  const diameter = radius * 2 + 1
  return Array.from({ length: diameter * diameter }, (_, index) => {
    const dx = index % diameter - radius
    const dy = Math.floor(index / diameter) - radius
    const steps = Math.max(Math.abs(dx), Math.abs(dy))
    const samples = Array.from({ length: steps }, (_, step) => {
      const x = Math.round(dx * (step + 1) / steps)
      const y = Math.round(dy * (step + 1) / steps)
      return { x, y, distance: step + 1, index: (y + radius) * diameter + x + radius }
    })
    return { dx, dy, samples }
  })
})

export function filterShadowVisibility(normals: Uint8Array, visibility: Uint8Array, output: Float32Array, options: VisibilityFilter): void {
  const { width, height, radius, depthSpan, depthStep } = options
  if (!Number.isInteger(radius) || radius < 0 || radius > 4) throw new Error('Shadow softness must be an integer from 0 to 4.')
  if (normals.length !== width * height * 4 || visibility.length !== normals.length || output.length !== width * height) throw new Error('Visibility filtering requires matching native buffers.')
  const depth = (offset: number) => (visibility[offset + 1] * 256 + visibility[offset + 2]) * depthSpan / 65535
  const valid = (offset: number) => normals[offset + 3] !== 0 && normals[offset + 3] === visibility[offset + 3]
  const eligibility = new Uint8Array((radius * 2 + 1) ** 2)
  const sameSurface = (a: number, b: number, distance: number, nx: number, ny: number, nz: number, lengthSquared: number, sourceDepth: number) => {
    if (!valid(b) || normals[a + 3] !== normals[b + 3]) return false
    const mx = normals[b] * 2 - 255
    const my = normals[b + 1] * 2 - 255
    const mz = normals[b + 2] * 2 - 255
    const dot = nx * mx + ny * my + nz * mz
    return dot >= 0.85 * Math.sqrt(lengthSquared * (mx * mx + my * my + mz * mz)) && Math.abs(sourceDepth - depth(b)) <= depthStep * distance + depthSpan * 2 / 65535
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x
    const offset = pixel * 4
    if (!valid(offset)) {
      if (normals[offset + 3] !== 0) throw new Error('Native visibility/category alignment failed. Retry renderer.')
      output[pixel] = 1
      continue
    }
    if (radius === 0) { output[pixel] = visibility[offset] / 255; continue }
    const nx = normals[offset] * 2 - 255
    const ny = normals[offset + 1] * 2 - 255
    const nz = normals[offset + 2] * 2 - 255
    const lengthSquared = nx * nx + ny * ny + nz * nz
    const sourceDepth = depth(offset)
    eligibility.fill(0)
    let sum = 0
    let count = 0
    for (const ray of kernels[radius]) {
      const sx = x + ray.dx
      const sy = y + ray.dy
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
      let eligible = true
      // Rays share samples; cache each surface test without allowing a ray to jump a hole.
      for (const sample of ray.samples) {
        if (eligibility[sample.index] === 0) {
          const target = ((y + sample.y) * width + x + sample.x) * 4
          eligibility[sample.index] = sameSurface(offset, target, sample.distance, nx, ny, nz, lengthSquared, sourceDepth) ? 1 : 2
        }
        if (eligibility[sample.index] === 2) { eligible = false; break }
      }
      if (eligible) { sum += visibility[(sy * width + sx) * 4] / 255; count++ }
    }
    output[pixel] = sum / count
  }
}
