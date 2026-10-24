import { MathUtils, Matrix4, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import type { Sphere } from 'three'
import { LIMITS } from '../domain/constraints'
import type { CameraSettings } from '../domain/settings'

export type StudioCamera = OrthographicCamera | PerspectiveCamera
export const CAMERA_VIEWS = ['front', 'back', 'left', 'right', 'top', 'bottom', 'isometric'] as const
export type CameraView = typeof CAMERA_VIEWS[number]

export function cameraDistance(settings: CameraSettings): number {
  return new Vector3().subVectors(settings.position, settings.target).length()
}

export function withCameraDistance(settings: CameraSettings, distance: number): CameraSettings {
  const position = new Vector3().subVectors(settings.position, settings.target).setLength(distance).add(settings.target)
  return { ...settings, position: { x: position.x, y: position.y, z: position.z } }
}

export function cameraView(settings: CameraSettings, view: CameraView): CameraSettings {
  const directions = {
    front: [0, 0, 1], back: [0, 0, -1], left: [-1, 0, 0], right: [1, 0, 0],
    top: [0, 1, 0], bottom: [0, -1, 0], isometric: [1, 1, 1],
  } as const
  const position = new Vector3(...directions[view]).setLength(cameraDistance(settings)).add(settings.target)
  return { ...settings, position: { x: position.x, y: position.y, z: position.z } }
}

export function switchCameraProjection(settings: CameraSettings, kind: CameraSettings['projection']['kind']): CameraSettings {
  const projection = settings.projection
  if (projection.kind === kind) return settings
  if (projection.kind === 'orthographic') {
    const fov = 50
    const distance = projection.verticalSize / projection.zoom / (2 * Math.tan(MathUtils.degToRad(fov / 2)))
    return { ...withCameraDistance(settings, distance), projection: { kind: 'perspective', fov, zoom: 1 } }
  }
  const span = 2 * cameraDistance(settings) * Math.tan(MathUtils.degToRad(projection.fov / 2)) / projection.zoom
  const verticalSize = MathUtils.clamp(span, LIMITS.cameraSpan.min, LIMITS.cameraSpan.max)
  return { ...settings, projection: { kind: 'orthographic', verticalSize, zoom: verticalSize / span } }
}

export function reframeCamera(settings: CameraSettings, bounds: Sphere, aspect: number): CameraSettings {
  const radius = Math.max(bounds.radius, 0.000001)
  let next: CameraSettings = { ...settings, target: { x: bounds.center.x, y: bounds.center.y, z: bounds.center.z } }
  const direction = new Vector3().subVectors(settings.position, settings.target).normalize()
  const projection = settings.projection
  let distance: number
  if (projection.kind === 'orthographic') {
    const span = radius * 2.4 / Math.min(aspect, 1)
    const verticalSize = MathUtils.clamp(span, LIMITS.cameraSpan.min, LIMITS.cameraSpan.max)
    next = { ...next, projection: { kind: 'orthographic', verticalSize, zoom: verticalSize / span } }
    distance = Math.max(radius * 3, 0.00001)
  } else {
    const halfFov = Math.atan(Math.tan(MathUtils.degToRad(projection.fov / 2)) / projection.zoom)
    distance = radius * 1.2 / Math.sin(Math.min(halfFov, Math.atan(Math.tan(halfFov) * aspect)))
  }
  const position = direction.multiplyScalar(distance).add(bounds.center)
  return { ...next, position: { x: position.x, y: position.y, z: position.z } }
}

export function configureOrbitCamera(camera: StudioCamera, settings: CameraSettings, aspect: number): void {
  camera.position.copy(settings.position)
  camera.up.set(0, 1, 0)
  const backward = new Vector3().subVectors(settings.position, settings.target).normalize()
  const right = new Vector3().crossVectors(camera.up, backward)
  // Exact poles use the same right axis as a front view approaching the pole.
  if (right.lengthSq() < 1e-24) right.set(1, 0, 0)
  else right.normalize()
  const up = new Vector3().crossVectors(backward, right).normalize()
  camera.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(right, up, backward))
  camera.zoom = settings.projection.zoom
  if (camera instanceof OrthographicCamera && settings.projection.kind === 'orthographic') {
    const halfHeight = settings.projection.verticalSize / 2
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
  } else if (camera instanceof PerspectiveCamera && settings.projection.kind === 'perspective') {
    camera.fov = settings.projection.fov
    camera.aspect = aspect
  }
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

export function deriveRenderCamera(source: StudioCamera, render: StudioCamera, settings: CameraSettings, bounds: Sphere): StudioCamera {
  if (render instanceof OrthographicCamera && source instanceof OrthographicCamera) render.copy(source)
  else if (render instanceof PerspectiveCamera && source instanceof PerspectiveCamera) render.copy(source)
  else throw new Error('Render and orbit camera projections must match.')
  render.rotateZ(MathUtils.degToRad(settings.roll))
  const forward = new Vector3(0, 0, -1).applyQuaternion(source.quaternion)
  const depth = bounds.center.clone().sub(source.position).dot(forward)
  const distance = cameraDistance(settings)
  render.near = Math.max(1e-9, Math.min(distance * 0.001, Math.max(1e-9, (depth - bounds.radius) / 2)))
  render.far = Math.max(render.near * 2, distance * 2, depth + bounds.radius * 2)
  render.updateProjectionMatrix()
  render.updateMatrixWorld()
  return render
}
