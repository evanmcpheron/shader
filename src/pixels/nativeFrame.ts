import type { FramingReport } from './subjectBounds'
import type { OutlineReport } from './silhouetteOutline'
import { LIMITS, MAX_CANVAS_PIXELS } from '../domain/constraints'
import { decodeSrgb, lambertIllumination } from '../domain/lighting'
import type { DerivedLighting } from '../domain/lighting'
import type { BackgroundSettings, DitherSettings, GroundSettings, ShadowSettings, PaletteSettings, ShadingSettings, Size2, SrgbColor, Vector3 } from '../domain/settings'
import { adjustShadingSignal, colorBytes, encodeDisplayChannel, illuminationLuminance, preparePalette, resolveEffectColor } from '../domain/shading'
import { createPaletteQuantizer, createRampQuantizer } from '../domain/orderedDither'
import type { GroundReport } from '../scene/groundReceiver'
import { directionalVisibility, shadowCovered } from './shadowVisibility'
import { createPaletteDiffuser, createRampDiffuser } from '../domain/errorDiffusion'

export { encodeDisplayChannel } from '../domain/shading'

export type NativeFrame = Readonly<{
  width: number
  height: number
  revision: number
  captureRevision: number
  framing: FramingReport
  outline: OutlineReport | null
  ground?: GroundReport | null
  rgba: Uint8ClampedArray<ArrayBuffer>
}>

export function nativeByteLength(width: number, height: number, maxWidth = 1024, maxHeight = 1024): number {
  for (const axis of [width, height]) {
    if (!Number.isInteger(axis) || axis < LIMITS.canvasAxis.min || axis > LIMITS.canvasAxis.max) {
      throw new Error('Native width and height must be integers from 1 to 1024.')
    }
  }
  if (width * height > MAX_CANVAS_PIXELS) throw new Error('Native canvas exceeds 1,048,576 pixels.')
  if (width > maxWidth || height > maxHeight) throw new Error(`Native canvas exceeds this GPU’s ${maxWidth} × ${maxHeight} limit. Choose a smaller size and retry.`)
  return width * height * 4
}

export function flipNativeRows(source: Uint8Array, destination: Uint8Array, width: number, height: number): void {
  const length = nativeByteLength(width, height)
  if (source.length !== length || destination.length !== length || source.buffer === destination.buffer) {
    throw new Error('Row flip requires separate, exactly sized native buffers.')
  }
  const stride = width * 4
  for (let y = 0; y < height; y++) {
    const offset = (height - 1 - y) * stride
    destination.set(source.subarray(offset, offset + stride), y * stride)
  }
}

export function decodeNormal(r: number, g: number, b: number): Vector3 {
  const x = r * 2 / 255 - 1
  const y = g * 2 / 255 - 1
  const z = b * 2 / 255 - 1
  const length = Math.hypot(x, y, z)
  return { x: x / length, y: y / length, z: z / length }
}

export type NativeEffects = Readonly<{ ground: GroundSettings; shadows: ShadowSettings; canvas: Size2; palette: PaletteSettings; visibility: Float32Array }>

export function processNativePixels(normals: Uint8Array, output: Uint8ClampedArray, light: DerivedLighting, baseColor: SrgbColor, background: BackgroundSettings, styling?: Readonly<{ shading: ShadingSettings; palette: PaletteSettings; dither?: DitherSettings; canvas?: Size2 }>, effects?: NativeEffects): void {
  if (normals.length !== output.length || normals.length % 4 !== 0) throw new Error('Pixel buffers must have matching RGBA dimensions.')
  if (effects && effects.visibility.length * 4 !== normals.length) throw new Error('Shadow visibility must match native pixels.')
  const base = decodeSrgb(baseColor)
  const palette = styling ? preparePalette(styling.palette.colors) : undefined
  const ramp = palette?.map((entry) => entry.bytes)
  const shading = styling?.shading
  const thresholds = shading?.tone.kind === 'cel' || shading?.tone.kind === 'bands' ? shading.tone.thresholds : undefined
  const requestedDither = styling?.dither
  const dither = shading?.tone.kind === 'continuous' || requestedDither?.kind === 'none' || requestedDither?.strength === 0 ? undefined : requestedDither
  if (dither && (!styling?.canvas || nativeByteLength(styling.canvas.width, styling.canvas.height) !== normals.length)) {
    throw new Error('Dithering requires the exact native canvas dimensions.')
  }
  const width = styling?.canvas?.width ?? effects?.canvas.width ?? 1
  const diffusion = dither?.kind === 'floyd-steinberg' ? dither : undefined
  const grid = { width, height: styling?.canvas?.height ?? normals.length / 4, categoryAt: (x: number, y: number) => normals[(y * width + x) * 4 + 3] }
  const selectRamp = thresholds
    ? diffusion ? createRampDiffuser(thresholds, diffusion.strength, grid) : createRampQuantizer(thresholds, dither)
    : undefined
  const selectPalette = shading?.tone.kind === 'palette' && palette
    ? diffusion ? createPaletteDiffuser(palette, diffusion.strength, grid) : createPaletteQuantizer(palette, dither)
    : undefined
  const adjust = (value: number) => shading ? adjustShadingSignal(value, shading) : value
  const backgroundRgb = background.kind !== 'solid' ? [0, 0, 0]
    : colorBytes(styling ? resolveEffectColor(background.color, styling.palette) : background.color)
  const ground = effects?.ground.kind === 'receiver' ? effects.ground : undefined
  const receiverRgb = ground?.appearance.kind === 'visible' ? colorBytes(resolveEffectColor(ground.appearance.color, effects!.palette)) : undefined
  const shadowRgb = effects?.shadows.kind === 'directional' ? colorBytes(resolveEffectColor(effects.shadows.color, effects.palette)) : undefined
  for (let i = 0; i < normals.length; i += 4) {
    if (normals[i + 3] === 255) {
      const visibility = effects ? directionalVisibility(effects.visibility[i / 4], effects.shadows, 255) : 1
      const illumination = lambertIllumination(decodeNormal(normals[i], normals[i + 1], normals[i + 2]), light, visibility)
      const pixel = i / 4
      const x = pixel % width
      const y = Math.floor(pixel / width)
      if (selectRamp && shading && ramp) {
        const signal = adjustShadingSignal(illuminationLuminance(illumination), shading)
        const color = ramp[selectRamp(signal, x, y)]
        output[i] = color[0]
        output[i + 1] = color[1]
        output[i + 2] = color[2]
      } else if (selectPalette && palette) {
        const input = { r: adjust(base.r * illumination.r), g: adjust(base.g * illumination.g), b: adjust(base.b * illumination.b) }
        const color = palette[selectPalette(input, x, y)].bytes
        output[i] = color[0]
        output[i + 1] = color[1]
        output[i + 2] = color[2]
      } else {
        output[i] = encodeDisplayChannel(adjust(base.r * illumination.r))
        output[i + 1] = encodeDisplayChannel(adjust(base.g * illumination.g))
        output[i + 2] = encodeDisplayChannel(adjust(base.b * illumination.b))
      }
      output[i + 3] = 255
    } else {
      let effectRgb: readonly number[] | undefined
      if (normals[i + 3] === 128 && ground && effects) {
        const normal = decodeNormal(normals[i], normals[i + 1], normals[i + 2])
        const unshadowed = illuminationLuminance(lambertIllumination(normal, light))
        const shadowed = illuminationLuminance(lambertIllumination(normal, light, directionalVisibility(effects.visibility[i / 4], effects.shadows, 128)))
        const coverage = unshadowed > 0 ? Math.max(0, 1 - shadowed / unshadowed) : 0
        effectRgb = shadowRgb && shadowCovered(coverage, (i / 4) % width, Math.floor(i / 4 / width)) ? shadowRgb : receiverRgb
      }
      if (effectRgb) {
        output[i] = effectRgb[0]; output[i + 1] = effectRgb[1]; output[i + 2] = effectRgb[2]; output[i + 3] = 255
        continue
      }
      output[i] = backgroundRgb[0]
      output[i + 1] = backgroundRgb[1]
      output[i + 2] = backgroundRgb[2]
      output[i + 3] = background.kind === 'solid' ? 255 : 0
    }
  }
}
