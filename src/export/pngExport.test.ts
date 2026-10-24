import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import type { NativeFrame } from '../pixels/nativeFrame'
import { ownExportFrame, pngFilename } from './pngExport'

const settings = createDefaultSettings()
function frame(): NativeFrame {
  return { width: 64, height: 64, revision: 7, captureRevision: 3, rgba: new Uint8ClampedArray(64 * 64 * 4), framing: { mode: 'pixel-fit', requested: { width: 32, height: 32 }, effective: { width: 32, height: 32 }, actual: null, clipped: false, converged: true, iterations: 1, notice: '' }, outline: null }
}

test('filenames describe actual canvas, active styling/dither and outlines with safe imported names', () => {
  expect(pngFilename(settings)).toBe('sphere-64x64-bands-none.png')
  const imported = { ...settings, subject: { ...settings.subject, geometry: { kind: 'imported' as const, asset: { fileName: '../Café: "dragon" /?.GLB', format: 'glb' as const, sha256: 'a'.repeat(64) } } }, canvas: { width: 96, height: 64 }, dither: { kind: 'bayer' as const, matrixSize: 4 as const, strength: 1, patternScale: 1, transitionWidth: 1 }, outline: { kind: 'silhouette' as const, color: '#000000' as const, thickness: 2 } }
  expect(pngFilename(imported)).toBe('cafe-dragon-96x64-bands-bayer4-outline2.png')
  expect(pngFilename({ ...imported, shading: { ...settings.shading, tone: { kind: 'continuous' } } })).toBe('cafe-dragon-96x64-smooth-none-outline2.png')
  expect(pngFilename({ ...settings, dither: { kind: 'floyd-steinberg', strength: 1 } })).toContain('-floyd-steinberg.png')
  expect(pngFilename({ ...settings, dither: { kind: 'blue-noise', strength: 0, patternScale: 1, transitionWidth: 1 } })).toContain('-none.png')
  expect(pngFilename({ ...imported, subject: { ...imported.subject, geometry: { ...imported.subject.geometry, asset: { ...imported.subject.geometry.asset, fileName: '🚀?.gltf' } } } })).toMatch(/^subject-/)
  expect(pngFilename({ ...imported, subject: { ...imported.subject, geometry: { ...imported.subject.geometry, asset: { ...imported.subject.geometry.asset, fileName: 'a'.repeat(200) + '.glb' } } } }).split('-')[0]).toHaveLength(64)
})

test('owned export bytes remain stable after source mutation and do not alias its storage', () => {
  const source = frame()
  source.rgba.set([17, 47, 97, 255])
  const owned = ownExportFrame(source, settings, 7, 3)
  source.rgba.fill(0)
  expect([...owned.rgba.slice(0, 4)]).toEqual([17, 47, 97, 255])
  expect(owned.rgba.buffer).not.toBe(source.rgba.buffer)
})

test('export rejects absent, stale, mismatched and malformed native frames', () => {
  for (const source of [undefined, { ...frame(), revision: 6 }, { ...frame(), captureRevision: 2 }, { ...frame(), width: 96 }, { ...frame(), height: 96 }]) {
    expect(() => ownExportFrame(source, settings, 7, 3)).toThrow('clicked revision')
  }
  expect(() => ownExportFrame({ ...frame(), rgba: new Uint8ClampedArray(4) }, settings, 7, 3)).toThrow('dimensions')
  const partial = frame(); partial.rgba[3] = 128
  expect(() => ownExportFrame(partial, settings, 7, 3)).toThrow('partial alpha')
  const hidden = frame(); hidden.rgba[0] = 1
  expect(() => ownExportFrame(hidden, settings, 7, 3)).toThrow('hidden color')
  expect(() => ownExportFrame({ ...frame(), width: 0 }, { ...settings, canvas: { width: 0, height: 64 } }, 7, 3)).toThrow('integers')
})
