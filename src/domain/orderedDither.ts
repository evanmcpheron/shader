import type { LinearRgb } from './lighting'
import type { DitherSettings } from './settings'
import { nearestColorIndex, rampCoordinate, rampIndex, rampIndexFromCoordinate, saturate } from './shading'
import type { PreparedColor } from './shading'
import { blueNoiseThreshold } from './blueNoise'

export type BayerSize = 2 | 4 | 8

function expandBayer(matrix: readonly number[]): readonly number[] {
  const size = Math.sqrt(matrix.length)
  const offsets = [0, 2, 3, 1]
  return Object.freeze(Array.from({ length: matrix.length * 4 }, (_, index) => {
    const x = index % (size * 2)
    const y = Math.floor(index / (size * 2))
    return matrix[(y % size) * size + x % size] * 4 + offsets[Math.floor(y / size) * 2 + Math.floor(x / size)]
  }))
}

const bayer2 = Object.freeze([0, 2, 3, 1])
const bayer4 = expandBayer(bayer2)
export const BAYER_RANKS: Readonly<Record<BayerSize, readonly number[]>> = Object.freeze({ 2: bayer2, 4: bayer4, 8: expandBayer(bayer4) })

export function bayerThreshold(x: number, y: number, size: BayerSize, scale: number): number {
  const column = Math.floor(x / scale) % size
  const row = Math.floor(y / scale) % size
  return (BAYER_RANKS[size][row * size + column] + 0.5) / (size * size)
}

export type PixelQuantizer<Input> = (input: Input, x: number, y: number) => number

function thresholdSource(dither: Extract<DitherSettings, { kind: 'bayer' | 'blue-noise' }>): (x: number, y: number) => number {
  if (dither.kind === 'bayer') return (x, y) => bayerThreshold(x, y, dither.matrixSize, dither.patternScale)
  return (x, y) => blueNoiseThreshold(x, y, dither.patternScale)
}

export function createRampQuantizer(thresholds: readonly number[], dither?: DitherSettings): PixelQuantizer<number> {
  const plain = (signal: number) => rampIndex(signal, thresholds)
  if (!dither || dither.kind === 'none' || dither.strength === 0) return plain
  if (dither.kind === 'floyd-steinberg') throw new Error('Floyd–Steinberg requires the sequential diffusion mapper.')
  const threshold = thresholdSource(dither)
  if (dither.transitionWidth === 0 || thresholds.length === 0) return plain
  return (signal, x, y) => {
    const offset = dither.strength * (0.5 - threshold(x, y)) * dither.transitionWidth
    return rampIndexFromCoordinate(rampCoordinate(signal, thresholds) + offset, thresholds.length)
  }
}

const paletteAmplitudes = new WeakMap<readonly PreparedColor[], number>()

export function paletteThresholdAmplitude(palette: readonly PreparedColor[]): number {
  const cached = paletteAmplitudes.get(palette)
  if (cached !== undefined) return cached
  let shortest = Infinity
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const a = palette[i].linear
      const b = palette[j].linear
      const distance = (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
      if (distance > 0 && distance < shortest) shortest = distance
    }
  }
  const amplitude = shortest === Infinity ? 0 : Math.min(1, Math.sqrt(shortest / 3))
  paletteAmplitudes.set(palette, amplitude)
  return amplitude
}

export function createPaletteQuantizer(palette: readonly PreparedColor[], dither?: DitherSettings): PixelQuantizer<LinearRgb> {
  const plain = (input: LinearRgb) => nearestColorIndex(input, palette)
  if (!dither || dither.kind === 'none' || dither.strength === 0) return plain
  if (dither.kind === 'floyd-steinberg') throw new Error('Floyd–Steinberg requires the sequential diffusion mapper.')
  const threshold = thresholdSource(dither)
  const amplitude = paletteThresholdAmplitude(palette)
  if (amplitude === 0) return plain
  return (input, x, y) => {
    const offset = dither.strength * (0.5 - threshold(x, y)) * amplitude
    return nearestColorIndex({ r: saturate(input.r + offset), g: saturate(input.g + offset), b: saturate(input.b + offset) }, palette)
  }
}
