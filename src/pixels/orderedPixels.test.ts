import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import type { DerivedLighting } from '../domain/lighting'
import type { BackgroundSettings, SceneSettings } from '../domain/settings'
import { colorBytes } from '../domain/shading'
import { flipNativeRows, processNativePixels } from './nativeFrame'

const base = createDefaultSettings()
const ambient: DerivedLighting = { direction: { x: 0, y: 0, z: 1 }, directional: { r: 0, g: 0, b: 0 }, ambient: { r: 0.4, g: 0.4, b: 0.4 } }
const categories = [255, 0, 255, 255, 128, 255, 255, 255, 255, 255, 0, 255]
const mask = new Uint8Array(categories.flatMap((category) => [128, 128, 255, category]))
const settings: SceneSettings = { ...base, canvas: { width: 4, height: 3 }, palette: { colors: ['#000000', '#FFFFFF'], effectPolicy: 'explicit' }, shading: { ...base.shading, baseColor: '#FFFFFF', tone: { kind: 'bands', thresholds: [0.5] } }, dither: { kind: 'bayer', matrixSize: 4, strength: 1, patternScale: 1, transitionWidth: 1 } }

function draw(scene = settings, normals = mask, light = ambient) {
  const output = new Uint8ClampedArray(normals.length).fill(42)
  processNativePixels(normals, output, light, scene.shading.baseColor, scene.background, scene)
  return output
}

test('4×3 masked ramp/palette golden uses canvas origin, excludes receiver and flips capture once', () => {
  const rgba = (value: number | null) => value === null ? [0, 0, 0, 0] : [value, value, value, 255]
  const golden = [255, null, 255, 0, null, 255, 0, 0, 255, 0, null, 0].flatMap(rgba)
  expect([...draw()]).toEqual(golden)
  expect([...draw({ ...settings, shading: { ...settings.shading, tone: { kind: 'palette' } } })]).toEqual(golden)
  const bottomLeft = new Uint8Array([...mask.slice(32), ...mask.slice(16, 32), ...mask.slice(0, 16)])
  const topLeft = new Uint8Array(mask.length)
  flipNativeRows(bottomLeft, topLeft, 4, 3)
  expect([...draw(settings, topLeft)]).toEqual(golden)
  expect([...draw({ ...settings, dither: { kind: 'bayer', matrixSize: 4, strength: 1, patternScale: 2, transitionWidth: 1 } })]).toEqual([255, null, 0, 0, null, 255, 0, 0, 0, 0, null, 255].flatMap(rgba))
})

test.each([2, 4, 8] as const)('size %i: full-frame zero equals None for cel/bands/palette, custom signals and masks', (matrixSize) => {
  for (const tone of [{ kind: 'cel', thresholds: [0.5] }, { kind: 'bands', thresholds: [0.5] }, { kind: 'palette' }] as const) {
    for (const brightness of [-1, 0, 0.2, 1]) {
      const scene = { ...settings, shading: { ...settings.shading, tone, brightness, contrast: 1.7, distribution: 0.7 } }
      const plain = draw({ ...scene, dither: { kind: 'none' } })
      expect(draw({ ...scene, dither: { kind: 'bayer', matrixSize, strength: 0, patternScale: 8, transitionWidth: 1 } })).toEqual(plain)
    }
  }
})

test.each([2, 4, 8] as const)('size %i: deterministic full frames keep permitted colors, alpha and both background policies', (matrixSize) => {
  for (const effectPolicy of ['explicit', 'strict'] as const) {
    for (const background of [{ kind: 'transparent' }, { kind: 'solid', color: '#123ABC' }] as const satisfies readonly BackgroundSettings[]) {
      for (const tone of [{ kind: 'bands', thresholds: [0.5] }, { kind: 'palette' }] as const) {
        const scene = { ...settings, background, palette: { ...settings.palette, effectPolicy }, shading: { ...settings.shading, tone }, dither: { kind: 'bayer' as const, matrixSize, strength: 1, patternScale: 1, transitionWidth: 1 } }
        const actual = draw(scene)
        expect(draw(scene)).toEqual(actual)
        const plain = draw({ ...scene, dither: { kind: 'none' } })
        for (let i = 0; i < categories.length; i++) {
          expect(actual[i * 4 + 3]).toBe(plain[i * 4 + 3])
          if (categories[i] === 255) expect([[0, 0, 0, 255], [255, 255, 255, 255]]).toContainEqual([...actual.slice(i * 4, i * 4 + 4)])
          else expect(actual.slice(i * 4, i * 4 + 4)).toEqual(plain.slice(i * 4, i * 4 + 4))
        }
      }
    }
  }
})

test('continuous modes ignore ordered settings and quantizing dimensions must match actual buffers', () => {
  const continuous = { ...settings, shading: { ...settings.shading, tone: { kind: 'continuous' as const } } }
  expect(draw(continuous)).toEqual(draw({ ...continuous, dither: { kind: 'none' } }))
  expect(() => draw({ ...settings, canvas: { width: 3, height: 4 } })).not.toThrow()
  expect(() => draw({ ...settings, canvas: { width: 4, height: 4 } })).toThrow('exact native canvas')
  expect(() => processNativePixels(mask, new Uint8ClampedArray(mask.length), ambient, '#FFFFFF', settings.background, { shading: settings.shading, palette: settings.palette, dither: settings.dither })).toThrow('exact native canvas')
})

test.each([2, 4, 8] as const)('size %i: one-color and duplicate-only frames keep original bytes at maximum settings', (matrixSize) => {
  for (const colors of [['#1279AB'], ['#1279AB', '#1279AB']] as const) {
    for (const tone of [{ kind: 'bands', thresholds: colors.length === 1 ? [] : [0.5] }, { kind: 'palette' }] as const) {
      const actual = draw({ ...settings, palette: { ...settings.palette, colors }, shading: { ...settings.shading, tone }, dither: { kind: 'bayer', matrixSize, strength: 1, patternScale: 8, transitionWidth: 1 } })
      for (let i = 0; i < categories.length; i++) if (categories[i] === 255) expect([...actual.slice(i * 4, i * 4 + 4)]).toEqual([...colorBytes('#1279AB'), 255])
    }
  }
})
