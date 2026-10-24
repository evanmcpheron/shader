export const IMPORT_LIMITS = {
  bytes: 25 * 1024 * 1024,
  files: 64,
  vertices: 250_000,
  triangles: 250_000,
  nodes: 2048,
  depth: 64,
  primitives: 2048,
  accessors: 4096,
} as const

export function localPath(uri: string): string {
  if (uri.length > 1024) throw new Error('Local resource paths must be at most 1,024 characters.')
  let path: string
  try { path = decodeURIComponent(uri).replaceAll('\\', '/') } catch { throw new Error(`Invalid local path: ${uri}`) }
  if (/^[a-z][a-z\d+.-]*:|^[/]|[?#]/i.test(path) || [...path].some((character) => character.charCodeAt(0) < 32)) {
    throw new Error(`Remote or absolute resource blocked: ${uri}. Select local companion files instead.`)
  }
  const parts = path.split('/').filter((part) => part !== '.' && part !== '')
  if (parts.includes('..') || parts.length === 0) throw new Error(`Unsafe local resource path: ${uri}`)
  return parts.join('/')
}

export function validateSelection(files: readonly File[]): File {
  if (files.length === 0) throw new Error('Select one .glb or .gltf and its companion files together.')
  if (files.length > IMPORT_LIMITS.files) throw new Error(`Select at most ${IMPORT_LIMITS.files} files.`)
  if (files.reduce((total, file) => total + file.size, 0) > IMPORT_LIMITS.bytes) throw new Error('Selected files exceed the 25 MiB import limit.')
  const models = files.filter((file) => /\.(glb|gltf)$/i.test(file.name))
  if (models.length !== 1) throw new Error('Select exactly one .glb or .gltf, together with its .bin/textures.')
  return models[0]
}

export function createLocalResolver(files: readonly File[]) {
  const paths = new Map<string, File>()
  const names = new Map<string, File[]>()
  for (const file of files) {
    const path = localPath(file.webkitRelativePath || file.name)
    if (paths.has(path)) throw new Error(`Duplicate selected path: ${path}. Select an unambiguous bundle.`)
    paths.set(path, file)
    const name = path.split('/').at(-1)!
    names.set(name, [...(names.get(name) ?? []), file])
  }
  return (uri: string): File => {
    const path = localPath(uri)
    const exact = paths.get(path)
    if (exact) return exact
    const matches = names.get(path.split('/').at(-1)!) ?? []
    if (matches.length > 1) throw new Error(`Ambiguous companion ${uri}. Select files with unique names.`)
    if (matches.length === 1) return matches[0]
    throw new Error(`Missing companion: ${uri}. Reselect the model together with this file (and all .bin/textures).`)
  }
}

export function embeddedBytes(uri: string): number {
  const match = /^data:(?:application\/(?:octet-stream|gltf-buffer)|image\/(?:png|jpeg|webp));base64,([a-z\d+/]*={0,2})$/i.exec(uri)
  if (!match || match[1].length % 4 !== 0) throw new Error('Unsupported embedded resource. Use base64 buffer or PNG/JPEG/WebP data.')
  const length = match[1].length * 3 / 4 - (match[1].endsWith('==') ? 2 : match[1].endsWith('=') ? 1 : 0)
  if (length > IMPORT_LIMITS.bytes) throw new Error('Embedded resource exceeds the 25 MiB import limit.')
  return length
}
