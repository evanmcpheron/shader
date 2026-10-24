/// <reference types="node" />

import { readFile } from 'node:fs/promises'
import { Box3, Group, Mesh, Vector3 } from 'three'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { createDefaultSettings } from '../domain/defaults'
import { SceneSubject } from '../scene/subject'
import { ImportController } from './importController'
import { createLocalResolver, embeddedBytes, IMPORT_LIMITS, localPath, validateSelection } from './localFiles'
import { importDiagnostics, loadModel, ModelAsset } from './modelAsset'
import { prepareModel } from './modelDocument'

async function fixture(name: string): Promise<File> {
  const bytes = await readFile(new URL(`../../tests/fixtures/models/${name}`, import.meta.url))
  return new File([new Uint8Array(bytes)], name)
}
const binary = () => fixture('group.bin')
const signal = () => new AbortController().signal
type FixtureDocument = {
  nodes: { mesh?: number; skin?: number; children?: number[] }[]
  scenes: { nodes: number[] }[]
  meshes: { primitives: { attributes: { POSITION: number; NORMAL?: number }; mode?: number }[] }[]
  buffers: { uri: string }[]
  bufferViews: { byteLength: number }[]
  accessors: { byteOffset?: number; count: number }[]
  images?: { uri: string }[]
  textures?: { source: number }[]
  materials: { pbrMetallicRoughness: { baseColorTexture?: { index: number } } }[]
  extensionsRequired?: string[]
}
async function document(): Promise<FixtureDocument> { return JSON.parse(await (await fixture('group.gltf')).text()) }
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).buffer

beforeEach(() => {
  vi.stubGlobal('ProgressEvent', class extends Event { loaded = 0; total = 0 })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

test('local resolution accepts explicit paths, encoded names and unique basename companions', () => {
  const file = new File(['bin'], 'my buffer.bin')
  const resolve = createLocalResolver([file])
  expect(resolve('textures/my%20buffer.bin')).toBe(file)
  expect(resolve('./my buffer.bin')).toBe(file)
  expect(localPath('folder\\mesh.bin')).toBe('folder/mesh.bin')
  expect(() => resolve('missing.bin')).toThrow(/Missing companion.*missing.bin/)
  expect(() => createLocalResolver([file, file])).toThrow(/Duplicate/)
  const first = Object.assign(new File(['a'], 'same.bin'), { webkitRelativePath: 'a/same.bin' })
  const second = Object.assign(new File(['b'], 'same.bin'), { webkitRelativePath: 'b/same.bin' })
  const ambiguous = createLocalResolver([first, second])
  expect(ambiguous('a/same.bin')).toBe(first)
  expect(() => ambiguous('same.bin')).toThrow(/Ambiguous/)
})

test.each(['https://host/model.bin', '//host/model.bin', '/absolute.bin', '../outside.bin', 'a/%2e%2e/out.bin', 'blob:unselected', 'file:///tmp/a', 'a.bin?url', 'a.bin#hash', '%00.bin', '%zz'])('blocks unselected/unsafe URI %s before fetching', (uri) => {
  expect(() => localPath(uri)).toThrow()
})

test('selection and embedded data have finite inclusive byte and file caps', () => {
  const model = new File([], 'model.glb')
  const atCap = new File([new Uint8Array(IMPORT_LIMITS.bytes)], 'buffer.bin')
  expect(validateSelection([model, atCap])).toBe(model)
  expect(() => validateSelection([model, atCap, new File(['x'], 'extra.bin')])).toThrow(/25 MiB/)
  expect(() => validateSelection([])).toThrow(/Select/)
  expect(() => validateSelection([model, new File([], 'other.gltf')])).toThrow(/exactly one/)
  expect(() => validateSelection([model, ...Array.from({ length: 64 }, (_, i) => new File([], `${i}.bin`))])).toThrow(/64 files/)
  expect(embeddedBytes('data:application/octet-stream;base64,AQID')).toBe(3)
  expect(() => embeddedBytes('data:text/html;base64,AQID')).toThrow(/Unsupported/)
})

test.each(['missing.gltf', 'remote.gltf', 'compressed.gltf', 'morph.gltf', 'animated.gltf', 'malformed.glb'])('rejects fixture %s without replacing a prior scene or retaining resources', async (name) => {
  const store = createStudioStore()
  const previous = store.getState().settings
  await store.assets.select([await fixture(name), await binary()])
  expect(store.getState().settings).toBe(previous)
  expect(store.getState().modelImport.kind).toBe('error')
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})

test('preflight rejects expanded vertex/triangle caps, deformation, bad spans, cycles and depth regardless of node order', async () => {
  const base = await document()
  const resolve = createLocalResolver([await binary()])
  const cases = [
    (doc: typeof base) => { doc.nodes = Array.from({ length: 21_000 }, () => ({ mesh: 0 })) },
    (doc: typeof base) => { doc.meshes[0].primitives = Array.from({ length: 40 }, () => doc.meshes[0].primitives[0]); doc.nodes = Array.from({ length: 800 }, () => ({ mesh: 0 })); doc.scenes = [{ nodes: doc.nodes.map((_, index) => index) }] },
    (doc: typeof base) => { doc.accessors[2].count = 3; doc.meshes[0].primitives = Array.from({ length: 40 }, () => doc.meshes[0].primitives[0]); doc.nodes = Array.from({ length: 1050 }, () => ({ mesh: 0 })); doc.scenes = [{ nodes: doc.nodes.map((_, index) => index) }] },
    (doc: typeof base) => { doc.nodes[1].skin = 0 },
    (doc: typeof base) => { doc.bufferViews[0].byteLength = 999 },
    (doc: typeof base) => { doc.accessors[0].byteOffset = 1 },
    (doc: typeof base) => { doc.nodes[1].children = [0] },
    (doc: typeof base) => { doc.nodes = Array.from({ length: 65 }, (_, i) => i === 0 ? { mesh: 0 } : { children: [i - 1] }); doc.scenes = [{ nodes: [64] }] },
    (doc: typeof base) => { doc.meshes[0].primitives[0].mode = 1 },
    (doc: typeof base) => { doc.extensionsRequired = ['EXT_meshopt_compression'] },
  ]
  for (const change of cases) {
    const doc = structuredClone(base)
    change(doc)
    expect(() => prepareModel(bytes(doc), 'gltf', resolve)).toThrow()
  }
})

test.each(['group.glb', 'group.gltf'])('%s parses real static groups, preserves normals/relationships and normalizes independently', async (name) => {
  const asset = await loadModel([await fixture(name), ...(name.endsWith('gltf') ? [await binary()] : [])], signal())
  const content = asset.createContent()
  const meshes: Mesh[] = []
  content.object.traverse((node) => { if (node instanceof Mesh) meshes.push(node) })
  expect(meshes).toHaveLength(2)
  expect(meshes[0].geometry).toBe(meshes[1].geometry)
  expect(meshes[0].geometry.getAttribute('normal').getY(0)).toBe(1)
  expect(meshes[0].position.toArray()).toEqual([-2, 0, 0])
  expect(content.object.getObjectsByProperty('isCamera', true)).toHaveLength(0)
  expect(content.object.getObjectsByProperty('isLight', true)).toHaveLength(0)
  expect(JSON.parse(JSON.stringify(asset.descriptor)).asset.sha256).toMatch(/^[a-f0-9]{64}$/)
  const subject = new SceneSubject()
  subject.replaceContent(content)
  const bounds = new Box3().setFromObject(subject.parent, true)
  expect(Math.max(...bounds.getSize(new Vector3()).toArray())).toBeCloseTo(2)
  expect(bounds.getCenter(new Vector3()).length()).toBeCloseTo(0)
  expect(subject.parent.scale.toArray()).toEqual([1, 1, 1])
  const geometryDispose = vi.spyOn(meshes[0].geometry, 'dispose')
  asset.release()
  expect(geometryDispose).not.toHaveBeenCalled()
  subject.dispose()
  subject.dispose()
  expect(geometryDispose).toHaveBeenCalledTimes(1)
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})

test('embedded buffers compute missing normals and failed parsed data releases ownership', async () => {
  const doc = await document()
  doc.buffers[0].uri = `data:application/octet-stream;base64,${Buffer.from(await (await binary()).arrayBuffer()).toString('base64')}`
  delete doc.meshes[0].primitives[0].attributes.NORMAL
  const asset = await loadModel([new File([JSON.stringify(doc)], 'embedded.gltf')], signal())
  const content = asset.createContent()
  const mesh = content.object.getObjectByProperty('isMesh', true) as Mesh
  expect(mesh.geometry.getAttribute('normal').count).toBe(6)
  content.dispose()
  asset.release()
  const bad = new Uint8Array(await (await binary()).arrayBuffer())
  new DataView(bad.buffer).setFloat32(0, NaN, true)
  doc.buffers[0].uri = `data:application/octet-stream;base64,${Buffer.from(bad).toString('base64')}`
  await expect(loadModel([new File([JSON.stringify(doc)], 'bad.gltf')], signal())).rejects.toThrow(/nonfinite/)
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})

test('an export pin keeps an imported asset usable after its store and scene release it', async () => {
  const asset = await loadModel([await fixture('group.glb')], signal())
  const releasePin = asset.retain()
  asset.release()
  const content = asset.createContent()
  content.dispose()
  expect(importDiagnostics().assets).toBe(1)
  releasePin()
  releasePin()
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
  expect(() => asset.retain()).toThrow('released')
})

test('URL remapping is revoked on success and postparse failure; imported images never decode', async () => {
  const create = vi.spyOn(URL, 'createObjectURL')
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  const doc = await document()
  doc.images = [{ uri: 'texture.png' }]
  doc.textures = [{ source: 0 }]
  doc.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 }
  const asset = await loadModel([new File([JSON.stringify(doc)], 'textured.gltf'), await binary(), new File(['intentionally undecoded'], 'texture.png')], signal())
  expect(create).toHaveBeenCalledTimes(1)
  expect(revoke).toHaveBeenCalledTimes(1)
  asset.release()
  const bad = new Uint8Array(await (await binary()).arrayBuffer())
  new DataView(bad.buffer).setUint16(144, 65535, true)
  await expect(loadModel([await fixture('group.gltf'), new File([bad], 'group.bin')], signal())).rejects.toThrow(/index/)
  expect(create).toHaveBeenCalledTimes(2)
  expect(revoke).toHaveBeenCalledTimes(2)
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})

test('late and cancelled successes are released; only the newest ready model replaces the prior owner', async () => {
  const completions: ((asset: ModelAsset) => void)[] = []
  const publish = vi.fn()
  const status = vi.fn()
  const controller = new ImportController(publish, status, () => new Promise((resolve) => completions.push(resolve)))
  const releases = [vi.fn(), vi.fn(), vi.fn()]
  const assets = releases.map((release, i) => new ModelAsset({ kind: 'imported', asset: { fileName: `${i}.glb`, format: 'glb', sha256: String(i).repeat(64) } }, new Group(), release))
  const first = controller.select([])
  const second = controller.select([])
  completions[1](assets[1])
  await second
  completions[0](assets[0])
  await first
  expect(publish).toHaveBeenCalledTimes(1)
  expect(publish).toHaveBeenCalledWith(assets[1].descriptor)
  expect(releases[0]).toHaveBeenCalledTimes(1)
  expect(releases[1]).not.toHaveBeenCalled()
  const third = controller.select([])
  controller.cancel()
  completions[2](assets[2])
  await third
  expect(publish).toHaveBeenCalledTimes(1)
  expect(releases[2]).toHaveBeenCalledTimes(1)
  controller.release()
  expect(releases[1]).toHaveBeenCalledTimes(1)
})

test('store keeps settings serializable, retains a valid model after failure and releases on primitive return', async () => {
  const store = createStudioStore()
  await store.assets.select([await fixture('group.glb')])
  const settings = store.getState().settings
  expect(settings.subject.geometry.kind).toBe('imported')
  expect(JSON.stringify(settings)).not.toMatch(/blob:|Object3D|File|geometry.*attributes/)
  expect(JSON.parse(JSON.stringify(settings)).subject.geometry.asset.fileName).toBe('group.glb')
  await store.assets.select([await fixture('malformed.glb')])
  expect(store.getState().settings).toBe(settings)
  expect(store.getState().modelImport.kind).toBe('error')
  store.getState().actions.selectPrimitive('cube')
  expect(store.getState().settings.subject.geometry.kind).toBe('cube')
  expect(importDiagnostics().assets).toBe(0)
  const restored = createStudioStore(settings)
  expect(restored.assets.getAsset(settings.subject.geometry as ModelAsset['descriptor'])).toBeUndefined()
  expect(restored.getState().settings.subject.transform).toEqual(createDefaultSettings().subject.transform)
})


test('the real loader observes file-read cancellation before parsing and leaves no resources', async () => {
  const file = await fixture('group.glb')
  const original = await file.arrayBuffer()
  let complete: (bytes: ArrayBuffer) => void = () => { throw new Error('Read has not started') }
  vi.spyOn(file, 'arrayBuffer').mockImplementation(() => new Promise((resolve) => { complete = resolve }))
  const abort = new AbortController()
  const loading = loadModel([file], abort.signal)
  abort.abort()
  complete(original)
  await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})

test('vertex and triangle caps count shared mesh instances before any parse', async () => {
  const base = await document()
  const resolve = createLocalResolver([await binary()])
  for (const kind of ['vertices', 'triangles']) {
    const doc = structuredClone(base)
    doc.meshes[0].primitives = Array.from({ length: 40 }, () => doc.meshes[0].primitives[0])
    if (kind === 'vertices') doc.accessors[2].count = 3
    doc.nodes = Array.from({ length: kind === 'vertices' ? 1050 : 800 }, () => ({ mesh: 0 }))
    doc.scenes = [{ nodes: doc.nodes.map((_, index) => index) }]
    expect(() => prepareModel(bytes(doc), 'gltf', resolve)).toThrow(/250,000 vertices or 250,000 triangles/)
  }
})


test('expanded mesh-part and unused remote texture references are bounded before parse', async () => {
  const doc = await document()
  const resolve = createLocalResolver([await binary()])
  doc.images = [{ uri: 'https://example.invalid/ignored.png' }]
  expect(() => prepareModel(bytes(doc), 'gltf', resolve)).toThrow(/Remote or absolute resource blocked/)
  delete doc.images
  doc.meshes[0].primitives = Array.from({ length: 1000 }, () => doc.meshes[0].primitives[0])
  doc.nodes = [{ mesh: 0 }, { mesh: 0 }, { mesh: 0 }]
  doc.scenes = [{ nodes: [0, 1, 2] }]
  expect(() => prepareModel(bytes(doc), 'gltf', resolve)).toThrow(/2,048 mesh parts/)
})

test('missing imported restore requires matching bytes, preserves settings on mismatch and reselects without scene edits', async () => {
  const source = createStudioStore()
  await source.assets.select([await fixture('group.glb')])
  source.getState().actions.setSection('camera', { ...source.getState().settings.camera, roll: 23 })
  const settings = source.getState().settings
  const descriptor = settings.subject.geometry
  if (descriptor.kind !== 'imported') throw new Error('Expected imported fixture')
  source.assets.release()
  const restored = createStudioStore(settings)
  const revision = restored.getState().revisions.settings
  await restored.assets.select([await fixture('embedded.gltf')], descriptor)
  expect(restored.getState().modelImport).toMatchObject({ kind: 'error', message: expect.stringContaining('does not match saved model') })
  expect(restored.getState().settings).toEqual(settings)
  expect(importDiagnostics().assets).toBe(0)
  await restored.assets.select([await fixture('group.glb')], descriptor)
  expect(restored.getState().modelImport.kind).toBe('ready')
  expect(restored.getState().settings).toEqual(settings)
  expect(restored.getState().revisions.settings).toBe(revision)
  expect(restored.assets.getAsset(descriptor)).toBeDefined()
  restored.assets.release()
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})

test('atomic restore cancels an older import completion before it can replace the restored scene', async () => {
  const store = createStudioStore()
  const file = await fixture('group.glb')
  const data = await file.arrayBuffer()
  let complete: (value: ArrayBuffer) => void = () => { throw new Error('Read has not started') }
  vi.spyOn(file, 'arrayBuffer').mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
  const importing = store.assets.select([file])
  const settings = createDefaultSettings()
  expect(store.getState().actions.restoreSettings({ ...settings, camera: { ...settings.camera, roll: 32 } }).ok).toBe(true)
  complete(data)
  await importing
  expect(store.getState().settings.subject.geometry.kind).toBe('sphere')
  expect(store.getState().settings.camera.roll).toBe(32)
  expect(importDiagnostics()).toEqual({ assets: 0, urls: 0, geometries: 0, materials: 0 })
})
