import type { NativeFrame } from '../pixels/nativeFrame'

export async function comparePngToFrame(blob: Blob, frame: NativeFrame) {
  const image = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const canvas = document.createElement('canvas')
  try {
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true })
    if (!context) throw new Error('PNG verification needs a real sRGB 2D canvas.')
    context.imageSmoothingEnabled = false
    context.drawImage(image, 0, 0)
    const decoded = context.getImageData(0, 0, image.width, image.height, { colorSpace: 'srgb' })
    let differentBytes = Math.abs(decoded.data.length - frame.rgba.length)
    for (let i = 0; i < Math.min(decoded.data.length, frame.rgba.length); i++) if (decoded.data[i] !== frame.rgba[i]) differentBytes++
    const alpha = new Set<number>()
    const opaqueColors = new Set<string>()
    let hiddenColorPixels = 0
    let opaquePixels = 0
    const bounds = { minX: image.width, minY: image.height, maxX: -1, maxY: -1 }
    for (let i = 0; i < decoded.data.length; i += 4) {
      const [r, g, b, a] = decoded.data.subarray(i, i + 4)
      alpha.add(a)
      if (a === 0 && (r || g || b)) hiddenColorPixels++
      if (a !== 255) continue
      opaquePixels++
      opaqueColors.add([r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase())
      const x = (i / 4) % image.width, y = Math.floor(i / 4 / image.width)
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x)
      bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y)
    }
    return { matches: image.width === frame.width && image.height === frame.height && differentBytes === 0, width: image.width, height: image.height, differentBytes, alpha: [...alpha].sort((a, b) => a - b), hiddenColorPixels, opaqueColors: [...opaqueColors].sort(), opaquePixels, bounds }
  } finally {
    image.close()
    canvas.width = 0
    canvas.height = 0
  }
}
