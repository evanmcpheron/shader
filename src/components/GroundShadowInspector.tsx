import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import type { GroundSettings, ShadowSettings, SrgbColor } from '../domain/settings'
import { resolveEffectColor } from '../domain/shading'
import { ColorField } from './ColorField'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

type Receiver = Extract<GroundSettings, { kind: 'receiver' }>
type Shadows = Extract<ShadowSettings, { kind: 'directional' }>
const initialReceiverColor: SrgbColor = '#5C88B8'
const initialGround: Receiver = { kind: 'receiver', position: { x: 0, y: -1, z: 0 }, width: 6, depth: 6, appearance: { kind: 'shadow-only' } }
const initialShadows: Shadows = { kind: 'directional', self: true, ground: true, strength: 1, color: '#172038', bias: 0.5, treatment: { kind: 'hard' } }

export function GroundShadowInspector({ store }: { store: StudioStore }) {
  const ground = useStore(store, (state) => state.settings.ground)
  const shadows = useStore(store, (state) => state.settings.shadows)
  const palette = useStore(store, (state) => state.settings.palette)
  const actions = useStore(store, (state) => state.actions)
  const [retainedGround, setRetainedGround] = useState(initialGround)
  const [retainedShadows, setRetainedShadows] = useState(initialShadows)
  const [receiverColor, setReceiverColor] = useState(initialReceiverColor)
  const [resetKey, setResetKey] = useState(0)
  const [notice, setNotice] = useState('')
  const receiver = ground.kind === 'receiver' ? ground : undefined
  const active = shadows.kind === 'directional' ? shadows : undefined
  const colors = [...new Set([...(receiver?.appearance.kind === 'visible' ? [receiver.appearance.color] : []), ...(active ? [active.color] : [])])]

  function reset() {
    const settings = store.getState().settings
    const result = actions.restoreSettings({ ...settings, ground: { kind: 'none' }, shadows: { kind: 'none' } })
    if (result.ok) { setRetainedGround(initialGround); setRetainedShadows(initialShadows); setReceiverColor(initialReceiverColor); setResetKey((key) => key + 1) }
    setNotice(result.ok ? 'Ground and shadows reset to Off. Lighting and subject were kept.' : result.issues[0].message)
  }

  return <Disclosure title="Ground & shadows">
    <SelectField label="Ground receiver" value={receiver?.appearance.kind ?? 'off'} options={[{ value: 'off', label: 'Off' }, { value: 'visible', label: 'Visible receiver' }, { value: 'shadow-only', label: 'Shadow only' }]} onValueChange={(kind) => {
      if (receiver) {
        setRetainedGround(receiver)
        if (receiver.appearance.kind === 'visible') setReceiverColor(receiver.appearance.color)
      }
      const previous = receiver ?? retainedGround
      actions.setSection('ground', kind === 'off' ? { kind: 'none' } : { ...previous, appearance: kind === 'visible' ? { kind, color: receiver?.appearance.kind === 'visible' ? receiver.appearance.color : receiverColor } : { kind } })
    }} description="Independent finite XZ plane; separate from the Plane subject. Starts at Y = −1. Ground never changes the subject fit or outline. Place it below the subject to avoid depth occlusion. Shadow only leaves unshadowed pixels transparent with a transparent background." />
    {receiver && <div key={`ground-${resetKey}`}>
      {receiver.appearance.kind === 'visible' && <ColorField label="Receiver color" value={receiver.appearance.color} onValueChange={(color) => actions.setSection('ground', { ...receiver, appearance: { kind: 'visible', color } })} />}
      <NumericField label="Ground width" value={receiver.width} bounds={LIMITS.dimension} slider={{ min: 0.1, max: 20, step: 0.1 }} onValueChange={(width) => actions.setSection('ground', { ...receiver, width })} />
      <NumericField label="Ground depth" value={receiver.depth} bounds={LIMITS.dimension} slider={{ min: 0.1, max: 20, step: 0.1 }} onValueChange={(depth) => actions.setSection('ground', { ...receiver, depth })} />
      {(['x', 'y', 'z'] as const).map((axis) => <NumericField key={axis} label={`Ground position ${axis.toUpperCase()}`} value={receiver.position[axis]} bounds={LIMITS.position} slider={{ min: -5, max: 5, step: 0.05 }} onValueChange={(value) => actions.setSection('ground', { ...receiver, position: { ...receiver.position, [axis]: value } })} />)}
    </div>}
    <label className="shadow-toggle"><input type="checkbox" checked={!!active} onChange={(event) => {
      if (active) setRetainedShadows(active)
      actions.setSection('shadows', event.target.checked ? retainedShadows : { kind: 'none' })
    }} /> Directional shadows</label>
    {active && <div key={`shadow-${resetKey}`}>
      <label className="shadow-toggle"><input type="checkbox" checked={active.self} onChange={(event) => actions.setSection('shadows', { ...active, self: event.target.checked })} /> Self shadows</label>
      <label className="shadow-toggle"><input type="checkbox" checked={active.ground} onChange={(event) => actions.setSection('shadows', { ...active, ground: event.target.checked })} /> Ground shadows</label>
      <NumericField label="Shadow strength" value={active.strength} bounds={LIMITS.unit} slider={{ min: 0, max: 1, step: 0.05 }} onValueChange={(strength) => actions.setSection('shadows', { ...active, strength })} />
      <SelectField label="Shadow treatment" value={active.treatment.kind} options={[{ value: 'hard', label: 'Hard' }, { value: 'pixel-soft', label: 'Pixel stylized soft' }]} onValueChange={(kind) => actions.setSection('shadows', { ...active, treatment: kind === 'hard' ? { kind } : { kind, radius: 2 } })} description="Softness averages visibility on nearby samples of the same surface before shading. This is native pixel styling, not physical area-light blur. Radius 0 equals Hard." />
      {active.treatment.kind === 'pixel-soft' && <NumericField label="Shadow softness (pixels)" value={active.treatment.radius} bounds={LIMITS.softness} slider={{ min: 0, max: 4, step: 1 }} onValueChange={(radius) => actions.setSection('shadows', { ...active, treatment: { kind: 'pixel-soft', radius } })} />}
      <NumericField label="Shadow bias (map texels)" value={active.bias ?? 0.5} bounds={LIMITS.shadowBias} slider={{ min: 0, max: 2, step: 0.05 }} onValueChange={(bias) => actions.setSection('shadows', { ...active, bias })} />
      <p className="field-description">Start at 0.5. Lower bias can cause speckled self-shadow acne; higher bias can detach contact shadows. A fitted 1024² map is retained while disabled. Ground shadows pause at or below near-horizontal light directions.</p>
      <ColorField label="Ground shadow color" value={active.color} onValueChange={(color) => actions.setSection('shadows', { ...active, color })} />
    </div>}
    <p className="field-description" aria-label="Ground color policy">{palette.effectPolicy === 'strict' ? `Strict palette: ${colors.map((color) => `${color} → ${resolveEffectColor(color, palette)}`).join(', ') || 'no active effect colors'}.` : `Explicit receiver/shadow colors: ${colors.join(', ') || 'none'}. Adds ${colors.filter((color) => !palette.colors.includes(color)).length} colors outside the subject palette.`} Receiver colors stay exact. Strength and soft edges use fixed opaque pixel coverage; ambient fill remains present. Outlines draw above ground.</p>
    <button type="button" onClick={reset}>Reset ground & shadows</button>
    {notice && <p role="status" className="field-description">{notice}</p>}
  </Disclosure>
}
