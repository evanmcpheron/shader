import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function WorkspaceDialog({ open, title, onClose, closeLabel = 'Done', children }: {
  open: boolean
  title: string
  onClose: () => void
  closeLabel?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    const dialog = ref.current!
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [open])

  return <dialog ref={ref} className="workspace-dialog" aria-label={title} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, summary, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.matches(':disabled') && element.getClientRects().length > 0)
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }} onCancel={event => {
    event.preventDefault()
    onClose()
  }} onClick={event => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose()
  }}>
    <div className="dialog-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label={closeLabel === 'Done' ? `Close ${title.toLowerCase()}` : closeLabel}>{closeLabel}</button></div>
    <div className="dialog-content">{children}</div>
  </dialog>
}
