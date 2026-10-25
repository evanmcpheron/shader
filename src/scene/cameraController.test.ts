// @vitest-environment jsdom

import { afterEach, expect, test, vi } from 'vitest'
import { Sphere, Vector3 } from 'three'
import { createStudioStore } from '../app/studioStore'
import { CameraController } from './cameraController'
import { cameraView, switchCameraProjection } from './referenceCamera'
import type { GroundSettings } from '../domain/settings'

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

const ground: GroundSettings = { kind: 'receiver', position: { x: 0, y: -1, z: 0 }, width: 6, depth: 6, appearance: { kind: 'visible', color: '#5C88B8' } }

test.each(['orthographic', 'perspective'] as const)('%s keyboard orbit stops above the enabled floor and resumes freely with ground off', (projection) => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientHeight: { value: 400 }, clientWidth: { value: 400 } })
  document.body.append(canvas)
  const store = createStudioStore()
  store.getState().actions.setSection('camera', switchCameraProjection(store.getState().settings.camera, projection))
  store.getState().actions.setSection('ground', ground)
  const controller = new CameraController(canvas, store)
  const down = () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', shiftKey: true, cancelable: true }))
  try {
    const before = store.getState().settings
    const distance = new Vector3().subVectors(before.camera.position, before.camera.target).length()
    for (let index = 0; index < 100; index++) {
      down()
      expect(store.getState().settings.camera.position.y).toBeGreaterThan(ground.position.y)
    }
    expect(store.getState().settings.camera.position.y).toBeCloseTo(before.camera.target.y, 5)
    expect(new Vector3().subVectors(store.getState().settings.camera.position, before.camera.target).length()).toBeCloseTo(distance, 8)
    expect(store.getState().settings.subject).toBe(before.subject)
    expect(store.getState().settings.ground).toBe(before.ground)
    expect(store.getState().settings.lighting).toBe(before.lighting)
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', shiftKey: true, cancelable: true }))
    expect(store.getState().settings.camera.position.y).toBeGreaterThan(ground.position.y + 0.01)
    store.getState().actions.setSection('ground', { kind: 'none' })
    for (let index = 0; index < 100; index++) down()
    expect(store.getState().settings.camera.position.y).toBeLessThan(ground.position.y)
  } finally { controller.dispose(); canvas.remove() }
})

test.each(['mouse', 'touch'])('%s orbit and manual pan cannot cross the floor, including in the light tool', (pointerType) => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientHeight: { value: 400 }, clientWidth: { value: 400 } })
  canvas.setPointerCapture = vi.fn()
  canvas.releasePointerCapture = vi.fn()
  document.body.append(canvas)
  const store = createStudioStore()
  store.getState().actions.setSection('ground', ground)
  store.getState().actions.setSection('framing', { ...store.getState().settings.framing, mode: 'manual' })
  store.getState().actions.setPreview({ tool: 'light' })
  const controller = new CameraController(canvas, store)
  const pointer = (type: string, y: number) => canvas.dispatchEvent(Object.assign(new MouseEvent(type, { clientX: 200, clientY: y, button: 0, bubbles: true }), { pointerId: 1, pointerType }))
  try {
    const before = store.getState().settings
    pointer('pointerdown', 200)
    pointer('pointermove', -200)
    pointer('pointerup', -200)
    expect(store.getState().settings.camera.position.y).toBeCloseTo(before.camera.target.y, 5)
    for (let index = 0; index < 100; index++) canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', cancelable: true }))
    expect(store.getState().settings.camera.position.y).toBeGreaterThan(ground.position.y)
    expect(store.getState().settings.subject).toBe(before.subject)
    expect(store.getState().settings.ground).toBe(before.ground)
  } finally { controller.dispose(); canvas.remove() }
})

test('enabling, raising and restoring ground clamps saved/numeric/preset cameras, retaining an above-floor pose', () => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientHeight: { value: 400 }, clientWidth: { value: 400 } })
  document.body.append(canvas)
  const store = createStudioStore()
  store.getState().actions.setSection('camera', cameraView(store.getState().settings.camera, 'bottom'))
  const controller = new CameraController(canvas, store)
  try {
    store.getState().actions.setSection('ground', ground)
    expect(store.getState().settings.camera.position.y).toBeGreaterThan(-1)
    store.getState().actions.setSection('camera', cameraView(store.getState().settings.camera, 'bottom'))
    expect(store.getState().settings.camera.position.y).toBeGreaterThan(-1)
    const raised = { ...ground, position: { x: 0, y: 2, z: 0 }, appearance: { kind: 'shadow-only' } } as const
    store.getState().actions.setSection('ground', raised)
    expect(store.getState().settings.camera.position.y).toBeGreaterThan(2)
    const saved = store.getState().settings
    store.getState().actions.restoreSettings({ ...saved, camera: { ...saved.camera, position: { x: 0, y: -20, z: 5 } } })
    expect(store.getState().settings.camera.position.y).toBeGreaterThan(2)
    expect(store.getState().settings.subject).toBe(saved.subject)
    expect(store.getState().settings.camera.target).toEqual(saved.camera.target)
    expect(controller.diagnostics().sourcePosition).toEqual(Object.values(store.getState().settings.camera.position))
    const revision = store.getState().revisions.settings
    controller.renderCamera(1, new Sphere())
    controller.renderCamera(2, new Sphere())
    expect(store.getState().revisions.settings).toBe(revision)
  } finally { controller.dispose(); canvas.remove() }
})
