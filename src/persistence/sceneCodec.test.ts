import { expect, test } from 'vitest'
import complete from '../../tests/fixtures/scenes/complete-v1.json'
import { createDefaultSettings } from '../domain/defaults'
import { validateSceneSettings } from '../domain/validation'
import { createFactoryPresets } from './factoryPresets'
import { deserializePresets, deserializeScene, serializePresets, serializeScene } from './sceneCodec'

function configured() {
  const result = validateSceneSettings(complete)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

test('complete version-1 scenes round trip every persisted category and omit transient state', () => {
  const settings = configured()
  for (const section of Object.keys(settings) as (keyof typeof settings)[]) {
    if (section !== 'schemaVersion') expect(settings[section]).not.toEqual(createDefaultSettings()[section])
  }
  expect(deserializeScene(serializeScene(settings))).toMatchObject({ ok: true, value: settings })
  expect(deserializePresets(serializePresets([{ id: 'study', name: 'My study', settings }]))).toMatchObject({ ok: true, value: [{ id: 'study', name: 'My study', settings }] })
  expect(JSON.parse(serializeScene(settings))).toEqual(settings)
  expect(() => serializeScene({ ...settings, preview: {} } as typeof settings)).toThrow('Unknown field')
})

test.each([
  '{broken', 'null', '[]', '{}', JSON.stringify({ ...complete, schemaVersion: 2 }),
  JSON.stringify({ ...complete, schemaVersion: 0 }),
  JSON.stringify({ ...complete, canvas: { width: -1, height: 64 } }),
  JSON.stringify({ ...complete, dither: { kind: 'bayer', matrixSize: 3 } }),
  JSON.stringify({ ...complete, shading: { ...complete.shading, tone: { kind: 'bands', thresholds: [0.8, 0.2, 0.5] } } }),
  JSON.stringify({ ...complete, file: 'blob:missing' }),
])('rejects corrupt, unsupported or invalid scenes: %s', text => expect(deserializeScene(text).ok).toBe(false))

test('the documented optional v1 shadow bias remains valid through repeated saves without a fabricated migration', () => {
  const shadows: Partial<typeof complete.shadows> = { ...complete.shadows }
  delete shadows.bias
  const restored = deserializeScene(JSON.stringify({ ...complete, shadows }))
  expect(restored).toMatchObject({ ok: true, value: { shadows } })
  if (restored.ok) expect(deserializeScene(serializeScene(restored.value))).toEqual(restored)
})

test.each([
  { schemaVersion: 2, presets: [] }, { schemaVersion: 0, presets: [] },
  { schemaVersion: 1, presets: [{ id: 'a', name: '', settings: complete }] },
  { schemaVersion: 1, presets: [{ id: 'a', name: 'Study', settings: complete }, { id: 'a', name: 'Other', settings: complete }] },
  { schemaVersion: 1, presets: [{ id: 'a', name: 'Study', settings: complete }, { id: 'b', name: 'study', settings: complete }] },
  { schemaVersion: 1, presets: [{ id: 'a', name: 'Study', settings: { ...complete, camera: null } }] },
  { schemaVersion: 1, presets: [], unexpected: true },
])('rejects invalid libraries atomically', library => expect(deserializePresets(JSON.stringify(library)).ok).toBe(false))

test('factory presets are complete, independent and valid', () => {
  const factories = createFactoryPresets()
  expect(factories).toHaveLength(3)
  for (const preset of factories) expect(deserializeScene(serializeScene(preset.settings))).toMatchObject({ ok: true, value: preset.settings })
  expect(factories[0].settings).toEqual(createDefaultSettings())
  expect(factories[1].settings.subject.geometry.kind).toBe('cube')
  expect(factories[2].settings.dither.kind).toBe('bayer')
  expect(createFactoryPresets()[0].settings).not.toBe(factories[0].settings)
})

test('preset library rejects reserved factory identifiers, missing fields and bounded excess input', () => {
  for (const presets of [
    [{ id: 'factory-sphere', name: 'Misleading scene', settings: complete }],
    [{ id: 'study', settings: complete }],
    Array.from({ length: 101 }, (_, index) => ({ id: `p${index}`, name: `Study ${index}`, settings: complete })),
  ]) expect(deserializePresets(JSON.stringify({ schemaVersion: 1, presets })).ok).toBe(false)
  expect(deserializeScene(' '.repeat(2_000_001)).ok).toBe(false)
})
