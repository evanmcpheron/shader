import { createDefaultSettings, PALETTE_PRESETS } from '../domain/defaults'
import type { SceneSettings } from '../domain/settings'

export function createFactoryPresets(): readonly Readonly<{ id: string; name: string; settings: SceneSettings }>[] {
  const sphere = createDefaultSettings()
  const cube: SceneSettings = {
    ...createDefaultSettings(),
    subject: { ...sphere.subject, geometry: { kind: 'cube', width: 2, height: 2, depth: 2 } },
    camera: { ...sphere.camera, position: { x: 4, y: 3, z: 5 } },
    lighting: { ...sphere.lighting, directional: { ...sphere.lighting.directional, position: { x: -4, y: 5, z: 3 } } },
    shading: { ...sphere.shading, normals: 'flat' },
  }
  return [
    { id: 'factory-sphere', name: 'Canonical blue sphere', settings: sphere },
    { id: 'factory-cube', name: 'Directional cube', settings: cube },
    { id: 'factory-dither', name: 'Dithered limited colors', settings: {
      ...createDefaultSettings(),
      palette: { colors: [...PALETTE_PRESETS.gameBoy], effectPolicy: 'strict' },
      dither: { kind: 'bayer', matrixSize: 4, strength: 0.8, patternScale: 1, transitionWidth: 1 },
      outline: { kind: 'silhouette', thickness: 1, color: '#0F380F' },
    } },
  ]
}
