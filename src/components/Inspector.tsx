import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

export function Inspector({ id, title, open, toggleRef, onClose, compact = false, expanded = false, onExpand, sections = [], children }: {
  id: string
  title: string
  open: boolean
  toggleRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  compact?: boolean
  expanded?: boolean
  onExpand?: () => void
  sections?: string[]
  children: ReactNode
}) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open && panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus()
  }, [open, toggleRef])

  useEffect(() => {
    if (open && compact && document.activeElement === toggleRef.current) {
      panelRef.current?.querySelector<HTMLButtonElement>('.close-inspector')?.focus({ preventScroll: true })
    }
  }, [open, compact, toggleRef])

  return (
    <aside
      id={id}
      ref={panelRef}
      className="inspector"
      hidden={!open}
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="inspector-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        {compact && <button className="expand-inspector" type="button" onClick={onExpand} aria-pressed={expanded}>{expanded ? 'Less' : 'More space'}</button>}
        <button type="button" className="close-inspector" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button>
      </div>
      {compact && <label className="section-jump">
        <span>Jump to</span>
        <select aria-label={`${title} section`} value="" onChange={event => {
          const section = [...panelRef.current!.querySelectorAll<HTMLDetailsElement>('.disclosure')].find(item => item.firstElementChild?.textContent === event.target.value)
          if (!section) return
          section.open = true
          const content = panelRef.current!.querySelector('.inspector-content')!
          content.scrollTop += section.getBoundingClientRect().top - content.getBoundingClientRect().top
          section.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true })
        }}>
          <option value="" disabled>Choose a section…</option>
          {sections.map(section => <option key={section}>{section}</option>)}
        </select>
      </label>}
      <div className="inspector-content">{children}</div>
    </aside>
  )
}
