import { Quaternion, Vector3 } from 'three'
import type { StudioStore } from '../app/studioStore'
import type { Vector3 as SettingsVector } from '../domain/settings'
import { screenArcball } from './lightHandle'
import type { HandleFrame } from './lightHandle'

type Drag = Readonly<{
  pointerId: number
  frame: HandleFrame
  start: Vector3
  offset: Vector3
  position: SettingsVector
  target: SettingsVector
}>

export class LightController {
  private readonly canvas: HTMLElement
  private readonly store: StudioStore
  private readonly getFrame: (x: number, y: number) => HandleFrame | undefined
  private readonly setOwned: (owned: boolean) => void
  private readonly unsubscribe: () => void
  private drag?: Drag
  private committing = false
  private disposed = false
  private completed = 0
  private cancelled = 0

  constructor(canvas: HTMLElement, store: StudioStore, getFrame: (x: number, y: number) => HandleFrame | undefined, setOwned: (owned: boolean) => void) {
    this.canvas = canvas
    this.store = store
    this.getFrame = getFrame
    this.setOwned = setOwned
    canvas.addEventListener('pointerdown', this.onDown, true)
    canvas.addEventListener('pointermove', this.onMove, true)
    canvas.addEventListener('pointerup', this.onUp, true)
    canvas.addEventListener('pointercancel', this.onCancel, true)
    canvas.addEventListener('lostpointercapture', this.onCancel, true)
    canvas.addEventListener('keydown', this.onKey, true)
    window.addEventListener('blur', this.onBlur)
    this.unsubscribe = store.subscribe((state, previous) => {
      if (this.drag && (state.preview !== previous.preview || state.settings.camera !== previous.settings.camera
        || (!this.committing && state.settings.lighting !== previous.settings.lighting))) this.finish(false)
    })
  }

  private readonly onDown = (event: PointerEvent) => {
    if (this.drag) { event.stopImmediatePropagation(); return }
    const frame = this.getFrame(event.clientX, event.clientY)
    if (this.disposed || event.button !== 0 || event.isPrimary === false || ![event.clientX, event.clientY].every(Number.isFinite)
      || this.store.getState().preview.tool !== 'light' || !frame
      || Math.hypot(event.clientX - frame.handle.x, event.clientY - frame.handle.y) > 18) return
    const { position, target } = this.store.getState().settings.lighting.directional
    this.drag = { pointerId: event.pointerId, frame, start: screenArcball(event.clientX, event.clientY, frame), offset: new Vector3().subVectors(position, target), position, target }
    event.preventDefault()
    event.stopImmediatePropagation()
    this.setOwned(true)
    this.canvas.focus({ preventScroll: true })
    try { this.canvas.setPointerCapture(event.pointerId) } catch { this.finish(false) }
  }

  private readonly onMove = (event: PointerEvent) => {
    const drag = this.drag
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (![event.clientX, event.clientY].every(Number.isFinite)) return
    const current = screenArcball(event.clientX, event.clientY, drag.frame)
    const rotation = new Quaternion().setFromUnitVectors(drag.start, current)
    const position = drag.offset.clone().applyQuaternion(rotation).add(drag.target)
    this.commitPosition({ x: position.x, y: position.y, z: position.z })
  }

  private commitPosition(position: SettingsVector): void {
    const { settings, actions } = this.store.getState()
    this.committing = true
    try {
      const result = actions.setSection('lighting', { ...settings.lighting, directional: { ...settings.lighting.directional, position } })
      if (!result.ok) actions.setStatus({ kind: 'error', message: `Light movement limit: ${result.issues[0].message}` })
    } finally { this.committing = false }
  }

  private readonly onUp = (event: PointerEvent) => {
    if (this.drag?.pointerId !== event.pointerId) return
    event.stopImmediatePropagation()
    this.finish(false)
  }

  private readonly onCancel = (event: PointerEvent) => {
    if (this.drag?.pointerId === event.pointerId) this.finish(true)
  }

  private readonly onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.drag) { event.preventDefault(); event.stopImmediatePropagation(); this.finish(true) }
  }

  private readonly onBlur = () => this.finish(true)

  finish(cancel: boolean): void {
    const drag = this.drag
    if (!drag) return
    this.drag = undefined
    if (cancel) { this.cancelled++; this.commitPosition(drag.position) }
    else this.completed++
    this.setOwned(false)
    if (this.canvas.hasPointerCapture(drag.pointerId)) this.canvas.releasePointerCapture(drag.pointerId)
  }

  diagnostics() {
    return { dragging: Boolean(this.drag), pointerId: this.drag?.pointerId, completed: this.completed, cancelled: this.cancelled, disposed: this.disposed }
  }

  dispose(): void {
    if (this.disposed) return
    this.finish(false)
    this.disposed = true
    this.unsubscribe()
    this.canvas.removeEventListener('pointerdown', this.onDown, true)
    this.canvas.removeEventListener('pointermove', this.onMove, true)
    this.canvas.removeEventListener('pointerup', this.onUp, true)
    this.canvas.removeEventListener('pointercancel', this.onCancel, true)
    this.canvas.removeEventListener('lostpointercapture', this.onCancel, true)
    this.canvas.removeEventListener('keydown', this.onKey, true)
    window.removeEventListener('blur', this.onBlur)
  }
}
