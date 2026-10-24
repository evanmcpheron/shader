import { importDiagnostics } from '../import/modelAsset'
import type { ModelAsset } from '../import/modelAsset'
import type { SceneSettings } from '../domain/settings'
import { validateSceneSettings } from '../domain/validation'
import { downloadPng, encodeNativePng, ownExportFrame, pngFilename } from '../export/pngExport'
import { Box3, NoToneMapping, Scene, Sphere, SRGBColorSpace, WebGLRenderer } from 'three'
import type { StudioStore } from '../app/studioStore'
import { InvalidationScheduler } from './invalidation'
import type { FrameWork } from './invalidation'
import { NativeCapture } from './nativeCapture'
import { PreviewPresentation } from './previewPresentation'
import { previewTopology } from './previewTopology'
import { reframeCamera } from './referenceCamera'
import { CameraController } from './cameraController'
import { LightController } from './lightController'
import { LightHandle } from './lightHandle'
import { ReferenceLighting } from './referenceLighting'
import { applySubjectTransform, createPrimitiveContent, SceneSubject } from './subject'

export type CreationFailure = 'no-context' | 'allocation' | 'native-allocation'

const lifecycle = { created: 0, disposed: 0, active: 0 }

function createRenderer(canvas: HTMLCanvasElement, failure?: CreationFailure): WebGLRenderer {
  const context = failure === 'no-context' || typeof WebGL2RenderingContext === 'undefined'
    ? null : canvas.getContext('webgl2', { alpha: true, antialias: true })
  if (!context) throw new Error('WebGL2 is unavailable. Enable browser hardware acceleration or use a browser with WebGL2, then retry.')
  try {
    if (failure === 'allocation') throw new Error('Graphics allocation failed (verification simulation).')
    return new WebGLRenderer({ canvas, context })
  } catch (error) {
    context.getExtension('WEBGL_lose_context')?.loseContext()
    throw error
  }
}

export class ReferenceRuntime {
  private readonly host: HTMLElement
  private readonly store: StudioStore
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scheduler: InvalidationScheduler
  private readonly native: NativeCapture
  private readonly presentation?: PreviewPresentation
  private readonly resizeObserver?: ResizeObserver
  private readonly unsubscribe?: () => void
  private readonly scene = new Scene()
  private readonly subject = new SceneSubject()
  private readonly camera?: CameraController
  private readonly lighting = new ReferenceLighting()
  private readonly lightHandle = new LightHandle()
  private readonly lightController?: LightController
  private readonly fit = new Sphere()
  private topologyRevision = -1
  private topologyPath = ''
  private geometryKey = ''
  private disposed = false
  private frames = 0
  private geometryBuilds = 0
  private lightingInvalidations = 0
  private readonly lifetime = new AbortController()
  private exporting = false
  private lastExport?: ReturnType<ReferenceRuntime['inspectNativePixels']>
  private renderTimings = { totalMs: 0, prepareMs: 0, presentationMs: 0 }

  constructor(host: HTMLElement, store: StudioStore, failure?: CreationFailure) {
    this.host = host
    this.store = store
    this.canvas = document.createElement('canvas')
    this.canvas.hidden = true
    this.canvas.setAttribute('aria-hidden', 'true')
    this.canvas.className = 'reference-canvas'
    this.canvas.setAttribute('aria-label', 'Native capture renderer')
    this.renderer = createRenderer(this.canvas, failure)
    this.scheduler = new InvalidationScheduler((work) => this.render(work))
    this.native = new NativeCapture(this.renderer, this.scene, failure === 'native-allocation', this.lighting.directional)
    lifecycle.created++
    lifecycle.active++
    try {
      this.presentation = new PreviewPresentation(host, store)
      this.renderer.debug.onShaderError = () => { throw new Error('The graphics driver could not compile the reference material.') }
      this.renderer.toneMapping = NoToneMapping
      this.renderer.outputColorSpace = SRGBColorSpace
      this.scene.add(this.subject.parent, this.lighting.root, this.lightHandle.root)
      this.canvas.addEventListener('webglcontextlost', this.onContextLost)
      this.canvas.addEventListener('webglcontextcreationerror', this.onCreationError)
      this.resizeObserver = new ResizeObserver(() => { this.lightController?.finish(false); this.presentation?.finish(false); this.scheduler.invalidate('presentation') })
      this.resizeObserver.observe(host)
      this.unsubscribe = store.subscribe((state, previous) => {
        if (state.settings !== previous.settings) {
          if (state.status.kind !== 'error') state.actions.setStatus({ kind: 'busy', operation: 'render' })
          if (state.revisions.capture !== previous.revisions.capture) this.scheduler.invalidate('capture')
          else if (state.settings.lighting !== previous.settings.lighting) this.invalidateLighting()
          else this.scheduler.invalidate('style')
        }
        if (state.modelImport !== previous.modelImport && state.modelImport.kind === 'ready') this.scheduler.invalidate('capture')
        if (state.preview !== previous.preview) this.scheduler.invalidate('presentation')
      })
      host.append(this.canvas)
      this.camera = new CameraController(host, store)
      this.lightController = new LightController(host, store, (x, y) => this.presentation?.handleAt(x, y), (owned) => this.camera!.setLightGestureOwned(owned))
      this.scheduler.invalidate()
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  invalidateLighting(): void {
    if (this.disposed) return
    this.lightingInvalidations++
    this.scheduler.invalidate('style')
  }

  reframe(): void {
    if (this.disposed) return
    const { settings, actions } = this.store.getState()
    const result = actions.setSection('camera', reframeCamera(settings.camera, this.fit, settings.canvas.width / settings.canvas.height))
    actions.setStatus(result.ok ? { kind: 'idle' } : { kind: 'error', message: `Cannot reframe within camera limits. Reduce object size or position. ${result.issues[0].message}` })
  }

  diagnostics() {
    return {
      lifecycle: { ...lifecycle },
      imports: importDiagnostics(),
      modelImport: this.store.getState().modelImport,
      frames: this.frames,
      renderTimings: { ...this.renderTimings },
      geometryBuilds: this.geometryBuilds,
      lightingInvalidations: this.lightingInvalidations,
      memory: { ...this.renderer.info.memory, programs: this.renderer.info.programs?.length ?? 0 },
      triangles: this.renderer.info.render.triangles,
      settings: this.store.getState().settings,
      preview: this.store.getState().preview,
      presentation: this.presentation?.diagnostics(),
      revisions: this.store.getState().revisions,
      camera: this.camera?.diagnostics(),
      native: this.native.diagnostics(),
      nativeCanvas: { width: this.presentation?.final.canvas.width, height: this.presentation?.final.canvas.height, revision: this.presentation?.final.canvas.dataset.revision, smoothing: this.presentation?.final.context.imageSmoothingEnabled },
      light: this.lightController?.diagnostics(),
      lightHandle: { visible: this.lightHandle.root.visible, frame: this.lightHandle.frame, layers: this.lightHandle.root.children.map((object) => ({ name: object.type, mask: object.layers.mask })) },
      subject: { position: this.subject.parent.position.toArray(), rotation: this.subject.parent.rotation.toArray(), scale: this.subject.parent.scale.toArray() },
      normalization: this.subject.normalization.matrix.toArray(),
      drawingBuffer: [this.canvas.width, this.canvas.height],
      devicePixelRatio: window.devicePixelRatio,
      contextLost: this.renderer.getContext().isContextLost(),
      contextLossSimulation: this.renderer.extensions.has('WEBGL_lose_context'),
      exporting: this.exporting,
    }
  }

  simulateContextLoss(): void {
    this.renderer.forceContextLoss()
  }

  getFrame() {
    return this.disposed ? undefined : this.native.getFrame(this.store.getState().revisions.settings)
  }

  fitPreview(): void {
    this.lightController?.finish(false)
    this.presentation?.finish(false)
    this.presentation?.fit()
  }

  inspectNativePixels(before = false) {
    const frame = before ? this.native.getBeforeFrame(this.store.getState().revisions.settings) : this.getFrame()
    return frame ? { ...frame, rgba: Array.from(frame.rgba) } : null
  }

  inspectNativePasses() { return this.native.inspectPasses() }

  inspectExportPixels() { return this.lastExport ?? null }

  async exportPng(): Promise<string> {
    if (this.exporting) throw new Error('PNG export is already in progress.')
    this.assertExportable()
    const state = this.store.getState()
    const validated = validateSceneSettings(state.settings)
    if (!validated.ok) throw new Error(`Cannot export: ${validated.issues[0].message}`)
    const settings = validated.value
    const revisions = { ...state.revisions }
    const geometry = settings.subject.geometry
    const asset = geometry.kind === 'imported' ? this.store.assets.getAsset(geometry) : undefined
    if (geometry.kind === 'imported' && !asset) throw new Error(`Reselect ${geometry.asset.fileName} before exporting.`)
    const release = asset?.retain()
    this.exporting = true
    this.lastExport = undefined
    try {
      const frame = await this.scheduler.pin(() => {
        this.assertExportable()
        this.prepareSubject(settings, asset)
        this.lighting.apply(settings.lighting)
        const captured = this.native.update(settings, revisions, this.fit, () => !this.disposed && !this.renderer.getContext().isContextLost())
        this.assertExportable()
        return ownExportFrame(captured, settings, revisions.settings, revisions.capture)
      })
      const blob = await encodeNativePng(frame, this.lifetime.signal)
      this.assertExportable()
      const filename = pngFilename(settings)
      downloadPng(blob, filename)
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('scene-checks')) this.lastExport = { ...frame, rgba: Array.from(frame.rgba) }
      return filename
    } finally {
      release?.()
      this.exporting = false
    }
  }

  private assertExportable(): void {
    if (this.disposed || this.renderer.getContext().isContextLost()) throw new Error('The graphics context is unavailable. Retry renderer, then export again.')
  }

  private clearRenderStatus(): void {
    const { status, actions } = this.store.getState()
    if (status.kind === 'busy' && status.operation === 'render') actions.setStatus({ kind: 'idle' })
  }

  private prepareSubject(settings: SceneSettings, asset?: ModelAsset): void {
    const geometry = settings.subject.geometry
    const key = JSON.stringify(geometry)
    if (key !== this.geometryKey) {
      this.subject.replaceContent(geometry.kind === 'imported' ? asset!.createContent() : createPrimitiveContent(geometry, settings.shading.baseColor))
      this.geometryBuilds++
      this.geometryKey = key
    }
    applySubjectTransform(this.subject.parent, settings.subject.transform)
    this.subject.setColor(settings.shading.baseColor)
    this.subject.parent.updateWorldMatrix(true, true)
    new Box3().setFromObject(this.subject.parent, true).getBoundingSphere(this.fit)
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault()
    this.fail(new Error('The graphics context was lost. Your settings are safe. Retry to rebuild reference and native pixels.'))
  }

  private readonly onCreationError = () => {
    this.fail(new Error('The browser could not allocate a graphics context. Close unused graphics tabs, then retry.'))
  }

  private fail(error: unknown): void {
    if (this.disposed) return
    this.dispose()
    const reason = error instanceof Error ? error.message : 'An unknown graphics error occurred.'
    this.store.getState().actions.setReferenceStatus({ kind: 'unavailable', message: `Reference unavailable. ${reason}` })
  }

  private render(work: FrameWork): void {
    if (this.disposed) return
    const start = performance.now()
    try {
      const { settings, revisions, actions } = this.store.getState()
      const geometry = settings.subject.geometry
      const asset = geometry.kind === 'imported' ? this.store.assets.getAsset(geometry) : undefined
      if (geometry.kind === 'imported' && !asset) {
        this.subject.dispose()
        this.scene.add(this.subject.parent)
        this.geometryKey = ''
        actions.setReferenceStatus({ kind: 'unavailable', message: `Reselect ${geometry.asset.fileName} and its companion files in Subject, or choose a built-in shape. Model bytes are kept only for this session.` })
        this.clearRenderStatus()
        return
      }
      this.prepareSubject(settings, asset)
      if (this.host.clientWidth < 1 || this.host.clientHeight < 1) return
      const gl = this.renderer.getContext()
      if (gl.isContextLost()) throw new Error('The graphics context was lost. Retry to rebuild the reference.')
      this.camera!.renderCamera(settings.canvas.width / settings.canvas.height, this.fit)
      this.lighting.apply(settings.lighting)
      this.renderTimings.prepareMs = performance.now() - start
      if (work.style || !this.getFrame()) {
        const frame = this.native.update(settings, revisions, this.fit, () => this.scheduler.isCurrent(work) && this.store.getState().revisions.settings === revisions.settings)
        if (!frame) return
        actions.setNativeFraming({ captureRevision: frame.captureRevision, report: frame.framing })
        actions.setNativeOutline({ revision: frame.revision, report: frame.outline })
        actions.setNativeGround({ revision: frame.revision, report: frame.ground ?? null })
        this.presentation!.publish(frame, this.native.getBeforeFrame(revisions.settings)!)
      }
      const presentStart = performance.now()
      const nativeCamera = this.native.getCamera()
      if (nativeCamera && this.store.getState().preview.referenceWireframe && this.topologyRevision !== revisions.capture) {
        this.topologyPath = previewTopology(this.subject.parent, nativeCamera, settings.canvas)
        this.topologyRevision = revisions.capture
      }
      if (nativeCamera) this.presentation!.present((rect) => {
        this.lightHandle.update(settings.lighting, nativeCamera, rect, this.store.getState().preview.tool === 'light')
        return this.lightHandle.frame
      }, this.store.getState().preview.referenceWireframe ? this.topologyPath : '')
      this.frames++
      this.renderTimings.presentationMs = performance.now() - presentStart
      actions.setReferenceStatus({ kind: 'ready' })
      this.clearRenderStatus()
    } catch (error) {
      this.fail(error)
    } finally {
      this.renderTimings.totalMs = performance.now() - start
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.clearRenderStatus()
    this.lifetime.abort(new Error('Renderer stopped during export. Retry renderer, then export again.'))
    this.lastExport = undefined
    this.scheduler.dispose()
    this.resizeObserver?.disconnect()
    this.unsubscribe?.()
    this.lightController?.dispose()
    this.camera?.dispose()
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextcreationerror', this.onCreationError)
    this.subject.dispose()
    this.native.dispose()
    this.store.getState().actions.setNativeFraming(null)
    this.store.getState().actions.setNativeOutline(null)
    this.store.getState().actions.setNativeGround(null)
    this.presentation?.dispose()
    this.lightHandle.dispose()
    this.lighting.dispose()
    this.scene.clear()
    this.renderer.dispose()
    if (!this.renderer.getContext().isContextLost() && this.renderer.extensions.has('WEBGL_lose_context')) this.renderer.forceContextLoss()
    this.canvas.remove()
    lifecycle.disposed++
    lifecycle.active--
  }
}
