import { useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { LIMITS, MAX_PALETTE_COLORS } from '../domain/constraints'
import { evenlySpacedThresholds } from '../domain/defaults'
import type { ShadingSettings } from '../domain/settings'
import { resizeThresholds } from '../domain/shading'
import { ColorField } from './ColorField'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

type ShadingMode = 'smooth' | 'flat' | 'cel' | 'bands' | 'palette'

export function ShadingInspector({ store }: { store: StudioStore }) {
  const shading = useStore(store, (state) => state.settings.shading)
  const palette = useStore(store, (state) => state.settings.palette)
  const actions = useStore(store, (state) => state.actions)
  const [resetKey, setResetKey] = useState(0)
  const [levelDraft, setLevelDraft] = useState<{ original: number; next: number }>()
  const [notice, setNotice] = useState('')
  const rememberedThresholds = useRef<readonly number[]>(evenlySpacedThresholds(palette.colors.length))
  const banded = shading.tone.kind === 'cel' || shading.tone.kind === 'bands'
  const mode: ShadingMode = shading.tone.kind === 'continuous' ? shading.normals : shading.tone.kind
  const levels = levelDraft?.original === palette.colors.length ? levelDraft.next : palette.colors.length

  function commit(next: ShadingSettings) { return actions.setSection('shading', next) }

  function selectMode(next: ShadingMode) {
    if (shading.tone.kind === 'cel' || shading.tone.kind === 'bands') rememberedThresholds.current = shading.tone.thresholds
    const result = commit({
      ...shading,
      normals: next === 'smooth' || next === 'flat' ? next : shading.normals,
      tone: next === 'smooth' || next === 'flat' ? { kind: 'continuous' }
        : next === 'palette' ? { kind: 'palette' }
          : { kind: next, thresholds: resizeThresholds(rememberedThresholds.current, palette.colors.length) },
    })
    if (!result.ok) setNotice(result.issues[0].message)
  }

  return (
    <Disclosure title="Shading">
      <SelectField label="Shading mode" value={mode} options={[
        { value: 'smooth', label: 'Smooth reference' },
        { value: 'flat', label: 'Flat shading' },
        { value: 'cel', label: 'Cel shading' },
        { value: 'bands', label: 'Discrete pixel-art bands' },
        { value: 'palette', label: 'Palette-constrained shading' },
      ]} onValueChange={selectMode} description={banded
        ? `${mode === 'cel' ? 'Cel uses hard light/dark regions.' : 'Discrete bands use the ordered pixel-art ramp.'} Both select exact stored colors using the same thresholds. Colored light moves shade placement through linear luminance, keeping ramp RGB fixed.`
        : mode === 'palette' ? 'Nearest color uses squared Euclidean distance in decoded linear-sRGB (not perceptual distance). Base × colored light and signal controls change allocation, then original entry bytes are written. Equal distances choose the first entry. No conversion follows selection.'
        : 'Continuous base reflectance × linear light. Smooth interpolates vertex normals; flat uses true triangle normals. Colored lights tint continuous RGB. Exact ramp colors are not enforced.'} />
      {(banded || mode === 'palette') && <SelectField label="Normal treatment" value={shading.normals} options={[
        { value: 'smooth', label: 'Smooth · interpolated normals' },
        { value: 'flat', label: 'Flat · triangle face normals' },
      ]} onValueChange={(normals) => commit({ ...shading, normals })} description="Normal treatment controls surface shape; tone mapping controls shade selection. Flat works with nonuniform scales without rebuilding geometry." />}
      <div key={resetKey}>
        <ColorField label="Base color" value={shading.baseColor} onValueChange={(baseColor) => commit({ ...shading, baseColor })} />
        {banded && <>
          <NumericField label="Levels" value={levels} bounds={{ min: 1, max: MAX_PALETTE_COLORS, integer: true }} onValueChange={(next) => {
            setLevelDraft({ original: palette.colors.length, next })
            return { ok: true, value: next, notices: [] }
          }} />
          <p className="field-description">Current ramp: {palette.colors.length} levels. Apply keeps existing entries and boundaries; new levels append the highlight color and split the remaining top interval. {levels < palette.colors.length ? `Reducing to ${levels} removes ${palette.colors.length - levels} trailing colors and their boundaries.` : 'Reducing levels removes trailing colors and their boundaries.'}</p>
          <button type="button" disabled={levels === palette.colors.length} onClick={() => {
            const result = actions.setShadingLevels(levels)
            setNotice(result.ok ? `Applied ${levels} levels. Existing retained colors and boundaries were kept.` : result.issues[0].message)
            if (result.ok) { setLevelDraft(undefined); setResetKey((key) => key + 1) }
          }}>Apply levels</button>
          <fieldset className="transform-group">
            <legend>Shade boundaries</legend>
            <p className="field-description">Strictly increasing inside 0–1. Equality selects the higher index; 0 and 1 select the first and last entries. One level needs no boundaries.</p>
            {(shading.tone.kind === 'cel' || shading.tone.kind === 'bands') && shading.tone.thresholds.map((threshold, index) => <NumericField
              key={`${mode}-${index}`} label={`Threshold ${index + 1}`} value={threshold} bounds={LIMITS.unit} slider={{ min: 0.01, max: 0.99, step: 0.01 }}
              onValueChange={(value) => {
                if (shading.tone.kind !== 'cel' && shading.tone.kind !== 'bands') return commit(shading)
                const thresholds = [...shading.tone.thresholds]
                thresholds[index] = value
                return commit({ ...shading, tone: { kind: shading.tone.kind, thresholds } })
              }}
            />)}
          </fieldset>
          <fieldset className="transform-group">
            <legend>Generate explicit ramp</legend>
            <p className="field-description">Base, shadow and highlight are generation inputs. Generate replaces all ramp entries with linear-RGB interpolation through base at the midpoint, keeping boundaries. One level uses base; two use shadow and highlight.</p>
            <ColorField label="Shadow color" value={shading.shadowColor} onValueChange={(shadowColor) => commit({ ...shading, shadowColor })} />
            <ColorField label="Highlight color" value={shading.highlightColor} onValueChange={(highlightColor) => commit({ ...shading, highlightColor })} />
            <button type="button" onClick={() => {
              const result = actions.generateShadingRamp()
              setNotice(result.ok ? 'Ramp replaced from shadow, base and highlight. Boundaries were kept.' : result.issues[0].message)
            }}>Generate ramp from colors</button>
          </fieldset>
        </>}
        <NumericField label="Brightness" value={shading.brightness} bounds={LIMITS.brightness} slider={{ min: -1, max: 1, step: 0.01 }} onValueChange={(brightness) => commit({ ...shading, brightness })} />
        <NumericField label="Contrast" value={shading.contrast} bounds={LIMITS.contrast} slider={{ min: 0, max: 4, step: 0.05 }} onValueChange={(contrast) => commit({ ...shading, contrast })} />
        <NumericField label="Shade distribution" value={shading.distribution} bounds={LIMITS.distribution} slider={{ min: 0.1, max: 4, step: 0.05 }} onValueChange={(distribution) => commit({ ...shading, distribution })} />
      </div>
      <p className="field-description">Light saturates to 0–1, then contrast around 0.5, brightness, clamp, and distribution exponent apply before selection. Distribution &gt;1 favors shadows; &lt;1 favors highlights. Original stays continuous with active normals and no signal adjustments.</p>
      <button type="button" onClick={() => {
        const result = actions.resetSection('shading')
        setNotice(result.ok ? 'Shading reset; stored ramp colors were kept.' : result.issues[0].message)
        if (result.ok) { setLevelDraft(undefined); setResetKey((key) => key + 1) }
      }}>Reset shading</button>
      {notice && <p role="status" className="field-description">{notice}</p>}
    </Disclosure>
  )
}
