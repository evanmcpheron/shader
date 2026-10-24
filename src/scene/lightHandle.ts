import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, RingGeometry, SphereGeometry, Vector3 } from 'three'
import type { Camera } from 'three'
import type { LightingSettings } from '../domain/settings'
import { deriveLightDirection } from '../domain/validation'
import type { StudioCamera } from './referenceCamera'
import { SCENE_LAYERS } from './subject'

export type ViewRect = Readonly<{ left: number; top: number; width: number; height: number }>
export type HandleFrame = Readonly<{
  center: Readonly<{ x: number; y: number }>
  handle: Readonly<{ x: number; y: number }>
  radius: number
  orientation: Quaternion
}>

export function projectToClient(position: Vector3, camera: Camera, rect: ViewRect) {
  const ndc = position.clone().project(camera)
  return { x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2, z: ndc.z }
}

export function screenArcball(clientX: number, clientY: number, frame: HandleFrame): Vector3 {
  const x = (clientX - frame.center.x) / frame.radius
  const y = (frame.center.y - clientY) / frame.radius
  const lengthSquared = x * x + y * y
  return new Vector3(x, y, Math.sqrt(Math.max(0, 1 - lengthSquared))).normalize().applyQuaternion(frame.orientation)
}

export class LightHandle {
  readonly root = new Group()
  private readonly marker = new Mesh(new SphereGeometry(1, 16, 12), new MeshBasicMaterial({ color: '#FFC36B', depthTest: false, depthWrite: false }))
  private readonly ring = new Mesh(new RingGeometry(0.992, 1, 64), new MeshBasicMaterial({ color: '#977446', side: DoubleSide, depthTest: false, depthWrite: false }))
  private readonly arm = new Line(new BufferGeometry(), new LineBasicMaterial({ color: '#FFC36B', depthTest: false, depthWrite: false }))
  frame?: HandleFrame
  private disposed = false

  constructor() {
    this.root.name = 'Light direction handle (reference only)'
    this.arm.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3))
    this.root.add(this.ring, this.arm, this.marker)
    this.root.traverse((object) => { object.layers.set(SCENE_LAYERS.helper); object.renderOrder = 10 })
  }

  update(settings: LightingSettings, camera: StudioCamera, rect: ViewRect, visible: boolean): void {
    this.root.visible = false
    this.frame = undefined
    if (this.disposed || !visible || rect.width < 1 || rect.height < 1) return
    const direction = deriveLightDirection(settings.directional.position, settings.directional.target)
    if (!direction.ok) return
    const target = new Vector3().copy(settings.directional.target)
    const center = projectToClient(target, camera, rect)
    const depth = -target.clone().applyMatrix4(camera.matrixWorldInverse).z
    if (depth <= camera.near || center.z < -1 || center.z > 1) return
    const worldPerPixel = camera instanceof PerspectiveCamera
      ? 2 * depth / (camera.projectionMatrix.elements[5] * rect.height)
      : 2 / (camera.projectionMatrix.elements[5] * rect.height)
    const radius = Math.min(rect.width, rect.height) * 0.32
    const worldRadius = camera instanceof PerspectiveCamera ? Math.min(radius * worldPerPixel, depth * 0.45) : radius * worldPerPixel
    const position = target.clone().addScaledVector(new Vector3().copy(direction.value), worldRadius)
    const handle = projectToClient(position, camera, rect)
    if (handle.z < -1 || handle.z > 1 || ![handle.x, handle.y, worldRadius].every(Number.isFinite)) return
    this.root.visible = true
    this.marker.position.copy(position)
    const markerDepthRatio = camera instanceof PerspectiveCamera ? -position.clone().applyMatrix4(camera.matrixWorldInverse).z / depth : 1
    this.marker.scale.setScalar(worldPerPixel * markerDepthRatio * 9)
    this.ring.position.copy(target)
    this.ring.quaternion.copy(camera.quaternion)
    this.ring.scale.setScalar(worldRadius)
    const attribute = this.arm.geometry.getAttribute('position')
    attribute.setXYZ(0, target.x, target.y, target.z)
    attribute.setXYZ(1, position.x, position.y, position.z)
    attribute.needsUpdate = true
    this.arm.geometry.computeBoundingSphere()
    this.frame = { center, handle, radius, orientation: camera.quaternion.clone() }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const object of [this.marker, this.ring, this.arm]) { object.geometry.dispose(); object.material.dispose() }
    this.root.clear()
    this.root.removeFromParent()
    this.frame = undefined
  }
}
