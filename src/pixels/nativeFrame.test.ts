import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import { decodeSrgb, deriveLighting } from '../domain/lighting'
import type { DerivedLighting } from '../domain/lighting'
import { decodeNormal, encodeDisplayChannel, flipNativeRows, nativeByteLength, processNativePixels } from './nativeFrame'

test.each([[1, 1, 4], [8, 8, 256], [64, 64, 16384], [256, 256, 262144], [96, 64, 24576], [1024, 1024, 4194304]])('native %i × %i has exactly %i bytes', (width, height, bytes) => {
  expect(nativeByteLength(width, height)).toBe(bytes)
})

test.each([[0, 1], [1, -1], [1.5, 8], [1025, 1], [1, Infinity], [NaN, 1]])('invalid dimensions %s × %s reject before allocating', (width, height) => {
  expect(() => nativeByteLength(width, height)).toThrow('integers from 1 to 1024')
})

test('GPU limits constrain each axis without changing requested dimensions', () => {
  expect(nativeByteLength(96, 64, 96, 64)).toBe(24576)
  expect(() => nativeByteLength(96, 65, 96, 64)).toThrow('GPU')
  expect(() => nativeByteLength(97, 64, 96, 64)).toThrow('GPU')
})

test('asymmetric GPU rows flip exactly once into top-left row-major order', () => {
  const bottomLeftRows = new Uint8Array([1, 2, 3, 255, 4, 5, 6, 0, 11, 12, 13, 255, 14, 15, 16, 0, 21, 22, 23, 255, 24, 25, 26, 0])
  const topLeftRows = new Uint8Array(24)
  flipNativeRows(bottomLeftRows, topLeftRows, 2, 3)
  expect([...topLeftRows]).toEqual([21, 22, 23, 255, 24, 25, 26, 0, 11, 12, 13, 255, 14, 15, 16, 0, 1, 2, 3, 255, 4, 5, 6, 0])
  expect(() => flipNativeRows(bottomLeftRows, bottomLeftRows, 2, 3)).toThrow('separate')
  expect(() => flipNativeRows(bottomLeftRows, new Uint8Array(4), 2, 3)).toThrow('exactly sized')
})

test('normal bytes are decoded as signed data then normalized, never as display color', () => {
  const normal = decodeNormal(128, 255, 128)
  expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 14)
  expect(normal.y).toBeGreaterThan(0.9999)
  expect(decodeNormal(0, 128, 128).x).toBeLessThan(-0.9999)
  expect(decodeNormal(255, 255, 255)).toEqual({ x: 1 / Math.sqrt(3), y: 1 / Math.sqrt(3), z: 1 / Math.sqrt(3) })
})

test('linear-to-display conversion saturates and round-trips all sRGB bytes once', () => {
  expect(encodeDisplayChannel(-5)).toBe(0)
  expect(encodeDisplayChannel(10)).toBe(255)
  expect(encodeDisplayChannel(0.0031308)).toBe(10)
  expect(encodeDisplayChannel(0.5)).toBe(188)
  for (let byte = 0; byte < 256; byte++) {
    expect(encodeDisplayChannel(decodeSrgb(`#${byte.toString(16).padStart(2, '0').repeat(3)}`).r)).toBe(byte)
  }
})

const unitLight: DerivedLighting = { direction: { x: 0, y: 1, z: 0 }, directional: { r: 1, g: 0.5, b: 0 }, ambient: { r: 0.2, g: 0.2, b: 0.2 } }

test('top-facing normals light the upper row; reversed normals retain ambient without a PI factor', () => {
  const normals = new Uint8Array([128, 255, 128, 255, 128, 0, 128, 255])
  const output = new Uint8ClampedArray(8)
  processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'transparent' })
  expect([...output]).toEqual([255, 218, 124, 255, 124, 124, 124, 255])
  expect([...normals]).toEqual([128, 255, 128, 255, 128, 0, 128, 255])
})

test('ambient-only lighting recovers exact base bytes independently of surface normal', () => {
  const settings = createDefaultSettings()
  const light = deriveLighting({ ...settings.lighting, directional: { ...settings.lighting.directional, intensity: 0 }, ambient: { color: '#FFFFFF', intensity: 1 } })
  if (!light.ok) throw new Error('Invalid fixture')
  const output = new Uint8ClampedArray(8)
  processNativePixels(new Uint8Array([255, 128, 128, 255, 128, 0, 128, 255]), output, light.value, '#5C88B8', { kind: 'transparent' })
  expect([...output]).toEqual([92, 136, 184, 255, 92, 136, 184, 255])
})

test('background ignores data RGB/category alpha, clears old bytes, and uses exact solid RGB', () => {
  const normals = new Uint8Array([255, 60, 200, 0, 99, 66, 55, 128, 128, 255, 128, 255])
  const output = new Uint8ClampedArray(12).fill(42)
  processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'transparent' })
  expect([...output.slice(0, 8)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  const subject = output.slice(8)
  processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'solid', color: '#123ABC' })
  expect([...output.slice(0, 8)]).toEqual([18, 58, 188, 255, 18, 58, 188, 255])
  expect(output.slice(8)).toEqual(subject)
  expect(() => processNativePixels(normals, new Uint8ClampedArray(8), unitLight, '#FFFFFF', { kind: 'transparent' })).toThrow('matching RGBA')
})

test('fixed ramps use linear illumination rather than reflectance and never tint selected bytes', () => {
  const settings = createDefaultSettings()
  const styling = { ...settings, shading: { ...settings.shading, baseColor: '#000000' as const, tone: { kind: 'cel' as const, thresholds: [0.2, 0.5, 0.8] } } }
  const output = new Uint8ClampedArray(12)
  processNativePixels(new Uint8Array([128, 255, 128, 255, 128, 0, 128, 255, 10, 20, 30, 0]), output, unitLight, '#000000', settings.background, styling)
  expect([...output]).toEqual([92, 136, 184, 255, 48, 72, 120, 255, 0, 0, 0, 0])
  const red = { ...unitLight, directional: { r: 1, g: 0, b: 0 }, ambient: { r: 0, g: 0, b: 0 } }
  processNativePixels(new Uint8Array([128, 255, 128, 255]), output.subarray(0, 4), red, '#FFFFFF', settings.background, styling)
  expect([...output.slice(0, 4)]).toEqual([48, 72, 120, 255])
})

test('one-level ramps, extreme signals and solid backgrounds keep exact bytes', () => {
  const settings = createDefaultSettings()
  const normals = new Uint8Array([128, 255, 128, 255, 128, 0, 128, 255, 0, 0, 0, 0])
  const output = new Uint8ClampedArray(12)
  for (const brightness of [-1, 1]) {
    const styling = { shading: { ...settings.shading, brightness, tone: { kind: 'bands' as const, thresholds: [] } }, palette: { ...settings.palette, colors: ['#1279AB' as const] } }
    processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'solid', color: '#FEDCBA' }, styling)
    expect([...output]).toEqual([18, 121, 171, 255, 18, 121, 171, 255, 254, 220, 186, 255])
  }
})

test('signal controls precede continuous encoding and ramp selection, leaving original processing untouched', () => {
  const settings = createDefaultSettings()
  const normals = new Uint8Array([128, 255, 128, 255])
  const output = new Uint8ClampedArray(4)
  const light = { ...unitLight, directional: { r: 0, g: 0, b: 0 }, ambient: { r: 0.4, g: 0.4, b: 0.4 } }
  const shading = { ...settings.shading, brightness: 0.1, contrast: 2, distribution: 2 }
  processNativePixels(normals, output, light, '#FFFFFF', settings.background, { shading, palette: settings.palette })
  expect([...output]).toEqual([23, 32, 56, 255])
  processNativePixels(normals, output, light, '#FFFFFF', settings.background, { shading: { ...shading, tone: { kind: 'continuous' } }, palette: settings.palette })
  expect([...output]).toEqual([111, 111, 111, 255])
  processNativePixels(normals, output, light, '#FFFFFF', settings.background)
  expect([...output]).toEqual([170, 170, 170, 255])
})

test('palette mapping compares continuous linear input and writes original bytes without post adjustment', () => {
  const settings = createDefaultSettings()
  const normals = new Uint8Array([128, 255, 128, 255, 0, 0, 0, 0])
  const output = new Uint8ClampedArray(8)
  const light = { ...unitLight, directional: { r: 0, g: 0, b: 0 }, ambient: { r: 1, g: 1, b: 1 } }
  const palette = { colors: ['#1279AB', '#FFFFFF', '#000000'] as const, effectPolicy: 'explicit' as const }
  const shading = { ...settings.shading, tone: { kind: 'palette' as const } }
  processNativePixels(normals, output, light, '#1279AB', settings.background, { shading, palette })
  expect([...output]).toEqual([18, 121, 171, 255, 0, 0, 0, 0])
  for (const [brightness, expected] of [[-1, [0, 0, 0]], [1, [255, 255, 255]]] as const) {
    processNativePixels(normals, output, light, '#1279AB', settings.background, { shading: { ...shading, brightness }, palette })
    expect([...output.slice(0, 3)]).toEqual(expected)
  }
  processNativePixels(normals, output, { ...light, ambient: { r: 1, g: 0, b: 0 } }, '#FFFFFF', settings.background, { shading, palette: { ...palette, colors: ['#FF0000', '#000000'] } })
  expect([...output.slice(0, 3)]).toEqual([255, 0, 0])
})

test('nearest subject membership survives signal/light/count changes; strict effects map background only before final write', () => {
  const settings = createDefaultSettings()
  const normals = new Uint8Array([128, 255, 128, 255, 128, 0, 128, 255, 0, 0, 0, 0])
  const output = new Uint8ClampedArray(12)
  const colors = ['#1279AB', '#1279AB'] as const
  for (const count of [1, 2]) for (const brightness of [-1, 0, 1]) for (const contrast of [0, 4]) {
    const styling = { shading: { ...settings.shading, brightness, contrast, tone: { kind: 'palette' as const } }, palette: { colors: colors.slice(0, count), effectPolicy: 'explicit' as const } }
    processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'solid', color: '#FEDCBA' }, styling)
    expect([...output]).toEqual([18, 121, 171, 255, 18, 121, 171, 255, 254, 220, 186, 255])
    processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'solid', color: '#FEDCBA' }, { ...styling, palette: { ...styling.palette, effectPolicy: 'strict' } })
    expect([...output.slice(8)]).toEqual([18, 121, 171, 255])
    processNativePixels(normals, output, unitLight, '#FFFFFF', { kind: 'transparent' }, { ...styling, palette: { ...styling.palette, effectPolicy: 'strict' } })
    expect([...output.slice(8)]).toEqual([0, 0, 0, 0])
  }
})
