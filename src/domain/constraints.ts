export type NumericBounds = Readonly<{ min: number; max: number; integer?: boolean }>

export const LIMITS = {
  canvasAxis: { min: 1, max: 1024, integer: true },
  dimension: { min: 0.001, max: 1000 },
  position: { min: -10_000, max: 10_000 },
  cameraPosition: { min: -100_000_000, max: 100_000_000 },
  cameraSpan: { min: 0.00000001, max: 100_000_000 },
  angle: { min: -360, max: 360 },
  scale: { min: -1000, max: 1000 },
  segments: { min: 1, max: 128, integer: true },
  radialSegments: { min: 3, max: 128, integer: true },
  sphereHeightSegments: { min: 2, max: 128, integer: true },
  zoom: { min: 0.01, max: 100 },
  fov: { min: 1, max: 179 },
  intensity: { min: 0, max: 10 },
  unit: { min: 0, max: 1 },
  brightness: { min: -1, max: 1 },
  contrast: { min: 0, max: 4 },
  distribution: { min: 0.1, max: 4 },
  offset: { min: -1024, max: 1024, integer: true },
  padding: { min: 0, max: 1023, integer: true },
  patternScale: { min: 1, max: 8, integer: true },
  outlineThickness: { min: 1, max: 8, integer: true },
  softness: { min: 0, max: 4, integer: true },
  shadowBias: { min: 0, max: 2 },
  previewZoom: { min: 0.125, max: 64 },
  previewPan: { min: -1_000_000, max: 1_000_000 },
} as const satisfies Record<string, NumericBounds>

export const MAX_CANVAS_PIXELS = 1_048_576
export const MIN_SCALE_MAGNITUDE = 0.001
export const MIN_DIRECTION_LENGTH = 0.000001
export const MAX_PALETTE_COLORS = 32
