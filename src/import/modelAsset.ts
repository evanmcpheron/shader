import { Box3, BufferGeometry, LoadingManager, Material, Mesh, MeshLambertMaterial, Texture, Vector3 } from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { ImportedSubject } from '../domain/settings'
import type { SubjectContent } from '../scene/subject'
import { createLocalResolver, IMPORT_LIMITS, validateSelection } from './localFiles'
import { prepareModel } from './modelDocument'

const counters = { assets: 0, urls: 0, geometries: 0, materials: 0 }
export function importDiagnostics() { return { ...counters } }

export class ModelAsset {
  readonly descriptor: ImportedSubject
  private readonly root: Object3D
  private readonly releaseResources: () => void
  private references = 1

  constructor(descriptor: ImportedSubject, root: Object3D, release: () => void) {
    this.descriptor = descriptor
    this.root = root
    this.releaseResources = release
    counters.assets++
  }

  createContent(): SubjectContent {
    const release = this.retain()
    try { return { object: this.root.clone(true), normalizeSize: true, dispose: release } }
    catch (error) { release(); throw error }
  }

  retain(): () => void {
    if (this.references < 1) throw new Error('This model was released. Reselect the local files.')
    this.references++
    let released = false
    return () => {
      if (released) return
      released = true
      this.release()
    }
  }

  release(): void {
    if (this.references < 1) return
    if (--this.references === 0) { this.releaseResources(); counters.assets-- }
  }
}

class ModelResources {
  readonly geometries = new Set<BufferGeometry>()
  readonly materials = new Set<Material>()
  private disposed = false

  collect(root: Object3D): void {
    root.traverse((node) => {
      if (!(node instanceof Mesh)) return
      this.geometries.add(node.geometry)
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) this.materials.add(material)
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    const textures = new Set<Texture>()
    const bitmaps = new Set<ImageBitmap>()
    for (const material of this.materials) {
      for (const value of Object.values(material)) {
        if (!(value instanceof Texture)) continue
        textures.add(value)
        if (typeof ImageBitmap !== 'undefined' && value.source.data instanceof ImageBitmap) bitmaps.add(value.source.data)
      }
      material.dispose()
    }
    for (const texture of textures) texture.dispose()
    for (const bitmap of bitmaps) bitmap.close()
    for (const geometry of this.geometries) geometry.dispose()
  }
}

function checkMeshes(root: Object3D): void {
  let vertices = 0
  let triangles = 0
  let nodes = 0
  root.updateWorldMatrix(true, true)
  root.traverse((node) => {
    if (++nodes > IMPORT_LIMITS.nodes + IMPORT_LIMITS.primitives + 1) throw new Error('Parsed scene exceeds the node limit.')
    if (!node.matrixWorld.elements.every(Number.isFinite)) throw new Error('Model transforms exceed finite world coordinates.')
    if (!(node instanceof Mesh)) return
    if ('isSkinnedMesh' in node || node.morphTargetInfluences?.length) throw new Error('Deformed meshes are unsupported. Export static geometry.')
    const determinant = node.matrixWorld.determinant()
    if (!Number.isFinite(determinant) || determinant === 0) throw new Error('Mesh has a singular or excessive transform. Apply a nonzero static scale before export.')
    const geometry = node.geometry
    const position = geometry.getAttribute('position')
    vertices += position.count
    triangles += (geometry.index?.count ?? position.count) / 3
    if (vertices > IMPORT_LIMITS.vertices || triangles > IMPORT_LIMITS.triangles) throw new Error('Parsed mesh exceeds 250,000 vertices or triangles.')
    const point = new Vector3()
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index)
      if (![point.x, point.y, point.z].every((n) => Number.isFinite(n) && Math.abs(n) <= 1e12)) throw new Error('Mesh contains nonfinite or excessive coordinates.')
    }
    const indices = geometry.index
    if (indices) for (let index = 0; index < indices.count; index++) if (indices.getX(index) >= position.count) throw new Error('Mesh triangle index is outside its vertex buffer.')
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals()
    const normal = geometry.getAttribute('normal')
    for (let index = 0; index < normal.count; index++) {
      point.fromBufferAttribute(normal, index)
      if (![point.x, point.y, point.z].every((n) => Number.isFinite(n) && Math.abs(n) <= 1e12) || point.lengthSq() < 1e-20) throw new Error('Mesh has invalid normals or degenerate triangles. Repair it before import.')
    }
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
  })
  const bounds = new Box3().setFromObject(root, true)
  const extent = bounds.getSize(new Vector3()).length()
  if (!vertices || !Number.isFinite(extent) || extent < 1e-8 || extent > 1e12) throw new Error('The selected scene has empty, degenerate or excessive bounds.')
}

export async function loadModel(files: readonly File[], signal: AbortSignal): Promise<ModelAsset> {
  const model = validateSelection(files)
  const resolve = createLocalResolver(files)
  const format = /\.glb$/i.test(model.name) ? 'glb' : 'gltf'
  const manager = new LoadingManager()
  const urls = new Map<string, string>()
  const resources = new ModelResources()
  const pending: Promise<unknown>[] = []
  const abort = () => manager.abort()
  signal.addEventListener('abort', abort)
  manager.setURLModifier((uri) => {
    signal.throwIfAborted()
    if (uri.startsWith('data:')) return uri
    let url = urls.get(uri)
    if (!url) {
      url = URL.createObjectURL(resolve(uri))
      urls.set(uri, url)
      counters.urls++
    }
    return url
  })
  try {
    signal.throwIfAborted()
    const bytes = await model.arrayBuffer()
    signal.throwIfAborted()
    const document = prepareModel(bytes, format, resolve)
    const hashes: string[] = []
    for (const file of [...files].sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name))) {
      signal.throwIfAborted()
      const digest = await crypto.subtle.digest('SHA-256', file === model ? bytes : await file.arrayBuffer())
      hashes.push(`${file.webkitRelativePath || file.name}:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`)
    }
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(hashes)))
    signal.throwIfAborted()
    const loader = new GLTFLoader(manager)
    loader.register((parser) => {
      const loadMaterial = parser.loadMaterial.bind(parser)
      parser.loadMaterial = (index) => {
        const promise = loadMaterial(index).then((material) => { resources.materials.add(material); return material })
        pending.push(promise)
        return promise
      }
      const loadGeometries = parser.loadGeometries.bind(parser)
      parser.loadGeometries = (...args) => {
        const promise = loadGeometries(...args).then((geometries) => {
          geometries.forEach((geometry) => resources.geometries.add(geometry))
          return geometries
        })
        pending.push(promise)
        return promise
      }
      const loadMesh = parser.loadMesh.bind(parser)
      parser.loadMesh = (index) => {
        const promise = loadMesh(index).then((mesh) => { resources.collect(mesh); return mesh })
        pending.push(promise)
        return promise
      }
      return { name: 'StudioResourceOwnership' }
    })
    const gltf = await loader.parseAsync(document, '')
    gltf.scenes.forEach((scene) => resources.collect(scene))
    signal.throwIfAborted()
    checkMeshes(gltf.scene)
    for (const material of resources.materials) material.dispose()
    resources.materials.clear()
    const material = new MeshLambertMaterial()
    resources.materials.add(material)
    gltf.scene.traverse((node) => { if (node instanceof Mesh) node.material = material })
    counters.geometries += resources.geometries.size
    counters.materials += resources.materials.size
    return new ModelAsset({ kind: 'imported', asset: {
      fileName: model.name, format, sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    } }, gltf.scene, () => {
      resources.dispose()
      counters.geometries -= resources.geometries.size
      counters.materials -= resources.materials.size
    })
  } catch (error) {
    await Promise.allSettled(pending)
    resources.dispose()
    throw error
  } finally {
    signal.removeEventListener('abort', abort)
    for (const url of urls.values()) { URL.revokeObjectURL(url); counters.urls-- }
  }
}
