import { describe, expect, test } from 'vitest'
import { LIMITS } from './constraints'
import { CANVAS_PRESETS, createDefaultPrimitive, createDefaultSettings, PALETTE_PRESETS } from './defaults'
import type { DitherSettings, PrimitiveKind, SceneSettings } from './settings'
import { deriveLightDirection, resolveFitBox, validateColor, validateNumber, validateSceneSettings } from './validation'

function expectValid(input: unknown): SceneSettings {
  const result = validateSceneSettings(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error('Expected valid settings')
  return result.value
}

function expectInvalid(input: unknown, path: string) {
  const first = validateSceneSettings(input)
  expect(first.ok).toBe(false)
  if (first.ok) throw new Error('Expected invalid settings')
  expect(first.issues[0].path).toBe(path)
  expect(validateSceneSettings(input)).toEqual(first)
}

test('canonical defaults are complete, independent, and survive a JSON round trip', () => {
  const settings = createDefaultSettings()
  expect(expectValid(settings)).toEqual(settings)
  expect(expectValid(JSON.parse(JSON.stringify(settings)))).toEqual(settings)
  expect(settings).toMatchObject({
    schemaVersion: 1,
    subject: { geometry: { kind: 'sphere' }, transform: { rotation: { x: 0, y: 0, z: 0 } } },
    camera: { projection: { kind: 'orthographic' } },
    canvas: { width: 64, height: 64 },
    framing: { mode: 'pixel-fit', fit: { box: { width: 32, height: 32 }, alignment: 'center' } },
    shading: { normals: 'smooth', tone: { kind: 'bands', thresholds: [0.22, 0.5, 0.75] } },
    palette: { colors: ['#172038', '#304878', '#5C88B8', '#B8D8F0'] },
    dither: { kind: 'none' }, outline: { kind: 'none' }, ground: { kind: 'none' },
    shadows: { kind: 'none' }, background: { kind: 'transparent' },
  })
  const another = createDefaultSettings()
  expect(another.subject.transform.position).not.toBe(settings.subject.transform.position)
  expect(another.palette.colors).not.toBe(settings.palette.colors)
})

test.each<PrimitiveKind>(['sphere', 'cube', 'cylinder', 'cone', 'pyramid', 'torus', 'plane'])('%s has a valid serializable default descriptor', (kind) => {
  const settings = createDefaultSettings()
  const configured = { ...settings, subject: { ...settings.subject, geometry: createDefaultPrimitive(kind) } }
  expect(expectValid(JSON.parse(JSON.stringify(configured)))).toEqual(configured)
})

test.each([
  [{ kind: 'sphere', radius: 0, widthSegments: 64, heightSegments: 32 }, 'radius'],
  [{ kind: 'sphere', radius: 1, widthSegments: 2, heightSegments: 32 }, 'widthSegments'],
  [{ kind: 'sphere', radius: 1, widthSegments: 64, heightSegments: 129 }, 'heightSegments'],
  [{ kind: 'cube', width: 2, height: Infinity, depth: 2 }, 'height'],
  [{ kind: 'cone', radius: 1, height: 2, radialSegments: 3.5, heightSegments: 1 }, 'radialSegments'],
  [{ kind: 'cylinder', radius: 1, height: 2, radialSegments: 32, heightSegments: 0 }, 'heightSegments'],
  [{ kind: 'pyramid', baseSize: -1, height: 2 }, 'baseSize'],
  [{ kind: 'torus', radius: 1, tubeRadius: 1, radialSegments: 16, tubularSegments: 64 }, 'tubeRadius'],
  [{ kind: 'plane', width: 2, height: 2, widthSegments: NaN, heightSegments: 1 }, 'widthSegments'],
] as const)('rejects invalid primitive parameters: %j', (geometry, field) => {
  const settings = createDefaultSettings()
  expectInvalid({ ...settings, subject: { ...settings.subject, geometry } }, `settings.subject.geometry.${field}`)
})

test.each(Object.entries(PALETTE_PRESETS))('%s preset preserves its artist-defined sRGB order', (_, colors) => {
  const settings = createDefaultSettings()
  expect(expectValid({ ...settings, palette: { ...settings.palette, colors } }).palette.colors).toEqual(colors)
})

const canvasCases: readonly (readonly [number, number])[] = [
  ...CANVAS_PRESETS.map((size) => [size, size] as const),
  [1, 1], [1, 1024], [1024, 1], [1024, 1024], [96, 64], [64, 96],
]

test.each(canvasCases)('accepts canvas %i × %i and reports oversized fit boxes', (width, height) => {
  const settings = createDefaultSettings()
  const result = validateSceneSettings({ ...settings, canvas: { width, height } })
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.value.canvas).toEqual({ width, height })
  expect(result.value.framing.fit.box).toEqual({ width: 32, height: 32 })
  expect(result.notices.map((notice) => notice.code)).toEqual(width < 32 || height < 32 ? ['fit-box-clamped'] : [])
  expect(resolveFitBox(result.value.canvas, result.value.framing)).toEqual({
    size: { width: Math.min(32, width), height: Math.min(32, height) },
    clamped: width < 32 || height < 32,
  })
})

test.each([0, -1, 1025, 1.5, NaN, Infinity, -Infinity, '64', null])('rejects invalid dimensions (%s) without coercion or truncation', (width) => {
  expectInvalid({ ...createDefaultSettings(), canvas: { width, height: 64 } }, 'settings.canvas.width')
})

test('padding must leave a drawable area, including retained manual fit settings', () => {
  const settings = createDefaultSettings()
  const padding = { top: 0, right: 31, bottom: 63, left: 32 }
  const valid = expectValid({ ...settings, framing: { ...settings.framing, fit: { ...settings.framing.fit, padding } } })
  expect(resolveFitBox(valid.canvas, valid.framing)).toEqual({ size: { width: 1, height: 1 }, clamped: true })
  for (const mode of ['pixel-fit', 'manual']) {
    expectInvalid({ ...valid, framing: { ...valid.framing, mode, fit: { ...valid.framing.fit, padding: { ...padding, right: 32 } } } }, 'settings.framing.fit.padding')
  }
  expectInvalid({ ...valid, framing: { ...valid.framing, fit: { ...valid.framing.fit, padding: { ...padding, top: -1 } } } }, 'settings.framing.fit.padding.top')
})

test('one-color and 32-color ramps work, preserving duplicates and order', () => {
  const settings = createDefaultSettings()
  for (const count of [1, 32]) {
    const colors = Array.from({ length: count }, () => '#ABCDEF')
    const thresholds = Array.from({ length: count - 1 }, (_, index) => (index + 1) / count)
    const valid = expectValid({ ...settings, palette: { ...settings.palette, colors }, shading: { ...settings.shading, tone: { kind: 'bands', thresholds } } })
    expect(valid.palette.colors).toEqual(colors)
  }
  for (const colors of [[], Array.from({ length: 33 }, () => '#ABCDEF'), new Array(4)]) {
    const path = colors.length === 4 ? 'settings.palette.colors[0]' : 'settings.palette.colors'
    expectInvalid({ ...settings, palette: { ...settings.palette, colors } }, path)
  }
})

test.each(['#FFF', '#12345678', 'transparent', 'red', '#GGFFFF', '#aabbcc ', '', 123])('rejects invalid opaque colors (%s)', (color) => {
  const settings = createDefaultSettings()
  expectInvalid({ ...settings, palette: { ...settings.palette, colors: [color, '#304878', '#5C88B8', '#B8D8F0'] } }, 'settings.palette.colors[0]')
  expect(validateColor(color).ok).toBe(false)
})

test('normalization copies input and changes only hex casing, hash casing and negative zero', () => {
  const input = structuredClone(createDefaultSettings())
  const changed = {
    ...input,
    palette: { ...input.palette, colors: ['#aabbcc', '#304878', '#5c88b8', '#b8d8f0'] },
    subject: { ...input.subject, transform: { ...input.subject.transform, position: { x: -0, y: 0, z: 0 } } },
  }
  const normalized = expectValid(changed)
  expect(normalized.palette.colors).toEqual(['#AABBCC', '#304878', '#5C88B8', '#B8D8F0'])
  expect(Object.is(normalized.subject.transform.position.x, -0)).toBe(false)
  expect(changed.palette.colors[0]).toBe('#aabbcc')
  expect(normalized.camera.position).not.toBe(changed.camera.position)
  expect(validateColor('#00ff1a')).toEqual({ ok: true, value: '#00FF1A', notices: [] })
})

test.each([[0.5, 0.25, 0.75], [0.25, 0.25, 0.75], [0, 0.5, 0.75], [0.25, 0.5, 1], [0.5], [NaN, 0.5, 0.75], [0.25, Infinity, 0.75]])('rejects malformed threshold sequence %j', (...thresholds) => {
  const settings = createDefaultSettings()
  const result = validateSceneSettings({ ...settings, shading: { ...settings.shading, tone: { kind: 'cel', thresholds } } })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.issues[0].path).toMatch(/^settings.shading.tone.thresholds/)
})

test.each([0, -0, 0.0001, NaN, Infinity, -Infinity, 1001])('rejects degenerate or unbounded scales (%s)', (x) => {
  const settings = createDefaultSettings()
  expectInvalid({ ...settings, subject: { ...settings.subject, transform: { ...settings.subject.transform, scale: { x, y: 1, z: 1 } } } }, 'settings.subject.transform.scale.x')
})

test('negative and nonuniform scales are valid without changing camera settings', () => {
  const settings = createDefaultSettings()
  const result = expectValid({ ...settings, subject: { ...settings.subject, transform: { ...settings.subject.transform, scale: { x: -0.001, y: 2, z: 1000 } } } })
  expect(result.camera).toEqual(settings.camera)
})

test('light direction points from the target toward the source and rejects coincident endpoints', () => {
  expect(deriveLightDirection({ x: 3, y: 4, z: 0 }, { x: 0, y: 0, z: 0 })).toEqual({ ok: true, value: { x: 0.6, y: 0.8, z: 0 }, notices: [] })
  const settings = createDefaultSettings()
  const directional = settings.lighting.directional
  expectInvalid({ ...settings, lighting: { ...settings.lighting, directional: { ...directional, position: directional.target } } }, 'settings.lighting.directional')
  expectInvalid({ ...settings, camera: { ...settings.camera, position: settings.camera.target } }, 'settings.camera')
  expect(deriveLightDirection({ x: NaN, y: 0, z: 0 }, directional.target).ok).toBe(false)
  expect(deriveLightDirection({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }).ok).toBe(false)
  const defaults = deriveLightDirection(directional.position, directional.target)
  expect(defaults.ok && defaults.value.x > 0 && defaults.value.y > 0).toBe(true)
})

test('camera, lighting and signal bounds reject invalid numeric values', () => {
  const settings = createDefaultSettings()
  for (const fov of [0, 180, NaN, Infinity]) {
    expectInvalid({ ...settings, camera: { ...settings.camera, projection: { kind: 'perspective', fov, zoom: 1 } } }, 'settings.camera.projection.fov')
  }
  expectInvalid({ ...settings, camera: { ...settings.camera, projection: { kind: 'orthographic', verticalSize: 4, zoom: 0 } } }, 'settings.camera.projection.zoom')
  expectInvalid({ ...settings, lighting: { ...settings.lighting, ambient: { color: '#FFFFFF', intensity: -1 } } }, 'settings.lighting.ambient.intensity')
  expectInvalid({ ...settings, shading: { ...settings.shading, brightness: 2 } }, 'settings.shading.brightness')
  expectInvalid({ ...settings, shading: { ...settings.shading, contrast: NaN } }, 'settings.shading.contrast')
  expectInvalid({ ...settings, shading: { ...settings.shading, distribution: 0 } }, 'settings.shading.distribution')
})

test('import descriptors validate identifiers without accepting resource objects or URLs', () => {
  const settings = createDefaultSettings()
  const asset = { fileName: 'subject.glb', format: 'glb', sha256: 'A'.repeat(64) }
  const normalized = expectValid({ ...settings, subject: { ...settings.subject, geometry: { kind: 'imported', asset } } })
  expect(normalized.subject.geometry).toEqual({ kind: 'imported', asset: { ...asset, sha256: 'a'.repeat(64) } })
  for (const sha256 of ['', 'bad-hash', 'z'.repeat(64)]) {
    expectInvalid({ ...settings, subject: { ...settings.subject, geometry: { kind: 'imported', asset: { ...asset, sha256 } } } }, 'settings.subject.geometry.asset.sha256')
  }
  expectInvalid({ ...settings, subject: { ...settings.subject, geometry: { kind: 'imported', asset: { ...asset, url: 'blob:runtime-only' } } } }, 'settings.subject.geometry.asset.url')
})

describe('algorithm-specific data and complete nondefault scene round trips', () => {
  const dithers: readonly DitherSettings[] = [
    { kind: 'none' },
    ...([2, 4, 8] as const).map((matrixSize) => ({ kind: 'bayer' as const, matrixSize, strength: 1, patternScale: 8, transitionWidth: 0.5 })),
    { kind: 'blue-noise', strength: 0, patternScale: 1, transitionWidth: 1 },
    { kind: 'floyd-steinberg', strength: 0.75 },
  ]

  test.each(dithers)('$kind retains only its supported settings', (dither) => {
    const defaults = createDefaultSettings()
    const configured: SceneSettings = {
      ...defaults,
      subject: {
        geometry: { kind: 'imported', asset: { fileName: 'reference.gltf', format: 'gltf', sha256: 'a'.repeat(64) } },
        transform: { position: { x: 1, y: -2, z: 3 }, rotation: { x: -90, y: 30, z: 360 }, scale: { x: 2, y: 0.5, z: -1 } },
      },
      camera: { position: { x: 3, y: 5, z: -2 }, target: { x: 1, y: 2, z: 0 }, roll: 35, projection: { kind: 'perspective', fov: 55, zoom: 2 } },
      lighting: { directional: { position: { x: -3, y: 5, z: 2 }, target: { x: 1, y: 0, z: 0 }, color: '#123456', intensity: 3 }, ambient: { color: '#654321', intensity: 0.5 } },
      canvas: { width: 96, height: 64 },
      framing: { mode: 'manual', fit: { box: { width: 50, height: 25 }, alignment: 'bottom-right', offset: { x: 3, y: -4 }, padding: { top: 1, right: 2, bottom: 3, left: 4 } } },
      shading: { normals: 'flat', tone: { kind: 'cel', thresholds: [0.1, 0.4, 0.9] }, brightness: -0.2, contrast: 2, distribution: 0.5, baseColor: '#567890', shadowColor: '#123456', highlightColor: '#ABCDEF' },
      palette: { colors: ['#111111', '#CC0000', '#0066AA', '#EEEEEE'], effectPolicy: 'strict' },
      dither, outline: { kind: 'silhouette', thickness: 8, color: '#000000' },
      ground: { kind: 'receiver', position: { x: 1, y: -2, z: 3 }, width: 8, depth: 10, appearance: { kind: 'visible', color: '#112233' } },
      shadows: { kind: 'directional', self: true, ground: true, strength: 0.8, color: '#112244', treatment: { kind: 'pixel-soft', radius: 4 } },
      background: { kind: 'solid', color: '#998877' },
    }
    expect(expectValid(JSON.parse(JSON.stringify(configured)))).toEqual(configured)
    expect(expectValid({ ...configured, shading: { ...configured.shading, tone: { kind: 'palette' } }, ground: { ...configured.ground, appearance: { kind: 'shadow-only' } }, shadows: { ...configured.shadows, treatment: { kind: 'hard' } } })).toMatchObject({ shading: { tone: { kind: 'palette' } } })
    expectValid({ ...configured, shading: { ...configured.shading, tone: { kind: 'continuous' } } })
  })
})

test.each([
  { kind: 'none', strength: 1 },
  { kind: 'floyd-steinberg', strength: 1, patternScale: 1 },
  { kind: 'bayer', matrixSize: 3, strength: 1, patternScale: 1, transitionWidth: 1 },
  { kind: 'blue-noise', strength: 1.01, patternScale: 1, transitionWidth: 1 },
  { kind: 'blue-noise', strength: 1, patternScale: 0, transitionWidth: 1 },
  { kind: 'blue-noise', strength: 1, patternScale: 1.5, transitionWidth: 1 },
  { kind: 'blue-noise', strength: 1, patternScale: 8, transitionWidth: Infinity },
])('rejects irrelevant or invalid dither fields: %j', (dither) => {
  expect(validateSceneSettings({ ...createDefaultSettings(), dither }).ok).toBe(false)
})

test('declared numeric bounds are inclusive and never silently clamp custom values', () => {
  expect(validateNumber(1, LIMITS.canvasAxis)).toMatchObject({ ok: true, value: 1 })
  expect(validateNumber(1024, LIMITS.canvasAxis)).toMatchObject({ ok: true, value: 1024 })
  expect(validateNumber(11, { min: 2, max: 10 }).ok).toBe(false)
  expect(validateNumber(5, { min: 10, max: 2 }).ok).toBe(false)
  expect(validateNumber(5, { min: 0, max: Infinity }).ok).toBe(false)
})

test('untrusted input cannot bring runtime resources, unknown fields or unsupported schemas into settings', () => {
  const settings = createDefaultSettings()
  for (const value of [null, [], new Date(), 'settings']) expectInvalid(value, 'settings')
  expectInvalid({ ...settings, schemaVersion: 2 }, 'settings.schemaVersion')
  expectInvalid({ ...settings, preview: {} }, 'settings.preview')
  expectInvalid({ ...settings, revisions: {} }, 'settings.revisions')
  expectInvalid({ ...settings, export: { width: 128 } }, 'settings.export')
  expectInvalid({ ...settings, subject: { ...settings.subject, file: new Blob() } }, 'settings.subject.file')
  expectInvalid({ ...settings, camera: { ...settings.camera, roll: () => 0 } }, 'settings.camera.roll')
  expectInvalid({ ...settings, background: { kind: 'solid' } }, 'settings.background.color')
})
