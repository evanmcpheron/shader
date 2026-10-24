export const SCENE_SCHEMA_VERSION = 1

export type Vector3 = Readonly<{ x: number; y: number; z: number }>
export type Size2 = Readonly<{ width: number; height: number }>
export type SrgbColor = `#${string}`

export type Primitive =
  | Readonly<{ kind: 'sphere'; radius: number; widthSegments: number; heightSegments: number }>
  | Readonly<{ kind: 'cube'; width: number; height: number; depth: number }>
  | Readonly<{ kind: 'cylinder'; radius: number; height: number; radialSegments: number; heightSegments: number }>
  | Readonly<{ kind: 'cone'; radius: number; height: number; radialSegments: number; heightSegments: number }>
  | Readonly<{ kind: 'pyramid'; baseSize: number; height: number }>
  | Readonly<{ kind: 'torus'; radius: number; tubeRadius: number; radialSegments: number; tubularSegments: number }>
  | Readonly<{ kind: 'plane'; width: number; height: number; widthSegments: number; heightSegments: number }>

export type PrimitiveKind = Primitive['kind']

export type ImportedSubject = Readonly<{
  kind: 'imported'
  asset: Readonly<{ fileName: string; format: 'glb' | 'gltf'; sha256: string }>
}>

export type Transform = Readonly<{
  position: Vector3
  rotation: Vector3
  scale: Vector3
}>

export type SubjectSettings = Readonly<{
  geometry: Primitive | ImportedSubject
  transform: Transform
}>

export type CameraSettings = Readonly<{
  position: Vector3
  target: Vector3
  roll: number
  projection:
    | Readonly<{ kind: 'orthographic'; verticalSize: number; zoom: number }>
    | Readonly<{ kind: 'perspective'; fov: number; zoom: number }>
}>

export type LightingSettings = Readonly<{
  directional: Readonly<{ position: Vector3; target: Vector3; color: SrgbColor; intensity: number }>
  ambient: Readonly<{ color: SrgbColor; intensity: number }>
}>

export type Alignment =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

export type FramingSettings = Readonly<{
  mode: 'pixel-fit' | 'manual'
  fit: Readonly<{
    box: Size2
    alignment: Alignment
    offset: Readonly<{ x: number; y: number }>
    padding: Readonly<{ top: number; right: number; bottom: number; left: number }>
  }>
}>

export type ToneMapping =
  | Readonly<{ kind: 'continuous' }>
  | Readonly<{ kind: 'cel'; thresholds: readonly number[] }>
  | Readonly<{ kind: 'bands'; thresholds: readonly number[] }>
  | Readonly<{ kind: 'palette' }>

export type ShadingSettings = Readonly<{
  normals: 'smooth' | 'flat'
  tone: ToneMapping
  baseColor: SrgbColor
  shadowColor: SrgbColor
  highlightColor: SrgbColor
  brightness: number
  contrast: number
  distribution: number
}>

export type PaletteSettings = Readonly<{
  colors: readonly SrgbColor[]
  effectPolicy: 'explicit' | 'strict'
}>

export type DitherSettings =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'bayer'; matrixSize: 2 | 4 | 8; strength: number; patternScale: number; transitionWidth: number }>
  | Readonly<{ kind: 'blue-noise'; strength: number; patternScale: number; transitionWidth: number }>
  | Readonly<{ kind: 'floyd-steinberg'; strength: number }>

export type OutlineSettings =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'silhouette'; thickness: number; color: SrgbColor }>

export type GroundSettings =
  | Readonly<{ kind: 'none' }>
  | Readonly<{
    kind: 'receiver'
    position: Vector3
    width: number
    depth: number
    appearance: Readonly<{ kind: 'visible'; color: SrgbColor }> | Readonly<{ kind: 'shadow-only' }>
  }>

export type ShadowSettings =
  | Readonly<{ kind: 'none' }>
  | Readonly<{
    kind: 'directional'
    self: boolean
    ground: boolean
    strength: number
    color: SrgbColor
    bias?: number
    treatment: Readonly<{ kind: 'hard' }> | Readonly<{ kind: 'pixel-soft'; radius: number }>
  }>

export type BackgroundSettings =
  | Readonly<{ kind: 'transparent' }>
  | Readonly<{ kind: 'solid'; color: SrgbColor }>

export type SceneSettings = Readonly<{
  schemaVersion: typeof SCENE_SCHEMA_VERSION
  subject: SubjectSettings
  camera: CameraSettings
  lighting: LightingSettings
  canvas: Size2
  framing: FramingSettings
  shading: ShadingSettings
  palette: PaletteSettings
  dither: DitherSettings
  outline: OutlineSettings
  ground: GroundSettings
  shadows: ShadowSettings
  background: BackgroundSettings
}>

export type SceneSection = Exclude<keyof SceneSettings, 'schemaVersion'>
