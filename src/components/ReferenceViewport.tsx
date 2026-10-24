import { useLayoutEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref, RefObject } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { ReferenceRuntime } from '../scene/referenceRuntime'
import type { CreationFailure } from '../scene/referenceRuntime'
import { NumericField } from './NumericField'
import { LIMITS } from '../domain/constraints'
import { stepPreviewZoom } from '../scene/viewTransform'

export type ReferenceHandle = Readonly<{ reframe: () => void; exportPng: () => Promise<string> }>

function ReferenceSession({ store, runtimeRef, failure, onRetry }: {
  store: StudioStore
  runtimeRef: RefObject<ReferenceRuntime | null>
  failure?: CreationFailure
  onRetry: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const status = useStore(store, (state) => state.referenceStatus)
  const mode = useStore(store, (state) => state.preview.mode)
  const geometry = useStore(store, (state) => state.settings.subject.geometry)
  const modelImport = useStore(store, (state) => state.modelImport)
  const pendingAsset = geometry.kind === 'imported' && !store.assets.getAsset(geometry)

  // OrbitControls disconnects from the host's current root; dispose before React detaches it.
  useLayoutEffect(() => {
    store.getState().actions.setReferenceStatus({ kind: 'starting' })
    try {
      runtimeRef.current = new ReferenceRuntime(host.current!, store, failure)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The renderer could not be created.'
      store.getState().actions.setReferenceStatus({ kind: 'unavailable', message: `Reference unavailable. ${message}` })
    }
    return () => {
      runtimeRef.current?.dispose()
      runtimeRef.current = null
    }
  }, [store, runtimeRef, failure])

  return (
    <div className="reference-surface">
      <div className="reference-host" data-mode={mode} ref={host} />
      {status.kind !== 'ready' && (
        <div className="reference-overlay">
          <div className="empty-state">
            <p className="eyebrow">3D reference</p>
            <h3>{pendingAsset ? 'Saved model needs reselect' : status.kind === 'starting' ? 'Starting renderer…' : 'Reference unavailable'}</h3>
            {pendingAsset && geometry.kind === 'imported' ? <>
              <p>Reselect {geometry.asset.fileName} and the same companion files. Settings are preserved; model bytes are local to each session.</p>
              <label htmlFor="pending-model-files">Reselect saved model files</label>
              <input id="pending-model-files" type="file" multiple accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp" onChange={event => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                if (files.length) void store.assets.select(files, geometry)
              }} />
              {modelImport.message && <p role={modelImport.kind === 'error' ? 'alert' : 'status'}>{modelImport.message}</p>}
              {modelImport.kind === 'loading' && <button type="button" onClick={() => store.assets.cancel()}>Cancel model reselect</button>}
              <button type="button" onClick={() => store.getState().actions.selectPrimitive('sphere')}>Use built-in sphere instead</button>
            </> : status.kind === 'unavailable' && <><p>{status.message}</p><button type="button" onClick={onRetry}>Retry renderer</button></>}
          </div>
        </div>
      )}
    </div>
  )
}

export function ReferenceViewport({ store, ref }: { store: StudioStore; ref?: Ref<ReferenceHandle> }) {
  const runtime = useRef<ReferenceRuntime | null>(null)
  const [attempt, setAttempt] = useState<{ generation: number; failure?: CreationFailure }>({ generation: 0 })
  const [diagnostics, setDiagnostics] = useState('Click Refresh diagnostics to inspect the current renderer.')
  const status = useStore(store, (state) => state.referenceStatus)
  const mode = useStore(store, (state) => state.preview.mode)
  const zoom = useStore(store, (state) => state.preview.zoom)
  const pan = useStore(store, (state) => state.preview.pan)
  const grid = useStore(store, (state) => state.preview.grid)
  const checkerboard = useStore(store, (state) => state.preview.checkerboard)
  const canvas = useStore(store, (state) => state.settings.canvas)
  const measured = useStore(store, (state) => state.nativeFraming?.report.actual)
  const ground = useStore(store, (state) => state.nativeGround)
  const outline = useStore(store, (state) => state.nativeOutline)
  const revision = useStore(store, (state) => state.revisions.settings)
  const effect = outline?.revision === revision ? outline.report : null
  useImperativeHandle(ref, () => ({
    reframe: () => runtime.current?.reframe(),
    exportPng: () => runtime.current?.exportPng() ?? Promise.reject(new Error('Renderer unavailable. Retry renderer before exporting.')),
  }), [])

  function reconstruct(failure?: CreationFailure) {
    setAttempt((previous) => ({ generation: previous.generation + 1, failure }))
  }

  return (
    <div className="reference-view">
      <ReferenceSession key={attempt.generation} store={store} runtimeRef={runtime} failure={attempt.failure} onRetry={() => reconstruct()} />
      <div className="reference-caption">
        <div className="preview-modes" role="group" aria-label="Workspace view">
          <button type="button" aria-pressed={mode === 'final'} onClick={() => store.getState().actions.setPreview({ mode: 'final' })}>Final only</button>
          <button type="button" aria-pressed={mode === 'reference'} onClick={() => store.getState().actions.setPreview({ mode: 'reference' })}>Original only</button>
          <button type="button" aria-pressed={mode === 'side-by-side'} onClick={() => store.getState().actions.setPreview({ mode: 'side-by-side' })}>Compare</button>
        </div>
        <span>Original uses active normals, light and native framing before tone, signal and outline effects. Styling applies to Final only.</span>
        <button type="button" disabled={status.kind !== 'ready'} onClick={() => runtime.current?.reframe()}>Reframe reference</button>
      </div>
      <div className="preview-controls" role="group" aria-label="Preview navigation">
        <button type="button" aria-label="Zoom out" onClick={() => store.getState().actions.setPreview({ zoom: stepPreviewZoom(zoom, -1) })}>−</button>
        <NumericField label="Preview zoom (%)" value={zoom * 100} bounds={{ min: LIMITS.previewZoom.min * 100, max: LIMITS.previewZoom.max * 100 }} onValueChange={(value) => store.getState().actions.setPreview({ zoom: value / 100 })} />
        <button type="button" aria-label="Zoom in" onClick={() => store.getState().actions.setPreview({ zoom: stepPreviewZoom(zoom, 1) })}>+</button>
        <button type="button" disabled={status.kind !== 'ready'} onClick={() => runtime.current?.fitPreview()}>Fit view</button>
        <button type="button" onClick={() => store.getState().actions.setPreview({ zoom: 1, pan: { x: 0, y: 0 } })}>100% / native</button>
        <button type="button" onClick={() => store.getState().actions.setPreview({ pan: { x: 0, y: 0 } })}>Center view</button>
        <label><input type="checkbox" checked={grid} onChange={(event) => store.getState().actions.setPreview({ grid: event.target.checked })} /> Pixel grid</label>
        <label><input type="checkbox" checked={checkerboard} onChange={(event) => store.getState().actions.setPreview({ checkerboard: event.target.checked })} /> Checkerboard</label>
      </div>
      <p className="preview-readout">PNG / canvas {canvas.width} × {canvas.height} px · Subject {measured ? `${measured.width} × ${measured.height} px` : 'not measured'} · Preview zoom {Number((zoom * 100).toFixed(2))}% · Pan {pan.x}, {pan.y} CSS px</p>
      {effect && <p className={effect.clipped ? 'field-error' : 'preview-readout'} role="status">Outline {effect.thickness} px · {effect.color} · Effect {effect.extent ? `${effect.extent.width} × ${effect.extent.height} px` : 'empty'}{effect.clipped ? ' · outline clipped to canvas; dimensions unchanged' : ''}</p>}
      {ground?.revision === revision && ground.report && <p className={ground.report.receiverClipped || ground.report.shadowClipped ? 'field-error' : 'preview-readout'} role="status">Ground extent {ground.report.receiverExtent ? `${ground.report.receiverExtent.width} × ${ground.report.receiverExtent.height} px` : 'empty'} · Shadow bound {ground.report.shadowExtent ? `${ground.report.shadowExtent.width} × ${ground.report.shadowExtent.height} px` : 'empty'} · {ground.report.receiverClipped ? 'receiver clipped' : 'receiver within canvas'} · {ground.report.shadowClipped ? 'shadow clipped by canvas or receiver' : 'shadow within bounds'}. {ground.report.notice}</p>}
      <p className="preview-help">Wheel zooms preview · F fit · N native · 0 reset · Pan tool: arrows move, Shift moves faster. {zoom < 4 && grid ? 'Grid hidden below 400%. ' : ''}{!Number.isInteger(zoom) ? 'Fractional zoom uses nearest pixels; display blocks may have unequal widths. ' : ''}100% = one output pixel per CSS pixel at 100% browser zoom.</p>
      {import.meta.env.DEV && new URLSearchParams(window.location.search).has('scene-checks') && (
        <details className="renderer-diagnostics">
          <summary>Renderer verification (development only)</summary>
          <div className="diagnostic-actions">
            <button type="button" onClick={() => setDiagnostics(JSON.stringify(runtime.current?.diagnostics() ?? { unavailable: true }, null, 2))}>Refresh diagnostics</button>
            <button type="button" onClick={() => setDiagnostics(JSON.stringify(runtime.current?.inspectNativePasses() ?? null))}>Inspect native passes</button>
            <button type="button" disabled={status.kind !== 'ready'} onClick={() => runtime.current?.simulateContextLoss()}>Simulate context loss</button>
            <button type="button" onClick={() => reconstruct('no-context')}>Simulate unavailable WebGL2</button>
            <button type="button" onClick={() => reconstruct('allocation')}>Simulate allocation failure</button>
            <button type="button" onClick={() => reconstruct('native-allocation')}>Simulate native allocation failure</button>
            <button type="button" onClick={() => reconstruct()}>Remount reference</button>
            <button type="button" disabled={status.kind !== 'ready'} onClick={() => setDiagnostics(JSON.stringify(runtime.current?.inspectNativePixels() ?? null))}>Inspect native RGBA</button>
            <button type="button" disabled={status.kind !== 'ready'} onClick={() => setDiagnostics(JSON.stringify(runtime.current?.inspectNativePixels(true) ?? null))}>Inspect original RGBA</button>
            <button type="button" onClick={() => setDiagnostics(JSON.stringify(runtime.current?.inspectExportPixels() ?? null))}>Inspect exported RGBA</button>
          </div>
          <pre aria-label="Renderer diagnostics">{diagnostics}</pre>
        </details>
      )}
    </div>
  )
}
