import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useVisualViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const viewport = window.visualViewport
    function update() {
      const element = ref.current
      if (!element) return
      const height = viewport?.height ?? window.innerHeight
      element.style.setProperty('--visible-height', `${height}px`)
      element.style.setProperty('--visible-top', `${viewport?.offsetTop ?? 0}px`)
      element.dataset.constrained = String(height <= 500)
    }
    function resize() {
      update()
      const focused = document.activeElement
      if (focused instanceof HTMLElement && focused.matches('input, textarea, select')) focused.scrollIntoView({ block: 'nearest' })
    }
    update()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', resize)
    return () => {
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', resize)
    }
  }, [ref])
}
