import { expect, test } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { createDefaultSettings, PALETTE_PRESETS } from './defaults'
import { decodeSrgb } from './lighting'
import { parsePalette, serializePalette } from './paletteInterchange'
import { encodeDisplayChannel, nearestColorIndex, preparePalette, resampleShadingRamp } from './shading'

const documented = {
  grayscale: ['#202020', '#686868', '#B0B0B0', '#F0F0F0'],
  gameBoy: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
  nes: ['#1C1C1C', '#2038EC', '#38B4FC', '#FCFCFC'],
  warm: ['#301B28', '#78404A', '#C47761', '#F4D7A1'],
  cool: ['#172038', '#304878', '#5C88B8', '#B8D8F0'],
}

test.each(Object.keys(documented) as (keyof typeof documented)[])('%s preset exactly matches specification order and bytes', (name) => {
  expect(PALETTE_PRESETS[name]).toEqual(documented[name])
})

test('sRGB endpoints and both sides of transfer knee use the standard transfer, with no double conversion', () => {
  expect(decodeSrgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
  expect(decodeSrgb('#FFFFFF')).toEqual({ r: 1, g: 1, b: 1 })
  expect(decodeSrgb('#0A0B80').r).toBeCloseTo(0.003035269835488375, 15)
  expect(decodeSrgb('#0A0B80').g).toBeCloseTo(0.003346535763899161, 15)
  expect(encodeDisplayChannel(0)).toBe(0)
  expect(encodeDisplayChannel(1)).toBe(255)
  expect(encodeDisplayChannel(0.21404114048223255)).toBe(128)
})

test('nearest matching uses squared linear RGB distances and stable lowest-index ties', () => {
  const redBlue = preparePalette(['#FF0000', '#0000FF'])
  // (0.5, 0, 0.5) is squared distance 0.5 from either primary.
  expect(nearestColorIndex({ r: 0.5, g: 0, b: 0.5 }, redBlue)).toBe(0)
  expect(nearestColorIndex({ r: 0.49, g: 0, b: 0.51 }, redBlue)).toBe(1)
  // Gray 128 decodes to 0.2158605: 3*0.1² < 3*(0.2158605-0.1)².
  expect(nearestColorIndex({ r: 0.1, g: 0.1, b: 0.1 }, preparePalette(['#000000', '#808080']))).toBe(0)
  expect(nearestColorIndex({ r: 0, g: 1, b: 0 }, preparePalette(['#FF0000', '#00FF00', '#0000FF']))).toBe(1)
})

test('decoded palette cache preserves byte order and duplicates; one color and count changes stay finite', () => {
  const colors = ['#A0127F', '#A0127F', '#010203'] as const
  const prepared = preparePalette(colors)
  expect(preparePalette(colors)).toBe(prepared)
  expect(prepared.map((entry) => entry.bytes)).toEqual([[160, 18, 127], [160, 18, 127], [1, 2, 3]])
  expect(nearestColorIndex(decodeSrgb(colors[0]), prepared)).toBe(0)
  expect(nearestColorIndex({ r: 1, g: 0, b: 1 }, preparePalette(['#010203']))).toBe(0)
  expect(preparePalette(colors.slice(0, 1))).toHaveLength(1)
  expect(() => preparePalette([])).toThrow('at least one')
})

test('resampling follows artist order in linear RGB, retains exact knots and endpoints, and defines one color', () => {
  const colors = ['#FFFFFF', '#000000', '#FF0000'] as const
  expect(resampleShadingRamp(colors, 5)).toEqual(['#FFFFFF', '#BCBCBC', '#000000', '#BC0000', '#FF0000'])
  expect(resampleShadingRamp(colors, 3)).toEqual(colors)
  expect(resampleShadingRamp(colors, 2)).toEqual(['#FFFFFF', '#FF0000'])
  expect(resampleShadingRamp(colors, 1)).toEqual(['#FFFFFF'])
  expect(resampleShadingRamp(['#2468AC'], 32)).toEqual(Array(32).fill('#2468AC'))
})

test('JSON and hex interchange round trip order, duplicates and policy without scene fields', () => {
  const palette = { colors: ['#FFFFFF', '#123ABC', '#123ABC', '#000000'] as const, effectPolicy: 'strict' as const }
  expect(parsePalette(serializePalette(palette, 'json'), 'explicit')).toEqual({ ok: true, value: palette, notices: [] })
  expect(parsePalette(serializePalette(palette, 'hex'), 'explicit')).toEqual({ ok: true, value: { ...palette, effectPolicy: 'explicit' }, notices: [] })
  expect(parsePalette('aabbcc, #010203\nAABBCC', 'strict')).toEqual({ ok: true, value: { colors: ['#AABBCC', '#010203', '#AABBCC'], effectPolicy: 'strict' }, notices: [] })
})

test.each([
  '', '#123', '#000000 #GG0000', '#FFFFFF80', 'red', '[]', '{', 'null',
  JSON.stringify({ schemaVersion: 2, colors: ['#000000'], effectPolicy: 'strict' }),
  JSON.stringify({ schemaVersion: 1, colors: ['#000000'], effectPolicy: 'strict', name: 'unknown' }),
  JSON.stringify({ schemaVersion: 1, colors: ['#000000'] }),
  JSON.stringify({ schemaVersion: 1, colors: [123], effectPolicy: 'explicit' }),
  JSON.stringify({ schemaVersion: 1, colors: ['#000000'], effectPolicy: 'invalid' }),
  Array(33).fill('#FFFFFF').join(' '), ' '.repeat(16_385),
])('invalid palette import %s leaves settings and all render revisions unchanged', (text) => {
  const store = createStudioStore()
  const before = store.getState()
  const result = store.getState().actions.importPalette(text)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.issues[0].message.length).toBeGreaterThan(10)
  expect(store.getState()).toBe(before)
})

test('import and explicit resample atomically update colors/policy/active boundaries without capturing geometry', () => {
  const store = createStudioStore()
  const { actions } = store.getState()
  const observations: number[] = []
  const unsubscribe = store.subscribe((state) => observations.push(state.settings.palette.colors.length))
  expect(actions.importPalette('{"schemaVersion":1,"colors":["#FFFFFF","#000000"],"effectPolicy":"strict"}').ok).toBe(true)
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'bands', thresholds: [0.5] })
  expect(store.getState().settings.palette.effectPolicy).toBe('strict')
  expect(observations).toEqual([2])
  expect(actions.resampleShadingRamp(3).ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(['#FFFFFF', '#BCBCBC', '#000000'])
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'bands', thresholds: [1 / 3, 2 / 3] })
  expect(store.getState().revisions).toMatchObject({ capture: 0, style: 2, settings: 2 })
  const before = store.getState()
  for (const count of [0, 33, 1.5, NaN]) expect(actions.resampleShadingRamp(count).ok).toBe(false)
  expect(store.getState()).toBe(before)
  expect(actions.resetSection('palette').ok).toBe(true)
  expect(store.getState().settings.palette).toEqual(createDefaultSettings().palette)
  unsubscribe()
})
