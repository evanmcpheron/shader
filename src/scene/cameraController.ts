import { MathUtils, OrthographicCamera, PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Sphere } from 'three'
import type { StudioStore } from '../app/studioStore'
import { LIMITS, MIN_DIRECTION_LENGTH } from '../domain/constraints'
import type { CameraSettings } from '../domain/settings'
import { configureOrbitCamera, deriveRenderCamera, groundOrbitLimits } from './referenceCamera'
import type { StudioCamera } from './referenceCamera'

export class CameraController {
  private readonly store: StudioStore
  private readonly orthographic = new OrthographicCamera()
  private readonly perspective = new PerspectiveCamera()
  private readonly renderOrthographic = new OrthographicCamera()
  private readonly renderPerspective = new PerspectiveCamera()
  private readonly controls: OrbitControls
  private readonly unsubscribe: () => void
  private aspect = 1
  private applying = false
  private disposed = false
  private changes = 0
  private lightOwnsGesture = false

  constructor(canvas: HTMLElement, store: StudioStore) {
    this.store = store
    this.controls = new OrbitControls(this.orthographic, canvas)
    this.controls.enableDamping = false
    this.controls.minDistance = MIN_DIRECTION_LENGTH * 1.000001
    this.controls.maxDistance = Math.sqrt(3) * (LIMITS.cameraPosition.max - LIMITS.cameraPosition.min)
    this.controls.minZoom = LIMITS.zoom.min
    this.controls.maxZoom = LIMITS.zoom.max
    this.controls.listenToKeyEvents(canvas)
    this.controls.addEventListener('change', this.onChange)
    this.unsubscribe = store.subscribe((state, previous) => {
      if ((state.settings.camera !== previous.settings.camera || state.settings.ground !== previous.settings.ground) && !this.applying) this.applySettings()
      if (state.preview.tool !== previous.preview.tool || state.settings.framing.mode !== previous.settings.framing.mode) this.setEnabled()
    })
    this.applySettings()
    this.setEnabled()
  }

  private setEnabled(): void {
    const manual = this.store.getState().settings.framing.mode === 'manual'
    this.controls.enablePan = manual
    this.controls.enableZoom = manual
    this.controls.enabled = this.store.getState().preview.tool !== 'preview-pan' && !this.lightOwnsGesture
  }

  setLightGestureOwned(owned: boolean): void {
    this.lightOwnsGesture = owned
    this.setEnabled()
  }

  private source(): StudioCamera {
    return this.store.getState().settings.camera.projection.kind === 'orthographic' ? this.orthographic : this.perspective
  }

  private applySettings(): void {
    this.applying = true
    try {
      const { settings: scene, actions } = this.store.getState()
      const { camera: settings, maxPolarAngle } = groundOrbitLimits(scene.camera, scene.ground)
      if (settings !== scene.camera) actions.setSection('camera', settings)
      const source = this.source()
      this.controls.maxPolarAngle = maxPolarAngle
      configureOrbitCamera(source, settings, this.aspect)
      this.controls.object = source
      this.controls.target.copy(settings.target)
      this.controls.update()
      // OrbitControls nudges exact poles. Keep numeric/preset poses exact until a gesture.
      configureOrbitCamera(source, settings, this.aspect)
    } finally {
      this.applying = false
    }
  }

  private readonly onChange = () => {
    if (this.applying || this.disposed) return
    const { settings, actions } = this.store.getState()
    const camera = settings.camera
    const source = this.source()
    const target = this.controls.target.clone()
    const position = source.position.clone()
    const pan = target.clone().sub(camera.target)
    const backward = position.clone().sub(target).normalize()
    // OrbitControls pans in unrolled axes; align that displacement with the displayed axes.
    const correction = pan.clone().applyAxisAngle(backward, MathUtils.degToRad(camera.roll)).sub(pan)
    target.add(correction)
    position.add(correction)
    const next: CameraSettings = groundOrbitLimits({
      ...camera,
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      projection: { ...camera.projection, zoom: source.zoom },
    }, settings.ground).camera
    this.applying = true
    const result = actions.setSection('camera', next)
    this.applying = false
    if (result.ok) this.changes++
    else actions.setStatus({ kind: 'error', message: `Camera movement limit: ${result.issues[0].message}` })
    this.applySettings()
  }

  renderCamera(aspect: number, bounds: Sphere): StudioCamera {
    if (aspect !== this.aspect) {
      this.aspect = aspect
      this.applySettings()
    }
    const source = this.source()
    const render = source instanceof OrthographicCamera ? this.renderOrthographic : this.renderPerspective
    return deriveRenderCamera(source, render, this.store.getState().settings.camera, bounds)
  }

  diagnostics() {
    const source = this.controls.object
    const render = source instanceof OrthographicCamera ? this.renderOrthographic : this.renderPerspective
    return {
      enabled: this.controls.enabled, panEnabled: this.controls.enablePan, zoomEnabled: this.controls.enableZoom, lightOwnsGesture: this.lightOwnsGesture, changes: this.changes, disposed: this.disposed,
      sourcePosition: source.position.toArray(), target: this.controls.target.toArray(),
      sourceQuaternion: source.quaternion.toArray(), renderQuaternion: render.quaternion.toArray(),
      projectionMatrix: render.projectionMatrix.toArray(), near: render.near, far: render.far,
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
    this.controls.removeEventListener('change', this.onChange)
    this.controls.dispose()
  }
}
