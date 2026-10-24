import { expect, test } from 'vitest'
import { BLUE_NOISE_BYTES, BLUE_NOISE_SIZE, blueNoiseThreshold } from './blueNoise'
import { createPaletteQuantizer, createRampQuantizer } from './orderedDither'
import { preparePalette, rampIndex } from './shading'

const blue = { kind: 'blue-noise', strength: 1, patternScale: 1, transitionWidth: 1 } as const

test('decoded bytes have pinned SHA-256 and exactly uniform 8-bit coverage', async () => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(BLUE_NOISE_BYTES)))
  expect([...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')).toBe('fe602dd3f05c3d79ef1ff01533923c45a9eede45531251901818250445fbe4b1')
  expect(BLUE_NOISE_BYTES).toHaveLength(BLUE_NOISE_SIZE ** 2)
  expect(Object.isFrozen(BLUE_NOISE_BYTES)).toBe(true)
  expect(Math.min(...BLUE_NOISE_BYTES)).toBe(0)
  expect(Math.max(...BLUE_NOISE_BYTES)).toBe(255)
  expect(Array.from({ length: 256 }, (_, byte) => BLUE_NOISE_BYTES.filter((value) => value === byte).length)).toEqual(Array<number>(256).fill(16))
})

test('midpoint thresholds tile at native floor-scaled coordinates with fixed top-left origin', () => {
  for (const scale of [1, 2, 8]) {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const expected = (BLUE_NOISE_BYTES[y * 64 + x] + 0.5) / 256
      expect(blueNoiseThreshold(x * scale + scale - 1, y * scale, scale)).toBe(expected)
      expect(blueNoiseThreshold((x + 64) * scale, (y + 64) * scale, scale)).toBe(expected)
    }
  }
  expect(BLUE_NOISE_BYTES.some((value, p) => value !== BLUE_NOISE_BYTES[Math.floor(p / 64) * 64 + (p % 64 + 8) % 64])).toBe(true)
})

test('blue-noise thresholds feed the established shade-interval and linear-palette formulas', () => {
  const palette = preparePalette(['#000000', '#FFFFFF'])
  const ramp = createRampQuantizer([0.5], blue)
  const nearest = createPaletteQuantizer(palette, blue)
  const narrow = createRampQuantizer([0.5], { ...blue, transitionWidth: 0.25 })
  const weak = createRampQuantizer([0.5], { ...blue, strength: 0.25 })
  for (let p = 0; p < 4096; p++) {
    const x = p % 64
    const y = Math.floor(p / 64)
    const threshold = (BLUE_NOISE_BYTES[p] + 0.5) / 256
    expect(ramp(0.4, x, y)).toBe(threshold <= 0.4 ? 1 : 0)
    expect(nearest({ r: 0.4, g: 0.4, b: 0.4 }, x, y)).toBe(threshold < 0.4 ? 1 : 0)
    expect(narrow(0.4, x, y)).toBe(weak(0.4, x, y))
    expect(createRampQuantizer([0.5], { ...blue, transitionWidth: 0 })(0.4, x, y)).toBe(rampIndex(0.4, [0.5]))
  }
})
