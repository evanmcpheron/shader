import { Box3, OrthographicCamera, Vector3 } from 'three'
import { expect, test } from 'vitest'
import { GroundReceiver } from './groundReceiver'
import type { GroundSettings } from '../domain/settings'
import { SCENE_LAYERS } from './subject'

const ground: Extract<GroundSettings, { kind: 'receiver' }> = { kind: 'receiver', position: { x: 0, y: -1, z: 0 }, width: 4, depth: 4, appearance: { kind: 'shadow-only' } }
const camera = new OrthographicCamera(-4, 4, 4, -4, 0.01, 20)
camera.position.set(0, 5, 0)
camera.up.set(0, 0, -1)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld(true)
const subject = new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5))

test('ground has independent layer/transform and disposes its own geometry/material', () => {
  const receiver = new GroundReceiver()
  let disposed = 0
  receiver.mesh.geometry.addEventListener('dispose', () => disposed++)
  receiver.mesh.material.addEventListener('dispose', () => disposed++)
  receiver.apply(ground)
  expect(receiver.mesh.layers.isEnabled(SCENE_LAYERS.subject)).toBe(false)
  expect(receiver.mesh.layers.isEnabled(SCENE_LAYERS.ground)).toBe(true)
  expect(receiver.mesh.castShadow).toBe(false)
  expect(receiver.mesh.position.toArray()).toEqual([0, -1, 0])
  receiver.apply({ kind: 'none' })
  expect(receiver.mesh.visible).toBe(false)
  receiver.dispose()
  expect(disposed).toBe(2)
})

test('shadow bounds include integer softness expansion without changing the native canvas', () => {
  const receiver = new GroundReceiver()
  receiver.apply(ground)
  const report = (radius: number) => receiver.report(ground, subject, { x: 0, y: 1, z: 0 }, camera, { width: 64, height: 64 }, true, radius)!
  const hard = report(0)
  const soft = report(4)
  expect(soft.receiverExtent).toEqual(hard.receiverExtent)
  expect(soft.shadowExtent).toEqual({ x: hard.shadowExtent!.x - 4, y: hard.shadowExtent!.y - 4, width: hard.shadowExtent!.width + 8, height: hard.shadowExtent!.height + 8 })
  expect(soft.shadowClipped).toBe(false)
  const small = { ...ground, width: 1, depth: 1 }
  receiver.apply(small)
  expect(receiver.report(small, subject, { x: 0, y: 1, z: 0 }, camera, { width: 64, height: 64 }, true, 4)!.shadowClipped).toBe(true)
  receiver.dispose()
})

test('horizontal/below-ground direction reports its pause and never invents a projected footprint', () => {
  const receiver = new GroundReceiver()
  receiver.apply(ground)
  for (const y of [0, -1]) {
    const report = receiver.report(ground, subject, { x: 1, y, z: 0 }, camera, { width: 64, height: 64 }, true)!
    expect(report.shadowExtent).toBeNull()
    expect(report.notice).toContain('pause')
  }
  receiver.dispose()
})
