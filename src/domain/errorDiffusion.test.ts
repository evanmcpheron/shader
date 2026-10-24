import { expect, test } from 'vitest'
import { createPaletteDiffuser, createRampDiffuser } from './errorDiffusion'
import type { DiffusionGrid } from './errorDiffusion'
import { createRampQuantizer } from './orderedDither'
import { preparePalette } from './shading'

function grid(width: number, height: number, categories = Array<number>(width * height).fill(255)): DiffusionGrid {
  return { width, height, categoryAt: (x, y) => categories[y * width + x] }
}

function ramp(signals: number[], width: number, categories?: number[], strength = 1, thresholds = [0.5]) {
  const surface = grid(width, signals.length / width, categories)
  const select = createRampDiffuser(thresholds, strength, surface)
  return signals.map((signal, pixel) => surface.categoryAt(pixel % width, Math.floor(pixel / width)) === 255 ? select(signal, pixel % width, Math.floor(pixel / width)) : -1)
}

test('hand-calculated 3×2 scalar scan includes each weight in left-to-right top-to-bottom order', () => {
  // Adjusted coordinates: 0, .4, .515; .525, .22625, .452421875.
  const input = [0, 0.4, 0.34, 0.45, 0.4, 0.48]
  expect(ramp(input, 3)).toEqual([0, 0, 1, 1, 0, 0])
  expect(ramp(input, 3)).toEqual(ramp(input, 3))
  const rgb = createPaletteDiffuser(preparePalette(['#000000', '#FFFFFF']), 1, grid(3, 2))
  expect(input.map((v, p) => rgb({ r: v, g: v, b: v }, p % 3, Math.floor(p / 3)))).toEqual([0, 0, 1, 1, 0, 0])
  const bayer = createRampQuantizer([0.5], { kind: 'bayer', matrixSize: 4, strength: 1, patternScale: 1, transitionWidth: 1 })
  expect(input.map((v, p) => bayer(v, p % 3, Math.floor(p / 3)))).not.toEqual(ramp(input, 3))
})

test.each([[2, 0, 7], [0, 1, 3], [1, 1, 5], [2, 1, 1]])('isolated neighbor (%i,%i) gets exactly %i/16 without renormalization', (x, y, weight) => {
  const target = y * 3 + x
  const categories = [0, 255, 0, 0, 0, 0]
  categories[target] = 255
  for (const [epsilon, expected] of [[-0.000001, 0], [0.000001, 1]]) {
    const input = [0, 0.4, 0, 0, 0, 0]
    input[target] = 0.5 - 0.4 * weight / 16 + epsilon
    expect(ramp(input, 3, categories)[target]).toBe(expected)
  }
})

test('nonuniform multi-shade ramp propagates coordinate error rather than signal or RGB error', () => {
  // q = 13/24 for signal .15; the next q is 13/24 - (11/24)*(7/16).
  expect(ramp([0.15, 0.15, 0.15, 0.15], 4, undefined, 1, [0.1, 0.7])).toEqual([1, 0, 1, 0])
  expect(ramp([0.5], 1)).toEqual([1])
})

test('RGB fixture diffuses independent linear channels and uses lowest-index ties', () => {
  const palette = preparePalette(['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFFFF'])
  const select = createPaletteDiffuser(palette, 1, grid(3, 1))
  expect(select({ r: 0.4, g: 0.1, b: 0.1 }, 0, 0)).toBe(0)
  expect(select({ r: 0.34, g: 0.1, b: 0.1 }, 1, 0)).toBe(1)
  expect(select({ r: 0.6, g: 0.6, b: 0.1 }, 2, 0)).toBe(2)
  const tie = createPaletteDiffuser(preparePalette(['#000000', '#FFFFFF']), 1, grid(1, 1))
  expect(tie({ r: 0.5, g: 0.5, b: 0.5 }, 0, 0)).toBe(0)
})

test('RGB accumulation stays in linear space without clipping residual error', () => {
  const select = createPaletteDiffuser(preparePalette(['#000000', '#FFFFFF']), 1, grid(2, 1))
  expect(select({ r: 0.4, g: 1, b: 1 }, 0, 0)).toBe(1)
  expect(select({ r: 0.1, g: 0.8, b: 0.8 }, 1, 0)).toBe(0)
  const gray = preparePalette(['#686868', '#B0B0B0'])
  const linearMidpoint = (gray[0].linear.r + gray[1].linear.r) / 2
  expect(createPaletteDiffuser(gray, 1, grid(1, 1))({ r: linearMidpoint + 0.001, g: linearMidpoint + 0.001, b: linearMidpoint + 0.001 }, 0, 0)).toBe(1)
})

test('holes, category barriers and entirely skipped rows drop errors instead of relaying them', () => {
  expect(ramp([0.4, 0.4, 0.4], 3, [255, 0, 255])).toEqual([0, -1, 0])
  expect(ramp([0.4, 0.4, 0.4], 1, [255, 128, 255])).toEqual([0, -1, 0])
  expect(ramp(Array<number>(9).fill(0.4), 3, [255, 255, 255, 0, 0, 0, 255, 255, 255])).toEqual([0, 1, 0, -1, -1, -1, 0, 1, 0])
  expect(ramp([0.4, 0.4, 0.4, 0.4], 2, [0, 255, 255, 128])).toEqual([-1, 0, 0, -1])
  const palette = preparePalette(['#000000', '#FFFFFF'])
  const select = createPaletteDiffuser(palette, 1, grid(3, 1, [255, 0, 255]))
  expect(select({ r: 0.4, g: 0.4, b: 0.4 }, 0, 0)).toBe(0)
  expect(select({ r: 0.4, g: 0.4, b: 0.4 }, 2, 0)).toBe(0)
})

test('one-pixel axes keep only valid weights, and strength scales outgoing error', () => {
  expect(ramp(Array<number>(5).fill(0.4), 5)).toEqual([0, 1, 0, 0, 1])
  expect(ramp(Array<number>(5).fill(0.4), 1)).toEqual([0, 1, 0, 0, 1])
  expect(ramp([0.4, 0.4], 2, undefined, 0.5)).toEqual([0, 0])
  expect(ramp([0.4, 0.4], 2)).toEqual([0, 1])
  expect(ramp([0.4], 1)).toEqual([0])
  expect(ramp([1, 0, 1, 0], 2, undefined, 1, [])).toEqual([0, 0, 0, 0])
})

test('zero strength bypasses row allocation and dimension/category access', () => {
  const unused = { width: 0, height: 0, categoryAt: () => { throw new Error('not used') } }
  expect(createRampDiffuser([0.5], 0, unused)(0.5, 100, 100)).toBe(1)
  expect(createPaletteDiffuser(preparePalette(['#000000', '#FFFFFF']), 0, unused)({ r: 0.5, g: 0.5, b: 0.5 }, 100, 100)).toBe(0)
})
