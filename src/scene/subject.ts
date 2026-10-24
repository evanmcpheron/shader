import { Box3, DoubleSide, FrontSide, Group, MathUtils, Mesh, MeshLambertMaterial, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { Primitive, SrgbColor, Transform } from '../domain/settings'
import { createPrimitiveGeometry } from './primitives'

export const SCENE_LAYERS = { subject: 0, helper: 1, ground: 2 } as const

export type SubjectContent = Readonly<{ object: Object3D; normalizeSize?: boolean; dispose: () => void }>

export function createPrimitiveContent(primitive: Primitive, color: SrgbColor): SubjectContent {
  const geometry = createPrimitiveGeometry(primitive)
  try {
    const material = new MeshLambertMaterial({
      color,
      flatShading: primitive.kind === 'pyramid',
      side: primitive.kind === 'plane' ? DoubleSide : FrontSide,
    })
    return {
      object: new Mesh(geometry, material),
      dispose: () => { geometry.dispose(); material.dispose() },
    }
  } catch (error) {
    geometry.dispose()
    throw error
  }
}

export function applySubjectTransform(parent: Object3D, transform: Transform): void {
  const { position, rotation, scale } = transform
  parent.position.set(position.x, position.y, position.z)
  parent.rotation.set(MathUtils.degToRad(rotation.x), MathUtils.degToRad(rotation.y), MathUtils.degToRad(rotation.z), 'XYZ')
  parent.scale.set(scale.x, scale.y, scale.z)
}

export class SceneSubject {
  readonly parent = new Group()
  readonly normalization = new Group()
  private content: SubjectContent | undefined

  constructor() {
    this.parent.name = 'Subject user transform'
    this.normalization.name = 'Subject normalization'
    this.parent.add(this.normalization)
  }

  replaceContent(content: SubjectContent): void {
    const bounds = new Box3().setFromObject(content.object, true)
    const center = bounds.getCenter(new Vector3())
    const size = content.normalizeSize ? 2 / Math.max(...bounds.getSize(new Vector3()).toArray()) : 1
    content.object.traverse((object) => object.layers.set(SCENE_LAYERS.subject))
    this.content?.dispose()
    this.normalization.clear()
    this.normalization.scale.setScalar(size)
    this.normalization.position.copy(center).multiplyScalar(-size)
    this.normalization.add(content.object)
    this.content = content
  }

  setColor(color: SrgbColor): void {
    this.content?.object.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof MeshLambertMaterial) object.material.color.set(color)
    })
  }

  setWireframe(wireframe: boolean): void {
    this.content?.object.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof MeshLambertMaterial) {
        object.material.wireframe = wireframe
        object.material.emissive.set(wireframe ? '#A8C3E0' : '#000000')
      }
    })
  }

  dispose(): void {
    this.content?.dispose()
    this.content = undefined
    this.normalization.clear()
    this.parent.removeFromParent()
  }
}
