import { BoxGeometry, ConeGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, TorusGeometry } from 'three'
import type { BufferGeometry } from 'three'
import type { Primitive } from '../domain/settings'

export function createPrimitiveGeometry(primitive: Primitive): BufferGeometry {
  switch (primitive.kind) {
    case 'sphere': return new SphereGeometry(primitive.radius, primitive.widthSegments, primitive.heightSegments)
    case 'cube': return new BoxGeometry(primitive.width, primitive.height, primitive.depth)
    case 'cylinder': return new CylinderGeometry(primitive.radius, primitive.radius, primitive.height, primitive.radialSegments, primitive.heightSegments)
    case 'cone': return new ConeGeometry(primitive.radius, primitive.height, primitive.radialSegments, primitive.heightSegments)
    case 'pyramid': {
      // Rotate the four-sided cone so baseSize measures an axis-aligned XZ square; the apex points +Y.
      return new ConeGeometry(primitive.baseSize / Math.SQRT2, primitive.height, 4).rotateY(Math.PI / 4)
    }
    case 'torus': return new TorusGeometry(primitive.radius, primitive.tubeRadius, primitive.radialSegments, primitive.tubularSegments)
    case 'plane': return new PlaneGeometry(primitive.width, primitive.height, primitive.widthSegments, primitive.heightSegments)
  }
}
