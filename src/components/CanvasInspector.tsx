import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import { CANVAS_PRESETS } from '../domain/defaults'
import { ColorField } from './ColorField'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

export function CanvasInspector({ store }: { store: StudioStore }) {
  const canvas = useStore(store, (state) => state.settings.canvas)
  const background = useStore(store, (state) => state.settings.background)
  const actions = useStore(store, (state) => state.actions)
  const [error, setError] = useState('')
  const [custom, setCustom] = useState(false)
  const preset = !custom && canvas.width === canvas.height && CANVAS_PRESETS.some((size) => size === canvas.width) ? String(canvas.width) : 'custom'
  return (
    <>
      <Disclosure title="Canvas pixels">
        <SelectField label="Canvas preset" value={preset} options={[...CANVAS_PRESETS.map((size) => ({ value: String(size), label: `${size} × ${size}` })), { value: 'custom', label: 'Custom dimensions' }]} onValueChange={(value) => {
          setCustom(value === 'custom')
          if (value === 'custom') return
          const result = actions.setSection('canvas', { width: Number(value), height: Number(value) })
          setError(result.ok ? '' : result.issues[0].message)
        }} description="Actual image pixels, independent of display size and DPR. Edit either axis for a rectangle. 1–1024 per axis, at most 1,048,576 pixels; GPU limits also apply." />
        {(['width', 'height'] as const).map((axis) => (
          <NumericField key={axis} label={`Canvas ${axis} (pixels)`} value={canvas[axis]} bounds={LIMITS.canvasAxis} slider={{ min: 1, max: 256, step: 1 }} onValueChange={(value) => actions.setSection('canvas', { ...canvas, [axis]: value })} />
        ))}
        <p className="field-description">PNG / canvas: <strong>{canvas.width} × {canvas.height} px</strong>. Canvas and subject box are independent. Export saves these native pixels; preview zoom never changes file dimensions.</p>
        {error && <p className="field-error">{error}</p>}
      </Disclosure>
      <Disclosure title="Output background">
        <SelectField label="Background" value={background.kind} options={[{ value: 'transparent', label: 'Transparent' }, { value: 'solid', label: 'Solid color' }]} onValueChange={(kind) => actions.setSection('background', kind === 'transparent' ? { kind } : { kind, color: '#20232B' })} description="Transparency is binary. The preview checkerboard is display only; solid color is part of the final image." />
        {background.kind === 'solid' && <ColorField label="Background color" value={background.color} onValueChange={(color) => actions.setSection('background', { kind: 'solid', color })} />}
      </Disclosure>
    </>
  )
}
