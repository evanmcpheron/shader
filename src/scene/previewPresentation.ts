import type { StudioStore } from '../app/studioStore'
import type { NativeFrame } from '../pixels/nativeFrame'
import type { HandleFrame, ViewRect } from './lightHandle'
import { anchoredZoom, clientToImage, containsPoint, fitPreviewZoom, imageRectangle, stepPreviewZoom } from './viewTransform'

type Panel = {
  root: HTMLDivElement
  image: HTMLDivElement
  canvas: HTMLCanvasElement
  checker: HTMLCanvasElement
  checkerContext: CanvasRenderingContext2D
  context: CanvasRenderingContext2D
  grid: HTMLDivElement
  helper: SVGSVGElement
  topology: SVGSVGElement
  frame?: NativeFrame
  handle?: HandleFrame
  rect?: ViewRect
}

type PanDrag = { id: number; x: number; y: number; pan: { x: number; y: number } }
const svgNamespace = 'http://www.w3.org/2000/svg'

function createPanel(name: string, className: string): Panel {
  const root = document.createElement('div')
  root.className = `preview-panel ${className}`
  const title = document.createElement('span')
  title.className = 'preview-panel-title'
  title.textContent = name
  const image = document.createElement('div')
  image.className = 'preview-image'
  const canvas = document.createElement('canvas')
  canvas.className = className === 'final-panel' ? 'native-canvas' : 'before-canvas'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', className === 'final-panel' ? 'Native pixel output' : 'Original continuous native reference')
  const context = canvas.getContext('2d', { colorSpace: 'srgb' })
  if (!context) throw new Error('The browser could not allocate a preview canvas. Retry renderer.')
  const checker = document.createElement('canvas')
  checker.className = 'preview-checkerboard'
  checker.setAttribute('aria-hidden', 'true')
  const checkerContext = checker.getContext('2d', { colorSpace: 'srgb' })
  if (!checkerContext) throw new Error('The browser could not allocate the checkerboard. Retry renderer.')
  const grid = document.createElement('div')
  grid.className = 'preview-grid'
  grid.setAttribute('aria-hidden', 'true')
  const helper = document.createElementNS(svgNamespace, 'svg')
  helper.classList.add('preview-helper')
  helper.setAttribute('aria-hidden', 'true')
  const topology = document.createElementNS(svgNamespace, 'svg')
  topology.classList.add('preview-topology')
  topology.setAttribute('aria-hidden', 'true')
  image.append(checker, canvas, topology, grid)
  root.append(title, image, helper)
  return { root, image, canvas, context, checker, checkerContext, grid, helper, topology }
}

export class PreviewPresentation {
  readonly final = createPanel('Final · native pixels', 'final-panel')
  readonly before = createPanel('Original · continuous lighting', 'before-panel')
  private readonly host: HTMLElement
  private readonly store: StudioStore
  private readonly pointerReadout = document.createElement('span')
  private readonly unsubscribe: () => void
  private drag?: PanDrag
  private initialFit = false
  private disposed = false

  constructor(host: HTMLElement, store: StudioStore) {
    this.host = host
    this.store = store
    host.tabIndex = 0
    host.setAttribute('role', 'group')
    host.setAttribute('aria-label', 'Preview interaction surface')
    host.setAttribute('aria-description', 'Wheel zooms preview. F fits, N shows native size, 0 resets view. Pan preview: drag or use arrow keys; Escape cancels drag. Camera orbit: drag or Shift plus arrows. Move light: drag amber handle, empty space orbits. Manual framing: middle drag changes camera distance; Shift drag pans camera.')
    this.pointerReadout.className = 'preview-pointer-readout'
    this.pointerReadout.textContent = 'Hover image for pixel coordinates'
    host.append(this.before.root, this.final.root, this.pointerReadout)
    host.addEventListener('wheel', this.onWheel, { capture: true, passive: false })
    host.addEventListener('pointerdown', this.onDown, true)
    host.addEventListener('pointermove', this.onMove, true)
    host.addEventListener('pointerup', this.onUp, true)
    host.addEventListener('pointercancel', this.onCancel, true)
    host.addEventListener('lostpointercapture', this.onCancel, true)
    host.addEventListener('keydown', this.onKey, true)
    window.addEventListener('blur', this.onBlur)
    this.unsubscribe = store.subscribe((state, previous) => {
      if (state.preview.tool !== previous.preview.tool || state.preview.mode !== previous.preview.mode || state.settings.canvas !== previous.settings.canvas) this.finish(false)
    })
  }

  publish(final: NativeFrame, before: NativeFrame): void {
    for (const [panel, frame] of [[this.final, final], [this.before, before]] as const) {
      if (panel.frame === frame) continue
      if (!panel.frame || panel.canvas.width !== frame.width || panel.canvas.height !== frame.height) {
        panel.canvas.width = frame.width
        panel.canvas.height = frame.height
        panel.checker.width = frame.width
        panel.checker.height = frame.height
        panel.checkerContext.fillStyle = '#252932'
        panel.checkerContext.fillRect(0, 0, frame.width, frame.height)
        panel.checkerContext.fillStyle = '#39414e'
        for (let y = 0; y < frame.height; y += 4) for (let x = 0; x < frame.width; x += 4) {
          if ((x / 4 + y / 4) % 2 === 0) panel.checkerContext.fillRect(x, y, 4, 4)
        }
      }
      panel.context.imageSmoothingEnabled = false
      panel.context.putImageData(new ImageData(frame.rgba, frame.width, frame.height, { colorSpace: 'srgb' }), 0, 0)
      panel.canvas.dataset.revision = String(frame.revision)
      panel.frame = frame
    }
    this.setMode()
    if (!this.initialFit) {
      this.initialFit = true
      this.fit()
    }
  }

  private setMode(): void {
    const mode = this.store.getState().preview.mode
    this.host.dataset.mode = mode
    this.before.root.hidden = mode === 'final'
    this.final.root.hidden = mode === 'reference'
  }

  private viewport(panel: Panel): ViewRect {
    const rect = panel.root.getBoundingClientRect()
    return { left: rect.left + panel.root.clientLeft, top: rect.top + panel.root.clientTop + 26, width: panel.root.clientWidth, height: Math.max(1, panel.root.clientHeight - 48) }
  }

  fit(): void {
    this.setMode()
    const panel = this.visiblePanels()[0]
    if (!panel.frame) return
    this.store.getState().actions.setPreview({ zoom: fitPreviewZoom(this.viewport(panel), panel.frame), pan: { x: 0, y: 0 } })
  }

  private visiblePanels(): Panel[] {
    return [this.before, this.final].filter((panel) => !panel.root.hidden)
  }

  present(updateHandle: (rect: ViewRect) => HandleFrame | undefined, topologyPath = ''): void {
    this.setMode()
    const { preview } = this.store.getState()
    this.host.dataset.tool = preview.tool
    for (const panel of this.visiblePanels()) {
      if (!panel.frame) continue
      const viewport = this.viewport(panel)
      const rect = imageRectangle(viewport, panel.frame, preview.zoom, preview.pan)
      panel.rect = rect
      Object.assign(panel.image.style, {
        left: `${rect.left - viewport.left}px`, top: `${rect.top - viewport.top + 26}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
      })
      panel.checker.hidden = !preview.checkerboard
      panel.grid.hidden = !preview.grid || preview.zoom < 4
      panel.grid.style.backgroundSize = `${preview.zoom}px ${preview.zoom}px`
      panel.topology.setAttribute('viewBox', `0 0 ${panel.frame.width} ${panel.frame.height}`)
      if (panel.topology.dataset.path !== topologyPath) {
        panel.topology.dataset.path = topologyPath
        const path = document.createElementNS(svgNamespace, 'path')
        path.setAttribute('d', topologyPath)
        path.setAttribute('vector-effect', 'non-scaling-stroke')
        panel.topology.replaceChildren(path)
      }
      panel.handle = updateHandle(rect)
      this.drawHelper(panel)
    }
  }

  private drawHelper(panel: Panel): void {
    panel.helper.replaceChildren()
    const frame = panel.handle
    if (!frame) return
    const origin = panel.root.getBoundingClientRect()
    const circle = (x: number, y: number, radius: number, fill: string) => {
      const element = document.createElementNS(svgNamespace, 'circle')
      element.setAttribute('cx', String(x - origin.left - panel.root.clientLeft))
      element.setAttribute('cy', String(y - origin.top - panel.root.clientTop))
      element.setAttribute('r', String(radius))
      element.setAttribute('fill', fill)
      element.setAttribute('stroke', '#ffc36b')
      panel.helper.append(element)
    }
    circle(frame.center.x, frame.center.y, frame.radius, 'none')
    const arm = document.createElementNS(svgNamespace, 'path')
    arm.setAttribute('d', `M${frame.center.x - origin.left - panel.root.clientLeft} ${frame.center.y - origin.top - panel.root.clientTop}L${frame.handle.x - origin.left - panel.root.clientLeft} ${frame.handle.y - origin.top - panel.root.clientTop}`)
    arm.setAttribute('stroke', '#ffc36b')
    panel.helper.append(arm)
    circle(frame.handle.x, frame.handle.y, 9, '#ffc36b')
  }

  handleAt(x: number, y: number): HandleFrame | undefined {
    return this.panelAt(x, y)?.handle
  }

  private panelAt(x: number, y: number): Panel | undefined {
    return this.visiblePanels().find((panel) => containsPoint(this.viewport(panel), { x, y }))
  }

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (this.drag || event.deltaY === 0) return
    const panel = this.panelAt(event.clientX, event.clientY)
    if (!panel?.rect || !panel.frame) return
    const { preview, actions } = this.store.getState()
    actions.setPreview(anchoredZoom(preview, stepPreviewZoom(preview.zoom, -event.deltaY), { x: event.clientX, y: event.clientY }, panel.rect, panel.frame))
  }

  private readonly onDown = (event: PointerEvent) => {
    if (this.store.getState().preview.tool !== 'preview-pan' || event.button !== 0 || event.isPrimary === false || this.drag) return
    event.preventDefault()
    event.stopImmediatePropagation()
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: { ...this.store.getState().preview.pan } }
    this.host.focus({ preventScroll: true })
    try { this.host.setPointerCapture(event.pointerId) } catch { this.finish(false) }
  }

  private readonly onMove = (event: PointerEvent) => {
    if (this.drag?.id === event.pointerId) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const { pan, x, y } = this.drag
      this.store.getState().actions.setPreview({ pan: { x: Math.round(pan.x + event.clientX - x), y: Math.round(pan.y + event.clientY - y) } })
    }
    const panel = this.panelAt(event.clientX, event.clientY)
    if (!panel?.rect || !panel.frame) return
    const point = clientToImage({ x: event.clientX, y: event.clientY }, panel.rect, panel.frame)
    this.pointerReadout.textContent = containsPoint(panel.rect, { x: event.clientX, y: event.clientY })
      ? `Pixel ${Math.floor(point.x)}, ${Math.floor(point.y)} · origin top-left`
      : 'Outside native image'
  }

  private readonly onUp = (event: PointerEvent) => {
    if (this.drag?.id !== event.pointerId) return
    event.stopImmediatePropagation()
    this.finish(false)
  }

  private readonly onCancel = (event: PointerEvent) => {
    if (this.drag?.id === event.pointerId) this.finish(true)
  }

  private readonly onBlur = () => this.finish(true)

  finish(cancel: boolean): void {
    const drag = this.drag
    if (!drag) return
    this.drag = undefined
    if (cancel) this.store.getState().actions.setPreview({ pan: drag.pan })
    if (this.host.hasPointerCapture(drag.id)) this.host.releasePointerCapture(drag.id)
  }

  private readonly onKey = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const { preview, actions } = this.store.getState()
    let handled = true
    if (event.key === 'Escape' && this.drag) this.finish(true)
    else if (event.key.toLowerCase() === 'f') { this.finish(false); this.fit() }
    else if (event.key.toLowerCase() === 'n') { this.finish(false); actions.setPreview({ zoom: 1, pan: { x: 0, y: 0 } }) }
    else if (event.key === '0') { this.finish(false); actions.resetPreview() }
    else if (event.key === '+' || event.key === '=' || event.key === '-') actions.setPreview({ zoom: stepPreviewZoom(preview.zoom, event.key === '-' ? -1 : 1) })
    else if (preview.tool === 'preview-pan' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const delta = event.shiftKey ? 64 : 16
      actions.setPreview({ pan: { x: preview.pan.x + (event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0), y: preview.pan.y + (event.key === 'ArrowDown' ? delta : event.key === 'ArrowUp' ? -delta : 0) } })
    } else handled = false
    if (handled) { event.preventDefault(); event.stopImmediatePropagation() }
  }

  diagnostics() {
    return this.visiblePanels().map((panel) => ({ name: panel.canvas.getAttribute('aria-label'), viewport: this.viewport(panel), image: panel.rect, handle: panel.handle, smoothing: panel.context.imageSmoothingEnabled }))
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.finish(false)
    this.unsubscribe()
    this.host.removeEventListener('wheel', this.onWheel, true)
    this.host.removeEventListener('pointerdown', this.onDown, true)
    this.host.removeEventListener('pointermove', this.onMove, true)
    this.host.removeEventListener('pointerup', this.onUp, true)
    this.host.removeEventListener('pointercancel', this.onCancel, true)
    this.host.removeEventListener('lostpointercapture', this.onCancel, true)
    this.host.removeEventListener('keydown', this.onKey, true)
    window.removeEventListener('blur', this.onBlur)
    for (const panel of [this.final, this.before]) {
      panel.canvas.width = 0; panel.canvas.height = 0
      panel.checker.width = 0; panel.checker.height = 0
      panel.frame = undefined
      panel.root.remove()
    }
    this.pointerReadout.remove()
    this.host.removeAttribute('tabindex')
  }
}
