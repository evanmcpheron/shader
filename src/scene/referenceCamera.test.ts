import { OrthographicCamera, PerspectiveCamera, Quaternion, Sphere, Vector3 } from 'three'
import { expect, test } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { createDefaultSettings } from '../domain/defaults'
import { validateSceneSettings } from '../domain/validation'
import { CAMERA_VIEWS, cameraDistance, cameraView, configureOrbitCamera, deriveRenderCamera, reframeCamera, switchCameraProjection } from './referenceCamera'
import type { CameraSettings } from '../domain/settings'

function renderCamera(settings: CameraSettings, aspect = 1, bounds = new Sphere(new Vector3(), 2)) {
  const source = settings.projection.kind === 'orthographic' ? new OrthographicCamera() : new PerspectiveCamera()
  const render = source.clone()
  configureOrbitCamera(source, settings, aspect)
  deriveRenderCamera(source, render, settings, bounds)
  return { source, render }
}

test.each(CAMERA_VIEWS)('%s view retains target/distance/roll and renders finite, orthonormal axes including exact poles', (view) => {
  const original = { ...createDefaultSettings().camera, target: { x: 1, y: -2, z: 3 }, roll: 30 }
  const before = JSON.stringify(original)
  const settings = cameraView(original, view)
  const { source, render } = renderCamera(settings)
  expect(settings.target).toEqual(original.target)
  expect(settings.roll).toBe(30)
  expect(cameraDistance(settings)).toBeCloseTo(cameraDistance(original), 12)
  expect([...render.matrixWorld.elements, ...render.projectionMatrix.elements].every(Number.isFinite)).toBe(true)
  const direction = new Vector3().subVectors(settings.target, settings.position).normalize()
  expect(source.getWorldDirection(new Vector3()).distanceTo(direction)).toBeLessThan(1e-12)
  expect(render.quaternion.length()).toBeCloseTo(1, 12)
  const relative = source.quaternion.clone().invert().multiply(render.quaternion)
  expect(relative.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 6))).toBeLessThan(1e-7)
  if (view === 'top' || view === 'bottom') {
    expect(settings.position.x).toBe(settings.target.x)
    expect(settings.position.z).toBe(settings.target.z)
    const up = new Vector3(0, 1, 0).applyQuaternion(source.quaternion)
    expect(up.distanceTo(new Vector3(0, 0, view === 'top' ? -1 : 1))).toBeLessThan(1e-12)
  }
  expect(JSON.stringify(original)).toBe(before)
})

test.each([0.25, 1, 3])('projection conversion matches target-plane screen coordinates at aspect %s', (aspect) => {
  const original = cameraView({ ...createDefaultSettings().camera, roll: 30 }, 'isometric')
  const perspective = switchCameraProjection(original, 'perspective')
  const roundtrip = switchCameraProjection(perspective, 'orthographic')
  const cameras = [original, perspective, roundtrip].map((settings) => renderCamera(settings, aspect).render)
  const right = new Vector3(1, 0, 0).applyQuaternion(cameras[0].quaternion)
  const up = new Vector3(0, 1, 0).applyQuaternion(cameras[0].quaternion)
  for (const point of [right.multiplyScalar(0.6), up.multiplyScalar(0.4)]) {
    const points = cameras.map((camera) => point.clone().project(camera))
    for (const projected of points.slice(1)) {
      expect(projected.x).toBeCloseTo(points[0].x, 12)
      expect(projected.y).toBeCloseTo(points[0].y, 12)
    }
  }
  expect(perspective.target).toEqual(original.target)
  expect(cameras[1].quaternion.angleTo(cameras[0].quaternion)).toBeLessThan(1e-7)
})

test('FOV and zoom change manual projection without fitting it back; render derivation leaves source untouched', () => {
  const settings: CameraSettings = { ...createDefaultSettings().camera, roll: 30, projection: { kind: 'perspective', fov: 50, zoom: 1 } }
  const { source, render } = renderCamera(settings)
  const sourceBefore = JSON.stringify(source.toJSON())
  const first = new Vector3(1, 0, 0).project(render).x
  const wide = renderCamera({ ...settings, projection: { kind: 'perspective', fov: 90, zoom: 1 } }).render
  const zoom = renderCamera({ ...settings, projection: { kind: 'perspective', fov: 50, zoom: 2 } }).render
  expect(new Vector3(1, 0, 0).project(wide).x).toBeLessThan(first)
  expect(new Vector3(1, 0, 0).project(zoom).x).toBeCloseTo(first * 2)
  deriveRenderCamera(source, render, settings, new Sphere(new Vector3(100, 20, -50), 200))
  expect(JSON.stringify(source.toJSON())).toBe(sourceBefore)
})

test('near/far and matrices stay valid across depth, distance, FOV and orthographic extent boundaries', () => {
  for (const distance of [0.000001, 5, 10_000]) {
    for (const radius of [0.000001, 1, 1_000_000]) {
      const base = { ...createDefaultSettings().camera, position: { x: 0, y: 0, z: distance } }
      for (const projection of [
        { kind: 'orthographic', verticalSize: 0.001, zoom: 100 },
        { kind: 'orthographic', verticalSize: 1000, zoom: 0.01 },
        { kind: 'perspective', fov: 1, zoom: 100 },
        { kind: 'perspective', fov: 179, zoom: 0.01 },
      ] as const) {
        const { render } = renderCamera({ ...base, projection }, 0.25, new Sphere(new Vector3(), radius))
        expect(render.near).toBeGreaterThan(0)
        expect(render.far).toBeGreaterThan(render.near)
        expect([...render.projectionMatrix.elements, ...render.projectionMatrixInverse.elements].every(Number.isFinite)).toBe(true)
      }
    }
  }
})

test('explicit reframe fits representable sizes and reports out-of-domain camera poses atomically', () => {
  const store = createStudioStore()
  for (const radius of [0.000001, 1, 100, 1_000_000]) {
    const camera = reframeCamera(store.getState().settings.camera, new Sphere(new Vector3(), radius), 0.5)
    expect(store.getState().actions.setSection('camera', camera).ok).toBe(true)
    const { render } = renderCamera(camera, 0.5, new Sphere(new Vector3(), radius))
    expect(Math.abs(new Vector3(radius, 0, 0).project(render).x)).toBeLessThan(1)
  }
  const before = store.getState()
  const impossible = reframeCamera(before.settings.camera, new Sphere(new Vector3(), 1_000_000_000_000), 1)
  expect(store.getState().actions.setSection('camera', impossible).ok).toBe(false)
  expect(store.getState()).toBe(before)
})

test('nonzero rolled orbit pose serializes once, restores and resets camera in isolation', () => {
  const store = createStudioStore()
  store.getState().actions.selectPrimitive('cube')
  const original = store.getState().settings
  const camera = cameraView({ ...original.camera, roll: 30 }, 'top')
  expect(store.getState().actions.setSection('camera', camera).ok).toBe(true)
  expect(store.getState().settings.subject).toBe(original.subject)
  const json = JSON.stringify(store.getState().settings)
  expect(validateSceneSettings(JSON.parse(json)).ok).toBe(true)
  const restored = createStudioStore()
  restored.getState().actions.restoreSettings(JSON.parse(json))
  expect(restored.getState().settings.camera).toEqual(camera)
  expect(renderCamera(restored.getState().settings.camera).render.quaternion.toArray()).toEqual(renderCamera(camera).render.quaternion.toArray())
  store.getState().actions.resetSection('camera')
  expect(store.getState().settings).toEqual(original)
})


test('expanded camera-only bounds retain geometry/light limits and reject singular or unrepresentable conversions', () => {
  const store = createStudioStore()
  const settings = store.getState().settings
  for (const value of [0, -1, NaN, Infinity, 100_000_001]) {
    expect(store.getState().actions.setSection('camera', { ...settings.camera, projection: { kind: 'orthographic', verticalSize: value, zoom: 1 } }).ok).toBe(false)
  }
  expect(store.getState().actions.setSection('camera', { ...settings.camera, position: { x: 100_000_001, y: 0, z: 0 } }).ok).toBe(false)
  const unrepresentable: CameraSettings = { ...settings.camera, projection: { kind: 'orthographic', verticalSize: 100_000_000, zoom: 0.01 } }
  expect(store.getState().actions.setSection('camera', unrepresentable).ok).toBe(true)
  const before = store.getState()
  expect(store.getState().actions.setSection('camera', switchCameraProjection(unrepresentable, 'perspective')).ok).toBe(false)
  expect(store.getState()).toBe(before)
  expect(store.getState().actions.setSection('subject', { ...settings.subject, transform: { ...settings.subject.transform, position: { x: 10_001, y: 0, z: 0 } } }).ok).toBe(false)
})
