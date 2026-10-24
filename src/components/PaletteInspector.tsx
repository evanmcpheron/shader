import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { StudioStore } from '../app/studioStore'
import { MAX_PALETTE_COLORS } from '../domain/constraints'
import { PALETTE_PRESETS } from '../domain/defaults'
import { MAX_PALETTE_TEXT_LENGTH, serializePalette } from '../domain/paletteInterchange'
import type { PaletteFormat } from '../domain/paletteInterchange'
import type { SrgbColor } from '../domain/settings'
import type { ValidationResult } from '../domain/validation'
import { ColorField } from './ColorField'
import { Disclosure, SelectField } from './controls'
import { NumericField } from './NumericField'

export function PaletteInspector({ store }: { store: StudioStore }) {
  const palette = useStore(store, (state) => state.settings.palette)
  const background = useStore(store, (state) => state.settings.background)
  const actions = useStore(store, (state) => state.actions)
  const [preset, setPreset] = useState<keyof typeof PALETTE_PRESETS>('cool')
  const [countDraft, setCountDraft] = useState<{ original: number; next: number }>()
  const [importText, setImportText] = useState('')
  const [format, setFormat] = useState<PaletteFormat>('json')
  const [feedback, setFeedback] = useState({ text: '', error: false })
  const reader = useRef<FileReader | null>(null)
  useEffect(() => () => reader.current?.abort(), [])
  const count = countDraft?.original === palette.colors.length ? countDraft.next : palette.colors.length
  const exportText = serializePalette(palette, format)
  const currentPreset = Object.entries(PALETTE_PRESETS).find(([, colors]) => colors.length === palette.colors.length && colors.every((color, index) => color === palette.colors[index]))?.[0]

  function report(result: ValidationResult<unknown>, success: string) {
    setFeedback({ text: result.ok ? success : result.issues[0].message, error: !result.ok })
    return result
  }
  function replace(colors: readonly SrgbColor[], success: string) {
    return report(actions.setPaletteColors(colors), success)
  }
  function move(index: number, direction: -1 | 1) {
    const colors = [...palette.colors]
    const destination = index + direction
    const moved = colors[index]
    colors[index] = colors[destination]
    colors[destination] = moved
    replace(colors, `Entry ${index + 1} moved to ${destination + 1}. Artist order preserved.`)
  }

  return (
    <Disclosure title="Palette & ramp">
      <p className="field-description">Current palette: {currentPreset ? `${currentPreset} factory colors` : 'custom colors'}. Selecting a preset below requires Apply palette preset.</p>
      <p className="field-description">{palette.colors.length} / 32 opaque sRGB entries, shared by ordered ramps and nearest-color mode. Ramp order follows your entries, even when bright colors precede dark ones. Duplicates are kept.</p>
      <SelectField label="Palette preset" value={preset} options={[
        { value: 'grayscale', label: 'Grayscale' },
        { value: 'gameBoy', label: 'Game Boy-inspired' },
        { value: 'nes', label: 'NES-inspired' },
        { value: 'warm', label: 'Warm monochrome' },
        { value: 'cool', label: 'Cool monochrome / default' },
      ]} onValueChange={setPreset} description="Apply replaces all entries with the specified bytes. Inspired palettes are aesthetic choices, not hardware accuracy claims. A changed count resets active ramp boundaries evenly." />
      <div className="palette-actions">
        <button type="button" onClick={() => replace(PALETTE_PRESETS[preset], 'Preset applied with exact stored bytes.')}>Apply palette preset</button>
        <button type="button" onClick={() => report(actions.resetSection('palette'), 'Default blue palette and explicit effect policy restored. Ramp boundaries reset evenly.')}>Reset palette</button>
      </div>
      <ol className="palette-editor" aria-label="Ordered palette entries">
        {palette.colors.map((color, index) => <li key={index}>
          <ColorField label={`Entry ${index + 1}`} value={color} onValueChange={(value) => replace(palette.colors.map((entry, position) => position === index ? value : entry), `Entry ${index + 1} updated.`)} />
          <div className="palette-actions">
            <button type="button" aria-label={`Move entry ${index + 1} earlier`} disabled={index === 0} onClick={() => move(index, -1)}>↑ Earlier</button>
            <button type="button" aria-label={`Move entry ${index + 1} later`} disabled={index === palette.colors.length - 1} onClick={() => move(index, 1)}>↓ Later</button>
            <button type="button" aria-label={`Remove entry ${index + 1}`} disabled={palette.colors.length === 1} onClick={() => replace(palette.colors.filter((_, position) => position !== index), 'Entry removed. Remaining order kept; active boundaries reset evenly.')}>Remove</button>
          </div>
        </li>)}
      </ol>
      <button type="button" disabled={palette.colors.length === MAX_PALETTE_COLORS} onClick={() => report(actions.setShadingLevels(palette.colors.length + 1), 'Highlight color appended. Existing entries and boundaries kept.')}>Add color</button>
      <p className="field-description">Add appends the current highlight color. Remove preserves remaining order and resets active boundaries evenly. Same-count edits and reordering keep boundaries.</p>
      <Disclosure title="Resample ramp" defaultOpen={false}>
        <NumericField label="Resample count" value={count} bounds={{ min: 1, max: MAX_PALETTE_COLORS, integer: true }} onValueChange={(next) => {
          setCountDraft({ original: palette.colors.length, next })
          return { ok: true, value: next, notices: [] }
        }} />
        <p className="field-description">Resample explicitly replaces entries by evenly sampling the existing ordered path in linear RGB, then storing sRGB bytes once. Endpoints stay exact; one color keeps the first entry. Changed counts reset active boundaries evenly. Apply levels in Shading instead keeps retained entries. Generate ramp from colors uses shadow/base/highlight.</p>
        <button type="button" disabled={count === palette.colors.length} onClick={() => {
          const result = report(actions.resampleShadingRamp(count), `Ramp resampled to ${count} editable entries.`)
          if (result.ok) setCountDraft(undefined)
        }}>Resample ordered ramp</button>
      </Disclosure>
      <SelectField label="Effect palette policy" value={palette.effectPolicy} options={[
        { value: 'explicit', label: 'Allow separate effect colors' },
        { value: 'strict', label: 'Strict · map all effect colors' },
      ]} onValueChange={(effectPolicy) => report(actions.setSection('palette', { ...palette, effectPolicy }), 'Effect palette policy updated.')} description={`Subject bytes are restricted in cel/bands/palette modes; continuous modes stay continuous. Transparent alpha is excluded. ${background.kind === 'solid' ? `Background: ${background.color}.` : 'Background: transparent.'} Explicit policy allows separate background, outline, receiver and ground shadow colors. Strict maps each by nearest linear RGB before writing. Each effect lists its resolved colors.`} />
      <Disclosure title="Palette interchange" defaultOpen={false}>
        <p className="field-description">Local palette data only. JSON: schemaVersion 1, colors (1–32 #RRGGBB entries), effectPolicy (explicit or strict). Hex lists accept whitespace/comma-separated six-digit colors with optional # and keep the current effect policy. Order and duplicates are preserved. Import replaces all entries; changed counts reset active boundaries evenly. Files are limited to 16 KiB.</p>
        <label className="palette-file">Read local palette file
          <input type="file" accept=".json,.txt,.hex,application/json,text/plain" onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            reader.current?.abort()
            if (!file) return
            if (file.size > MAX_PALETTE_TEXT_LENGTH) { setFeedback({ text: 'Palette file exceeds 16 KiB.', error: true }); return }
            const nextReader = new FileReader()
            reader.current = nextReader
            nextReader.onload = () => { setImportText(String(nextReader.result)); setFeedback({ text: 'File read. Review text, then Import palette text to apply.', error: false }) }
            nextReader.onerror = () => setFeedback({ text: 'Could not read this local file. Try again or paste its palette text.', error: true })
            nextReader.readAsText(file)
          }} />
        </label>
        <label className="palette-text">Palette import text
          <textarea value={importText} spellCheck={false} onChange={(event) => { reader.current?.abort(); setImportText(event.target.value) }} />
        </label>
        <button type="button" onClick={() => report(actions.importPalette(importText), 'Palette imported atomically. Exact entry order retained.')}>Import palette text</button>
        <SelectField label="Palette export format" value={format} options={[{ value: 'json', label: 'Version-1 JSON' }, { value: 'hex', label: 'Hex list' }]} onValueChange={setFormat} description="JSON includes effect policy; hex lists contain only ordered colors. Copy the text or download a local configuration file. This is not image export." />
        <label className="palette-text">Palette export text<textarea readOnly value={exportText} spellCheck={false} /></label>
        <a className="palette-download" href={`data:${format === 'json' ? 'application/json' : 'text/plain'};charset=utf-8,${encodeURIComponent(exportText)}`} download={`palette.${format === 'json' ? 'json' : 'hex'}`}>Download palette {format === 'json' ? 'JSON' : 'hex list'}</a>
      </Disclosure>
      {feedback.text && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'field-error' : 'field-description'}>{feedback.text}</p>}
    </Disclosure>
  )
}
