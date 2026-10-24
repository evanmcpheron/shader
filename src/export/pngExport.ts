import type { SceneSettings } from '../domain/settings'
import { nativeByteLength } from '../pixels/nativeFrame'
import type { NativeFrame } from '../pixels/nativeFrame'

export function pngFilename(settings: SceneSettings): string {
  const geometry = settings.subject.geometry
  const subject = geometry.kind === 'imported' ? geometry.asset.fileName.replace(/\.(glb|gltf)$/i, '') : geometry.kind
  const safeSubject = subject.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '') || 'subject'
  const tone = settings.shading.tone.kind
  const style = tone === 'continuous' ? settings.shading.normals : tone
  const dither = tone === 'continuous' || settings.dither.kind === 'none' || settings.dither.strength === 0 ? 'none'
    : settings.dither.kind === 'bayer' ? `bayer${settings.dither.matrixSize}` : settings.dither.kind
  const outline = settings.outline.kind === 'silhouette' ? `-outline${settings.outline.thickness}` : ''
  return `${safeSubject}-${settings.canvas.width}x${settings.canvas.height}-${style}-${dither}${outline}.png`
}

export function ownExportFrame(frame: NativeFrame | undefined, settings: SceneSettings, revision: number, captureRevision: number): NativeFrame {
  if (!frame || frame.revision !== revision || frame.captureRevision !== captureRevision || frame.width !== settings.canvas.width || frame.height !== settings.canvas.height) {
    throw new Error('The clicked revision has no complete native frame. Retry export.')
  }
  if (frame.rgba.length !== nativeByteLength(frame.width, frame.height)) throw new Error('Native export dimensions do not match its pixels. Retry renderer.')
  for (let i = 0; i < frame.rgba.length; i += 4) {
    const alpha = frame.rgba[i + 3]
    if (alpha !== 0 && alpha !== 255) throw new Error('Native export contains partial alpha. Retry renderer.')
    if (alpha === 0 && (frame.rgba[i] || frame.rgba[i + 1] || frame.rgba[i + 2])) throw new Error('Native transparent pixels contain hidden color. Retry renderer.')
  }
  return { ...frame, rgba: frame.rgba.slice() }
}

export async function encodeNativePng(frame: NativeFrame, signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted()
  const canvas = document.createElement('canvas')
  canvas.width = frame.width
  canvas.height = frame.height
  try {
    const context = canvas.getContext('2d', { colorSpace: 'srgb' })
    if (!context) throw new Error('A native sRGB canvas could not be allocated. Retry export.')
    context.imageSmoothingEnabled = false
    context.putImageData(new ImageData(frame.rgba.slice(), frame.width, frame.height, { colorSpace: 'srgb' }), 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      const abort = () => { cleanup(); reject(signal.reason) }
      const cleanup = () => signal.removeEventListener('abort', abort)
      signal.addEventListener('abort', abort, { once: true })
      try {
        signal.throwIfAborted()
        canvas.toBlob((blob) => {
          cleanup()
          if (signal.aborted) reject(signal.reason)
          else if (!blob || blob.type !== 'image/png') reject(new Error('PNG encoding returned no PNG. Retry export.'))
          else resolve(blob)
        }, 'image/png')
      } catch (error) { cleanup(); reject(error) }
    })
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export function downloadPng(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  } finally { link.remove() }
  // Navigation consumes the blob asynchronously after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
