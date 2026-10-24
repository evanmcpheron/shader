import { expect, test } from 'vitest'
import { Vector3 } from 'three'
import { createStudioStore } from '../app/studioStore'
import { createDefaultSettings } from './defaults'
import { createLightingPreset, decodeSrgb, deriveLighting, lambertIllumination, LIGHT_PRESETS } from './lighting'
import { deriveLightDirection, validateSceneSettings } from './validation'
import { ReferenceLighting } from '../scene/referenceLighting'

test('surface-to-source sign follows position minus target and ignores translation/distance', () => {
  const result = deriveLightDirection({ x: 4, y: 2, z: -3 }, { x: 1, y: 2, z: -3 })
  expect(result).toMatchObject({ ok: true, value: { x: 1, y: 0, z: 0 } })
  const settings = createLightingPreset('side')
  const light = deriveLighting(settings)
  if (!light.ok) throw new Error('Invalid fixture')
  expect(lambertIllumination({ x: 1, y: 0, z: 0 }, light.value)).toEqual({ r: 1.2, g: 1.2, b: 1.2 })
  for (const normal of [{ x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]) {
    expect(lambertIllumination(normal, light.value)).toEqual({ r: 0.2, g: 0.2, b: 0.2 })
  }
  expect(deriveLighting({ ...settings, directional: { ...settings.directional, position: { x: 50, y: 0, z: 0 } } })).toEqual(light)
})

test.each([NaN, Infinity, -Infinity, -1, 10.01])('rejects invalid energy %s atomically', (intensity) => {
  const store = createStudioStore()
  const before = store.getState()
  for (const group of ['directional', 'ambient'] as const) {
    const lighting = { ...before.settings.lighting, [group]: { ...before.settings.lighting[group], intensity } }
    expect(deriveLighting(lighting).ok).toBe(false)
    expect(before.actions.setSection('lighting', lighting).ok).toBe(false)
    expect(store.getState()).toBe(before)
  }
})

test('zero/near-zero or nonfinite directions reject; exact minimum remains usable', () => {
  const settings = createDefaultSettings()
  const target = settings.lighting.directional.target
  for (const position of [target, { x: 1e-7, y: 0, z: 0 }, { x: NaN, y: 0, z: 0 }, { x: 0, y: Infinity, z: 0 }]) {
    expect(deriveLighting({ ...settings.lighting, directional: { ...settings.lighting.directional, position } }).ok).toBe(false)
    expect(deriveLightDirection(position, target).ok).toBe(false)
  }
  expect(deriveLightDirection({ x: 1e-6, y: 0, z: 0 }, target)).toMatchObject({ ok: true, value: { x: 1, y: 0, z: 0 } })
})

test('linear RGB illumination preserves colored ambient, zero endpoints and bounded high energy', () => {
  expect(decodeSrgb('#808080').r).toBeCloseTo(0.2158605001, 9)
  expect(decodeSrgb('#000A00').g).toBeCloseTo(10 / 255 / 12.92, 12)
  const settings = createLightingPreset('side')
  const light = deriveLighting({ directional: { ...settings.directional, color: '#FF0000', intensity: 10 }, ambient: { color: '#0000FF', intensity: 10 } })
  if (!light.ok) throw new Error('Invalid fixture')
  expect(lambertIllumination({ x: 1, y: 0, z: 0 }, light.value)).toEqual({ r: 10, g: 0, b: 10 })
  expect(lambertIllumination({ x: -1, y: 0, z: 0 }, light.value)).toEqual({ r: 0, g: 0, b: 10 })
  const dark = deriveLighting({ directional: { ...settings.directional, intensity: 0 }, ambient: { color: '#FFFFFF', intensity: 0 } })
  if (!dark.ok) throw new Error('Invalid fixture')
  expect(lambertIllumination({ x: 1, y: 0, z: 0 }, dark.value)).toEqual({ r: 0, g: 0, b: 0 })
})

test.each(LIGHT_PRESETS)('%s preset and lighting reset preserve all other sections and capture data', (preset) => {
  const store = createStudioStore()
  const { actions } = store.getState()
  actions.selectPrimitive('cube')
  actions.setSection('camera', { ...store.getState().settings.camera, roll: 45 })
  const before = store.getState()
  const lighting = createLightingPreset(preset)
  expect(validateSceneSettings({ ...before.settings, lighting }).ok).toBe(true)
  expect(actions.setSection('lighting', lighting).ok).toBe(true)
  const after = store.getState()
  expect({ ...after.settings, lighting: before.settings.lighting }).toEqual(before.settings)
  expect(after.settings.subject).toBe(before.settings.subject)
  expect(after.settings.camera).toBe(before.settings.camera)
  expect(after.settings.palette).toBe(before.settings.palette)
  expect(after.revisions.capture).toBe(before.revisions.capture)
  expect(actions.resetSection('lighting').ok).toBe(true)
  expect(store.getState().settings).toEqual({ ...before.settings, lighting: createDefaultSettings().lighting })
})

test('flat ambient removes normal-dependent contrast without disabling the directional pose', () => {
  const light = deriveLighting(createLightingPreset('flat-ambient'))
  if (!light.ok) throw new Error('Invalid fixture')
  for (const normal of [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0)]) {
    expect(lambertIllumination(normal, light.value)).toEqual({ r: 1, g: 1, b: 1 })
  }
})

test('reference adapter cancels Three Lambert PI normalization and uses the shared linear energies', () => {
  const light = new ReferenceLighting()
  const settings = createLightingPreset('upper-left')
  light.apply({ ...settings, directional: { ...settings.directional, color: '#808080', intensity: 2 } })
  expect(light.directional.position.clone().normalize().x).toBeLessThan(0)
  expect(light.directional.color.r * light.directional.intensity / Math.PI).toBeCloseTo(2 * 0.2158605001, 9)
  expect(light.ambient.color.r * light.ambient.intensity / Math.PI).toBeCloseTo(0.2, 12)
  expect(light.directional.castShadow).toBe(false)
  light.dispose()
  expect(light.root.children).toHaveLength(0)
})
