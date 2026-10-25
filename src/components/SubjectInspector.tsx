import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import type { NumericBounds } from '../domain/constraints'
import { createDefaultPrimitive } from '../domain/defaults'
import type { Primitive, PrimitiveKind, Transform } from '../domain/settings'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'
import type { SliderRange } from './NumericField'

const shapes = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'cone', label: 'Cone' },
  { value: 'pyramid', label: 'Square pyramid' },
  { value: 'torus', label: 'Torus' },
  { value: 'plane', label: 'Plane' },
] as const

type Parameter = Readonly<{ key: string; label: string; value: number; bounds: NumericBounds; slider: SliderRange }>

function geometryParameters(geometry: Primitive): Parameter[] {
  const dimension = (key: string, label: string, value: number): Parameter => ({ key, label, value, bounds: LIMITS.dimension, slider: { min: 0.05, max: 4, step: 0.05 } })
  const segments = (key: string, label: string, value: number, bounds: NumericBounds = LIMITS.segments): Parameter => ({ key, label, value, bounds, slider: { min: bounds.min, max: bounds.max, step: 1 } })
  switch (geometry.kind) {
    case 'sphere': return [dimension('radius', 'Radius', geometry.radius), segments('widthSegments', 'Width segments', geometry.widthSegments, LIMITS.radialSegments), segments('heightSegments', 'Height segments', geometry.heightSegments, LIMITS.sphereHeightSegments)]
    case 'cube': return [dimension('width', 'Width', geometry.width), dimension('height', 'Height', geometry.height), dimension('depth', 'Depth', geometry.depth)]
    case 'cylinder':
    case 'cone': return [dimension('radius', 'Radius', geometry.radius), dimension('height', 'Height', geometry.height), segments('radialSegments', 'Radial segments', geometry.radialSegments, LIMITS.radialSegments), segments('heightSegments', 'Height segments', geometry.heightSegments)]
    case 'pyramid': return [dimension('baseSize', 'Base size', geometry.baseSize), dimension('height', 'Height', geometry.height)]
    case 'torus': return [dimension('radius', 'Major radius', geometry.radius), dimension('tubeRadius', 'Tube radius', geometry.tubeRadius), segments('radialSegments', 'Tube segments', geometry.radialSegments, LIMITS.radialSegments), segments('tubularSegments', 'Ring segments', geometry.tubularSegments, LIMITS.radialSegments)]
    case 'plane': return [dimension('width', 'Width', geometry.width), dimension('height', 'Height', geometry.height), segments('widthSegments', 'Width segments', geometry.widthSegments), segments('heightSegments', 'Height segments', geometry.heightSegments)]
  }
}

const transformGroups: readonly Readonly<{ key: keyof Transform; label: string; bounds: NumericBounds; slider: SliderRange }>[] = [
  { key: 'position', label: 'Position (world units)', bounds: LIMITS.position, slider: { min: -3, max: 3, step: 0.05 } },
  { key: 'rotation', label: 'Rotation (degrees, XYZ)', bounds: LIMITS.angle, slider: { min: -180, max: 180, step: 1 } },
  { key: 'scale', label: 'Scale (multiplier)', bounds: LIMITS.scale, slider: { min: 0.1, max: 3, step: 0.05 } },
]

export function SubjectInspector({ store }: { store: StudioStore }) {
  const modelImport = useStore(store, (state) => state.modelImport)
  const subject = useStore(store, (state) => state.settings.subject)
  const wireframe = useStore(store, (state) => state.preview.referenceWireframe)
  const actions = useStore(store, (state) => state.actions)
  const [resetKey, setResetKey] = useState(0)
  const geometry = subject.geometry
  const pendingAsset = geometry.kind === 'imported' && !store.assets.getAsset(geometry)

  function selectShape(kind: PrimitiveKind) {
    actions.selectPrimitive(kind)
    setResetKey((key) => key + 1)
  }

  return (
    <>
      <Disclosure title="Subject">
        <SelectField
          label="Shape"
          value={geometry.kind}
          options={geometry.kind === 'imported' ? [...shapes, { value: 'imported', label: geometry.asset.fileName }] : shapes}
          onValueChange={(kind) => { if (kind !== 'imported') selectShape(kind) }}
          description="Selection keeps transforms, camera, light and style. Use Reframe reference to center and size the camera."
        />
        <Disclosure title="Local model import" defaultOpen={false}>
        <label className="field-label" htmlFor="local-model-files">{geometry.kind === 'imported' ? 'Reselect / replace local model' : 'Import local model'}</label>
        <input id="local-model-files" type="file" multiple accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp" onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) void store.assets.select(files, pendingAsset && geometry.kind === 'imported' ? geometry : undefined)
        }} />
        <p className="field-description">Select one GLB/glTF 2.0 plus all .bin/textures together. Local static triangles only: 25 MiB total, 250,000 vertices / triangles, 64 files, 2,048 nodes and 64 hierarchy levels. No remote resources. Export without compression, skins, morphs or animations.</p>
        {modelImport.kind === 'loading' && <button type="button" onClick={() => store.assets.cancel()}>Cancel import</button>}
        {modelImport.message && <p role={modelImport.kind === 'error' ? 'alert' : 'status'} className={modelImport.kind === 'error' ? 'field-error' : 'field-description'}>{modelImport.message}</p>}
        {pendingAsset && <div role="status"><p>Saved model pending reselect. Choose the original matching file and companions above. Scene settings are preserved.</p><button type="button" onClick={() => selectShape('sphere')}>Use built-in sphere</button></div>}
        {geometry.kind === 'imported' && <p className="field-description">{geometry.asset.fileName} · {geometry.asset.format.toUpperCase()} · {geometry.asset.sha256.slice(0, 12)}. Centered and normalized to 2 world units on the longest axis; user transforms remain independent. Studio appearance replaces imported materials. Cameras/lights are ignored. Files must be reselected after reload; settings contain a descriptor only.</p>}
        </Disclosure>
        {geometry.kind !== 'imported' && (
          <div className="geometry-fields">
            <p className="field-description">Dimensions use world units. Sliders cover common sizes; type for the full range. Segments are whole numbers up to 128.</p>
            {geometryParameters(geometry).map((parameter) => (
              <NumericField
                {...parameter}
                key={`${geometry.kind}-${resetKey}-${parameter.key}`}
                onValueChange={(value) => actions.setSection('subject', { ...subject, geometry: { ...geometry, [parameter.key]: value } })}
              />
            ))}
            <button type="button" onClick={() => {
              actions.setSection('subject', { ...subject, geometry: createDefaultPrimitive(geometry.kind) })
              setResetKey((key) => key + 1)
            }}>Reset geometry</button>
            {geometry.kind === 'pyramid' && <p className="field-description">Square base in XZ with axis-aligned sides, apex +Y, flat faces.</p>}
            {geometry.kind === 'plane' && <p className="field-description">XY reference plane, visible from both sides. It is separate from the ground receiver.</p>}
            {geometry.kind === 'torus' && <p className="field-description">Major radius measures the ring centerline. Tube radius must be smaller.</p>}
          </div>
        )}
        <label className="checkbox-field"><input type="checkbox" checked={wireframe} onChange={(event) => actions.setPreview({ referenceWireframe: event.target.checked })} />Show mesh edges</label>
        <p className="field-description">View-only topology shows triangle edges, including hidden faces. Subdivisions on flat surfaces do not change the silhouette.</p>
      </Disclosure>
      <Disclosure title="Object transforms">
        <div>
          {transformGroups.map((group) => (
            <fieldset className="transform-group" key={`${resetKey}-${group.key}`}>
              <legend>{group.label}</legend>
              {(['x', 'y', 'z'] as const).map((axis) => (
                <NumericField
                  key={axis}
                  label={`${group.key[0].toUpperCase()}${group.key.slice(1)} ${axis.toUpperCase()}`}
                  value={subject.transform[group.key][axis]}
                  bounds={group.bounds}
                  slider={group.slider}
                  onValueChange={(value) => actions.setSection('subject', { ...subject, transform: { ...subject.transform, [group.key]: { ...subject.transform[group.key], [axis]: value } } })}
                />
              ))}
            </fieldset>
          ))}
          <button type="button" onClick={() => { actions.resetTransforms(); setResetKey((key) => key + 1) }}>Reset transforms</button>
          <p className="field-description">Scale may be negative to mirror; its magnitude must be at least 0.001. Reframe if the object moves out of view. These controls keep camera settings intact.</p>
        </div>
      </Disclosure>
    </>
  )
}
