import { embeddedBytes, IMPORT_LIMITS } from './localFiles'

type JsonObject = Record<string, unknown>
function fail(message: string): never { throw new Error(message) }
const object = (value: unknown): JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : fail('Malformed glTF object.')
const list = (value: unknown, cap: number = IMPORT_LIMITS.accessors): JsonObject[] => {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > cap) return fail(`Malformed or oversized glTF list (limit ${cap}).`)
  return value.map(object)
}
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER): number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max ? value as number : fail('Malformed glTF count or index.')
const reference = <T,>(array: T[], value: unknown): T => array[integer(value, array.length - 1)] ?? fail('Missing glTF array reference.')
const vector = (value: unknown, size: number): unknown => {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length !== size || !value.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e12)) fail('Invalid or excessive node transform.')
  return value
}

function readContainer(bytes: ArrayBuffer, format: 'glb' | 'gltf'): { json: JsonObject; binary?: Uint8Array } {
  let jsonBytes = new Uint8Array(bytes)
  let binary: Uint8Array | undefined
  if (format === 'glb') {
    const view = new DataView(bytes)
    if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) fail('Malformed GLB 2.0 header or length.')
    let offset = 12
    let chunks = 0
    while (offset < bytes.byteLength) {
      if (offset + 8 > bytes.byteLength) fail('Truncated GLB chunk.')
      const length = view.getUint32(offset, true)
      const kind = view.getUint32(offset + 4, true)
      offset += 8
      if (length % 4 || offset + length > bytes.byteLength) fail('Malformed GLB chunk length.')
      const chunk = new Uint8Array(bytes, offset, length)
      if (chunks === 0 && kind === 0x4e4f534a) jsonBytes = chunk
      else if (chunks === 1 && kind === 0x004e4942) binary = chunk
      else fail('Unsupported GLB chunk layout. Export standard JSON and BIN chunks.')
      offset += length
      chunks++
    }
  }
  try { return { json: object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes))), binary } }
  catch (error) { throw new Error(`Malformed model JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`, { cause: error }) }
}

export function prepareModel(bytes: ArrayBuffer, format: 'glb' | 'gltf', resolve: (uri: string) => File): string {
  const { json, binary } = readContainer(bytes, format)
  const asset = object(json.asset)
  if (asset.version !== '2.0' || (asset.minVersion !== undefined && asset.minVersion !== '2.0')) fail('Only glTF 2.0 static meshes are supported.')
  if (json.extensionsRequired !== undefined) {
    if (!Array.isArray(json.extensionsRequired)) fail('Malformed required extensions.')
    const unsupported = json.extensionsRequired.filter((name) => !['KHR_materials_unlit', 'KHR_lights_punctual'].includes(String(name)))
    if (unsupported.length) fail(`Unsupported required extension: ${unsupported.join(', ')}. Export an uncompressed static mesh without required extensions.`)
  }
  if (list(json.animations).length || list(json.skins).length) fail('Animated or skinned models are unsupported. Export a static, undeformed mesh.')
  const nodes = list(json.nodes, IMPORT_LIMITS.nodes)
  const meshes = list(json.meshes, IMPORT_LIMITS.primitives)
  const accessors = list(json.accessors)
  const views = list(json.bufferViews)
  const buffers = list(json.buffers, IMPORT_LIMITS.files)
  let totalBytes = 0
  const sanitizedBuffers = buffers.map((buffer, index) => {
    const length = integer(buffer.byteLength, IMPORT_LIMITS.bytes)
    totalBytes += length
    let uri = buffer.uri
    if (uri === undefined) {
      if (index !== 0 || !binary || binary.byteLength < length || binary.byteLength - length > 3) fail('Missing or malformed embedded GLB buffer.')
      // Use a data URI so the sanitized geometry document can be parsed without its original material/extension graph.
      let data = ''
      for (let offset = 0; offset < length; offset += 8192) data += String.fromCharCode(...binary.subarray(offset, Math.min(length, offset + 8192)))
      uri = `data:application/octet-stream;base64,${btoa(data)}`
    }
    if (typeof uri !== 'string') return fail('Invalid buffer URI.')
    const available = uri.startsWith('data:') ? embeddedBytes(uri) : resolve(uri).size
    if (available < length) fail(`Buffer ${index} is shorter than its declared byte length.`)
    return { uri, byteLength: length }
  })
  if (totalBytes > IMPORT_LIMITS.bytes) fail('Decoded buffers exceed the 25 MiB limit.')
  for (const image of list(json.images)) {
    if (typeof image.uri === 'string') {
      if (image.uri.startsWith('data:')) embeddedBytes(image.uri)
      else resolve(image.uri)
    } else if (image.bufferView !== undefined) reference(views, image.bufferView)
    else fail('Malformed image resource.')
  }
  const sanitizedViews = views.map((view) => {
    if (view.extensions) fail('Compressed/extended buffer views are unsupported. Export uncompressed geometry.')
    const buffer = integer(view.buffer, buffers.length - 1)
    const byteOffset = integer(view.byteOffset ?? 0)
    const byteLength = integer(view.byteLength, IMPORT_LIMITS.bytes)
    if (byteOffset + byteLength > integer(reference(buffers, buffer).byteLength)) fail('Buffer view exceeds its buffer.')
    const byteStride = view.byteStride === undefined ? undefined : integer(view.byteStride, 252)
    if (byteStride !== undefined && (byteStride < 4 || byteStride % 4)) fail('Invalid buffer stride.')
    return { buffer, byteOffset, byteLength, byteStride }
  })
  const sanitizedAccessors = accessors.map((accessor) => {
    if (accessor.sparse || accessor.extensions) fail('Sparse/extended accessors are unsupported. Export dense static geometry.')
    const view = reference(sanitizedViews, accessor.bufferView)
    const componentType = integer(accessor.componentType)
    const componentBytes = ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[componentType]
    const components = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[String(accessor.type)]
    if (!componentBytes || !components) fail('Unsupported accessor layout.')
    const count = integer(accessor.count, IMPORT_LIMITS.triangles * 3)
    if (count < 1) fail('Empty geometry accessor.')
    const byteOffset = integer(accessor.byteOffset ?? 0)
    const elementBytes = componentBytes * components
    if (byteOffset % componentBytes || (view.byteStride ?? elementBytes) < elementBytes || byteOffset + (count - 1) * (view.byteStride ?? elementBytes) + elementBytes > view.byteLength) fail('Accessor exceeds its buffer view or has invalid alignment.')
    // GLTFLoader needs interim bounds; exact bounds are recomputed from validated vertices before publication.
    return { bufferView: integer(accessor.bufferView), byteOffset, componentType, count, type: accessor.type, min: components === 3 ? [-1e12, -1e12, -1e12] : undefined, max: components === 3 ? [1e12, 1e12, 1e12] : undefined, normalized: accessor.normalized === true }
  })
  let primitiveCount = 0
  const costs: { vertices: number; triangles: number; primitives: number }[] = []
  const sanitizedMeshes = meshes.map((mesh) => {
    if (mesh.weights !== undefined || mesh.extensions) fail('Deformed/extended meshes are unsupported. Export a static mesh.')
    let vertices = 0
    let triangles = 0
    const primitives = list(mesh.primitives, IMPORT_LIMITS.primitives).map((primitive) => {
      if (++primitiveCount > IMPORT_LIMITS.primitives) fail('Too many mesh primitives.')
      if (primitive.targets || primitive.extensions) fail('Morph targets, compression and extended primitives are unsupported. Export an uncompressed static mesh.')
      if (primitive.mode !== undefined && primitive.mode !== 4) fail('Only triangle meshes are supported; convert points, lines and strips to triangles.')
      const attributes = object(primitive.attributes)
      if (Object.keys(attributes).some((name) => /^(JOINTS|WEIGHTS)_/.test(name))) fail('Skinning attributes are unsupported. Export a static, undeformed mesh.')
      const position = reference(sanitizedAccessors, attributes.POSITION)
      if (position.type !== 'VEC3' || position.componentType !== 5126 || position.normalized) fail('Positions must use uncompressed FLOAT VEC3 data.')
      vertices += position.count
      const normal = attributes.NORMAL === undefined ? undefined : reference(sanitizedAccessors, attributes.NORMAL)
      if (normal && (normal.type !== 'VEC3' || normal.componentType !== 5126 || normal.count !== position.count || normal.normalized)) fail('Invalid authored normals.')
      const indices = primitive.indices === undefined ? undefined : reference(sanitizedAccessors, primitive.indices)
      if (indices && (indices.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indices.componentType) || indices.normalized)) fail('Invalid triangle indices.')
      const drawCount = indices?.count ?? position.count
      if (drawCount % 3) fail('Triangle index/vertex count must be a multiple of three.')
      triangles += drawCount / 3
      return { attributes: { POSITION: attributes.POSITION, ...(normal ? { NORMAL: attributes.NORMAL } : {}) }, indices: primitive.indices, material: 0, mode: 4 }
    })
    costs.push({ vertices, triangles, primitives: primitives.length })
    return { primitives }
  })
  let vertices = 0
  let triangles = 0
  let meshParts = 0
  const parents = new Set<number>()
  const sanitizedNodes = nodes.map((node) => {
    if (node.skin !== undefined || node.weights !== undefined) fail('Skinned/morph/deformed nodes are unsupported. Export a static mesh.')
    if (node.extensions && Object.keys(object(node.extensions)).some((name) => name !== 'KHR_lights_punctual')) fail('Extended/instanced nodes are unsupported. Export ordinary static mesh groups.')
    if (node.mesh !== undefined) {
      const cost = reference(costs, node.mesh)
      vertices += cost.vertices
      triangles += cost.triangles
      meshParts += cost.primitives
    }
    const children = node.children ?? []
    if (!Array.isArray(children) || children.length > IMPORT_LIMITS.nodes) fail('Invalid node children.')
    for (const child of children) {
      reference(nodes, child)
      if (parents.has(child)) fail('A node has multiple parents or duplicate children.')
      parents.add(child)
    }
    const translation = vector(node.translation, 3)
    const rotation = vector(node.rotation, 4)
    const scale = vector(node.scale, 3)
    const matrix = vector(node.matrix, 16)
    if (Array.isArray(rotation) && Math.abs(Math.hypot(...rotation) - 1) > 0.001) fail('Node rotation must be a unit quaternion.')
    if (Array.isArray(matrix) && (translation || rotation || scale || matrix[3] !== 0 || matrix[7] !== 0 || matrix[11] !== 0 || matrix[15] !== 1)) fail('Node matrix must be affine and cannot be combined with translation/rotation/scale.')
    return { mesh: node.mesh, children, translation, rotation, scale, matrix }
  })
  if (vertices > IMPORT_LIMITS.vertices || triangles > IMPORT_LIMITS.triangles) fail('Model exceeds 250,000 vertices or 250,000 triangles (including instances). Simplify the mesh.')
  if (meshParts > IMPORT_LIMITS.primitives) fail('Model exceeds 2,048 mesh parts including instances. Merge small meshes before export.')
  const heights = new Map<number, number>()
  function height(index: number, active: Set<number>): number {
    if (active.has(index) || active.size >= IMPORT_LIMITS.depth) fail('Model hierarchy is cyclic or exceeds 64 levels.')
    const known = heights.get(index)
    if (known !== undefined) return known
    active.add(index)
    const result = 1 + Math.max(0, ...reference(sanitizedNodes, index).children.map((child) => height(child as number, active)))
    active.delete(index)
    if (result > IMPORT_LIMITS.depth) fail('Model hierarchy exceeds 64 levels.')
    heights.set(index, result)
    return result
  }
  nodes.forEach((_, index) => height(index, new Set()))
  const scenes = list(json.scenes, IMPORT_LIMITS.nodes).map((scene) => {
    if (!Array.isArray(scene.nodes) || scene.nodes.length > IMPORT_LIMITS.nodes) fail('Invalid scene roots.')
    const roots = scene.nodes as unknown[]
    const unique = new Set<number>()
    for (const root of roots) {
      const index = integer(root, nodes.length - 1)
      if (parents.has(index) || unique.has(index)) fail('Invalid or duplicate scene root.')
      unique.add(index)
    }
    return { nodes: roots }
  })
  const scene = integer(json.scene ?? 0, scenes.length - 1)
  reference(scenes, scene)
  if (!vertices || !triangles) fail('The model contains no static triangle meshes.')
  return JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [scenes[scene]], nodes: sanitizedNodes, meshes: sanitizedMeshes, materials: [{}], accessors: sanitizedAccessors, bufferViews: sanitizedViews, buffers: sanitizedBuffers })
}
