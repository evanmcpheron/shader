import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

export function Inspector({ id, title, open, toggleRef, onClose, children }: {
  id: string
  title: string
  open: boolean
  toggleRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open && panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus()
  }, [open, toggleRef])

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
        <button type="button" className="close-inspector" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button>
      </div>
      <div className="inspector-content">{children}</div>
    </aside>
  )
}
