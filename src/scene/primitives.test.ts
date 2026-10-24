import { DoubleSide, Group, Matrix3, Mesh, Vector3 } from 'three'
import { expect, test } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { createDefaultPrimitive, createDefaultTransform } from '../domain/defaults'
import type { Primitive, PrimitiveKind } from '../domain/settings'
import { createPrimitiveGeometry } from './primitives'
import { applySubjectTransform, createPrimitiveContent, SceneSubject } from './subject'

const kinds: readonly PrimitiveKind[] = ['sphere', 'cube', 'cylinder', 'cone', 'pyramid', 'torus', 'plane']

test.each(kinds)('%s produces indexed triangles with finite positions and usable unit normals', (kind) => {
  const geometry = createPrimitiveGeometry(createDefaultPrimitive(kind))
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  expect(positions.count).toBeGreaterThan(3)
  expect(normals.count).toBe(positions.count)
  expect(geometry.index!.count % 3).toBe(0)
  for (let vertex = 0; vertex < positions.count; vertex++) {
    expect(new Vector3().fromBufferAttribute(positions, vertex).toArray().every(Number.isFinite)).toBe(true)
    expect(new Vector3().fromBufferAttribute(normals, vertex).length()).toBeCloseTo(1, 5)
  }
  for (const index of geometry.index!.array) expect(index).toBeLessThan(positions.count)
  geometry.dispose()
})

test('pyramid base has the requested XZ side length, a +Y apex and flat faces; plane is double sided', () => {
  const content = createPrimitiveContent({ kind: 'pyramid', baseSize: 4, height: 3 }, '#5C88B8')
  expect(content.object).toBeInstanceOf(Mesh)
  if (!(content.object instanceof Mesh)) throw new Error('Expected a pyramid mesh')
  content.object.geometry.computeBoundingBox()
  expect(content.object.geometry.boundingBox!.getSize(new Vector3()).toArray()).toEqual([4, 3, 4])
  expect(content.object.material.flatShading).toBe(true)
  const apex = new Vector3().fromBufferAttribute(content.object.geometry.getAttribute('position'), 0)
  expect(apex.toArray()).toEqual([0, 1.5, 0])
  const plane = createPrimitiveContent(createDefaultPrimitive('plane'), '#5C88B8')
  if (!(plane.object instanceof Mesh)) throw new Error('Expected a plane mesh')
  expect(plane.object.material.side).toBe(DoubleSide)
  content.dispose()
  plane.dispose()
})

test('dimensions change bounds and segments change actual topology, including low segment boundaries', () => {
  const cases: readonly Primitive[] = [
    { kind: 'sphere', radius: 2, widthSegments: 3, heightSegments: 2 },
    { kind: 'cube', width: 3, height: 4, depth: 5 },
    { kind: 'cylinder', radius: 2, height: 3, radialSegments: 3, heightSegments: 2 },
    { kind: 'cone', radius: 2, height: 3, radialSegments: 3, heightSegments: 2 },
    { kind: 'pyramid', baseSize: 3, height: 4 },
    { kind: 'torus', radius: 2, tubeRadius: 0.5, radialSegments: 3, tubularSegments: 3 },
    { kind: 'plane', width: 3, height: 4, widthSegments: 2, heightSegments: 3 },
  ]
  for (const primitive of cases) {
    const geometry = createPrimitiveGeometry(primitive)
    const baseline = createPrimitiveGeometry(createDefaultPrimitive(primitive.kind))
    geometry.computeBoundingBox()
    baseline.computeBoundingBox()
    expect(geometry.boundingBox!.getSize(new Vector3()).toArray()).not.toEqual(baseline.boundingBox!.getSize(new Vector3()).toArray())
    if (primitive.kind !== 'cube' && primitive.kind !== 'pyramid') expect(geometry.index!.count).not.toBe(baseline.index!.count)
    expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true)
    geometry.dispose()
    baseline.dispose()
  }
})

test.each([
  { kind: 'sphere', radius: 0, widthSegments: 64, heightSegments: 32 },
  { kind: 'cone', radius: 1, height: -1, radialSegments: 32, heightSegments: 1 },
  { kind: 'torus', radius: 1, tubeRadius: 1, radialSegments: 16, tubularSegments: 64 },
  { kind: 'plane', width: 2, height: 2, widthSegments: 1.5, heightSegments: 1 },
])('invalid primitive parameters cannot replace a valid subject: %j', (geometry) => {
  const store = createStudioStore()
  const before = store.getState()
  expect(store.getState().actions.restoreSettings({ ...before.settings, subject: { ...before.settings.subject, geometry } }).ok).toBe(false)
  expect(store.getState()).toBe(before)
})

test('subject replacement disposes geometry and material once while preserving user and normalization ownership', () => {
  const subject = new SceneSubject()
  const first = createPrimitiveContent(createDefaultPrimitive('sphere'), '#5C88B8')
  if (!(first.object instanceof Mesh)) throw new Error('Expected a mesh')
  let disposedGeometries = 0
  let disposedMaterials = 0
  first.object.geometry.addEventListener('dispose', () => disposedGeometries++)
  first.object.material.addEventListener('dispose', () => disposedMaterials++)
  subject.replaceContent(first)
  const transform = { position: { x: 1, y: -2, z: 0.5 }, rotation: { x: 30, y: 45, z: -15 }, scale: { x: -2, y: 0.5, z: 3 } }
  applySubjectTransform(subject.parent, transform)
  subject.parent.updateMatrix()
  const matrix = subject.parent.matrix.clone()
  const staticGroup = new Group()
  const groupedContent = createPrimitiveContent(createDefaultPrimitive('cube'), '#5C88B8')
  staticGroup.add(groupedContent.object)
  staticGroup.position.set(10, 20, -5)
  let groupDisposals = 0
  subject.replaceContent({ object: staticGroup, dispose: () => { groupDisposals++; groupedContent.dispose() } })
  expect(disposedGeometries).toBe(1)
  expect(disposedMaterials).toBe(1)
  expect(subject.parent.matrix.equals(matrix)).toBe(true)
  expect(subject.normalization.position.toArray()).toEqual([-10, -20, 5])
  expect(staticGroup.parent).toBe(subject.normalization)
  subject.dispose()
  subject.dispose()
  expect(groupDisposals).toBe(1)
  expect(subject.normalization.children).toHaveLength(0)
})

test('inverse-transpose normals remain perpendicular under signed nonuniform transforms', () => {
  const parent = new Group()
  applySubjectTransform(parent, { ...createDefaultTransform(), rotation: { x: 30, y: 45, z: 20 }, scale: { x: -2, y: 0.5, z: 3 } })
  parent.updateMatrixWorld()
  const normal = new Vector3(1, 1, 1).normalize().applyNormalMatrix(new Matrix3().getNormalMatrix(parent.matrixWorld))
  for (const tangent of [new Vector3(1, -1, 0), new Vector3(1, 0, -1)]) {
    expect(normal.dot(tangent.transformDirection(parent.matrixWorld))).toBeCloseTo(0, 10)
  }
})

