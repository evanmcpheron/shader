import { BasicShadowMap, Box3, DoubleSide, FrontSide, Mesh, NoBlending, ShaderLib, ShaderMaterial, UniformsUtils, Vector3 } from 'three'
import type { DirectionalLight, Scene, WebGLRenderer } from 'three'
import type { SceneSettings } from '../domain/settings'
import type { StudioCamera } from './referenceCamera'
import { boxCorners } from './groundReceiver'
import { SCENE_LAYERS } from './subject'

export class DirectionalShadows {
  readonly material: ShaderMaterial
  private readonly category = { value: 1 }
  private readonly depthOrigin = { value: 0 }
  private readonly depthRange = { value: 1 }
  private mapRenders = 0
  private active = false
  private subjectIsPlane = false
  depthStep = 1

  private readonly renderer: WebGLRenderer
  private readonly scene: Scene
  private readonly light: DirectionalLight

  constructor(renderer: WebGLRenderer, scene: Scene, light: DirectionalLight) {
    this.renderer = renderer
    this.scene = scene
    this.light = light
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = BasicShadowMap
    renderer.shadowMap.autoUpdate = false
    light.shadow.mapSize.set(1024, 1024)
    light.shadow.autoUpdate = false
    this.material = new ShaderMaterial({
      name: 'Native directional visibility and depth', lights: true, blending: NoBlending,
      depthTest: true, depthWrite: true, toneMapped: false, side: DoubleSide,
      uniforms: { ...UniformsUtils.clone(ShaderLib.shadow.uniforms), category: this.category, depthOrigin: this.depthOrigin, depthRange: this.depthRange },
      vertexShader: ShaderLib.shadow.vertexShader.replace('void main() {', 'varying float captureDepth;\nvoid main() {').replace('#include <project_vertex>', '#include <project_vertex>\ncaptureDepth = -mvPosition.z;'),
      fragmentShader: ShaderLib.shadow.fragmentShader.replace('void main() {', 'uniform float category;\nuniform float depthOrigin;\nuniform float depthRange;\nvarying float captureDepth;\nvoid main() {')
        .replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );', `float depthCode = floor(clamp((captureDepth - depthOrigin) / depthRange, 0.0, 1.0) * 65535.0 + 0.5);
        gl_FragColor = vec4(getShadowMask(), floor(depthCode / 256.0) / 255.0, mod(depthCode, 256.0) / 255.0, category);`)
        .replace('#include <colorspace_fragment>', ''),
    })
    this.material.onBeforeRender = (_r, _s, _c, _g, object) => {
      const isGround = object.layers.isEnabled(SCENE_LAYERS.ground)
      const side = isGround || this.subjectIsPlane ? DoubleSide : FrontSide
      if (this.material.side !== side) { this.material.side = side; this.material.needsUpdate = true }
      this.category.value = isGround ? 128 / 255 : 1
      this.material.uniformsNeedUpdate = true
    }
  }

  configure(settings: SceneSettings, camera: StudioCamera, subject: Box3, receiver: Box3): boolean {
    this.subjectIsPlane = settings.subject.geometry.kind === 'plane'
    const shadow = settings.shadows
    this.active = shadow.kind === 'directional' && (shadow.self || (shadow.ground && settings.ground.kind === 'receiver'))
    this.light.castShadow = this.active
    this.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const isSubject = object.layers.isEnabled(SCENE_LAYERS.subject)
      object.castShadow = isSubject
      object.receiveShadow = shadow.kind === 'directional' && (isSubject ? shadow.self : shadow.ground)
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) material.shadowSide = material.side === DoubleSide ? DoubleSide : FrontSide
    })
    if (!this.active) return false
    const direction = new Vector3().subVectors(settings.lighting.directional.position, settings.lighting.directional.target).normalize()
    if (direction.y <= 0.01) this.scene.traverse((object) => { if (object.layers.isEnabled(SCENE_LAYERS.ground)) object.receiveShadow = false })
    const casterPoints = boxCorners(subject)
    const allPoints = [...casterPoints, ...(receiver.isEmpty() ? [] : boxCorners(receiver))]
    const center = subject.getCenter(new Vector3())
    const radius = Math.max(subject.getSize(new Vector3()).length(), 0.001)
    const distance = Math.max(...allPoints.map((point) => point.distanceTo(center)), radius) + radius
    this.light.target.position.copy(center)
    this.light.position.copy(center).addScaledVector(direction, distance)
    this.light.target.updateWorldMatrix(true, false)
    this.light.updateWorldMatrix(true, false)
    const shadowCamera = this.light.shadow.camera
    shadowCamera.up.set(0, Math.abs(direction.y) > 0.99 ? 0 : 1, Math.abs(direction.y) > 0.99 ? 1 : 0)
    shadowCamera.position.copy(this.light.position)
    shadowCamera.lookAt(center)
    shadowCamera.updateMatrixWorld(true)
    const caster = new Box3().setFromPoints(casterPoints.map((point) => point.clone().applyMatrix4(shadowCamera.matrixWorldInverse)))
    const full = new Box3().setFromPoints(allPoints.map((point) => point.clone().applyMatrix4(shadowCamera.matrixWorldInverse)))
    const margin = radius * 0.05
    shadowCamera.left = caster.min.x - margin
    shadowCamera.right = caster.max.x + margin
    shadowCamera.bottom = caster.min.y - margin
    shadowCamera.top = caster.max.y + margin
    shadowCamera.near = Math.max(0.00001, -full.max.z - margin)
    shadowCamera.far = Math.max(shadowCamera.near + 0.001, -full.min.z + margin)
    shadowCamera.updateProjectionMatrix()
    const texel = Math.max(shadowCamera.right - shadowCamera.left, shadowCamera.top - shadowCamera.bottom) / 1024
    this.light.shadow.normalBias = (shadow.kind === 'directional' ? shadow.bias ?? 0.5 : 0.5) * texel
    this.light.shadow.bias = -0.00001
    this.light.shadow.intensity = 1
    const viewDepths = allPoints.map((point) => -point.clone().applyMatrix4(camera.matrixWorldInverse).z)
    this.depthOrigin.value = Math.min(...viewDepths) - margin
    this.depthRange.value = Math.max(...viewDepths) - this.depthOrigin.value + margin
    const centerView = center.clone().applyMatrix4(camera.matrixWorldInverse)
    const pixel = new Vector3(2 / settings.canvas.width, 2 / settings.canvas.height, center.clone().project(camera).z).applyMatrix4(camera.projectionMatrixInverse)
    const origin = new Vector3(0, 0, center.clone().project(camera).z).applyMatrix4(camera.projectionMatrixInverse)
    this.depthStep = Math.max(pixel.distanceTo(origin) * 2, Math.abs(centerView.z) * 1e-7)
    this.light.shadow.needsUpdate = true
    this.renderer.shadowMap.needsUpdate = true
    this.mapRenders++
    return true
  }

  get depthSpan() { return this.depthRange.value }

  freeze(): void {
    this.light.shadow.needsUpdate = false
    this.renderer.shadowMap.needsUpdate = false
  }

  diagnostics() {
    return { active: this.active, mapRenders: this.mapRenders, allocatedMaps: this.light.shadow.map ? 1 : 0, resolution: this.light.shadow.mapSize.toArray(), bias: this.light.shadow.bias, normalBias: this.light.shadow.normalBias, depthSpan: this.depthSpan, depthStep: this.depthStep, frustum: { left: this.light.shadow.camera.left, right: this.light.shadow.camera.right, top: this.light.shadow.camera.top, bottom: this.light.shadow.camera.bottom, near: this.light.shadow.camera.near, far: this.light.shadow.camera.far } }
  }

  dispose(): void {
    this.material.dispose()
    this.light.castShadow = false
    this.light.shadow.dispose()
    this.light.shadow.map = null
  }
}
