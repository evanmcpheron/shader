import { SCENE_SCHEMA_VERSION } from './settings'
import type { Primitive, PrimitiveKind, SceneSettings, SrgbColor, ToneMapping, Transform } from './settings'

export const PALETTE_PRESETS = {
  grayscale: ['#202020', '#686868', '#B0B0B0', '#F0F0F0'],
  gameBoy: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
  nes: ['#1C1C1C', '#2038EC', '#38B4FC', '#FCFCFC'],
  warm: ['#301B28', '#78404A', '#C47761', '#F4D7A1'],
  cool: ['#172038', '#304878', '#5C88B8', '#B8D8F0'],
} as const satisfies Record<string, readonly SrgbColor[]>

export const CANVAS_PRESETS = [8, 16, 24, 32, 48, 64, 96, 128, 256] as const

export function createDefaultPrimitive(kind: PrimitiveKind): Primitive {
  switch (kind) {
    case 'sphere': return { kind, radius: 1, widthSegments: 64, heightSegments: 32 }
    case 'cube': return { kind, width: 2, height: 2, depth: 2 }
    case 'cylinder': return { kind, radius: 1, height: 2, radialSegments: 32, heightSegments: 1 }
    case 'cone': return { kind, radius: 1, height: 2, radialSegments: 32, heightSegments: 1 }
    case 'pyramid': return { kind, baseSize: 2, height: 2 }
    case 'torus': return { kind, radius: 0.75, tubeRadius: 0.25, radialSegments: 16, tubularSegments: 64 }
    case 'plane': return { kind, width: 2, height: 2, widthSegments: 1, heightSegments: 1 }
  }
}

export function createDefaultTransform(): Transform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  }
}

export function evenlySpacedThresholds(colorCount: number): number[] {
  return Array.from({ length: colorCount - 1 }, (_, index) => (index + 1) / colorCount)
}

export function withPaletteSize(tone: ToneMapping, colorCount: number): ToneMapping {
  return tone.kind === 'cel' || tone.kind === 'bands'
    ? { kind: tone.kind, thresholds: evenlySpacedThresholds(colorCount) }
    : tone
}

export function createDefaultSettings(): SceneSettings {
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    subject: { geometry: createDefaultPrimitive('sphere'), transform: createDefaultTransform() },
    camera: {
      position: { x: 0, y: 0, z: 5 },
      target: { x: 0, y: 0, z: 0 },
      roll: 0,
      projection: { kind: 'orthographic', verticalSize: 4, zoom: 1 },
    },
    lighting: {
      directional: { position: { x: 3, y: 4, z: 5 }, target: { x: 0, y: 0, z: 0 }, color: '#FFFFFF', intensity: 1 },
      ambient: { color: '#FFFFFF', intensity: 0.2 },
    },
    canvas: { width: 64, height: 64 },
    framing: {
      mode: 'pixel-fit',
      fit: {
        box: { width: 32, height: 32 },
        alignment: 'center',
        offset: { x: 0, y: 0 },
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
    shading: {
      normals: 'smooth',
      tone: { kind: 'bands', thresholds: evenlySpacedThresholds(4) },
      baseColor: '#5C88B8',
      shadowColor: '#172038',
      highlightColor: '#B8D8F0',
      brightness: 0,
      contrast: 1,
      distribution: 1,
    },
    palette: { colors: [...PALETTE_PRESETS.cool], effectPolicy: 'explicit' },
    dither: { kind: 'none' },
    outline: { kind: 'none' },
    ground: { kind: 'none' },
    shadows: { kind: 'none' },
    background: { kind: 'transparent' },
  }
}
