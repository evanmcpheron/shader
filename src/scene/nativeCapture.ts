import { Box3, DoubleSide, FrontSide, Matrix4, NearestFilter, NoBlending, NoColorSpace, OrthographicCamera, PerspectiveCamera, RGBAFormat, ShaderMaterial, UnsignedByteType, Vector3, WebGLRenderTarget } from 'three'
import type { DirectionalLight, Scene, Sphere, WebGLRenderer } from 'three'
import { deriveLighting } from '../domain/lighting'
import type { DirtyRevisions } from '../app/studioStore'
import type { SceneSettings } from '../domain/settings'
import { flipNativeRows, nativeByteLength, processNativePixels } from '../pixels/nativeFrame'
import type { NativeFrame } from '../pixels/nativeFrame'
import { measureSubjectBounds } from '../pixels/subjectBounds'
import type { FramingReport } from '../pixels/subjectBounds'
import { compositeOutline, dilateSubjectRing } from '../pixels/silhouetteOutline'
import type { OutlineGeometry, OutlineReport } from '../pixels/silhouetteOutline'
import { resolveEffectColor } from '../domain/shading'
import { frameSubject } from './pixelFraming'
import { configureOrbitCamera, deriveRenderCamera } from './referenceCamera'
import { SCENE_LAYERS } from './subject'
import { DirectionalShadows } from './directionalShadows'
import { GroundReceiver } from './groundReceiver'
import type { GroundReport } from './groundReceiver'
import { withNativeTarget } from './nativeRender'
import { filterShadowVisibility } from '../pixels/shadowVisibility'

const targetLifecycle = { created: 0, disposed: 0, active: 0 }

export class NativeCapture {
  private readonly renderer: WebGLRenderer
  private readonly scene: Scene
  private readonly material = new ShaderMaterial({
    name: 'Native view normals and subject category',
    blending: NoBlending,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
    side: DoubleSide,
    uniforms: { flatNormals: { value: false }, category: { value: 1 } },
    vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewPosition;
      void main() {
        vec4 positionInView = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalMatrix * normal;
        viewPosition = positionInView.xyz;
        gl_Position = projectionMatrix * positionInView;
      }`,
    fragmentShader: `
      uniform bool flatNormals;
      uniform float category;
      varying vec3 viewNormal;
      varying vec3 viewPosition;
      void main() {
        vec3 n = flatNormals
          ? normalize(cross(dFdx(viewPosition), dFdy(viewPosition)))
          : normalize(viewNormal);
        // Screen derivatives already orient geometric normals toward the visible side.
        if (!flatNormals && !gl_FrontFacing) n = -n;
        gl_FragColor = vec4(n * 0.5 + 0.5, category);
      }`,
  })
  private subjectIsPlane = false
  private readonly ground = new GroundReceiver()
  private readonly shadows?: DirectionalShadows
  private groundReport: GroundReport | null = null
  private subjectNormals = new Uint8Array(0)
  private visibility = new Uint8Array(0)
  private filtered = new Float32Array(0)
  private groundCaptureRevision = -1
  private shadowRevision = -1
  private visibilityKey = ''
  private filterKey = ''
  private visibilityEnabled = false
  private readonly orthographic = new OrthographicCamera()
  private readonly perspective = new PerspectiveCamera()
  private readonly renderOrthographic = new OrthographicCamera()
  private readonly renderPerspective = new PerspectiveCamera()
  private frameCamera?: OrthographicCamera | PerspectiveCamera
  private readonly viewMatrix = new Matrix4()
  private target?: WebGLRenderTarget
  private raw = new Uint8Array(0)
  private normals = new Uint8Array(0)
  private output = new Uint8ClampedArray(0)
  private styled = new Uint8ClampedArray(0)
  private ring = new Uint8Array(0)
  private horizontal = new Uint8Array(0)
  private processedSettings?: SceneSettings
  private processedCapture = -1
  private ringCapture = -1
  private ringThickness = 0
  private ringGeometry?: OutlineGeometry
  private capturedRevision = -1
  private disposed = false
  private frame: NativeFrame | undefined
  private beforeFrame: NativeFrame | undefined
  private captures = 0
  private rasterizations = 0
  private framing?: FramingReport
  private visibilityCaptures = 0
  private receiverCaptures = 0
  private processes = 0
  private composites = 0
  private readonly simulateAllocationFailure: boolean
  private timings = { visibilityMs: 0, effectsReadbackMs: 0, filterMs: 0, captureMs: 0, readbackMs: 0, processMs: 0, originalMs: 0, styleMs: 0, compositeMs: 0, publishMs: 0 }

  constructor(renderer: WebGLRenderer, scene: Scene, simulateAllocationFailure = false, light?: DirectionalLight) {
    this.renderer = renderer
    this.scene = scene
    this.simulateAllocationFailure = simulateAllocationFailure
    this.scene.add(this.ground.mesh)
    if (light) this.shadows = new DirectionalShadows(renderer, scene, light)
    this.material.onBeforeRender = (_r, _s, _c, _g, object) => {
      const isGround = object.layers.isEnabled(SCENE_LAYERS.ground)
      const side = isGround || this.subjectIsPlane ? DoubleSide : FrontSide
      if (this.material.side !== side) { this.material.side = side; this.material.needsUpdate = true }
      this.material.uniforms.category.value = isGround ? 128 / 255 : 1
      this.material.uniformsNeedUpdate = true
    }
  }

  private allocate(width: number, height: number): void {
    const gl = this.renderer.getContext()
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
    const maxAxis = Math.min(this.renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number)
    const length = nativeByteLength(width, height, Math.min(maxAxis, viewport[0]), Math.min(maxAxis, viewport[1]))
    if (this.target?.width === width && this.target.height === height) return
    const raw = new Uint8Array(length)
    const normals = new Uint8Array(length)
    const output = new Uint8ClampedArray(length)
    const styled = new Uint8ClampedArray(length)
    const ring = new Uint8Array(width * height)
    const horizontal = new Uint8Array(width * height)
    const target = new WebGLRenderTarget(width, height, {
      type: UnsignedByteType, format: RGBAFormat, colorSpace: NoColorSpace,
      minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false,
      depthBuffer: true, stencilBuffer: false, samples: 0,
    })
    this.releaseTarget()
    this.target = target
    targetLifecycle.created++
    targetLifecycle.active++
    this.raw = raw
    this.normals = normals
    this.subjectNormals = new Uint8Array(length)
    this.visibility = new Uint8Array(length)
    this.filtered = new Float32Array(width * height)
    this.shadowRevision = -1
    this.groundCaptureRevision = -1
    this.visibilityKey = ''
    this.filterKey = ''
    this.output = output
    this.styled = styled
    this.ring = ring
    this.horizontal = horizontal
    this.capturedRevision = -1
    this.processedCapture = -1
    this.ringCapture = -1
  }

  update(settings: SceneSettings, revisions: DirtyRevisions, bounds: Sphere, isCurrent: () => boolean): NativeFrame | undefined {
    if (this.disposed) return
    for (const key of Object.keys(this.timings) as (keyof typeof this.timings)[]) this.timings[key] = 0
    const { width, height } = settings.canvas
    this.allocate(width, height)
    if (this.simulateAllocationFailure) throw new Error('Native target allocation failed (verification simulation). Choose a smaller canvas and Retry renderer.')
    if (this.capturedRevision !== revisions.capture) {
      this.capture(settings, bounds)
      if (!isCurrent() || this.disposed) return
      this.capturedRevision = revisions.capture
    }
    if (this.shadowRevision !== revisions.shadow) {
      this.captureEffects(settings)
      if (!isCurrent() || this.disposed) return
      this.shadowRevision = revisions.shadow
    }
    const previous = this.processedSettings
    const needsStyle = this.processedCapture !== revisions.capture || !previous || !this.beforeFrame
      || (['lighting', 'shading', 'palette', 'dither', 'background', 'ground', 'shadows'] as const).some((section) => previous[section] !== settings[section])
    let beforeBytes = this.beforeFrame?.rgba
    if (needsStyle) {
      this.processedCapture = -1
      const start = performance.now()
      const lighting = deriveLighting(settings.lighting)
      if (!lighting.ok) throw new Error(lighting.issues[0].message)
      const direction = new Vector3().copy(lighting.value.direction).transformDirection(this.viewMatrix)
      const viewLighting = { ...lighting.value, direction }
      processNativePixels(this.normals, this.output, viewLighting, settings.shading.baseColor, settings.background, undefined, { ground: settings.ground, shadows: settings.shadows, canvas: settings.canvas, palette: settings.palette, visibility: this.filtered })
      beforeBytes = this.output.slice()
      this.timings.originalMs = performance.now() - start
      const styleStart = performance.now()
      processNativePixels(this.normals, this.styled, viewLighting, settings.shading.baseColor, settings.background, settings, { ground: settings.ground, shadows: settings.shadows, canvas: settings.canvas, palette: settings.palette, visibility: this.filtered })
      this.timings.styleMs = performance.now() - styleStart
      this.timings.processMs = performance.now() - start
      this.processes++
    }
    const compositeStart = performance.now()
    let outline: OutlineReport | null = null
    if (settings.outline.kind === 'silhouette') {
      const { thickness } = settings.outline
      if (this.ringCapture !== revisions.capture || this.ringThickness !== thickness) {
        this.ringGeometry = dilateSubjectRing(this.subjectNormals, width, height, thickness, this.ring, this.horizontal)
        this.ringCapture = revisions.capture
        this.ringThickness = thickness
      }
      const color = resolveEffectColor(settings.outline.color, settings.palette)
      compositeOutline(this.subjectNormals, this.ring, this.styled, this.output, color)
      outline = { ...this.ringGeometry!, color, thickness }
    } else this.output.set(this.styled)
    this.timings.compositeMs = performance.now() - compositeStart
    this.composites++
    if (!isCurrent() || this.disposed) return
    const publishStart = performance.now()
    this.processedSettings = settings
    this.processedCapture = revisions.capture
    this.beforeFrame = { width, height, revision: revisions.settings, captureRevision: revisions.capture, framing: this.framing!, outline: null, rgba: beforeBytes! }
    this.frame = { width, height, revision: revisions.settings, captureRevision: revisions.capture, framing: this.framing!, outline, ground: this.groundReport, rgba: this.output.slice() }
    this.timings.publishMs = performance.now() - publishStart
    return this.frame
  }

  private capture(settings: SceneSettings, bounds: Sphere): void {
    const renderer = this.renderer
    const scene = this.scene
    const target = this.target!
    const source = settings.camera.projection.kind === 'orthographic' ? this.orthographic : this.perspective
    const render = settings.camera.projection.kind === 'orthographic' ? this.renderOrthographic : this.renderPerspective
    configureOrbitCamera(source, settings.camera, target.width / target.height)
    const camera = deriveRenderCamera(source, render, settings.camera, bounds)
    camera.layers.set(SCENE_LAYERS.subject)
    this.subjectIsPlane = settings.subject.geometry.kind === 'plane'
    this.material.uniforms.flatNormals.value = settings.shading.normals === 'flat'
    const start = performance.now()
    withNativeTarget(renderer, scene, target, () => {
      scene.overrideMaterial = this.material
      const gl = renderer.getContext()
      const rasterize = () => {
        renderer.clear(true, true, true)
        renderer.render(scene, camera)
        const readStart = performance.now()
        renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, this.raw)
        const error = gl.getError()
        if (gl.isContextLost() || error !== gl.NO_ERROR) throw new Error(`Native capture/readback failed (WebGL ${error}). Choose a smaller canvas and Retry renderer.`)
        flipNativeRows(this.raw, this.normals, target.width, target.height)
        this.timings.readbackMs += performance.now() - readStart
        this.rasterizations++
        return measureSubjectBounds(this.normals, target.width, target.height)
      }
      this.timings.readbackMs = 0
      this.framing = frameSubject(this.scene, camera, settings, rasterize)
      this.timings.captureMs = performance.now() - start
      this.frameCamera = camera
      this.viewMatrix.copy(camera.matrixWorldInverse)
      this.captures++
    })
    this.subjectNormals.set(this.normals)
  }

  private captureEffects(settings: SceneSettings): void {
    const started = performance.now()
    this.ground.apply(settings.ground)
    const camera = this.frameCamera!
    const subjectBox = new Box3()
    this.scene.traverseVisible((object) => {
      if (object.layers.isEnabled(SCENE_LAYERS.subject) && 'geometry' in object) subjectBox.expandByObject(object, true)
    })
    if (subjectBox.isEmpty()) subjectBox.setFromCenterAndSize(new Vector3(), new Vector3(0.001, 0.001, 0.001))
    const receiverBox = settings.ground.kind === 'receiver' ? new Box3().setFromObject(this.ground.mesh) : new Box3()
    const shadow = settings.shadows
    const radius = shadow.kind === 'directional' && shadow.treatment.kind === 'pixel-soft' ? shadow.treatment.radius : 0
    const visibilityKey = JSON.stringify([this.capturedRevision, shadow.kind === 'directional' ? [settings.lighting.directional.position, settings.lighting.directional.target, shadow.self, shadow.ground, shadow.bias ?? 0.5] : 'none'])
    const needsVisibility = this.visibilityKey !== visibilityKey
    if (needsVisibility) this.visibilityEnabled = this.shadows?.configure(settings, camera, subjectBox, receiverBox) ?? false
    const enabled = this.visibilityEnabled
    if (settings.shadows.kind === 'directional' && !this.shadows) throw new Error('Directional shadow resources are unavailable. Retry renderer.')
    const needsNormals = this.groundCaptureRevision !== this.capturedRevision
    if (needsNormals) this.normals.set(this.subjectNormals)
    const groundActive = settings.ground.kind === 'receiver'
    if ((groundActive && needsNormals) || (enabled && needsVisibility)) withNativeTarget(this.renderer, this.scene, this.target!, () => {
      camera.layers.set(SCENE_LAYERS.subject)
      if (groundActive) camera.layers.enable(SCENE_LAYERS.ground)
      const read = (destination: Uint8Array) => {
        const start = performance.now()
        this.renderer.readRenderTargetPixels(this.target!, 0, 0, this.target!.width, this.target!.height, this.raw)
        const gl = this.renderer.getContext()
        const error = gl.getError()
        if (gl.isContextLost() || error !== gl.NO_ERROR) throw new Error(`Native visibility/readback failed (WebGL ${error}). Retry renderer.`)
        flipNativeRows(this.raw, destination, settings.canvas.width, settings.canvas.height)
        this.timings.effectsReadbackMs += performance.now() - start
      }
      try {
        if (groundActive && needsNormals) {
          this.scene.overrideMaterial = this.material
          this.renderer.clear(true, true, true)
          this.renderer.render(this.scene, camera)
          read(this.normals)
          this.receiverCaptures++
          this.shadows?.freeze()
        }
        if (enabled && needsVisibility) {
          this.scene.overrideMaterial = this.shadows!.material
          this.renderer.clear(true, true, true)
          this.renderer.render(this.scene, camera)
          read(this.visibility)
          this.visibilityCaptures++
          this.shadows!.freeze()
        }
      } finally { camera.layers.set(SCENE_LAYERS.subject) }
    })
    this.visibilityKey = visibilityKey
    this.groundCaptureRevision = this.capturedRevision
    this.timings.visibilityMs = performance.now() - started
    const filterStarted = performance.now()
    const filterKey = JSON.stringify([visibilityKey, radius])
    if (this.filterKey !== filterKey) {
      this.filtered.fill(1)
      if (enabled) filterShadowVisibility(this.normals, this.visibility, this.filtered, {
        ...settings.canvas, radius, depthSpan: this.shadows!.depthSpan, depthStep: this.shadows!.depthStep,
      })
      this.filterKey = filterKey
    }
    this.timings.filterMs = performance.now() - filterStarted
    const light = deriveLighting(settings.lighting)
    if (!light.ok) throw new Error(light.issues[0].message)
    this.groundReport = this.ground.report(settings.ground, subjectBox, light.value.direction, camera, settings.canvas, settings.shadows.kind === 'directional' && settings.shadows.ground, settings.shadows.kind === 'directional' && settings.shadows.treatment.kind === 'pixel-soft' ? settings.shadows.treatment.radius : 0)
  }

  diagnostics() {
    return {
      visibilityCaptures: this.visibilityCaptures, receiverCaptures: this.receiverCaptures,
      ground: this.groundReport, shadow: this.shadows?.diagnostics(),
      framing: this.framing, outline: this.frame?.outline, rasterizations: this.rasterizations, readback: 'synchronous', captures: this.captures, processes: this.processes, composites: this.composites, timings: { ...this.timings },
      targetLifecycle: { ...targetLifecycle },
      target: this.target ? { width: this.target.width, height: this.target.height, samples: this.target.samples, type: this.target.texture.type, format: this.target.texture.format, colorSpace: this.target.texture.colorSpace, minFilter: this.target.texture.minFilter, magFilter: this.target.texture.magFilter, generateMipmaps: this.target.texture.generateMipmaps } : null,
      effectBuffers: { subject: this.subjectNormals.byteLength, visibility: this.visibility.byteLength, filtered: this.filtered.byteLength },
      buffers: { raw: this.raw.byteLength, normals: this.normals.byteLength, work: this.output.byteLength, styled: this.styled.byteLength, ring: this.ring.byteLength, horizontal: this.horizontal.byteLength },
      frame: this.frame ? { width: this.frame.width, height: this.frame.height, revision: this.frame.revision, captureRevision: this.frame.captureRevision, byteLength: this.frame.rgba.byteLength } : null,
    }
  }

  getFrame(revision: number): NativeFrame | undefined {
    return this.frame?.revision === revision ? this.frame : undefined
  }

  getBeforeFrame(revision: number): NativeFrame | undefined {
    return this.beforeFrame?.revision === revision ? this.beforeFrame : undefined
  }

  inspectPasses() {
    return { normals: Array.from(this.normals), subject: Array.from(this.subjectNormals), visibility: Array.from(this.visibility), filtered: Array.from(this.filtered), projection: this.frameCamera?.projectionMatrix.toArray(), view: this.viewMatrix.toArray() }
  }

  getCamera() {
    return this.frameCamera
  }

  private releaseTarget(): void {
    if (!this.target) return
    this.target.dispose()
    this.target = undefined
    targetLifecycle.disposed++
    targetLifecycle.active--
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.releaseTarget()
    this.material.dispose()
    this.ground.dispose()
    this.shadows?.dispose()
    this.subjectNormals = new Uint8Array(0)
    this.visibility = new Uint8Array(0)
    this.filtered = new Float32Array(0)
    this.raw = new Uint8Array(0)
    this.normals = new Uint8Array(0)
    this.output = new Uint8ClampedArray(0)
    this.styled = new Uint8ClampedArray(0)
    this.ring = new Uint8Array(0)
    this.horizontal = new Uint8Array(0)
    this.processedSettings = undefined
    this.ringGeometry = undefined
    this.frame = undefined
    this.beforeFrame = undefined
    this.frameCamera = undefined
  }
}
