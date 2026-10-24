import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import type { Alignment, FramingSettings } from '../domain/settings'
import { resolveFitBox } from '../domain/validation'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

const alignments: readonly Alignment[] = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right']

export function FramingInspector({ store }: { store: StudioStore }) {
  const framing = useStore(store, (state) => state.settings.framing)
  const canvas = useStore(store, (state) => state.settings.canvas)
  const measurement = useStore(store, (state) => state.nativeFraming)
  const captureRevision = useStore(store, (state) => state.revisions.capture)
  const actions = useStore(store, (state) => state.actions)
  const [resetKey, setResetKey] = useState(0)
  const [error, setError] = useState('')
  const resolved = resolveFitBox(canvas, framing)
  const report = measurement?.captureRevision === captureRevision ? measurement.report : null
  const actual = report?.actual
  const fit = framing.fit

  function commit(next: FramingSettings) {
    const result = actions.setSection('framing', next)
    setError(result.ok ? '' : result.issues[0].message)
    return result
  }

  return (
    <Disclosure title="Subject framing">
      <SelectField label="Framing mode" value={framing.mode} options={[{ value: 'pixel-fit', label: 'Pixel fit' }, { value: 'manual', label: 'Manual camera' }]} onValueChange={(mode) => commit({ ...framing, mode })} description="Pixel fit contains the projected shape without stretching it. Orbit and roll refit; camera pan/zoom are locked. Manual framing uses the saved camera and retains fit values." />
      <p className="field-description">Requested box: <strong>{fit.box.width} × {fit.box.height} px</strong>. Effective maximum: {resolved.size.width} × {resolved.size.height} px.</p>
      {resolved.clamped && <p className="field-error">Requested box retained and clamped to the padded drawable area{framing.mode === 'manual' ? ' when pixel fit is enabled' : ''}.</p>}
      <p className="field-description" aria-label="Measured subject bounds">{report ? actual
        ? `Measured subject: ${actual.width} × ${actual.height} px · x=${actual.x}..${actual.x + actual.width - 1}, y=${actual.y}..${actual.y + actual.height - 1}${report.clipped ? ' · clipped' : ''}.`
        : 'Measured subject: empty (no visible subject pixels).'
        : 'Subject measurement pending an available native frame.'}</p>
      {report?.notice && <p className="field-error" aria-label="Framing notice">{report.notice}</p>}
      <div key={resetKey}>
        <fieldset disabled={framing.mode === 'manual'} className="transform-group">
          <legend>Pixel fit settings</legend>
          {(['width', 'height'] as const).map((axis) => <NumericField key={axis} label={`Subject box ${axis} (pixels)`} value={fit.box[axis]} bounds={LIMITS.canvasAxis} slider={{ min: 1, max: 256, step: 1 }} onValueChange={(value) => commit({ ...framing, fit: { ...fit, box: { ...fit.box, [axis]: value } } })} />)}
          <SelectField description="Position within the padded canvas." label="Subject alignment" value={fit.alignment} options={alignments.map((value) => ({ value, label: value.replaceAll('-', ' ') }))} onValueChange={(alignment) => commit({ ...framing, fit: { ...fit, alignment } })} />
          {(['x', 'y'] as const).map((axis) => <NumericField key={axis} label={`Subject offset ${axis.toUpperCase()} (pixels)`} value={fit.offset[axis]} bounds={LIMITS.offset} slider={{ min: -64, max: 64, step: 1 }} onValueChange={(value) => commit({ ...framing, fit: { ...fit, offset: { ...fit.offset, [axis]: value } } })} />)}
          {(['top', 'right', 'bottom', 'left'] as const).map((edge) => <NumericField key={edge} label={`Padding ${edge} (pixels)`} value={fit.padding[edge]} bounds={LIMITS.padding} slider={{ min: 0, max: 64, step: 1 }} onValueChange={(value) => commit({ ...framing, fit: { ...fit, padding: { ...fit.padding, [edge]: value } } })} />)}
        </fieldset>
      </div>
      <p className="field-description">Alignment places the measured subject inside the padded canvas. Center uses floor(spare / 2) on left/top; an odd extra pixel goes right/bottom. Offsets apply afterward: +X right, +Y down, and may clip. A non-square shape may fill only one box axis. Ground, helpers and future effects are excluded.</p>
      <button type="button" onClick={() => { const result = actions.resetSection('framing'); setError(result.ok ? '' : result.issues[0].message); if (result.ok) setResetKey((key) => key + 1) }}>Reset framing</button>
      {error && <p className="field-error">{error}</p>}
    </Disclosure>
  )
}
