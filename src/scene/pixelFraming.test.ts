import { BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, OrthographicCamera, PerspectiveCamera, Sphere, Vector3 } from 'three'
import { expect, test } from 'vitest'
import { createDefaultSettings } from '../domain/defaults'
import { resolveFitBox, validateSceneSettings } from '../domain/validation'
import { measureSubjectBounds } from '../pixels/subjectBounds'
import { applyFitProjection, calibrateFit, fitScale, frameSubject, MAX_FIT_SAMPLES, projectedVertexExtents, subjectPlacement } from './pixelFraming'
import { configureOrbitCamera, deriveRenderCamera } from './referenceCamera'

const defaults = createDefaultSettings()

test('subject categories alone measure inclusive top-left bounds and exclude receiver/background', () => {
  const bytes = new Uint8Array(7 * 5 * 4)
  bytes[(1 * 7 + 2) * 4 + 3] = 255
  bytes[(3 * 7 + 4) * 4 + 3] = 255
  bytes[3] = 128
  bytes[bytes.length - 1] = 128
  expect(measureSubjectBounds(bytes, 7, 5)).toEqual({ x: 2, y: 1, width: 3, height: 3 })
  expect(measureSubjectBounds(new Uint8Array(4), 1, 1)).toBeNull()
  expect(() => measureSubjectBounds(bytes, 1, 1)).toThrow()
})

test.each([
  ['top-left', 3, 2], ['top', 17, 2], ['top-right', 32, 2],
  ['left', 3, 10], ['center', 17, 10], ['right', 32, 10],
  ['bottom-left', 3, 19], ['bottom', 17, 19], ['bottom-right', 32, 19],
] as const)('alignment %s floors odd leading margins within asymmetric padding', (alignment, x, y) => {
  const framing = { ...defaults.framing, fit: { ...defaults.framing.fit, alignment, padding: { left: 3, right: 7, top: 2, bottom: 5 } } }
  expect(subjectPlacement({ width: 71, height: 56 }, framing, { width: 32, height: 32 })).toEqual({ x, y })
  expect(subjectPlacement({ width: 71, height: 56 }, { ...framing, fit: { ...framing.fit, offset: { x: -4, y: 6 } } }, { width: 32, height: 32 })).toEqual({ x: x - 4, y: y + 6 })
})

test('clamping retains the request; empty padding and noninteger input reject atomically', () => {
  const framing = { ...defaults.framing, fit: { ...defaults.framing.fit, box: { width: 96, height: 48 }, padding: { left: 5, right: 10, top: 2, bottom: 3 } } }
  expect(resolveFitBox({ width: 64, height: 32 }, framing)).toEqual({ size: { width: 49, height: 27 }, clamped: true })
  const valid = validateSceneSettings({ ...defaults, framing })
  expect(valid.ok && valid.value.framing.fit.box).toEqual({ width: 96, height: 48 })
  expect(valid.ok && valid.notices[0].code).toBe('fit-box-clamped')
  expect(validateSceneSettings({ ...defaults, framing: { ...framing, fit: { ...framing.fit, padding: { ...framing.fit.padding, left: 54 } } } }).ok).toBe(false)
  expect(validateSceneSettings({ ...defaults, framing: { ...framing, fit: { ...framing.fit, offset: { x: 0.5, y: 0 } } } }).ok).toBe(false)
})

test('fit scale preserves non-square projected aspect in rectangular boxes', () => {
  const extents = { minX: -4, maxX: 4, minY: -1, maxY: 1, nearCrossing: false }
  expect(fitScale(extents, { width: 32, height: 48 })).toBe(4)
  expect(fitScale(extents, { width: 96, height: 8 })).toBe(4)
  expect(fitScale({ ...extents, maxY: -1 }, defaults.canvas)).toBeNull()
  expect(fitScale({ ...extents, nearCrossing: true }, defaults.canvas)).toBeNull()
})

test.each(['orthographic', 'perspective'] as const)('fit derives %s projection from transformed vertices without changing pose or transforms', (kind) => {
  const source = kind === 'orthographic' ? new OrthographicCamera() : new PerspectiveCamera()
  const render = source.clone()
  const settings = { ...defaults.camera, roll: 23, projection: kind === 'orthographic' ? defaults.camera.projection : { kind, fov: 179, zoom: 0.01 } }
  configureOrbitCamera(source, settings, 1.5)
  deriveRenderCamera(source, render, settings, new Sphere(new Vector3(), 2))
  const root = new Group()
  const mesh = new Mesh(new BoxGeometry(2, 1, 0.5))
  mesh.rotation.set(0.4, 0.6, 0.2)
  mesh.scale.set(2, 0.5, -1)
  root.add(mesh)
  const before = { source: source.toJSON(), transform: mesh.matrix.toArray(), settings: JSON.stringify(settings) }
  const canvas = { width: 96, height: 64 }
  const extents = projectedVertexExtents(root, render, canvas)!
  const scale = fitScale(extents, { width: 32, height: 24 })!
  expect(scale).toBeGreaterThan(0)
  applyFitProjection(render, render.projectionMatrix.clone(), extents, canvas, scale, 0, 0)
  const fitted = projectedVertexExtents(root, render, canvas)!
  const width = fitted.maxX - fitted.minX
  const height = fitted.maxY - fitted.minY
  expect(width / height).toBeCloseTo((extents.maxX - extents.minX) / (extents.maxY - extents.minY))
  expect(Math.max(width / 32, height / 24)).toBeCloseTo(1)
  expect(source.toJSON()).toEqual(before.source)
  expect(JSON.stringify(settings)).toBe(before.settings)
  expect(mesh.position.toArray()).toEqual([0, 0, 0])
  expect(mesh.scale.toArray()).toEqual([2, 0.5, -1])
  mesh.geometry.dispose()
})

test('projected extents exclude helper/ground meshes and detect near-plane crossings', () => {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.z = 0.5
  camera.updateMatrixWorld()
  const root = new Group()
  const subject = new Mesh(new BoxGeometry(2, 1, 2))
  const helper = new Mesh(new BoxGeometry(100, 100, 100))
  helper.layers.set(1)
  root.add(subject, helper)
  const extents = projectedVertexExtents(root, camera, defaults.canvas)
  helper.visible = false
  expect(projectedVertexExtents(root, camera, defaults.canvas)).toEqual(extents)
  expect(extents?.nearCrossing).toBe(true)
  expect(projectedVertexExtents(new Group(), camera, defaults.canvas)).toBeNull()
  subject.geometry.dispose()
  helper.geometry.dispose()
})

test('bounded correction converges on an independently quantized rectangle and terminates on empty/impossible masks', () => {
  const result = calibrateFit({ width: 32, height: 32 }, ({ scale, phaseX, phaseY }) => {
    const left = Math.ceil(32 + phaseX - 15.6 * scale - 0.5)
    const right = Math.ceil(32 + phaseX + 15.6 * scale - 0.5)
    const top = Math.ceil(32 + phaseY - 8 * scale - 0.5)
    const bottom = Math.ceil(32 + phaseY + 8 * scale - 0.5)
    return { x: left, y: top, width: right - left, height: bottom - top }
  })
  expect(result.converged).toBe(true)
  expect(result.bounds?.width).toBe(32)
  expect(result.bounds!.height).toBeLessThan(32)
  expect(result.iterations).toBeLessThanOrEqual(MAX_FIT_SAMPLES)
  const empty = calibrateFit(defaults.canvas, () => null)
  expect(empty).toMatchObject({ bounds: null, converged: false, iterations: MAX_FIT_SAMPLES })
  const impossible = calibrateFit({ width: 3, height: 3 }, () => ({ x: 0, y: 0, width: 2, height: 1 }))
  expect(impossible).toMatchObject({ converged: false, iterations: MAX_FIT_SAMPLES })
  expect(impossible.bounds).toEqual({ x: 0, y: 0, width: 2, height: 1 })
})


test('rotated triangle uses its three vertices rather than fictitious world-box corners', () => {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
  const mesh = new Mesh(geometry)
  const camera = new OrthographicCamera()
  const settings = { ...defaults.camera, roll: 45, projection: { kind: 'orthographic' as const, verticalSize: 2, zoom: 1 } }
  configureOrbitCamera(camera, settings, 1)
  const render = deriveRenderCamera(camera, camera.clone(), settings, new Sphere(new Vector3(), 2))
  const extents = projectedVertexExtents(mesh, render, defaults.canvas)!
  expect(extents.minX).toBeCloseTo(-32 / Math.sqrt(2))
  expect(extents.maxX).toBeCloseTo(32 / Math.sqrt(2))
  geometry.dispose()
})

test('near-plane singular vertices retain the depth failure reason and usable manual fallback', () => {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1))
  const camera = new PerspectiveCamera(50, 1, 0.01, 10)
  camera.position.z = 0.5
  camera.updateMatrixWorld()
  let reads = 0
  const report = frameSubject(mesh, camera, defaults, () => { reads++; return null })
  expect(report).toMatchObject({ mode: 'manual-fallback', actual: null, clipped: true, converged: false, iterations: 1 })
  expect(report.notice).toContain('near/far plane')
  expect(reads).toBe(1)
  mesh.geometry.dispose()
})
