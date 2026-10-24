import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import type { DerivedLighting } from '../domain/lighting'
import type { DitherSettings, SceneSettings } from '../domain/settings'
import { colorBytes } from '../domain/shading'
import { processNativePixels } from './nativeFrame'

const defaults = createDefaultSettings()
const algorithms: readonly Exclude<DitherSettings, { kind: 'none' }>[] = [
  ...([2, 4, 8] as const).map((matrixSize) => ({ kind: 'bayer' as const, matrixSize, strength: 1, patternScale: 1, transitionWidth: 1 })),
  { kind: 'blue-noise', strength: 1, patternScale: 1, transitionWidth: 1 },
  { kind: 'floyd-steinberg', strength: 1 },
]
const light: DerivedLighting = { direction: { x: 0, y: 0, z: 1 }, directional: { r: 0.6, g: 0.5, b: 0.7 }, ambient: { r: 0.1, g: 0.15, b: 0.2 } }

function draw(scene: SceneSettings, categories: number[]) {
  const normals = new Uint8Array(categories.flatMap((category, p) => [Math.round(p % scene.canvas.width * 255 / Math.max(1, scene.canvas.width - 1)), 128, 255, category]))
  const before = normals.slice()
  const output = new Uint8ClampedArray(normals.length).fill(42)
  processNativePixels(normals, output, light, scene.shading.baseColor, scene.background, scene)
  expect(normals).toEqual(before)
  return output
}

test.each(algorithms)('$kind strength zero is the exact none path in every shading mode, without canvas metadata', (dither) => {
  for (const tone of [{ kind: 'continuous' }, { kind: 'cel', thresholds: [0.1, 0.5, 0.8] }, { kind: 'bands', thresholds: [0.1, 0.5, 0.8] }, { kind: 'palette' }] as const) {
    const scene = { ...defaults, shading: { ...defaults.shading, tone, brightness: 0.13, contrast: 1.7, distribution: 0.7 } }
    const normals = new Uint8Array([128, 128, 255, 255, 0, 255, 128, 0, 128, 128, 255, 128])
    const output = new Uint8ClampedArray(normals.length)
    const plain = new Uint8ClampedArray(normals.length)
    processNativePixels(normals, output, light, scene.shading.baseColor, scene.background, { shading: scene.shading, palette: scene.palette, dither: { ...dither, strength: 0 } })
    processNativePixels(normals, plain, light, scene.shading.baseColor, scene.background, { shading: scene.shading, palette: scene.palette, dither: { kind: 'none' } })
    expect(output).toEqual(plain)
  }
})

test.each(algorithms.slice(3))('$kind keeps whole-frame determinism, masks and exact colors across native shapes and policies', (dither) => {
  for (const canvas of [{ width: 1, height: 7 }, { width: 7, height: 1 }, { width: 1, height: 1 }, { width: 5, height: 4 }]) {
    for (const colors of [defaults.palette.colors, ['#1279AB'] as const, ['#1279AB', '#1279AB'] as const]) {
      for (const tone of [{ kind: 'bands', thresholds: Array.from({ length: colors.length - 1 }, (_, i) => (i + 1) / colors.length) }, { kind: 'palette' }] as const) {
        for (const background of [{ kind: 'transparent' }, { kind: 'solid', color: '#FEDCBA' }] as const) {
          for (const effectPolicy of ['explicit', 'strict'] as const) {
            const scene = { ...defaults, canvas, background, dither, shading: { ...defaults.shading, tone }, palette: { colors, effectPolicy } }
            for (const mask of [Array<number>(canvas.width * canvas.height).fill(0), Array<number>(canvas.width * canvas.height).fill(255), Array.from({ length: canvas.width * canvas.height }, (_, p) => [255, 0, 255, 128, 255][p % 5])]) {
              const actual = draw(scene, mask)
              expect(actual).toEqual(draw(scene, mask))
              const plain = draw({ ...scene, dither: { kind: 'none' } }, mask)
              for (let p = 0; p < mask.length; p++) {
                const bytes = [...actual.slice(p * 4, p * 4 + 4)]
                if (mask[p] === 255) expect(colors.map((color) => [...colorBytes(color), 255])).toContainEqual(bytes)
                else expect(bytes).toEqual([...plain.slice(p * 4, p * 4 + 4)])
              }
            }
          }
        }
      }
    }
  }
})

test('nonzero advanced algorithms require true native dimensions and continuous bypass remains exact', () => {
  for (const dither of algorithms.slice(3)) {
    const scene = { ...defaults, canvas: { width: 3, height: 2 }, dither }
    expect(() => draw(scene, [255])).toThrow('exact native canvas')
    const continuous = { ...scene, shading: { ...scene.shading, tone: { kind: 'continuous' as const } } }
    expect(draw(continuous, [255])).toEqual(draw({ ...continuous, dither: { kind: 'none' } }, [255]))
  }
})
