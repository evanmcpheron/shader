import { Mesh, Vector3 } from 'three'
import type { Camera, Object3D } from 'three'
import type { Size2 } from '../domain/settings'

export function previewTopology(subject: Object3D, camera: Camera, size: Size2): string {
  const segments: string[] = []
  subject.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return
    const positions = object.geometry.getAttribute('position')
    if (!positions) return
    const points = Array.from({ length: positions.count }, (_, index) => new Vector3().fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld).project(camera))
    const indices = object.geometry.index
    const count = indices?.count ?? positions.count
    for (let index = 0; index < count; index += 3) {
      const triangle = [0, 1, 2].map((offset) => points[indices ? indices.getX(index + offset) : index + offset])
      if (triangle.some((point) => !Number.isFinite(point.x + point.y) || point.z < -1 || point.z > 1)) continue
      segments.push(triangle.map((point, offset) => `${offset ? 'L' : 'M'}${((point.x + 1) * size.width / 2).toFixed(3)} ${((1 - point.y) * size.height / 2).toFixed(3)}`).join('') + 'Z')
    }
  })
  return segments.join('')
}
