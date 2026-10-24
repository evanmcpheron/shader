import { createDefaultSettings } from './defaults'
import type { LightingSettings, SrgbColor, Vector3 } from './settings'
import { deriveLightDirection, validateLighting } from './validation'
import type { ValidationResult } from './validation'

export type LinearRgb = Readonly<{ r: number; g: number; b: number }>
export type DerivedLighting = Readonly<{
  direction: Vector3
  directional: LinearRgb
  ambient: LinearRgb
}>

export const LIGHT_PRESETS = ['upper-right', 'upper-left', 'overhead', 'side', 'flat-ambient'] as const
export type LightPreset = typeof LIGHT_PRESETS[number]

export function createLightingPreset(preset: LightPreset): LightingSettings {
  const defaults = createDefaultSettings().lighting
  const positions = {
    'upper-right': { x: 3, y: 4, z: 5 },
    'upper-left': { x: -3, y: 4, z: 5 },
    overhead: { x: 0, y: 5, z: 0 },
    side: { x: 5, y: 0, z: 0 },
    'flat-ambient': defaults.directional.position,
  }
  return {
    directional: { ...defaults.directional, position: positions[preset], intensity: preset === 'flat-ambient' ? 0 : 1 },
    ambient: { ...defaults.ambient, intensity: preset === 'flat-ambient' ? 1 : 0.2 },
  }
}

export function decodeSrgb(color: SrgbColor): LinearRgb {
  const channel = (offset: number) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return { r: channel(1), g: channel(3), b: channel(5) }
}

export function deriveLighting(input: LightingSettings): ValidationResult<DerivedLighting> {
  const validation = validateLighting(input)
  if (!validation.ok) return validation
  const { directional, ambient } = validation.value
  const direction = deriveLightDirection(directional.position, directional.target)
  if (!direction.ok) return direction
  const energy = ({ color, intensity }: LightingSettings['ambient']): LinearRgb => {
    const rgb = decodeSrgb(color)
    return { r: rgb.r * intensity, g: rgb.g * intensity, b: rgb.b * intensity }
  }
  return { ok: true, value: { direction: direction.value, directional: energy(directional), ambient: energy(ambient) }, notices: [] }
}

// N and L share a coordinate space; L points from the surface toward the source.
// Keep linear energy unclamped until display conversion or later tone processing.
export function lambertIllumination(unitNormal: Vector3, light: DerivedLighting, visibility = 1): LinearRgb {
  const l = light.direction
  const diffuse = Math.max(0, Math.min(1, unitNormal.x * l.x + unitNormal.y * l.y + unitNormal.z * l.z)) * Math.max(0, Math.min(1, visibility))
  return {
    r: light.ambient.r + light.directional.r * diffuse,
    g: light.ambient.g + light.directional.g * diffuse,
    b: light.ambient.b + light.directional.b * diffuse,
  }
}
