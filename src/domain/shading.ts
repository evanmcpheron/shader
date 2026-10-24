import { decodeSrgb } from './lighting'
import type { LinearRgb } from './lighting'
import type { PaletteSettings, ShadingSettings, SrgbColor } from './settings'

export function saturate(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function encodeDisplayChannel(linear: number): number {
  const value = saturate(linear)
  const srgb = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
  return Math.round(srgb * 255)
}

export function illuminationLuminance(illumination: LinearRgb): number {
  return saturate(0.2126 * illumination.r + 0.7152 * illumination.g + 0.0722 * illumination.b)
}

export function adjustShadingSignal(value: number, controls: Pick<ShadingSettings, 'brightness' | 'contrast' | 'distribution'>): number {
  return saturate((saturate(value) - 0.5) * controls.contrast + 0.5 + controls.brightness) ** controls.distribution
}

export function rampCoordinate(signal: number, thresholds: readonly number[]): number {
  if (thresholds.length === 0) return 0
  const value = saturate(signal)
  let start = 0
  let coordinate = 0
  for (let index = 0; index < thresholds.length; index++) {
    const end = thresholds[index]
    const next = index + 0.5
    if (value === end) return next
    if (value < end) return coordinate + (next - coordinate) * (value - start) / (end - start)
    start = end
    coordinate = next
  }
  return coordinate + (thresholds.length - coordinate) * (value - start) / (1 - start)
}

export function rampIndex(signal: number, thresholds: readonly number[]): number {
  return rampIndexFromCoordinate(rampCoordinate(signal, thresholds), thresholds.length)
}

export function rampIndexFromCoordinate(coordinate: number, lastIndex: number): number {
  return Math.max(0, Math.min(lastIndex, Math.floor(coordinate + 0.5)))
}

export function colorBytes(color: SrgbColor): readonly [number, number, number] {
  return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]
}

function interpolateColor(from: LinearRgb, to: LinearRgb, blend: number): SrgbColor {
  const hex = (['r', 'g', 'b'] as const).map((channel) =>
    encodeDisplayChannel(from[channel] + (to[channel] - from[channel]) * blend).toString(16).padStart(2, '0')).join('')
  return `#${hex.toUpperCase()}`
}

export function generateShadingRamp(count: number, colors: Pick<ShadingSettings, 'shadowColor' | 'baseColor' | 'highlightColor'>): SrgbColor[] {
  const shadow = decodeSrgb(colors.shadowColor)
  const base = decodeSrgb(colors.baseColor)
  const highlight = decodeSrgb(colors.highlightColor)
  if (count === 1) return [colors.baseColor]
  return Array.from({ length: count }, (_, index): SrgbColor => {
    if (index === 0) return colors.shadowColor
    if (index === count - 1) return colors.highlightColor
    const position = index / (count - 1)
    const from = position <= 0.5 ? shadow : base
    const to = position <= 0.5 ? base : highlight
    const blend = position <= 0.5 ? position * 2 : (position - 0.5) * 2
    return interpolateColor(from, to, blend)
  })
}

export function resizeThresholds(thresholds: readonly number[], count: number): number[] {
  const retained = thresholds.slice(0, count - 1)
  const last = retained.at(-1) ?? 0
  const missing = count - 1 - retained.length
  return [...retained, ...Array.from({ length: missing }, (_, index) => last + (1 - last) * (index + 1) / (missing + 1))]
}

export type PreparedColor = Readonly<{ linear: LinearRgb; bytes: readonly [number, number, number] }>
const decodedPalettes = new WeakMap<readonly SrgbColor[], readonly PreparedColor[]>()

export function preparePalette(colors: readonly SrgbColor[]): readonly PreparedColor[] {
  const cached = decodedPalettes.get(colors)
  if (cached) return cached
  if (colors.length === 0) throw new Error('A palette needs at least one color.')
  const prepared = colors.map((color) => ({ linear: decodeSrgb(color), bytes: colorBytes(color) }))
  decodedPalettes.set(colors, prepared)
  return prepared
}

export function nearestColorIndex(input: LinearRgb, palette: readonly PreparedColor[]): number {
  let nearest = 0
  let shortest = Infinity
  for (let index = 0; index < palette.length; index++) {
    const color = palette[index].linear
    const distance = (input.r - color.r) ** 2 + (input.g - color.g) ** 2 + (input.b - color.b) ** 2
    if (distance < shortest) {
      shortest = distance
      nearest = index
    }
  }
  return nearest
}

export function resolveEffectColor(color: SrgbColor, palette: PaletteSettings): SrgbColor {
  return palette.effectPolicy === 'strict' ? palette.colors[nearestColorIndex(decodeSrgb(color), preparePalette(palette.colors))] : color
}

export function resampleShadingRamp(colors: readonly SrgbColor[], count: number): SrgbColor[] {
  if (count === colors.length) return [...colors]
  const prepared = preparePalette(colors)
  return Array.from({ length: count }, (_, index): SrgbColor => {
    const position = count === 1 ? 0 : index * (colors.length - 1) / (count - 1)
    const lower = Math.floor(position)
    const blend = position - lower
    if (blend === 0) return colors[lower]
    const from = prepared[lower].linear
    const to = prepared[Math.min(lower + 1, colors.length - 1)].linear
    return interpolateColor(from, to, blend)
  })
}
