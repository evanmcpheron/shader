import { useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS } from '../domain/constraints'
import type { DitherSettings } from '../domain/settings'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

type OrderedSettings = Extract<DitherSettings, { kind: 'bayer' }>
type Algorithm = 'none' | '2' | '4' | '8' | 'blue-noise' | 'floyd-steinberg'
const initialOrdered: OrderedSettings = { kind: 'bayer', matrixSize: 4, strength: 1, patternScale: 1, transitionWidth: 1 }

export function DitherInspector({ store }: { store: StudioStore }) {
  const dither = useStore(store, (state) => state.settings.dither)
  const tone = useStore(store, (state) => state.settings.shading.tone.kind)
  const colorCount = useStore(store, (state) => state.settings.palette.colors.length)
  const actions = useStore(store, (state) => state.actions)
  const [remembered, setRemembered] = useState(initialOrdered)
  const [notice, setNotice] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const active = dither.kind === 'none' ? undefined : dither
  const pattern = active?.kind === 'bayer' || active?.kind === 'blue-noise' ? active : undefined
  const quantizing = tone !== 'continuous'

  function commit(next: DitherSettings) {
    const result = actions.setSection('dither', next)
    if (!result.ok) setNotice(result.issues[0].message)
    return result
  }

  return <Disclosure title="Dithering">
    <SelectField<Algorithm> label="Dither algorithm" value={dither.kind === 'bayer' ? `${dither.matrixSize}` : dither.kind} options={[
      { value: 'none', label: 'None' },
      { value: '2', label: 'Bayer 2×2' },
      { value: '4', label: 'Bayer 4×4' },
      { value: '8', label: 'Bayer 8×8' },
      { value: 'blue-noise', label: 'Blue noise' },
      { value: 'floyd-steinberg', label: 'Floyd–Steinberg' },
    ]} onValueChange={(value) => {
      const retained = {
        ...remembered, strength: active?.strength ?? remembered.strength,
        patternScale: pattern?.patternScale ?? remembered.patternScale,
        transitionWidth: pattern?.transitionWidth ?? remembered.transitionWidth,
        matrixSize: active?.kind === 'bayer' ? active.matrixSize : remembered.matrixSize,
      }
      setRemembered(retained)
      if (value === 'none') commit({ kind: 'none' })
      else if (value === 'floyd-steinberg') commit({ kind: value, strength: retained.strength })
      else if (value === 'blue-noise') commit({ kind: value, strength: retained.strength, patternScale: retained.patternScale, transitionWidth: retained.transitionWidth })
      else commit({ ...retained, matrixSize: value === '2' ? 2 : value === '4' ? 4 : 8 })
    }} description="Bayer and blue noise use fixed native thresholds; Floyd–Steinberg passes quantization error to later neighbors. All select exact ramp or palette colors. Original stays undithered." />
    {!quantizing && <p className="field-description">Dithering is inactive in continuous smooth/flat modes. Choose cel, discrete bands or palette-constrained shading to use the retained settings.</p>}
    {quantizing && active && <div key={resetKey}>
      <NumericField label="Dither strength" value={active.strength} bounds={LIMITS.unit} slider={{ min: 0, max: 1, step: 0.05 }} onValueChange={(strength) => commit({ ...active, strength })} />
      <p className="field-description">Zero uses the exact None mapper. {active.kind === 'floyd-steinberg' ? 'Error strength scales the error passed to later neighbors, scanning left to right, top to bottom. Masked neighbors drop their share.' : 'Higher strength spreads shade transitions across more pixels.'}</p>
      {pattern ? <>
        <NumericField label="Pattern scale (native pixels)" value={pattern.patternScale} bounds={LIMITS.patternScale} slider={{ min: 1, max: 8, step: 1 }} onValueChange={(patternScale) => commit({ ...pattern, patternScale })} />
        <p className="field-description">Each threshold cell covers scale × scale native pixels. The tile repeats every {(pattern.kind === 'bayer' ? pattern.matrixSize : 64) * pattern.patternScale} pixels on each axis, fixed at the canvas top-left through zoom and pan.</p>
        {tone !== 'palette' ? <>
          <NumericField label="Ramp transition width" value={pattern.transitionWidth} bounds={LIMITS.unit} slider={{ min: 0, max: 1, step: 0.05 }} onValueChange={(transitionWidth) => commit({ ...pattern, transitionWidth })} />
          <p className="field-description">Width in shade intervals (0–1), multiplied by strength. Zero keeps hard bands; one blends neighboring shades across one interval.</p>
        </> : <p className="field-description">Palette mode uses the smallest distinct linear-RGB palette spacing for a bounded, equal-channel threshold shift before nearest matching. Ramp transition width is retained for ramps and has no effect here.</p>}
      </> : <p className="field-description">Pattern scale and ordered transition width do not apply to error diffusion. Their values are retained for Bayer and blue noise.</p>}
      {colorCount === 1 && <p className="field-description">One color has no shade transitions; every subject pixel keeps that color.</p>}
    </div>}
    <button type="button" onClick={() => {
      const result = actions.resetSection('dither')
      setNotice(result.ok ? 'Dithering reset to None. Shading and palette were kept.' : result.issues[0].message)
      if (result.ok) { setRemembered(initialOrdered); setResetKey((key) => key + 1) }
    }}>Reset dithering</button>
    {notice && <p role="status" className="field-description">{notice}</p>}
  </Disclosure>
}
