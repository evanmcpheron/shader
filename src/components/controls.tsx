import { useId } from 'react'
import type { ReactNode, Ref } from 'react'

export function DisclosureToggle({ controls, expanded, onToggle, children, ref }: {
  controls: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button ref={ref} type="button" aria-controls={controls} aria-expanded={expanded} onClick={onToggle}>
      {children}
    </button>
  )
}

export function Disclosure({ title, children, defaultOpen = true, className = '' }: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <details className={`disclosure ${className}`} open={defaultOpen}>
      <summary>{title}</summary>
      <div className="disclosure-content">{children}</div>
    </details>
  )
}

export function SelectField<T extends string>({ label, value, options, onValueChange, description }: {
  label: string
  value: T
  options: readonly Readonly<{ value: T; label: string }>[]
  onValueChange: (value: T) => void
  description: string
}) {
  const id = useId()
  return (
    <div className="select-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        aria-describedby={`${id}-description`}
        onChange={(event) => {
          const option = options.find((item) => item.value === event.target.value)
          if (option) onValueChange(option.value)
        }}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p id={`${id}-description`} className="field-description">{description}</p>
    </div>
  )
}
