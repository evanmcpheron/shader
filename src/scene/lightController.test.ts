// @vitest-environment jsdom

import { afterEach, expect, test, vi } from 'vitest'
import { Line, Mesh, Sphere, Vector3 } from 'three'
import { createStudioStore } from '../app/studioStore'
import { CameraController } from './cameraController'
import { LightController } from './lightController'
import { LightHandle, projectToClient, screenArcball } from './lightHandle'
import { switchCameraProjection } from './referenceCamera'
import { SCENE_LAYERS } from './subject'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

function setup() {
  const canvas = document.createElement('canvas')
  document.body.append(canvas)
  const rect = { left: 260, top: 130, width: 600, height: 400 }
  Object.defineProperties(canvas, { clientWidth: { value: rect.width }, clientHeight: { value: rect.height } })
  canvas.getBoundingClientRect = () => ({ ...rect, right: 860, bottom: 530, x: 260, y: 130, toJSON: () => rect })
  let capture: number | undefined
  canvas.setPointerCapture = (id) => { capture = id }
  canvas.hasPointerCapture = (id) => capture === id
  canvas.releasePointerCapture = () => { capture = undefined }
  const store = createStudioStore()
  const camera = new CameraController(canvas, store)
  const handle = new LightHandle()
  const update = () => handle.update(store.getState().settings.lighting, camera.renderCamera(1.5, new Sphere(new Vector3(), 2)), rect, true)
  update()
  const controller = new LightController(canvas, store, () => handle.frame, (owned) => camera.setLightGestureOwned(owned))
  const send = (type: string, x = handle.frame!.handle.x, y = handle.frame!.handle.y, id = 1) => canvas.dispatchEvent(Object.assign(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }), { pointerId: id, pointerType: 'mouse', isPrimary: true }))
  const start = () => { store.getState().actions.setPreview({ tool: 'light' }); update(); send('pointerdown') }
  const dispose = () => { controller.dispose(); camera.dispose(); handle.dispose() }
  return { canvas, store, camera, handle, controller, send, start, dispose, update, rect }
}

test.each(['orthographic', 'perspective'] as const)('%s handle projection uses the canvas offset and rolled displayed camera', (kind) => {
  const env = setup()
  const settings = env.store.getState().settings
  env.store.getState().actions.setSection('camera', { ...switchCameraProjection(settings.camera, kind), roll: 90 })
  env.update()
  const render = env.camera.renderCamera(1.5, new Sphere(new Vector3(), 2))
  const center = projectToClient(new Vector3(), render, env.rect)
  expect(center.x).toBeCloseTo(env.rect.left + env.rect.width / 2)
  expect(center.y).toBeCloseTo(env.rect.top + env.rect.height / 2)
  const right = new Vector3(1, 0, 0).applyQuaternion(render.quaternion)
  const worldRight = screenArcball(center.x + env.handle.frame!.radius, center.y, env.handle.frame!)
  expect(worldRight.dot(right)).toBeCloseTo(1, 12)
  expect(env.handle.frame!.handle.x).toBeGreaterThan(center.x)
  expect(env.handle.frame!.handle.y).toBeGreaterThan(center.y)
  const settingsBefore = env.store.getState().settings
  env.start()
  env.send('pointermove', center.x - 50, center.y - 80)
  expect(env.store.getState().settings.camera).toBe(settingsBefore.camera)
  expect(env.store.getState().settings.subject).toBe(settingsBefore.subject)
  const position = env.store.getState().settings.lighting.directional.position
  expect(new Vector3().copy(position).length()).toBeCloseTo(Math.sqrt(50), 10)
  expect(position).not.toEqual(settingsBefore.lighting.directional.position)
  expect(env.store.getState().revisions.capture).toBe(1)
  env.send('pointerup')
  expect(env.camera.diagnostics().enabled).toBe(true)
  env.dispose()
})

test.each(['pointerup', 'pointercancel', 'lostpointercapture', 'Escape', 'blur', 'dispose'])(
  '%s releases light ownership and restores camera input; cancellation rolls back the light', (ending) => {
    const env = setup()
    env.store.getState().actions.setSection('framing', { ...env.store.getState().settings.framing, mode: 'manual' })
    const before = env.store.getState().settings
    env.start()
    expect(env.camera.diagnostics()).toMatchObject({ enabled: false, lightOwnsGesture: true })
    const revisions = env.store.getState().revisions
    env.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    expect(env.store.getState().revisions).toBe(revisions)
    env.send('pointermove', 550, 240)
    const moved = env.store.getState().settings.lighting
    expect(moved).not.toEqual(before.lighting)
    if (ending === 'Escape') env.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    else if (ending === 'blur') window.dispatchEvent(new Event('blur'))
    else if (ending === 'dispose') env.controller.dispose()
    else env.send(ending)
    expect(env.controller.diagnostics().dragging).toBe(false)
    expect(env.canvas.hasPointerCapture(1)).toBe(false)
    expect(env.camera.diagnostics()).toMatchObject({ enabled: true, lightOwnsGesture: false })
    expect(env.store.getState().settings.camera).toBe(before.camera)
    expect(env.store.getState().settings.lighting).toEqual(ending === 'pointerup' || ending === 'dispose' ? moved : before.lighting)
    env.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    expect(env.store.getState().settings.camera.projection.zoom).toBeGreaterThan(1)
    env.dispose()
  },
)

test('tool/pose/numeric edits end an active gesture without undoing the external edit', () => {
  const env = setup()
  env.start()
  env.store.getState().actions.setPreview({ tool: 'preview-pan' })
  expect(env.controller.diagnostics().dragging).toBe(false)
  expect(env.camera.diagnostics().enabled).toBe(false)
  env.start()
  env.store.getState().actions.setSection('camera', { ...env.store.getState().settings.camera, roll: 35 })
  expect(env.controller.diagnostics().dragging).toBe(false)
  expect(env.camera.diagnostics().enabled).toBe(true)
  env.start()
  const lighting = env.store.getState().settings.lighting
  env.store.getState().actions.setSection('lighting', { ...lighting, ambient: { ...lighting.ambient, intensity: 0.8 } })
  expect(env.controller.diagnostics().dragging).toBe(false)
  expect(env.store.getState().settings.lighting.ambient.intensity).toBe(0.8)
  env.dispose()
})

test('a translated light target stays fixed and the original radius survives a drag and cancellation', () => {
  const env = setup()
  const { settings, actions } = env.store.getState()
  const target = { x: 1, y: -0.5, z: 0.25 }
  actions.setSection('lighting', { ...settings.lighting, directional: { ...settings.lighting.directional, target } })
  const radius = new Vector3().subVectors(settings.lighting.directional.position, target).length()
  env.start()
  env.send('pointermove', 680, 220)
  const moved = env.store.getState().settings.lighting.directional
  expect(moved.target).toEqual(target)
  expect(new Vector3().subVectors(moved.position, moved.target).length()).toBeCloseTo(radius, 12)
  env.send('pointercancel')
  expect(env.store.getState().settings.lighting.directional.position).toEqual(settings.lighting.directional.position)
  expect(env.store.getState().settings.lighting.directional.target).toEqual(target)
  env.dispose()
})

test('handle requires explicit light tool and a hit; unrelated pointers and failed capture are safe', () => {
  const env = setup()
  env.send('pointerdown')
  expect(env.controller.diagnostics().dragging).toBe(false)
  env.send('pointerup')
  env.start()
  env.send('pointermove', 450, 230, 2)
  env.send('pointerup', 450, 230, 2)
  expect(env.controller.diagnostics().dragging).toBe(true)
  env.send('pointercancel')
  env.send('pointerdown', env.rect.left + 1, env.rect.top + 1)
  expect(env.controller.diagnostics().dragging).toBe(false)
  env.send('pointerup', env.rect.left + 1, env.rect.top + 1)
  env.canvas.setPointerCapture = () => { throw new Error('Pointer no longer active') }
  env.start()
  expect(env.controller.diagnostics().dragging).toBe(false)
  expect(env.camera.diagnostics().enabled).toBe(true)
  env.dispose()
})

test('every helper descendant is excluded from subject capture and resources dispose once', () => {
  const handle = new LightHandle()
  let disposed = 0
  for (const object of handle.root.children) {
    expect(object.layers.mask).toBe(1 << SCENE_LAYERS.helper)
    expect(object.layers.isEnabled(SCENE_LAYERS.subject)).toBe(false)
    if ((object instanceof Mesh || object instanceof Line) && !Array.isArray(object.material)) {
      object.geometry.addEventListener('dispose', () => disposed++)
      object.material.addEventListener('dispose', () => disposed++)
    }
  }
  handle.dispose()
  handle.dispose()
  expect(disposed).toBe(6)
  expect(handle.root.children).toHaveLength(0)
})

test.each(['orthographic', 'perspective'] as const)('%s handle follows a zoomed, panned rectangular image in either comparison panel', (projection) => {
  const env = setup()
  const { settings, actions } = env.store.getState()
  actions.setSection('camera', { ...switchCameraProjection(settings.camera, projection), roll: 37 })
  const camera = env.camera.renderCamera(96 / 64, new Sphere(new Vector3(), 2))
  const rects = [
    { left: 61, top: 92, width: 192, height: 128 },
    { left: 512, top: 92, width: 192, height: 128 },
  ]
  const frames = rects.map((rect) => {
    env.handle.update(settings.lighting, camera, rect, true)
    return env.handle.frame!
  })
  expect(frames[1].handle.x - frames[0].handle.x).toBeCloseTo(451)
  expect(frames[1].handle.y).toBeCloseTo(frames[0].handle.y)
  const movement = frames.map((frame) => screenArcball(frame.handle.x + 13, frame.handle.y - 9, frame).toArray())
  movement[0].forEach((value, axis) => expect(value).toBeCloseTo(movement[1][axis], 12))
  env.start()
  actions.setPreview({ zoom: 2, pan: { x: 12, y: -7 } })
  expect(env.controller.diagnostics().dragging).toBe(false)
  expect(env.camera.diagnostics().lightOwnsGesture).toBe(false)
  env.dispose()
})


test('touch can acquire a light handle within a 48px target without widening mouse ownership', () => {
  const env = setup()
  env.store.getState().actions.setPreview({ tool: 'light' })
  env.update()
  const handle = env.handle.frame!.handle
  env.send('pointerdown', handle.x + 23, handle.y)
  expect(env.controller.diagnostics().dragging).toBe(false)
  env.canvas.dispatchEvent(Object.assign(new MouseEvent('pointerdown', { clientX: handle.x + 23, clientY: handle.y, button: 0, bubbles: true, cancelable: true }), { pointerId: 1, pointerType: 'touch', isPrimary: true }))
  expect(env.controller.diagnostics().dragging).toBe(true)
  env.send('pointercancel')
  expect(env.controller.diagnostics().dragging).toBe(false)
  env.dispose()
})
