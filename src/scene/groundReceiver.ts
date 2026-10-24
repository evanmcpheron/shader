import { Box3, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import type { Camera } from 'three'
import type { GroundSettings, Size2, Vector3 as Direction } from '../domain/settings'
import type { PixelBounds } from '../pixels/subjectBounds'
import { SCENE_LAYERS } from './subject'

export type GroundReport = Readonly<{
  receiverExtent: PixelBounds | null
  shadowExtent: PixelBounds | null
  receiverClipped: boolean
  shadowClipped: boolean
  notice: string
}>

export function boxCorners(box: Box3): Vector3[] {
  return [box.min.x, box.max.x].flatMap((x) => [box.min.y, box.max.y].flatMap((y) => [box.min.z, box.max.z].map((z) => new Vector3(x, y, z))))
}

function projectedBounds(points: Vector3[], camera: Camera, canvas: Size2): PixelBounds | null {
  if (!points.length) return null
  const projected = points.map((point) => point.clone().project(camera))
  if (projected.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null
  const x = Math.floor(Math.min(...projected.map((point) => (point.x + 1) * canvas.width / 2)))
  const y = Math.floor(Math.min(...projected.map((point) => (1 - point.y) * canvas.height / 2)))
  return { x, y, width: Math.ceil(Math.max(...projected.map((point) => (point.x + 1) * canvas.width / 2))) - x, height: Math.ceil(Math.max(...projected.map((point) => (1 - point.y) * canvas.height / 2))) - y }
}

export class GroundReceiver {
  readonly mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ side: DoubleSide }))

  constructor() {
    this.mesh.name = 'Independent ground receiver'
    this.mesh.layers.set(SCENE_LAYERS.ground)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.receiveShadow = true
    this.mesh.visible = false
  }

  apply(ground: GroundSettings): void {
    this.mesh.visible = ground.kind === 'receiver'
    if (ground.kind === 'none') return
    this.mesh.position.copy(ground.position)
    this.mesh.scale.set(ground.width, ground.depth, 1)
    this.mesh.updateWorldMatrix(true, false)
  }

  report(ground: GroundSettings, subject: Box3, direction: Direction, camera: Camera, canvas: Size2, shadows: boolean, softnessRadius = 0): GroundReport | null {
    if (ground.kind === 'none') return null
    const plane = boxCorners(new Box3().setFromObject(this.mesh))
    const receiverExtent = projectedBounds(plane, camera, canvas)
    const footprint = shadows && direction.y > 0.01 ? boxCorners(subject).filter((point) => point.y >= ground.position.y).map((point) => point.addScaledVector(direction, -(point.y - ground.position.y) / direction.y)) : []
    const hardExtent = projectedBounds(footprint, camera, canvas)
    const shadowExtent = hardExtent ? { x: hardExtent.x - softnessRadius, y: hardExtent.y - softnessRadius, width: hardExtent.width + 2 * softnessRadius, height: hardExtent.height + 2 * softnessRadius } : null
    const polygon = plane.map((point) => point.clone().project(camera)).map((point) => ({ x: (point.x + 1) * canvas.width / 2, y: (1 - point.y) * canvas.height / 2 }))
    const center = polygon.reduce((sum, point) => ({ x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }), { x: 0, y: 0 })
    polygon.sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x))
    const withinReceiver = (x: number, y: number) => {
      const cross = polygon.map((a, index) => {
        const b = polygon[(index + 1) % polygon.length]
        return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)
      })
      return cross.every((value) => value >= -1e-6) || cross.every((value) => value <= 1e-6)
    }
    const softReceiverCut = softnessRadius > 0 && shadowExtent && [shadowExtent.x, shadowExtent.x + shadowExtent.width].some((x) => [shadowExtent.y, shadowExtent.y + shadowExtent.height].some((y) => !withinReceiver(x, y)))
    const clipped = (bounds: PixelBounds | null) => Boolean(bounds && (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > canvas.width || bounds.y + bounds.height > canvas.height))
    const receiverCut = footprint.some((point) => Math.abs(point.x - ground.position.x) > ground.width / 2 || Math.abs(point.z - ground.position.z) > ground.depth / 2)
    const depthCut = plane.some((point) => Math.abs(point.clone().project(camera).z) > 1)
    return {
      receiverExtent, shadowExtent, receiverClipped: clipped(receiverExtent) || depthCut, shadowClipped: clipped(shadowExtent) || receiverCut || Boolean(softReceiverCut),
      notice: direction.y <= 0.01 && shadows ? 'Ground shadows pause when light is below or within 0.57° of the ground. Raise Light position Y or lower its target.' : 'Extents are conservative projected bounds including soft radius; finite ground can cut the shadow. Canvas and subject fit stay fixed.',
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.mesh.removeFromParent()
  }
}
