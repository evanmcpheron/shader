import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import type { OutlineSettings } from '../domain/settings'
import { resolveEffectColor } from '../domain/shading'
import { ColorField } from './ColorField'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

type Silhouette = Extract<OutlineSettings, { kind: 'silhouette' }>
const initial: Silhouette = { kind: 'silhouette', thickness: 1, color: '#172038' }

export function OutlineInspector({ store }: { store: StudioStore }) {
  const outline = useStore(store, (state) => state.settings.outline)
  const palette = useStore(store, (state) => state.settings.palette)
  const measurement = useStore(store, (state) => state.nativeOutline)
  const revision = useStore(store, (state) => state.revisions.settings)
  const actions = useStore(store, (state) => state.actions)
  const [remembered, setRemembered] = useState(initial)
  const [notice, setNotice] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const active = outline.kind === 'silhouette' ? outline : undefined
  const color = active ? resolveEffectColor(active.color, palette) : undefined
  const report = measurement?.revision === revision ? measurement.report : undefined
  const extent = report?.extent
  const visible = report?.visible

  function commit(next: OutlineSettings) {
    const result = actions.setSection('outline', next)
    setNotice(result.ok ? '' : result.issues[0].message)
    return result
  }

  return <Disclosure title="Outline">
    <SelectField label="Outline mode" value={outline.kind} options={[{ value: 'none', label: 'None' }, { value: 'silhouette', label: 'Silhouette' }]} onValueChange={(kind) => {
      if (active) setRemembered(active)
      commit(kind === 'none' ? { kind } : remembered)
    }} description="Square / Chebyshev dilation of the native subject mask, minus the subject. Corners extend diagonally. Hole edges grow inward by the same radius; small holes can close. Helpers and ground are excluded. Subject size and framing stay fixed." />
    {active && <div key={resetKey}>
      <NumericField label="Outline thickness (pixels)" value={active.thickness} bounds={LIMITS.outlineThickness} slider={{ min: 1, max: 8, step: 1 }} onValueChange={(thickness) => commit({ ...active, thickness })} />
      <ColorField label="Outline color" value={active.color} onValueChange={(color) => commit({ ...active, color })} />
      <p className="field-description" aria-label="Outline color policy">{palette.effectPolicy === 'strict'
        ? `Strict palette: ${active.color} maps to active entry ${color} by nearest linear RGB. The requested color is retained for explicit mode.`
        : `Explicit effect color: ${color}. ${palette.colors.includes(active.color) ? 'Already in the active palette; no extra color.' : 'Adds at most one color outside the subject palette.'}`} Dithering never changes outline bytes.</p>
      <p className="field-description" aria-label="Outline effect bounds">{report ? extent && visible
        ? `Effect extent: ${extent.width} × ${extent.height} px · x=${extent.x}..${extent.x + extent.width - 1}, y=${extent.y}..${extent.y + extent.height - 1}. Visible extent: ${visible.width} × ${visible.height} px. Outline: ${report.pixelCount} pixels, ${report.color}.`
        : 'Effect extent: empty (no captured subject pixels).'
        : 'Effect measurement pending an available native frame.'}</p>
      {report?.clipped && <p className="field-error" role="status">Outline clipped to canvas. No padding or resizing is added; reduce thickness or move the subject inward.</p>}
      <p className="field-description">Extent includes subject and outline, measured from the captured subject mask. Original stays continuous without outlines. Canvas dimensions are unchanged.</p>
    </div>}
    <button type="button" onClick={() => {
      const result = actions.resetSection('outline')
      setNotice(result.ok ? 'Outline reset to None. Framing, shading and palette were kept.' : result.issues[0].message)
      if (result.ok) { setRemembered(initial); setResetKey((key) => key + 1) }
    }}>Reset outline</button>
    {notice && <p role="status" className="field-description">{notice}</p>}
  </Disclosure>
}
