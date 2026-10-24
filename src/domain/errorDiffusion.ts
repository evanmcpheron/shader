import type { LinearRgb } from './lighting'
import type { PixelQuantizer } from './orderedDither'
import { nearestColorIndex, rampCoordinate, rampIndex, rampIndexFromCoordinate } from './shading'
import type { PreparedColor } from './shading'

export type DiffusionGrid = Readonly<{
  width: number
  height: number
  categoryAt: (x: number, y: number) => number
}>

class ErrorRows {
  private current: Float64Array
  private next: Float64Array
  private row = 0
  private grid: DiffusionGrid
  private channels: 1 | 3
  private strength: number

  constructor(grid: DiffusionGrid, channels: 1 | 3, strength: number) {
    if (!Number.isInteger(grid.width) || grid.width < 1 || !Number.isInteger(grid.height) || grid.height < 1) {
      throw new Error('Diffusion requires positive integer native dimensions.')
    }
    this.current = new Float64Array(grid.width * channels)
    this.next = new Float64Array(grid.width * channels)
    this.grid = grid
    this.channels = channels
    this.strength = strength
  }

  error(x: number, y: number, channel: number): number {
    // Empty rows still rotate, so residuals cannot cross a skipped mask gap.
    while (this.row < y) {
      const finished = this.current
      this.current = this.next
      this.next = finished
      this.next.fill(0)
      this.row++
    }
    return this.current[x * this.channels + channel]
  }

  propagate(x: number, y: number, channel: number, error: number): void {
    const { width, height, categoryAt } = this.grid
    const category = categoryAt(x, y)
    if (category === 0) return
    const scaled = error * this.strength / 16
    if (x + 1 < width && categoryAt(x + 1, y) === category) this.current[(x + 1) * this.channels + channel] += scaled * 7
    if (y + 1 >= height) return
    if (x > 0 && categoryAt(x - 1, y + 1) === category) this.next[(x - 1) * this.channels + channel] += scaled * 3
    if (categoryAt(x, y + 1) === category) this.next[x * this.channels + channel] += scaled * 5
    if (x + 1 < width && categoryAt(x + 1, y + 1) === category) this.next[(x + 1) * this.channels + channel] += scaled
  }
}

export function createRampDiffuser(thresholds: readonly number[], strength: number, grid: DiffusionGrid): PixelQuantizer<number> {
  if (strength === 0 || thresholds.length === 0) return (signal) => rampIndex(signal, thresholds)
  const rows = new ErrorRows(grid, 1, strength)
  return (signal, x, y) => {
    const coordinate = rampCoordinate(signal, thresholds) + rows.error(x, y, 0)
    const index = rampIndexFromCoordinate(coordinate, thresholds.length)
    rows.propagate(x, y, 0, coordinate - index)
    return index
  }
}

export function createPaletteDiffuser(palette: readonly PreparedColor[], strength: number, grid: DiffusionGrid): PixelQuantizer<LinearRgb> {
  if (strength === 0 || palette.length === 1) return (input) => nearestColorIndex(input, palette)
  const rows = new ErrorRows(grid, 3, strength)
  return (input, x, y) => {
    const adjusted = { r: input.r + rows.error(x, y, 0), g: input.g + rows.error(x, y, 1), b: input.b + rows.error(x, y, 2) }
    const index = nearestColorIndex(adjusted, palette)
    const selected = palette[index].linear
    rows.propagate(x, y, 0, adjusted.r - selected.r)
    rows.propagate(x, y, 1, adjusted.g - selected.g)
    rows.propagate(x, y, 2, adjusted.b - selected.b)
    return index
  }
}
