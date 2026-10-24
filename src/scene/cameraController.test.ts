// @vitest-environment jsdom

import { afterEach, expect, test, vi } from 'vitest'
import { Sphere, Vector3 } from 'three'
import { createStudioStore } from '../app/studioStore'
import { CameraController } from './cameraController'
import { cameraView, switchCameraProjection } from './referenceCamera'

afterEach(() => vi.restoreAllMocks())

test('real OrbitControls publishes one validated revision per wheel event, preserves roll, and stops after disposal', () => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientHeight: { value: 400 }, clientWidth: { value: 400 } })
  document.body.append(canvas)
  const store = createStudioStore()
  store.getState().actions.setSection('framing', { ...store.getState().settings.framing, mode: 'manual' })
  const removeCanvas = vi.spyOn(canvas, 'removeEventListener')
  const addDocument = vi.spyOn(document, 'addEventListener')
  const removeDocument = vi.spyOn(document, 'removeEventListener')
  const controller = new CameraController(canvas, store)
  const settings = store.getState().settings
  expect(store.getState().revisions.settings).toBe(1)
  store.getState().actions.setSection('camera', { ...settings.camera, roll: 30 })
  const before = store.getState().revisions.settings
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
  expect(store.getState().revisions.settings).toBe(before + 1)
  expect(store.getState().settings.camera.roll).toBe(30)
  expect(store.getState().settings.camera.projection.zoom).toBeGreaterThan(1)
  expect(store.getState().settings.subject).toBe(settings.subject)
  const render = controller.renderCamera(1, new Sphere())
  const right = new Vector3(1, 0, 0).applyQuaternion(render.quaternion)
  canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', cancelable: true }))
  const pan = new Vector3().copy(store.getState().settings.camera.target)
  expect(pan.clone().normalize().dot(right)).toBeCloseTo(1, 10)
  expect(new Vector3().subVectors(store.getState().settings.camera.position, store.getState().settings.camera.target).length()).toBeCloseTo(5)
  for (const view of ['top', 'bottom'] as const) {
    store.getState().actions.setSection('camera', cameraView(store.getState().settings.camera, view))
    controller.renderCamera(1, new Sphere())
    const pose = store.getState().settings.camera
    expect(controller.diagnostics().sourcePosition).toEqual([pose.position.x, pose.position.y, pose.position.z])
    const revision = store.getState().revisions.settings
    controller.renderCamera(2, new Sphere())
    expect(store.getState().revisions.settings).toBe(revision)
  }
  store.getState().actions.setSection('camera', switchCameraProjection(store.getState().settings.camera, 'perspective'))
  expect(controller.diagnostics().sourcePosition.every(Number.isFinite)).toBe(true)
  store.getState().actions.setPreview({ tool: 'preview-pan' })
  const paused = store.getState().settings
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }))
  expect(store.getState().settings).toBe(paused)
  controller.dispose()
  controller.dispose()
  store.getState().actions.setPreview({ tool: 'camera' })
  const final = store.getState().revisions.settings
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }))
  expect(store.getState().revisions.settings).toBe(final)
  expect(removeCanvas.mock.calls.some(([name]) => name === 'wheel')).toBe(true)
  expect(removeCanvas.mock.calls.some(([name]) => name === 'pointerdown')).toBe(true)
  expect(removeCanvas.mock.calls.some(([name]) => name === 'keydown')).toBe(true)
  for (const [name, listener] of addDocument.mock.calls) {
    expect(removeDocument.mock.calls.some(([removedName, removedListener]) => name === removedName && listener === removedListener)).toBe(true)
  }
  const diagnostics = controller.diagnostics()
  store.getState().actions.resetSection('camera')
  expect(controller.diagnostics()).toEqual(diagnostics)
  canvas.remove()
})

test('pixel-fit locks pan/zoom, permits orbit, and mode switches retain pose and transforms', () => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientHeight: { value: 400 }, clientWidth: { value: 400 } })
  document.body.append(canvas)
  const store = createStudioStore()
  const controller = new CameraController(canvas, store)
  try {
    const original = store.getState().settings
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', cancelable: true }))
    expect(store.getState().settings).toBe(original)
    expect(controller.diagnostics()).toMatchObject({ panEnabled: false, zoomEnabled: false })
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', shiftKey: true, cancelable: true }))
    expect(store.getState().settings.camera.position).not.toEqual(original.camera.position)
    const orbit = store.getState().settings.camera
    store.getState().actions.setSection('framing', { ...original.framing, mode: 'manual' })
    expect(store.getState().settings.camera).toBe(orbit)
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    expect(store.getState().settings.camera.projection.zoom).toBeGreaterThan(1)
    expect(store.getState().settings.subject).toBe(original.subject)
    store.getState().actions.setSection('framing', original.framing)
    expect(controller.diagnostics()).toMatchObject({ panEnabled: false, zoomEnabled: false })
    expect(store.getState().settings.subject).toBe(original.subject)
  } finally { controller.dispose(); canvas.remove() }
})
