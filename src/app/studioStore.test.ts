import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import type { PrimitiveKind, SceneSettings } from '../domain/settings'
import { validateSceneSettings } from '../domain/validation'
import { createDefaultPreview, createStudioStore } from './studioStore'

test('camera, object, lighting and palette edits and resets have independent boundaries', () => {
  const store = createStudioStore()
  const { actions } = store.getState()
  const defaults = createDefaultSettings()
  const camera = { ...defaults.camera, roll: 30, position: { x: 3, y: 2, z: 5 } }
  const transform = { ...defaults.subject.transform, rotation: { x: 20, y: 30, z: 40 } }
  const subject = { ...defaults.subject, transform }
  const lighting = { ...defaults.lighting, ambient: { color: '#123456' as const, intensity: 0.9 } }

  expect(actions.setSection('subject', subject).ok).toBe(true)
  expect(actions.setSection('camera', camera).ok).toBe(true)
  expect(actions.setSection('lighting', lighting).ok).toBe(true)
  expect(actions.setPaletteColors(['#111111', '#222222', '#333333', '#444444']).ok).toBe(true)
  expect(store.getState().settings.subject).toEqual(subject)

  expect(actions.resetSection('camera').ok).toBe(true)
  expect(store.getState().settings).toMatchObject({ camera: defaults.camera, subject, lighting })
  expect(actions.resetSection('palette').ok).toBe(true)
  expect(store.getState().settings.lighting).toEqual(lighting)
  expect(store.getState().settings.palette).toEqual(defaults.palette)

  actions.setPaletteColors(['#ABCDEF'])
  expect(actions.resetSection('lighting').ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(['#ABCDEF'])
  expect(store.getState().settings.lighting).toEqual(defaults.lighting)
  expect(actions.resetTransforms().ok).toBe(true)
  expect(store.getState().settings.subject.transform).toEqual(defaults.subject.transform)
  expect(store.getState().settings.camera).toEqual(defaults.camera)
})

test.each<PrimitiveKind>(['sphere', 'cube', 'cylinder', 'cone', 'pyramid', 'torus', 'plane'])('selecting %s replaces only geometry and retains intentional transforms', (kind) => {
  const store = createStudioStore()
  const { actions } = store.getState()
  const settings = store.getState().settings
  actions.setSection('subject', { ...settings.subject, transform: { ...settings.subject.transform, position: { x: 1, y: 2, z: 3 } } })
  const before = store.getState().settings
  expect(actions.selectPrimitive(kind).ok).toBe(true)
  const after = store.getState().settings
  expect(after.subject.geometry.kind).toBe(kind)
  expect(after.subject.transform).toEqual(before.subject.transform)
  expect(after.camera).toBe(before.camera)
  expect(after.lighting).toBe(before.lighting)
  expect(after.framing).toBe(before.framing)
  expect(after.palette).toBe(before.palette)
})

type RevisionCase = {
  name: string
  change: (settings: SceneSettings) => SceneSettings
  capture: number
  shadow: number
}

const revisionCases: RevisionCase[] = [
  { name: 'object position', change: (s) => ({ ...s, subject: { ...s.subject, transform: { ...s.subject.transform, position: { x: 1, y: 0, z: 0 } } } }), capture: 1, shadow: 1 },
  { name: 'geometry', change: (s) => ({ ...s, subject: { ...s.subject, geometry: { kind: 'cube', width: 2, height: 2, depth: 2 } } }), capture: 1, shadow: 1 },
  { name: 'camera roll', change: (s) => ({ ...s, camera: { ...s.camera, roll: 45 } }), capture: 1, shadow: 1 },
  { name: 'camera projection', change: (s) => ({ ...s, camera: { ...s.camera, projection: { kind: 'perspective', fov: 60, zoom: 1 } } }), capture: 1, shadow: 1 },
  { name: 'canvas', change: (s) => ({ ...s, canvas: { width: 96, height: 64 } }), capture: 1, shadow: 1 },
  { name: 'framing', change: (s) => ({ ...s, framing: { ...s.framing, fit: { ...s.framing.fit, alignment: 'left' } } }), capture: 1, shadow: 1 },
  { name: 'normal treatment', change: (s) => ({ ...s, shading: { ...s.shading, normals: 'flat' } }), capture: 1, shadow: 1 },
  { name: 'light direction', change: (s) => ({ ...s, lighting: { ...s.lighting, directional: { ...s.lighting.directional, position: { x: -3, y: 4, z: 5 } } } }), capture: 0, shadow: 1 },
  { name: 'light intensity', change: (s) => ({ ...s, lighting: { ...s.lighting, directional: { ...s.lighting.directional, intensity: 2 } } }), capture: 0, shadow: 0 },
  { name: 'ambient color', change: (s) => ({ ...s, lighting: { ...s.lighting, ambient: { ...s.lighting.ambient, color: '#FF0000' } } }), capture: 0, shadow: 0 },
  { name: 'palette', change: (s) => ({ ...s, palette: { ...s.palette, colors: ['#111111', '#222222', '#333333', '#444444'] } }), capture: 0, shadow: 0 },
  { name: 'tone mapping', change: (s) => ({ ...s, shading: { ...s.shading, tone: { kind: 'continuous' } } }), capture: 0, shadow: 0 },
  { name: 'signal', change: (s) => ({ ...s, shading: { ...s.shading, brightness: 0.5 } }), capture: 0, shadow: 0 },
  { name: 'dither', change: (s) => ({ ...s, dither: { kind: 'floyd-steinberg', strength: 1 } }), capture: 0, shadow: 0 },
  { name: 'outline', change: (s) => ({ ...s, outline: { kind: 'silhouette', color: '#000000', thickness: 1 } }), capture: 0, shadow: 0 },
  { name: 'background', change: (s) => ({ ...s, background: { kind: 'solid', color: '#FFFFFF' } }), capture: 0, shadow: 0 },
  { name: 'shadows', change: (s) => ({ ...s, shadows: { kind: 'directional', self: true, ground: true, color: '#000000', strength: 1, treatment: { kind: 'hard' } } }), capture: 0, shadow: 1 },
  { name: 'ground geometry', change: (s) => ({ ...s, ground: { kind: 'receiver', position: { x: 0, y: -1, z: 0 }, width: 10, depth: 10, appearance: { kind: 'shadow-only' } } }), capture: 1, shadow: 1 },
]

test.each(revisionCases)('$name invalidates only its dependent work', ({ change, capture, shadow }) => {
  const store = createStudioStore()
  const { settings, actions } = store.getState()
  expect(actions.restoreSettings(change(settings)).ok).toBe(true)
  expect(store.getState().revisions).toEqual({ settings: 1, capture, style: 1, shadow, view: 0 })
})

test('receiver color changes reuse geometry and shadow visibility', () => {
  const settings = createDefaultSettings()
  const ground = { kind: 'receiver', position: { x: 0, y: -1, z: 0 }, width: 10, depth: 10, appearance: { kind: 'visible', color: '#000000' } } as const
  const store = createStudioStore({ ...settings, ground })
  expect(store.getState().actions.setSection('ground', { ...ground, appearance: { kind: 'visible', color: '#FFFFFF' } }).ok).toBe(true)
  expect(store.getState().revisions).toEqual({ settings: 1, capture: 0, style: 1, shadow: 0, view: 0 })
})

test('all preview and tool edits are view-only; status never invalidates pixels', () => {
  const store = createStudioStore()
  const { settings, actions } = store.getState()
  expect(actions.setPreview({ zoom: 16, pan: { x: -12.5, y: 20 }, grid: true, checkerboard: false, mode: 'side-by-side', tool: 'light' }).ok).toBe(true)
  expect(store.getState().settings).toBe(settings)
  expect(store.getState().settings.canvas).toEqual({ width: 64, height: 64 })
  expect(store.getState().revisions).toEqual({ settings: 0, capture: 0, style: 0, shadow: 0, view: 1 })
  actions.setStatus({ kind: 'busy', operation: 'render' })
  actions.setStatus({ kind: 'error', message: 'Context unavailable' })
  expect(store.getState().revisions.view).toBe(1)
  expect(actions.resetPreview().ok).toBe(true)
  expect(store.getState().preview).toEqual(createDefaultPreview())
  expect(store.getState().settings).toBe(settings)
})

test.each([0, 0.01, 65, NaN, Infinity, -Infinity])('invalid preview zoom (%s) preserves the entire state', (zoom) => {
  const store = createStudioStore()
  const before = store.getState()
  expect(before.actions.setPreview({ zoom, grid: true }).ok).toBe(false)
  expect(store.getState()).toBe(before)
})

test('invalid or missing preview pan values cannot partially apply a view change', () => {
  const store = createStudioStore()
  const before = store.getState()
  for (const pan of [undefined, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: 1_000_001, y: 0 }]) {
    expect(before.actions.setPreview({ pan, grid: true }).ok).toBe(false)
    expect(store.getState()).toBe(before)
  }
})

test('restore publishes one coherent transition and excludes transients and runtime data from JSON', () => {
  const store = createStudioStore()
  const { actions } = store.getState()
  actions.setPreview({ zoom: 16, tool: 'preview-pan' })
  actions.setStatus({ kind: 'busy', operation: 'import' })
  const before = store.getState()
  const configured = revisionCases.reduce((settings, { change }) => change(settings), createDefaultSettings())
  const observed: SceneSettings[] = []
  const unsubscribe = store.subscribe((state) => {
    expect(validateSceneSettings(state.settings).ok).toBe(true)
    expect(state.revisions).toEqual({ settings: 1, capture: 1, style: 1, shadow: 1, view: 1 })
    observed.push(state.settings)
  })

  const input = JSON.parse(JSON.stringify(configured))
  expect(actions.restoreSettings(input).ok).toBe(true)
  expect(observed).toEqual([configured])
  expect(store.getState().preview).toBe(before.preview)
  expect(store.getState().status).toBe(before.status)
  const json = JSON.stringify(store.getState().settings)
  expect(JSON.parse(json)).toEqual(configured)
  for (const field of ['preview', 'status', 'revisions', 'actions', 'rgba', 'export']) {
    expect(Object.hasOwn(JSON.parse(json), field)).toBe(false)
  }
  input.camera.roll = 123
  expect(store.getState().settings.camera.roll).toBe(45)
  unsubscribe()
})

test('invalid and equivalent updates notify no subscribers or revisions', () => {
  const store = createStudioStore()
  const before = store.getState()
  let notifications = 0
  const unsubscribe = store.subscribe(() => { notifications += 1 })
  expect(before.actions.restoreSettings({ ...before.settings, canvas: { width: 0, height: 64 } }).ok).toBe(false)
  expect(before.actions.restoreSettings({ ...before.settings, schemaVersion: 2 }).ok).toBe(false)
  expect(before.actions.setSection('camera', { ...before.settings.camera, roll: Infinity }).ok).toBe(false)
  expect(before.actions.setPaletteColors(['#INVALID']).ok).toBe(false)
  expect(before.actions.resetScene().ok).toBe(true)
  expect(before.actions.restoreSettings(JSON.parse(JSON.stringify(before.settings))).ok).toBe(true)
  expect(before.actions.setPreview({ zoom: 8 }).ok).toBe(true)
  expect(notifications).toBe(0)
  expect(store.getState()).toBe(before)
  unsubscribe()
})

test('bounded numeric actions accept endpoints and reject invalid changes atomically', () => {
  const store = createStudioStore()
  const { actions } = store.getState()
  expect(actions.setSection('canvas', { width: 1, height: 1024 }).ok).toBe(true)
  const before = store.getState()
  for (const width of [0, 1025, 12.5, NaN, Infinity]) {
    expect(actions.setSection('canvas', { width, height: 64 }).ok).toBe(false)
    expect(store.getState()).toBe(before)
  }
  expect(actions.setSection('subject', { ...before.settings.subject, transform: { ...before.settings.subject.transform, scale: { x: 0, y: 1, z: 1 } } }).ok).toBe(false)
  expect(store.getState()).toBe(before)
})

test('palette resizing and palette/shading resets keep threshold counts valid without resetting lighting', () => {
  const store = createStudioStore()
  const { actions } = store.getState()
  const lighting = store.getState().settings.lighting
  expect(actions.setPaletteColors(['#abcdef']).ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(['#ABCDEF'])
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'bands', thresholds: [] })
  expect(actions.resetSection('shading').ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(['#ABCDEF'])
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'bands', thresholds: [] })
  expect(actions.resetSection('palette').ok).toBe(true)
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'bands', thresholds: [0.25, 0.5, 0.75] })
  const palette = store.getState().settings.palette
  expect(actions.resetSection('shading').ok).toBe(true)
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'bands', thresholds: [0.22, 0.5, 0.75] })
  expect(store.getState().settings.palette).toBe(palette)
  expect(store.getState().settings.lighting).toBe(lighting)
  expect(actions.setPaletteColors([]).ok).toBe(false)
  expect(actions.setPaletteColors(Array.from({ length: 33 }, () => '#000000' as const)).ok).toBe(false)
})

test('same-size palette edits preserve custom threshold placement', () => {
  const store = createStudioStore()
  const { settings, actions } = store.getState()
  actions.setSection('shading', { ...settings.shading, tone: { kind: 'cel', thresholds: [0.1, 0.2, 0.9] } })
  actions.setPaletteColors(['#000000', '#123456', '#789ABC', '#FFFFFF'])
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'cel', thresholds: [0.1, 0.2, 0.9] })
})

test('an isolated section reset rejects impossible cross-section constraints without changing other settings', () => {
  const settings = createDefaultSettings()
  const store = createStudioStore({ ...settings, canvas: { width: 128, height: 128 }, framing: { ...settings.framing, fit: { ...settings.framing.fit, padding: { top: 0, right: 64, bottom: 0, left: 0 } } } })
  const before = store.getState()
  expect(before.actions.resetSection('canvas')).toMatchObject({ ok: false, issues: [{ path: 'settings.framing.fit.padding' }] })
  expect(store.getState()).toBe(before)
  expect(before.actions.resetSection('framing').ok).toBe(true)
  expect(before.actions.resetSection('canvas').ok).toBe(true)
})

test('whole-scene reset restores settings in one transition and preserves the independent preview', () => {
  const configured = revisionCases.reduce((settings, { change }) => change(settings), createDefaultSettings())
  const store = createStudioStore(configured)
  const { actions } = store.getState()
  actions.setPreview({ zoom: 32, mode: 'reference', grid: true })
  const preview = store.getState().preview
  let notifications = 0
  const unsubscribe = store.subscribe(() => { notifications += 1 })
  expect(actions.resetScene().ok).toBe(true)
  expect(notifications).toBe(1)
  expect(store.getState().settings).toEqual(createDefaultSettings())
  expect(store.getState().preview).toBe(preview)
  unsubscribe()
})

test('store instances do not share state and the public API cannot bypass validated actions', () => {
  const first = createStudioStore()
  const second = createStudioStore()
  first.getState().actions.selectPrimitive('cube')
  expect(second.getState().settings.subject.geometry.kind).toBe('sphere')
  expect('setState' in first).toBe(false)
  expect(() => createStudioStore({})).toThrow('Invalid initial scene')
})

test('level resize preserves deliberate entries and thresholds atomically; generation is explicit', () => {
  const settings = createDefaultSettings()
  const custom = ['#FF0000', '#000000', '#FFFFFF', '#00FF00'] as const
  const store = createStudioStore({ ...settings, palette: { ...settings.palette, colors: custom }, shading: { ...settings.shading, tone: { kind: 'cel', thresholds: [0.12, 0.31, 0.82] } } })
  const { actions } = store.getState()
  let notifications = 0
  store.subscribe(() => { notifications++ })
  expect(actions.setShadingLevels(6).ok).toBe(true)
  expect(notifications).toBe(1)
  expect(store.getState().settings.palette.colors).toEqual([...custom, '#B8D8F0', '#B8D8F0'])
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'cel', thresholds: [0.12, 0.31, 0.82, 0.88, 0.94] })
  expect(store.getState().revisions).toMatchObject({ capture: 0, settings: 1, style: 1 })
  expect(actions.setShadingLevels(2).ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(custom.slice(0, 2))
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'cel', thresholds: [0.12] })
  const before = store.getState()
  for (const invalid of [0, 33, 2.5, NaN]) expect(actions.setShadingLevels(invalid).ok).toBe(false)
  expect(store.getState()).toBe(before)
  expect(actions.generateShadingRamp().ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(['#172038', '#B8D8F0'])
  expect(store.getState().settings.shading.tone).toBe(before.settings.shading.tone)
  expect(actions.setShadingLevels(1).ok).toBe(true)
  expect(store.getState().settings.shading.tone).toEqual({ kind: 'cel', thresholds: [] })
  expect(actions.generateShadingRamp().ok).toBe(true)
  expect(store.getState().settings.palette.colors).toEqual(['#5C88B8'])
})
