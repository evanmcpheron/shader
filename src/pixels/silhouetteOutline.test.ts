import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import { deriveLighting } from '../domain/lighting'
import type { DitherSettings } from '../domain/settings'
import { resolveEffectColor } from '../domain/shading'
import { processNativePixels } from './nativeFrame'
import { compositeOutline, dilateSubjectRing } from './silhouetteOutline'
import { measureSubjectBounds } from './subjectBounds'

function fixture(rows: readonly string[]) {
  const width = rows[0].length
  const height = rows.length
  const categories = new Uint8Array(width * height * 4)
  rows.forEach((row, y) => [...row].forEach((value, x) => {
    categories.set([128, 255, 128, value === '#' ? 255 : value === 'g' ? 128 : 0], (y * width + x) * 4)
  }))
  const ring = new Uint8Array(width * height).fill(9)
  const scratch = new Uint8Array(width * height).fill(9)
  return { width, height, categories, ring, scratch }
}

function ringRows(ring: Uint8Array, width: number) {
  return Array.from({ length: ring.length / width }, (_, y) => [...ring.slice(y * width, (y + 1) * width)].map((v) => v ? '+' : '.').join(''))
}

test.each([
  { thickness: 1, expected: ['.......', '.......', '..+++..', '..+.+..', '..+++..', '.......', '.......'] },
  { thickness: 2, expected: ['.......', '.+++++.', '.+++++.', '.++.++.', '.+++++.', '.+++++.', '.......'] },
])('single-pixel Chebyshev ring has exact thickness $thickness and diagonal corners', ({ thickness, expected }) => {
  const f = fixture(['.......', '.......', '.......', '...#...', '.......', '.......', '.......'])
  const saved = f.categories.slice()
  const report = dilateSubjectRing(f.categories, f.width, f.height, thickness, f.ring, f.scratch)
  expect(ringRows(f.ring, f.width)).toEqual(expected)
  expect(report).toEqual({ extent: { x: 3 - thickness, y: 3 - thickness, width: 1 + 2 * thickness, height: 1 + 2 * thickness }, visible: { x: 3 - thickness, y: 3 - thickness, width: 1 + 2 * thickness, height: 1 + 2 * thickness }, clipped: false, pixelCount: (1 + 2 * thickness) ** 2 - 1 })
  expect(f.categories).toEqual(saved)
  expect(measureSubjectBounds(f.categories, f.width, f.height)).toEqual({ x: 3, y: 3, width: 1, height: 1 })
})

test('upper-bound radius eight makes a 17-square ring without iteratively growing the source', () => {
  const f = fixture(Array.from({ length: 19 }, (_, y) => y === 9 ? '.........#.........' : '.'.repeat(19)))
  const report = dilateSubjectRing(f.categories, 19, 19, 8, f.ring, f.scratch)
  const fullRow = '.' + '+'.repeat(17) + '.'
  expect(ringRows(f.ring, 19)).toEqual(['.'.repeat(19), ...Array<string>(8).fill(fullRow), '.' + '+'.repeat(8) + '.' + '+'.repeat(8) + '.', ...Array<string>(8).fill(fullRow), '.'.repeat(19)])
  expect(report).toMatchObject({ extent: { x: 1, y: 1, width: 17, height: 17 }, pixelCount: 288, clipped: false })
})

test('diagonal and concave corners form a square-distance union, excluding ground categories', () => {
  const f = fixture(['.......', '.#.....', '..#....', '..##...', '.......', '.....g.', '.......'])
  dilateSubjectRing(f.categories, 7, 7, 1, f.ring, f.scratch)
  expect(ringRows(f.ring, 7)).toEqual(['+++....', '+.++...', '++.++..', '.+..+..', '.++++..', '.......', '.......'])
})

test('holes shrink only by the declared radius; large centers survive and small holes close', () => {
  const f = fixture(['.........', '.#######.', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '.#######.', '.........'])
  dilateSubjectRing(f.categories, 9, 9, 1, f.ring, f.scratch)
  expect(ringRows(f.ring, 9)).toEqual(['+++++++++', '+.......+', '+.+++++.+', '+.+...+.+', '+.+...+.+', '+.+...+.+', '+.+++++.+', '+.......+', '+++++++++'])
  dilateSubjectRing(f.categories, 9, 9, 2, f.ring, f.scratch)
  expect(f.ring[4 * 9 + 4]).toBe(0)
  dilateSubjectRing(f.categories, 9, 9, 3, f.ring, f.scratch)
  expect(f.ring[4 * 9 + 4]).toBe(1)
})

test.each([1, 2, 8])('clipped edge/corner rings match an independent all-source distance fixture at radius %i', (thickness) => {
  const f = fixture(['#....#', '......', '..##..', '......', '#....#'])
  const points = [[0, 0], [5, 0], [2, 2], [3, 2], [0, 4], [5, 4]]
  const expected = Array.from({ length: 30 }, (_, i) => {
    const x = i % 6, y = Math.floor(i / 6)
    const distance = Math.min(...points.map(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y))))
    return Number(distance > 0 && distance <= thickness)
  })
  const report = dilateSubjectRing(f.categories, 6, 5, thickness, f.ring, f.scratch)
  expect([...f.ring]).toEqual(expected)
  expect(report).toMatchObject({ clipped: true, visible: { x: 0, y: 0, width: 6, height: 5 }, extent: { x: -thickness, y: -thickness, width: 6 + 2 * thickness, height: 5 + 2 * thickness } })
})

test('empty and full one-pixel canvases clear work buffers and disclose clipped extents', () => {
  const f = fixture(['g'])
  expect(dilateSubjectRing(f.categories, 1, 1, 8, f.ring, f.scratch)).toEqual({ extent: null, visible: null, clipped: false, pixelCount: 0 })
  expect([...f.ring, ...f.scratch]).toEqual([0, 0])
  f.categories[3] = 255
  expect(dilateSubjectRing(f.categories, 1, 1, 8, f.ring, f.scratch)).toMatchObject({ clipped: true, pixelCount: 0, extent: { x: -8, y: -8, width: 17, height: 17 }, visible: { x: 0, y: 0, width: 1, height: 1 } })
  expect([...f.ring]).toEqual([0])
})

test('invalid thickness, dimensions and aliased work ownership fail explicitly', () => {
  const f = fixture(['.#.'])
  for (const thickness of [0, 1.5, 9, NaN, Infinity]) expect(() => dilateSubjectRing(f.categories, 3, 1, thickness, f.ring, f.scratch)).toThrow('integer from 1 to 8')
  expect(() => dilateSubjectRing(f.categories, 3, 1, 1, f.ring, f.ring)).toThrow('separate ownership')
  expect(() => dilateSubjectRing(f.categories, 3, 1, 1, f.categories.subarray(0, 3), f.scratch)).toThrow('separate ownership')
  expect(() => dilateSubjectRing(f.categories, 2, 1, 1, f.ring, f.scratch)).toThrow('exactly sized')
})

test('subject wins over outline, outline wins over receiver/background, transparency stays canonical', () => {
  const categories = new Uint8Array([1, 2, 3, 255, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0])
  const underlay = new Uint8ClampedArray([17, 34, 51, 255, 68, 85, 102, 255, 119, 136, 153, 255, 0, 0, 0, 0])
  const output = new Uint8ClampedArray(16)
  compositeOutline(categories, new Uint8Array([1, 1, 0, 0]), underlay, output, '#01FE80')
  expect([...output]).toEqual([17, 34, 51, 255, 1, 254, 128, 255, 119, 136, 153, 255, 0, 0, 0, 0])
  expect([...underlay.slice(4, 8)]).toEqual([68, 85, 102, 255])
  expect(() => compositeOutline(categories, new Uint8Array(2), underlay, output, '#000000')).toThrow('matching native')
})

test('explicit and strict colors use chosen bytes, nearest linear RGB and stable first-entry ties', () => {
  const palette = { colors: ['#000000', '#FFFFFF', '#FFFFFF'] as const, effectPolicy: 'strict' as const }
  expect(resolveEffectColor('#808080', palette)).toBe('#000000')
  expect(resolveEffectColor('#FFFFFF', palette)).toBe('#FFFFFF')
  expect(resolveEffectColor('#01FE80', { ...palette, effectPolicy: 'explicit' })).toBe('#01FE80')
  expect(resolveEffectColor('#ABCDEF', { colors: ['#1279AB'], effectPolicy: 'strict' })).toBe('#1279AB')
  expect(resolveEffectColor('#000000', { colors: ['#010000', '#000100'], effectPolicy: 'strict' })).toBe('#010000')
})

const dithers: DitherSettings[] = [{ kind: 'none' }, ...([2, 4, 8] as const).map((matrixSize) => ({ kind: 'bayer' as const, matrixSize, strength: 1, transitionWidth: 1, patternScale: 1 })), { kind: 'blue-noise', strength: 1, transitionWidth: 1, patternScale: 1 }, { kind: 'floyd-steinberg', strength: 1 }]

test.each(['bands', 'palette'] as const)('all dither modes leave %s outline bytes/alpha exact and do not diffuse across the ring', (kind) => {
  const f = fixture(['.......', '.##....', '.##.##.', '....##.', '.......'])
  const settings = createDefaultSettings()
  const light = deriveLighting(settings.lighting)
  if (!light.ok) throw new Error('Invalid fixture light')
  dilateSubjectRing(f.categories, f.width, f.height, 1, f.ring, f.scratch)
  const underlay = new Uint8ClampedArray(f.categories.length)
  const output = new Uint8ClampedArray(f.categories.length)
  const saved = f.categories.slice()
  for (const effectPolicy of ['explicit', 'strict'] as const) for (const dither of dithers) {
    const palette = { ...settings.palette, effectPolicy }
    processNativePixels(f.categories, underlay, light.value, settings.shading.baseColor, settings.background, { ...settings, canvas: f, palette, dither, shading: { ...settings.shading, tone: kind === 'bands' ? settings.shading.tone : { kind } } })
    const color = resolveEffectColor('#01FE80', palette)
    compositeOutline(f.categories, f.ring, underlay, output, color)
    const expectedColor = effectPolicy === 'explicit' ? [1, 254, 128, 255] : [92, 136, 184, 255]
    for (let i = 0; i < f.ring.length; i++) {
      const offset = i * 4
      const bytes = [...output.slice(offset, offset + 4)]
      if (f.ring[i]) expect(bytes).toEqual(expectedColor)
      else if (f.categories[offset + 3] === 255) expect(bytes).toEqual([...underlay.slice(offset, offset + 4)])
      else expect(bytes).toEqual([0, 0, 0, 0])
    }
  }
  expect(f.categories).toEqual(saved)
})
