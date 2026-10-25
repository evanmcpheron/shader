import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS, MIN_DIRECTION_LENGTH } from '../domain/constraints'
import type { CameraSettings } from '../domain/settings'
import { CAMERA_VIEWS, cameraDistance, cameraView, switchCameraProjection, withCameraDistance } from '../scene/referenceCamera'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

export function CameraInspector({ store }: { store: StudioStore }) {
  const camera = useStore(store, (state) => state.settings.camera)
  const framing = useStore(store, (state) => state.settings.framing)
  const locked = framing.mode === 'pixel-fit'
  const actions = useStore(store, (state) => state.actions)
  const [resetKey, setResetKey] = useState(0)
  const [error, setError] = useState('')
  const projection = camera.projection

  function commit(next: CameraSettings) {
    const result = actions.setSection('camera', next)
    setError(result.ok ? '' : result.issues[0].message)
    return result
  }

  return (
    <Disclosure title="Camera">
      <p className="field-description">Camera orbit · drag to orbit. In manual framing, middle-drag changes camera distance/zoom; right-drag or Shift-drag pans the camera. Wheel always zooms the preview. Focus the image: arrows pan the camera, Shift+arrows orbit. Move light also orbits from empty space.</p>
      <p className="field-description">When ground is enabled, the camera stays above the floor and orbits stop at the horizon. Camera views and numeric edits follow the same limit. Turn ground off for unrestricted views.</p>
      {locked && <><p className="field-description">Pixel fit controls native size and placement. Camera pan/zoom are disabled; orbit and roll still work.</p><button type="button" onClick={() => actions.setSection('framing', { ...framing, mode: 'manual' })}>Switch to manual framing</button></>}
      <SelectField
        label="Camera projection"
        value={projection.kind}
        options={[{ value: 'orthographic', label: 'Orthographic' }, { value: 'perspective', label: 'Perspective' }]}
        onValueChange={(kind) => commit(switchCameraProjection(camera, kind))}
        description="Switching matches scale at the target plane and keeps target, direction and roll. Perspective changes near/far size relationships. Pixel fit derives a native crop from this orientation; original and final share that crop. Manual framing uses the saved projection."
      />
      <div className="camera-presets" role="group" aria-label="Camera views">
        {CAMERA_VIEWS.map((view) => <button type="button" key={view} onClick={() => commit(cameraView(camera, view))}>{view[0].toUpperCase()}{view.slice(1)}</button>)}
      </div>
      <div key={resetKey}>
        <NumericField label="Camera roll (degrees)" value={camera.roll} bounds={LIMITS.angle} slider={{ min: -180, max: 180, step: 1 }} onValueChange={(roll) => commit({ ...camera, roll })} />
        {projection.kind === 'perspective'
          ? <NumericField label="Field of view (degrees)" value={projection.fov} bounds={LIMITS.fov} slider={{ min: 10, max: 120, step: 1 }} onValueChange={(fov) => commit({ ...camera, projection: { ...projection, fov } })} />
          : <NumericField disabled={locked} label="Orthographic span (world units)" value={projection.verticalSize} bounds={LIMITS.cameraSpan} slider={{ min: 0.1, max: 20, step: 0.1 }} onValueChange={(verticalSize) => commit({ ...camera, projection: { ...projection, verticalSize } })} />}
        <NumericField disabled={locked} label="Camera zoom" value={projection.zoom} bounds={LIMITS.zoom} slider={{ min: 0.1, max: 10, step: 0.1 }} onValueChange={(zoom) => commit({ ...camera, projection: { ...projection, zoom } })} />
        <NumericField disabled={locked} label="Camera distance (world units)" value={cameraDistance(camera)} bounds={{ min: MIN_DIRECTION_LENGTH, max: Math.sqrt(3) * (LIMITS.cameraPosition.max - LIMITS.cameraPosition.min) }} slider={{ min: 0.1, max: 30, step: 0.1 }} onValueChange={(distance) => commit(withCameraDistance(camera, distance))} />
        {(['position', 'target'] as const).map((group) => (
          <fieldset disabled={locked} className="transform-group" key={group}>
            <legend>Camera {group} (world units)</legend>
            {(['x', 'y', 'z'] as const).map((axis) => (
              <NumericField key={axis} label={`Camera ${group} ${axis.toUpperCase()}`} value={camera[group][axis]} bounds={LIMITS.cameraPosition} slider={{ min: -10, max: 10, step: 0.1 }} onValueChange={(value) => commit({ ...camera, [group]: { ...camera[group], [axis]: value } })} />
            ))}
          </fieldset>
        ))}
      </div>
      <button type="button" onClick={() => { actions.resetSection('camera'); setResetKey((key) => key + 1); setError('') }}>Reset camera</button>
      <p className="field-description">Views keep target, distance and roll. Front looks along −Z; top looks down −Y with −Z up. Reset camera restores front, zero roll and orthographic defaults; object and light stay intact.</p>
      {error && <p role="status" className="field-error">Camera unchanged: {error}</p>}
    </Disclosure>
  )
}
