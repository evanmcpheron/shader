import { LIMITS, MAX_CANVAS_PIXELS, MAX_PALETTE_COLORS, MIN_DIRECTION_LENGTH, MIN_SCALE_MAGNITUDE } from './constraints'
import type { NumericBounds } from './constraints'
import { SCENE_SCHEMA_VERSION } from './settings'
import type {
  BackgroundSettings, CameraSettings, DitherSettings, FramingSettings, GroundSettings,
  LightingSettings, OutlineSettings, PaletteSettings, Primitive, ImportedSubject,
  SceneSettings, ShadingSettings, ShadowSettings, Size2, SrgbColor, ToneMapping, Transform, Vector3,
} from './settings'

export type ValidationIssue = Readonly<{ path: string; message: string }>
export type ValidationNotice = Readonly<{ code: 'fit-box-clamped'; path: string; message: string }>
export type ValidationResult<T> =
  | Readonly<{ ok: true; value: T; notices: readonly ValidationNotice[] }>
  | Readonly<{ ok: false; issues: readonly ValidationIssue[] }>

class InvalidSetting extends Error {
  readonly issue: ValidationIssue

  constructor(path: string, message: string) {
    super(`${path}: ${message}`)
    this.issue = { path, message }
  }
}

function check<T>(read: () => T): ValidationResult<T> {
  try {
    return { ok: true, value: read(), notices: [] }
  } catch (error) {
    if (error instanceof InvalidSetting) return { ok: false, issues: [error.issue] }
    throw error
  }
}

function objectAt(value: unknown, path: string, keys?: readonly string[], optionalKeys: readonly string[] = []): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new InvalidSetting(path, 'Expected a plain object.')
  }
  const result = value as Record<string, unknown>
  if (keys) {
    for (const key of Object.keys(result)) {
      if (!keys.includes(key)) throw new InvalidSetting(`${path}.${key}`, 'Unknown field.')
    }
    for (const key of keys) {
      if (!Object.hasOwn(result, key) && !optionalKeys.includes(key)) throw new InvalidSetting(`${path}.${key}`, 'Required field is missing.')
    }
  }
  return result
}

function numberAt(value: unknown, path: string, bounds: NumericBounds): number {
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) || bounds.min > bounds.max) {
    throw new InvalidSetting(path, 'Invalid declared numeric bounds.')
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidSetting(path, 'Expected a finite number.')
  }
  if (bounds.integer && !Number.isInteger(value)) throw new InvalidSetting(path, 'Expected an integer.')
  if (value < bounds.min || value > bounds.max) {
    throw new InvalidSetting(path, `Expected a value from ${bounds.min} to ${bounds.max}.`)
  }
  return Object.is(value, -0) ? 0 : value
}

export function validateNumber(value: unknown, bounds: NumericBounds): ValidationResult<number> {
  return check(() => numberAt(value, 'value', bounds))
}

function enumAt<const T extends readonly (string | number)[]>(value: unknown, path: string, choices: T): T[number] {
  if (!choices.some((choice) => choice === value)) {
    throw new InvalidSetting(path, `Expected one of: ${choices.join(', ')}.`)
  }
  return value as T[number]
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new InvalidSetting(path, 'Expected a boolean.')
  return value
}

function colorAt(value: unknown, path: string): SrgbColor {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) {
    throw new InvalidSetting(path, 'Expected an opaque sRGB color in #RRGGBB form.')
  }
  return value.toUpperCase() as SrgbColor
}

export function validateColor(value: unknown): ValidationResult<SrgbColor> {
  return check(() => colorAt(value, 'color'))
}

function vectorAt(value: unknown, path: string, bounds: NumericBounds = LIMITS.position): Vector3 {
  const vector = objectAt(value, path, ['x', 'y', 'z'])
  return {
    x: numberAt(vector.x, `${path}.x`, bounds),
    y: numberAt(vector.y, `${path}.y`, bounds),
    z: numberAt(vector.z, `${path}.z`, bounds),
  }
}

function directionAt(position: Vector3, target: Vector3, path: string): Vector3 {
  const x = position.x - target.x
  const y = position.y - target.y
  const z = position.z - target.z
  const length = Math.hypot(x, y, z)
  if (length < MIN_DIRECTION_LENGTH) throw new InvalidSetting(path, 'Position and target must define a nonzero direction.')
  return { x: x / length, y: y / length, z: z / length }
}

export function deriveLightDirection(position: Vector3, target: Vector3): ValidationResult<Vector3> {
  return check(() => directionAt(vectorAt(position, 'position'), vectorAt(target, 'target'), 'direction'))
}

function sizeAt(value: unknown, path: string): Size2 {
  const size = objectAt(value, path, ['width', 'height'])
  return {
    width: numberAt(size.width, `${path}.width`, LIMITS.canvasAxis),
    height: numberAt(size.height, `${path}.height`, LIMITS.canvasAxis),
  }
}

function geometryAt(value: unknown): Primitive | ImportedSubject {
  const path = 'settings.subject.geometry'
  const kind = objectAt(value, path).kind
  const read = (keys: readonly string[]) => objectAt(value, path, ['kind', ...keys])
  const dimension = (data: Record<string, unknown>, key: string) => numberAt(data[key], `${path}.${key}`, LIMITS.dimension)
  const segments = (data: Record<string, unknown>, key: string, bounds: NumericBounds = LIMITS.segments) =>
    numberAt(data[key], `${path}.${key}`, bounds)
  switch (kind) {
    case 'sphere': {
      const data = read(['radius', 'widthSegments', 'heightSegments'])
      return {
        kind, radius: dimension(data, 'radius'),
        widthSegments: segments(data, 'widthSegments', LIMITS.radialSegments),
        heightSegments: segments(data, 'heightSegments', LIMITS.sphereHeightSegments),
      }
    }
    case 'cube': {
      const data = read(['width', 'height', 'depth'])
      return { kind, width: dimension(data, 'width'), height: dimension(data, 'height'), depth: dimension(data, 'depth') }
    }
    case 'cylinder':
    case 'cone': {
      const data = read(['radius', 'height', 'radialSegments', 'heightSegments'])
      return {
        kind, radius: dimension(data, 'radius'), height: dimension(data, 'height'),
        radialSegments: segments(data, 'radialSegments', LIMITS.radialSegments),
        heightSegments: segments(data, 'heightSegments'),
      }
    }
    case 'pyramid': {
      const data = read(['baseSize', 'height'])
      return { kind, baseSize: dimension(data, 'baseSize'), height: dimension(data, 'height') }
    }
    case 'torus': {
      const data = read(['radius', 'tubeRadius', 'radialSegments', 'tubularSegments'])
      const radius = dimension(data, 'radius')
      const tubeRadius = dimension(data, 'tubeRadius')
      if (tubeRadius >= radius) throw new InvalidSetting(`${path}.tubeRadius`, 'Tube radius must be smaller than the major radius.')
      return {
        kind, radius, tubeRadius,
        radialSegments: segments(data, 'radialSegments', LIMITS.radialSegments),
        tubularSegments: segments(data, 'tubularSegments', LIMITS.radialSegments),
      }
    }
    case 'plane': {
      const data = read(['width', 'height', 'widthSegments', 'heightSegments'])
      return {
        kind, width: dimension(data, 'width'), height: dimension(data, 'height'),
        widthSegments: segments(data, 'widthSegments'), heightSegments: segments(data, 'heightSegments'),
      }
    }
    case 'imported': {
      const data = read(['asset'])
      const asset = objectAt(data.asset, `${path}.asset`, ['fileName', 'format', 'sha256'])
      if (typeof asset.fileName !== 'string' || asset.fileName.trim().length === 0 || asset.fileName.length > 255) {
        throw new InvalidSetting(`${path}.asset.fileName`, 'Expected a nonempty filename of at most 255 characters.')
      }
      if (typeof asset.sha256 !== 'string' || !/^[\da-f]{64}$/i.test(asset.sha256)) {
        throw new InvalidSetting(`${path}.asset.sha256`, 'Expected a SHA-256 hash with 64 hexadecimal digits.')
      }
      return {
        kind,
        asset: {
          fileName: asset.fileName,
          format: enumAt(asset.format, `${path}.asset.format`, ['glb', 'gltf']),
          sha256: asset.sha256.toLowerCase(),
        },
      }
    }
    default: throw new InvalidSetting(`${path}.kind`, 'Unknown subject kind.')
  }
}

function transformAt(value: unknown): Transform {
  const path = 'settings.subject.transform'
  const data = objectAt(value, path, ['position', 'rotation', 'scale'])
  const scale = vectorAt(data.scale, `${path}.scale`, LIMITS.scale)
  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(scale[axis]) < MIN_SCALE_MAGNITUDE) {
      throw new InvalidSetting(`${path}.scale.${axis}`, `Scale magnitude must be at least ${MIN_SCALE_MAGNITUDE}.`)
    }
  }
  return { position: vectorAt(data.position, `${path}.position`), rotation: vectorAt(data.rotation, `${path}.rotation`, LIMITS.angle), scale }
}

function cameraAt(value: unknown): CameraSettings {
  const path = 'settings.camera'
  const data = objectAt(value, path, ['position', 'target', 'roll', 'projection'])
  const position = vectorAt(data.position, `${path}.position`, LIMITS.cameraPosition)
  const target = vectorAt(data.target, `${path}.target`, LIMITS.cameraPosition)
  directionAt(position, target, path)
  const kind = enumAt(objectAt(data.projection, `${path}.projection`).kind, `${path}.projection.kind`, ['orthographic', 'perspective'])
  const projection = objectAt(data.projection, `${path}.projection`, kind === 'orthographic'
    ? ['kind', 'verticalSize', 'zoom']
    : ['kind', 'fov', 'zoom'])
  const zoom = numberAt(projection.zoom, `${path}.projection.zoom`, LIMITS.zoom)
  return {
    position, target, roll: numberAt(data.roll, `${path}.roll`, LIMITS.angle),
    projection: kind === 'orthographic'
      ? { kind, zoom, verticalSize: numberAt(projection.verticalSize, `${path}.projection.verticalSize`, LIMITS.cameraSpan) }
      : { kind, zoom, fov: numberAt(projection.fov, `${path}.projection.fov`, LIMITS.fov) },
  }
}

function lightingAt(value: unknown): LightingSettings {
  const path = 'settings.lighting'
  const data = objectAt(value, path, ['directional', 'ambient'])
  const directional = objectAt(data.directional, `${path}.directional`, ['position', 'target', 'color', 'intensity'])
  const position = vectorAt(directional.position, `${path}.directional.position`)
  const target = vectorAt(directional.target, `${path}.directional.target`)
  directionAt(position, target, `${path}.directional`)
  const ambient = objectAt(data.ambient, `${path}.ambient`, ['color', 'intensity'])
  return {
    directional: {
      position, target,
      color: colorAt(directional.color, `${path}.directional.color`),
      intensity: numberAt(directional.intensity, `${path}.directional.intensity`, LIMITS.intensity),
    },
    ambient: {
      color: colorAt(ambient.color, `${path}.ambient.color`),
      intensity: numberAt(ambient.intensity, `${path}.ambient.intensity`, LIMITS.intensity),
    },
  }
}

export function validateLighting(value: unknown): ValidationResult<LightingSettings> {
  return check(() => lightingAt(value))
}

function framingAt(value: unknown, canvas: Size2): FramingSettings {
  const path = 'settings.framing'
  const data = objectAt(value, path, ['mode', 'fit'])
  const fit = objectAt(data.fit, `${path}.fit`, ['box', 'alignment', 'offset', 'padding'])
  const offset = objectAt(fit.offset, `${path}.fit.offset`, ['x', 'y'])
  const padding = objectAt(fit.padding, `${path}.fit.padding`, ['top', 'right', 'bottom', 'left'])
  const result: FramingSettings = {
    mode: enumAt(data.mode, `${path}.mode`, ['pixel-fit', 'manual']),
    fit: {
      box: sizeAt(fit.box, `${path}.fit.box`),
      alignment: enumAt(fit.alignment, `${path}.fit.alignment`, [
        'top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right',
      ]),
      offset: { x: numberAt(offset.x, `${path}.fit.offset.x`, LIMITS.offset), y: numberAt(offset.y, `${path}.fit.offset.y`, LIMITS.offset) },
      padding: {
        top: numberAt(padding.top, `${path}.fit.padding.top`, LIMITS.padding),
        right: numberAt(padding.right, `${path}.fit.padding.right`, LIMITS.padding),
        bottom: numberAt(padding.bottom, `${path}.fit.padding.bottom`, LIMITS.padding),
        left: numberAt(padding.left, `${path}.fit.padding.left`, LIMITS.padding),
      },
    },
  }
  const edges = result.fit.padding
  if (edges.left + edges.right >= canvas.width || edges.top + edges.bottom >= canvas.height) {
    throw new InvalidSetting(`${path}.fit.padding`, 'Padding must leave at least one drawable pixel on each axis.')
  }
  return result
}

export function resolveFitBox(canvas: Size2, framing: FramingSettings): Readonly<{ size: Size2; clamped: boolean }> {
  const { box, padding } = framing.fit
  const width = Math.min(box.width, canvas.width - padding.left - padding.right)
  const height = Math.min(box.height, canvas.height - padding.top - padding.bottom)
  return { size: { width, height }, clamped: width !== box.width || height !== box.height }
}

function paletteAt(value: unknown): PaletteSettings {
  const path = 'settings.palette'
  const data = objectAt(value, path, ['colors', 'effectPolicy'])
  if (!Array.isArray(data.colors) || data.colors.length < 1 || data.colors.length > MAX_PALETTE_COLORS) {
    throw new InvalidSetting(`${path}.colors`, `Expected 1–${MAX_PALETTE_COLORS} colors.`)
  }
  return {
    colors: Array.from(data.colors, (color, index) => colorAt(color, `${path}.colors[${index}]`)),
    effectPolicy: enumAt(data.effectPolicy, `${path}.effectPolicy`, ['explicit', 'strict']),
  }
}

function toneAt(value: unknown, colorCount: number): ToneMapping {
  const path = 'settings.shading.tone'
  const kind = enumAt(objectAt(value, path).kind, `${path}.kind`, ['continuous', 'cel', 'bands', 'palette'])
  if (kind === 'continuous' || kind === 'palette') {
    objectAt(value, path, ['kind'])
    return { kind }
  }
  const data = objectAt(value, path, ['kind', 'thresholds'])
  if (!Array.isArray(data.thresholds) || data.thresholds.length !== colorCount - 1) {
    throw new InvalidSetting(`${path}.thresholds`, 'Expected exactly one fewer threshold than palette colors.')
  }
  const thresholds = Array.from(data.thresholds, (threshold, index) => numberAt(threshold, `${path}.thresholds[${index}]`, LIMITS.unit))
  if (thresholds.some((threshold, index) => threshold <= 0 || threshold >= 1 || (index > 0 && threshold <= thresholds[index - 1]))) {
    throw new InvalidSetting(`${path}.thresholds`, 'Thresholds must increase strictly inside (0, 1).')
  }
  return { kind, thresholds }
}

function shadingAt(value: unknown, colorCount: number): ShadingSettings {
  const path = 'settings.shading'
  const data = objectAt(value, path, ['normals', 'tone', 'baseColor', 'shadowColor', 'highlightColor', 'brightness', 'contrast', 'distribution'])
  return {
    normals: enumAt(data.normals, `${path}.normals`, ['smooth', 'flat']),
    tone: toneAt(data.tone, colorCount),
    baseColor: colorAt(data.baseColor, `${path}.baseColor`),
    shadowColor: colorAt(data.shadowColor, `${path}.shadowColor`),
    highlightColor: colorAt(data.highlightColor, `${path}.highlightColor`),
    brightness: numberAt(data.brightness, `${path}.brightness`, LIMITS.brightness),
    contrast: numberAt(data.contrast, `${path}.contrast`, LIMITS.contrast),
    distribution: numberAt(data.distribution, `${path}.distribution`, LIMITS.distribution),
  }
}

function ditherAt(value: unknown): DitherSettings {
  const path = 'settings.dither'
  const kind = enumAt(objectAt(value, path).kind, `${path}.kind`, ['none', 'bayer', 'blue-noise', 'floyd-steinberg'])
  if (kind === 'none') {
    objectAt(value, path, ['kind'])
    return { kind }
  }
  const keys = kind === 'floyd-steinberg' ? ['kind', 'strength'] : ['kind', 'strength', 'patternScale', 'transitionWidth']
  const data = objectAt(value, path, kind === 'bayer' ? [...keys, 'matrixSize'] : keys)
  const strength = numberAt(data.strength, `${path}.strength`, LIMITS.unit)
  if (kind === 'floyd-steinberg') return { kind, strength }
  const pattern = {
    strength,
    patternScale: numberAt(data.patternScale, `${path}.patternScale`, LIMITS.patternScale),
    transitionWidth: numberAt(data.transitionWidth, `${path}.transitionWidth`, LIMITS.unit),
  }
  return kind === 'bayer'
    ? { kind, ...pattern, matrixSize: enumAt(data.matrixSize, `${path}.matrixSize`, [2, 4, 8]) }
    : { kind, ...pattern }
}

function outlineAt(value: unknown): OutlineSettings {
  const path = 'settings.outline'
  const kind = enumAt(objectAt(value, path).kind, `${path}.kind`, ['none', 'silhouette'])
  const data = objectAt(value, path, kind === 'none' ? ['kind'] : ['kind', 'thickness', 'color'])
  return kind === 'none' ? { kind } : {
    kind,
    thickness: numberAt(data.thickness, `${path}.thickness`, LIMITS.outlineThickness),
    color: colorAt(data.color, `${path}.color`),
  }
}

function groundAt(value: unknown): GroundSettings {
  const path = 'settings.ground'
  const kind = enumAt(objectAt(value, path).kind, `${path}.kind`, ['none', 'receiver'])
  const data = objectAt(value, path, kind === 'none' ? ['kind'] : ['kind', 'position', 'width', 'depth', 'appearance'])
  if (kind === 'none') return { kind }
  const appearanceKind = enumAt(objectAt(data.appearance, `${path}.appearance`).kind, `${path}.appearance.kind`, ['visible', 'shadow-only'])
  const appearance = objectAt(data.appearance, `${path}.appearance`, appearanceKind === 'visible' ? ['kind', 'color'] : ['kind'])
  return {
    kind, position: vectorAt(data.position, `${path}.position`),
    width: numberAt(data.width, `${path}.width`, LIMITS.dimension), depth: numberAt(data.depth, `${path}.depth`, LIMITS.dimension),
    appearance: appearanceKind === 'visible'
      ? { kind: appearanceKind, color: colorAt(appearance.color, `${path}.appearance.color`) }
      : { kind: appearanceKind },
  }
}

function shadowsAt(value: unknown): ShadowSettings {
  const path = 'settings.shadows'
  const kind = enumAt(objectAt(value, path).kind, `${path}.kind`, ['none', 'directional'])
  const data = objectAt(value, path, kind === 'none' ? ['kind'] : ['kind', 'self', 'ground', 'strength', 'color', 'bias', 'treatment'], ['bias'])
  if (kind === 'none') return { kind }
  const treatmentKind = enumAt(objectAt(data.treatment, `${path}.treatment`).kind, `${path}.treatment.kind`, ['hard', 'pixel-soft'])
  const treatment = objectAt(data.treatment, `${path}.treatment`, treatmentKind === 'hard' ? ['kind'] : ['kind', 'radius'])
  return {
    kind, self: booleanAt(data.self, `${path}.self`), ground: booleanAt(data.ground, `${path}.ground`),
    strength: numberAt(data.strength, `${path}.strength`, LIMITS.unit), color: colorAt(data.color, `${path}.color`),
    ...(data.bias === undefined ? {} : { bias: numberAt(data.bias, `${path}.bias`, LIMITS.shadowBias) }),
    treatment: treatmentKind === 'hard'
      ? { kind: treatmentKind }
      : { kind: treatmentKind, radius: numberAt(treatment.radius, `${path}.treatment.radius`, LIMITS.softness) },
  }
}

function backgroundAt(value: unknown): BackgroundSettings {
  const path = 'settings.background'
  const kind = enumAt(objectAt(value, path).kind, `${path}.kind`, ['transparent', 'solid'])
  const data = objectAt(value, path, kind === 'transparent' ? ['kind'] : ['kind', 'color'])
  return kind === 'transparent' ? { kind } : { kind, color: colorAt(data.color, `${path}.color`) }
}

export function validateSceneSettings(value: unknown): ValidationResult<SceneSettings> {
  const result = check<SceneSettings>(() => {
    const data = objectAt(value, 'settings', [
      'schemaVersion', 'subject', 'camera', 'lighting', 'canvas', 'framing', 'shading',
      'palette', 'dither', 'outline', 'ground', 'shadows', 'background',
    ])
    if (data.schemaVersion !== SCENE_SCHEMA_VERSION) {
      throw new InvalidSetting('settings.schemaVersion', `Only schema version ${SCENE_SCHEMA_VERSION} is supported.`)
    }
    const subject = objectAt(data.subject, 'settings.subject', ['geometry', 'transform'])
    const canvas = sizeAt(data.canvas, 'settings.canvas')
    if (canvas.width * canvas.height > MAX_CANVAS_PIXELS) throw new InvalidSetting('settings.canvas', `Canvas exceeds ${MAX_CANVAS_PIXELS} pixels.`)
    const palette = paletteAt(data.palette)
    return {
      schemaVersion: SCENE_SCHEMA_VERSION,
      subject: { geometry: geometryAt(subject.geometry), transform: transformAt(subject.transform) },
      camera: cameraAt(data.camera), lighting: lightingAt(data.lighting), canvas,
      framing: framingAt(data.framing, canvas), shading: shadingAt(data.shading, palette.colors.length),
      palette, dither: ditherAt(data.dither), outline: outlineAt(data.outline),
      ground: groundAt(data.ground), shadows: shadowsAt(data.shadows), background: backgroundAt(data.background),
    }
  })
  if (!result.ok) return result
  const { canvas, framing } = result.value
  const fit = resolveFitBox(canvas, framing)
  if (!fit.clamped || framing.mode === 'manual') return result
  return {
    ...result,
    notices: [{
      code: 'fit-box-clamped',
      path: 'settings.framing.fit.box',
      message: `Requested box retained; effective fit box is ${fit.size.width}×${fit.size.height} within the padded canvas.`,
    }],
  }
}

export function validatePalette(input: unknown): ValidationResult<PaletteSettings> {
  return check(() => paletteAt(input))
}
