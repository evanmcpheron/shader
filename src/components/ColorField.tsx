import { useId, useState } from 'react'
import type { SrgbColor } from '../domain/settings'
import { validateColor } from '../domain/validation'
import type { ValidationResult } from '../domain/validation'

export function ColorField({ label, value, onValueChange }: {
  label: string
  value: SrgbColor
  onValueChange: (value: SrgbColor) => ValidationResult<unknown>
}) {
  const id = useId()
  const [draft, setDraft] = useState<{ committed: string; text: string; error: string }>()
  const current = draft?.committed === value ? draft : undefined
  const error = current?.error ?? ''
  function change(text: string) {
    const validation = validateColor(text)
    const result = validation.ok ? onValueChange(validation.value) : validation
    setDraft({ committed: result.ok && validation.ok ? validation.value : value, text, error: result.ok ? '' : result.issues[0].message })
  }
  function pickColor(value: string) {
    change(value)
    setDraft(undefined)
  }
  return (
    <div className="color-field">
      <label htmlFor={id}>{label} (hex)</label>
      <div className="color-inputs">
        <input type="color" aria-label={`${label} picker`} value={value} onInput={(event) => pickColor(event.currentTarget.value)} onChange={(event) => pickColor(event.target.value)} />
        <input id={id} type="text" value={current?.text ?? value} spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => change(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && error) { event.stopPropagation(); setDraft(undefined) } }} />
      </div>
      {error && <p id={`${id}-error`} className="field-error">{error} Escape restores the last valid color.</p>}
    </div>
  )
}
