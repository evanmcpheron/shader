import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import { createLightingPreset, LIGHT_PRESETS } from '../domain/lighting'
import type { LightingSettings } from '../domain/settings'
import { deriveLightDirection } from '../domain/validation'
import { ColorField } from './ColorField'
import { Disclosure } from './controls'
import { NumericField } from './NumericField'

export function LightInspector({ store }: { store: StudioStore }) {
  const lighting = useStore(store, (state) => state.settings.lighting)
  const actions = useStore(store, (state) => state.actions)
  const [resetKey, setResetKey] = useState(0)
  const direction = deriveLightDirection(lighting.directional.position, lighting.directional.target)
  function commit(next: LightingSettings) { return actions.setSection('lighting', next) }

  return (
    <Disclosure title="Lighting">
      <p className="field-description">One directional source plus ambient fill. Presets use world axes: +X right, +Y up, +Z front. They change lighting only.</p>
      <div className="camera-presets" role="group" aria-label="Lighting presets">
        {LIGHT_PRESETS.map((preset) => <button type="button" key={preset} onClick={() => { commit(createLightingPreset(preset)); setResetKey((key) => key + 1) }}>{preset.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')}</button>)}
      </div>
      <div key={resetKey}>
        <ColorField label="Directional color" value={lighting.directional.color} onValueChange={(color) => commit({ ...lighting, directional: { ...lighting.directional, color } })} />
        <NumericField label="Directional intensity" value={lighting.directional.intensity} bounds={LIMITS.intensity} slider={{ min: 0, max: 3, step: 0.05 }} onValueChange={(intensity) => commit({ ...lighting, directional: { ...lighting.directional, intensity } })} />
        <ColorField label="Ambient color" value={lighting.ambient.color} onValueChange={(color) => commit({ ...lighting, ambient: { ...lighting.ambient, color } })} />
        <NumericField label="Ambient intensity" value={lighting.ambient.intensity} bounds={LIMITS.intensity} slider={{ min: 0, max: 1, step: 0.05 }} onValueChange={(intensity) => commit({ ...lighting, ambient: { ...lighting.ambient, intensity } })} />
        {(['position', 'target'] as const).map((group) => (
          <fieldset className="transform-group" key={group}>
            <legend>Light {group} (world units)</legend>
            {(['x', 'y', 'z'] as const).map((axis) => <NumericField key={axis} label={`Light ${group} ${axis.toUpperCase()}`} value={lighting.directional[group][axis]} bounds={LIMITS.position} slider={{ min: -10, max: 10, step: 0.1 }} onValueChange={(value) => commit({ ...lighting, directional: { ...lighting.directional, [group]: { ...lighting.directional[group], [axis]: value } } })} />)}
          </fieldset>
        ))}
      </div>
      {direction.ok && <p className="field-description">Surface → light: ({[direction.value.x, direction.value.y, direction.value.z].map((value) => value.toFixed(3)).join(', ')}). Derived from position − target; distance does not change brightness.</p>}
      <button type="button" onClick={() => { actions.resetSection('lighting'); setResetKey((key) => key + 1) }}>Reset lighting</button>
      <p className="field-description">Move light: drag the amber handle around the target on a screen arcball, keeping its distance. The handle shows direction at a convenient display radius. Empty space orbits the camera; Escape cancels a light drag. Numeric inputs work in every tool.</p>
      <p className="field-description">If the target or handle is outside the view, adjust the light target or camera numerically to bring it back.</p>
      <p className="field-description">Continuous reference colors use linear diffuse + ambient light. Intensities 0–10; bright colors saturate at display white. Ground & shadows adds optional directional visibility before shading; ambient fill is preserved. Reset lighting keeps ground and shadow settings.</p>
    </Disclosure>
  )
}
