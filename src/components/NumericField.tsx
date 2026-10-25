import { useId, useRef, useState } from 'react'
import type { NumericBounds } from '../domain/constraints'
import { validateNumber } from '../domain/validation'
import type { ValidationResult } from '../domain/validation'

export type SliderRange = Readonly<{ min: number; max: number; step: number }>

export function NumericField({ label, value, bounds, slider, onValueChange, disabled = false }: {
  disabled?: boolean
  label: string
  value: number
  bounds: NumericBounds
  slider?: SliderRange
  onValueChange: (value: number) => ValidationResult<unknown>
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<{ committed: number; text: string; error: string }>()
  const current = draft?.committed === value ? draft : undefined
  const error = current?.error ?? ''

  function change(text: string) {
    const number = text.trim() === '' ? NaN : Number(text)
    const validation = validateNumber(number, bounds)
    const result = validation.ok ? onValueChange(number) : validation
    setDraft({ committed: result.ok ? number : value, text, error: result.ok ? '' : result.issues[0].message })
  }

  return (
    <div className="numeric-field">
      <div className="numeric-heading">
        <label htmlFor={id}>{label}</label>
        <input
          ref={input}
          disabled={disabled}
          id={id}
          type="number"
          inputMode={bounds.min < 0 ? 'text' : bounds.integer ? 'numeric' : 'decimal'}
          min={bounds.min}
          max={bounds.max}
          step={bounds.integer ? 1 : 'any'}
          value={current?.text ?? value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => change(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && error) { event.preventDefault(); event.stopPropagation(); setDraft(undefined) }
          }}
        />
      </div>
      {slider && <input
        disabled={disabled}
        type="range"
        aria-label={`${label} slider`}
        title={`Slider: ${slider.min} to ${slider.max}. Type a number for the full supported range.`}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={Math.max(slider.min, Math.min(slider.max, value))}
        onChange={(event) => change(event.target.value)}
      />}
      {error && <><button className="restore-value" type="button" onClick={() => { setDraft(undefined); input.current?.focus() }}>Restore valid value</button><p id={`${id}-error`} className="field-error">{error} The reference keeps the last valid value. Escape or Restore valid value restores it.</p></>}
    </div>
  )
}
