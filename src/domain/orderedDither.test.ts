import { expect, test } from 'vitest'
import type { DitherSettings, SrgbColor } from './settings'
import { BAYER_RANKS, bayerThreshold, createPaletteQuantizer, createRampQuantizer, paletteThresholdAmplitude } from './orderedDither'
import type { BayerSize } from './orderedDither'
import { nearestColorIndex, preparePalette, rampIndex } from './shading'

const sizes = [2, 4, 8] as const
const ordered = (matrixSize: BayerSize, strength = 1, patternScale = 1, transitionWidth = 1): DitherSettings => ({ kind: 'bayer', matrixSize, strength, patternScale, transitionWidth })

test('Bayer ranks have the expected orientation and complete 8×8 fixture', () => {
  expect(BAYER_RANKS[2]).toEqual([0, 2, 3, 1])
  expect(BAYER_RANKS[4]).toEqual([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5])
  expect(BAYER_RANKS[8]).toEqual([
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ])
})

test.each(sizes)('Bayer %i contains every rank once and normalized midpoint thresholds', (size) => {
  const thresholds = Array.from({ length: size * size }, (_, index) => bayerThreshold(index % size, Math.floor(index / size), size, 1))
  expect([...BAYER_RANKS[size]].sort((a, b) => a - b)).toEqual(Array.from({ length: size * size }, (_, i) => i))
  expect(thresholds).toEqual(BAYER_RANKS[size].map((rank) => (rank + 0.5) / (size * size)))
  expect(thresholds.reduce((sum, value) => sum + value, 0) / thresholds.length).toBe(0.5)
})

test.each(sizes)('Bayer %i scale uses native floor coordinates, repeats from canvas origin', (size) => {
  for (const scale of [1, 2, 8]) {
    for (let y = 0; y < size * scale * 2; y++) {
      for (let x = 0; x < size * scale * 2; x++) {
        expect(bayerThreshold(x, y, size, scale)).toBe(bayerThreshold(Math.floor(x / scale) % size, Math.floor(y / scale) % size, size, 1))
      }
    }
  }
})

test.each(sizes)('Bayer %i zero strength uses exact undithered ramp and nearest results', (size) => {
  const thresholds = [0.1, 0.4, 0.8]
  const palette = preparePalette(['#172038', '#304878', '#5C88B8', '#B8D8F0'])
  const ramp = createRampQuantizer(thresholds, ordered(size, 0))
  const nearest = createPaletteQuantizer(palette, ordered(size, 0))
  for (const signal of [-1, 0, 0.1, 0.100000000000001, 0.4, 0.8, 1, 5]) {
    for (const coordinate of [0, 1, 7, 17]) {
      expect(ramp(signal, coordinate, 5)).toBe(rampIndex(signal, thresholds))
      const input = { r: signal, g: 0.1, b: 0.7 }
      expect(nearest(input, coordinate, 5)).toBe(nearestColorIndex(input, palette))
    }
  }
})

test('explicit 4×4 gradient goldens distinguish matrices, strength and transition width', () => {
  const gradient = [0.1, 0.4, 0.6, 0.9]
  function draw(dither: DitherSettings) {
    const select = createRampQuantizer([0.5], dither)
    return Array.from({ length: 4 }, (_, y) => gradient.map((signal, x) => select(signal, x, y)))
  }
  expect(draw(ordered(2))).toEqual([[0, 0, 1, 1], [0, 1, 0, 1], [0, 0, 1, 1], [0, 1, 0, 1]])
  const full = [[1, 0, 1, 1], [0, 1, 0, 1], [0, 0, 1, 1], [0, 0, 0, 1]]
  expect(draw(ordered(4))).toEqual(full)
  expect(draw(ordered(4, 0.25))).toEqual([[0, 0, 1, 1], [0, 0, 0, 1], [0, 0, 1, 1], [0, 0, 1, 1]])
  expect(draw(ordered(4, 1, 1, 0.25))).toEqual(draw(ordered(4, 0.25)))
  expect(draw(ordered(4, 1, 1, 0))).toEqual(draw({ kind: 'none' }))
  expect(createRampQuantizer([0.5], ordered(4))(0.02, 0, 0)).toBe(0)
  expect(createRampQuantizer([0.5], ordered(8))(0.02, 0, 0)).toBe(1)
})

test('palette amplitude is minimum distinct linear spacing, ignores duplicates and is bounded', () => {
  expect(paletteThresholdAmplitude(preparePalette(['#000000', '#FFFFFF']))).toBe(1)
  expect(paletteThresholdAmplitude(preparePalette(['#000000', '#FF0000']))).toBeCloseTo(1 / Math.sqrt(3), 15)
  const colors: readonly SrgbColor[] = ['#000000', '#686868', '#FFFFFF']
  expect(paletteThresholdAmplitude(preparePalette([...colors, '#686868']))).toBe(paletteThresholdAmplitude(preparePalette(colors)))
  expect(paletteThresholdAmplitude(preparePalette(['#1279AB']))).toBe(0)
  expect(paletteThresholdAmplitude(preparePalette(['#1279AB', '#1279AB']))).toBe(0)
})

test.each(sizes)('Bayer %i palette gradient is deterministic, bounded and ignores ramp width', (size) => {
  const palette = preparePalette(['#000000', '#FFFFFF'])
  const select = createPaletteQuantizer(palette, ordered(size))
  const withoutWidth = createPaletteQuantizer(palette, ordered(size, 1, 1, 0))
  const actual: number[] = []
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const input = { r: x / 7, g: x / 7, b: x / 7 }
      const index = select(input, x, y)
      expect(index).toBe(withoutWidth(input, x, y))
      expect(index).toBe(select(input, x, y))
      actual.push(index)
    }
  }
  expect(new Set(actual)).toEqual(new Set([0, 1]))
  for (const value of [0, 1]) expect(select({ r: value, g: value, b: value }, 0, 0)).toBe(value)
})

test('one-color ramp and duplicate-only nearest palette stay stable at maximum strength', () => {
  for (const size of sizes) {
    const ramp = createRampQuantizer([], ordered(size))
    const nearest = createPaletteQuantizer(preparePalette(['#1279AB', '#1279AB']), ordered(size))
    for (let x = 0; x < 16; x++) {
      expect(ramp(x / 15, x, 3)).toBe(0)
      expect(nearest({ r: x / 15, g: 0.5, b: 1 }, x, 3)).toBe(0)
    }
  }
})
