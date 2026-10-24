import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import { lambertIllumination } from '../domain/lighting'
import { validateSceneSettings } from '../domain/validation'
import type { ShadowSettings } from '../domain/settings'
import { processNativePixels } from './nativeFrame'
import { directionalVisibility, filterShadowVisibility, shadowCovered } from './shadowVisibility'

const shadows: Extract<ShadowSettings, { kind: 'directional' }> = { kind: 'directional', self: true, ground: true, strength: 0.75, color: '#010203', treatment: { kind: 'hard' } }
const light = { direction: { x: 0, y: 1, z: 0 }, directional: { r: 1, g: 0.5, b: 0.25 }, ambient: { r: 0.2, g: 0.3, b: 0.4 } }

test('visibility attenuates directional energy before quantization and preserves colored ambient exactly', () => {
  expect(lambertIllumination(light.direction, light, 0)).toEqual(light.ambient)
  expect(lambertIllumination(light.direction, light, 0.25)).toEqual({ r: 0.45, g: 0.425, b: 0.4625 })
  expect(directionalVisibility(0, shadows, 255)).toBe(0.25)
  expect(directionalVisibility(0, { ...shadows, self: false }, 255)).toBe(1)
  expect(directionalVisibility(0, { ...shadows, ground: false }, 128)).toBe(1)
  expect(directionalVisibility(0, shadows, 0)).toBe(1)
  expect(directionalVisibility(0, { kind: 'none' }, 255)).toBe(1)
})

test('opaque shadow coverage has exact zero/full endpoints and fixed half coverage without alpha blending', () => {
  for (const [strength, count] of [[0, 0], [0.25, 4], [0.5, 8], [0.75, 12], [1, 16]]) {
    const samples = Array.from({ length: 16 }, (_, i) => shadowCovered(strength, i % 4, Math.floor(i / 4)))
    expect(samples.filter(Boolean)).toHaveLength(count)
    expect(samples).toEqual(Array.from({ length: 16 }, (_, i) => shadowCovered(strength, i % 4 + 4, Math.floor(i / 4) + 4)))
  }
})

function filtered(categories: number[], depths: number[], visibility: number[], radius = 1, face = -1) {
  const normals = new Uint8Array(categories.flatMap((category, i) => i === face ? [128, 255, 128, category] : [128, 128, 255, category]))
  const pass = new Uint8Array(categories.flatMap((category, i) => [visibility[i], Math.floor(depths[i] / 256), depths[i] % 256, category]))
  const output = new Float32Array(categories.length)
  filterShadowVisibility(normals, pass, output, { width: categories.length, height: 1, radius, depthSpan: 65535, depthStep: 1 })
  return [...output]
}

test('soft filtering averages same planar surface, and radius zero is exactly Hard', () => {
  expect(filtered([255, 255, 255], [0, 0, 0], [0, 255, 255])).toEqual([0.5, expect.closeTo(2 / 3), 1])
  expect(filtered([255, 255, 255], [0, 0, 0], [0, 255, 255], 0)).toEqual([0, 1, 1])
})

test('soft filtering excludes other categories, background holes, depth discontinuities and unrelated faces', () => {
  expect(filtered([255, 128, 255], [0, 0, 0], [0, 255, 255], 4)).toEqual([0, 1, 1])
  expect(filtered([255, 0, 255], [0, 0, 0], [0, 0, 255], 4)).toEqual([0, 1, 1])
  expect(filtered([255, 255], [0, 100], [0, 255])).toEqual([0, 1])
  expect(filtered([255, 255], [0, 0], [0, 255], 1, 1)).toEqual([0, 1])
})

test('category misalignment fails visibly instead of silently accepting shifted native passes', () => {
  expect(() => filterShadowVisibility(new Uint8Array([128, 128, 255, 255]), new Uint8Array([0, 0, 0, 128]), new Float32Array(1), { width: 1, height: 1, radius: 0, depthSpan: 1, depthStep: 1 })).toThrow('alignment')
})

test('cached rays exactly preserve the direct filter across holes, categories, normals, depths and all radii', () => {
  const width = 13, height = 11
  const normals = new Uint8Array(width * height * 4)
  const pass = new Uint8Array(normals.length)
  for (let pixel = 0; pixel < width * height; pixel++) {
    const category = pixel % 17 === 0 ? 0 : pixel % 7 === 0 ? 128 : 255
    normals.set([100 + pixel % 29, 105 + pixel % 19, pixel % 23 === 0 ? 100 : 255, category], pixel * 4)
    pass.set([pixel * 37 % 256, pixel % 9, pixel * 13 % 256, category], pixel * 4)
  }
  for (const radius of [0, 1, 2, 3, 4]) {
    const expected = new Float32Array(width * height)
    const output = new Float32Array(expected.length)
    const depth = (offset: number) => (pass[offset + 1] * 256 + pass[offset + 2]) * 17 / 65535
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const a = (y * width + x) * 4
      if (normals[a + 3] === 0) { expected[a / 4] = 1; continue }
      let sum = 0, count = 0
      for (let sy = Math.max(0, y - radius); sy <= Math.min(height - 1, y + radius); sy++) for (let sx = Math.max(0, x - radius); sx <= Math.min(width - 1, x + radius); sx++) {
        const steps = Math.max(Math.abs(sx - x), Math.abs(sy - y))
        let eligible = true
        for (let step = 1; step <= steps; step++) {
          const b = (Math.round(y + (sy - y) * step / steps) * width + Math.round(x + (sx - x) * step / steps)) * 4
          let dot = 0, aa = 0, bb = 0
          for (let channel = 0; channel < 3; channel++) {
            const n = normals[a + channel] * 2 - 255, m = normals[b + channel] * 2 - 255
            dot += n * m; aa += n * n; bb += m * m
          }
          if (normals[b + 3] !== normals[a + 3] || dot < 0.85 * Math.sqrt(aa * bb) || Math.abs(depth(a) - depth(b)) > 0.03 * step + 17 * 2 / 65535) { eligible = false; break }
        }
        if (eligible) { sum += pass[(sy * width + sx) * 4] / 255; count++ }
      }
      expected[a / 4] = sum / count
    }
    filterShadowVisibility(normals, pass, output, { width, height, radius, depthSpan: 17, depthStep: 0.03 })
    expect(output).toEqual(expected)
  }
})

function receiverFrame(appearance: 'visible' | 'shadow-only', visibility: number, strict = false, ambientOnly = false) {
  const settings = { ...createDefaultSettings(), canvas: { width: 4, height: 4 } }
  const normals = new Uint8Array(Array.from({ length: 16 }, () => [128, 255, 128, 128]).flat())
  const output = new Uint8ClampedArray(normals.length)
  processNativePixels(normals, output, ambientOnly ? { ...light, directional: { r: 0, g: 0, b: 0 } } : light, '#FFFFFF', { kind: 'transparent' }, settings, {
    ground: { kind: 'receiver', position: { x: 0, y: -1, z: 0 }, width: 6, depth: 6, appearance: appearance === 'visible' ? { kind: appearance, color: '#FEFDFC' } : { kind: appearance } },
    shadows: { ...shadows, strength: 1 }, canvas: { width: 4, height: 4 }, palette: { ...settings.palette, effectPolicy: strict ? 'strict' : 'explicit' }, visibility: new Float32Array(16).fill(visibility),
  })
  return Array.from({ length: 16 }, (_, pixel) => [...output.slice(pixel * 4, pixel * 4 + 4)])
}

test('receiver states are distinct, zero hidden RGB and binary alpha never leak category 128', () => {
  expect(receiverFrame('shadow-only', 1)).toEqual(Array.from({ length: 16 }, () => [0, 0, 0, 0]))
  expect(receiverFrame('visible', 1)).toEqual(Array.from({ length: 16 }, () => [254, 253, 252, 255]))
  const shadowed = receiverFrame('shadow-only', 0)
  expect(shadowed.some((pixel) => pixel[3] === 255)).toBe(true)
  expect(shadowed.every((pixel) => pixel.join() === '1,2,3,255' || pixel.join() === '0,0,0,0')).toBe(true)
  expect(receiverFrame('shadow-only', 0, false, true)).toEqual(receiverFrame('shadow-only', 1))
})

test('strict receiver/shadow policy selects original palette entries, explicit adds only its two colors', () => {
  const allowed = createDefaultSettings().palette.colors.map((color) => `${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5), 16)},255`)
  for (const appearance of ['visible', 'shadow-only'] as const) {
    const frame = receiverFrame(appearance, 0, true)
    expect(frame.every((pixel) => pixel[3] === 0 || allowed.includes(pixel.join()))).toBe(true)
  }
  expect(receiverFrame('visible', 0).every((pixel) => ['254,253,252,255', '1,2,3,255'].includes(pixel.join()))).toBe(true)
})

test.each(['bands', 'palette'] as const)('receiver never emits/receives subject diffusion error (%s)', (kind) => {
  const defaults = createDefaultSettings()
  const styling = { ...defaults, canvas: { width: 4, height: 1 }, shading: { ...defaults.shading, tone: kind === 'bands' ? { kind, thresholds: [0.5] } : { kind } }, palette: { colors: ['#000000', '#FFFFFF'] as const, effectPolicy: 'strict' as const }, dither: { kind: 'floyd-steinberg' as const, strength: 1 } }
  const normals = new Uint8Array([128, 255, 128, 255, 128, 255, 128, 128, 128, 255, 128, 255, 128, 255, 128, 255])
  const first = new Uint8ClampedArray(16)
  const second = new Uint8ClampedArray(16)
  const effects = { ground: { kind: 'receiver' as const, position: { x: 0, y: 0, z: 0 }, width: 6, depth: 6, appearance: { kind: 'visible' as const, color: '#FF0000' as const } }, shadows, canvas: styling.canvas, palette: styling.palette, visibility: new Float32Array([1, 0, 1, 1]) }
  processNativePixels(normals, first, light, '#FFFFFF', defaults.background, styling, effects)
  normals[7] = 0
  processNativePixels(normals, second, light, '#FFFFFF', defaults.background, styling)
  for (const pixel of [0, 2, 3]) expect(first.slice(pixel * 4, pixel * 4 + 4)).toEqual(second.slice(pixel * 4, pixel * 4 + 4))
})

test('bounded bias is backward compatible with saved version-one scenes and rejects invalid values', () => {
  const defaults = createDefaultSettings()
  for (const bias of [undefined, 0, 0.5, 2]) expect(validateSceneSettings({ ...defaults, shadows: { ...shadows, ...(bias === undefined ? {} : { bias }) } }).ok).toBe(true)
  for (const bias of [-0.01, 2.01, NaN, Infinity]) expect(validateSceneSettings({ ...defaults, shadows: { ...shadows, bias } }).ok).toBe(false)
})
