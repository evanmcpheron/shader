import { AmbientLight, DirectionalLight, Group } from 'three'
import { deriveLighting } from '../domain/lighting'
import type { LightingSettings } from '../domain/settings'

export class ReferenceLighting {
  readonly root = new Group()
  readonly directional = new DirectionalLight()
  readonly ambient = new AmbientLight()

  constructor() {
    this.root.name = 'Directional and ambient illumination'
    this.root.add(this.directional, this.directional.target, this.ambient)
  }

  apply(settings: LightingSettings): void {
    const result = deriveLighting(settings)
    if (!result.ok) throw new Error(result.issues[0].message)
    const { direction, directional, ambient } = result.value
    this.directional.position.copy(direction)
    this.directional.target.position.set(0, 0, 0)
    this.directional.color.setRGB(directional.r, directional.g, directional.b)
    this.ambient.color.setRGB(ambient.r, ambient.g, ambient.b)
    // Three r186 Lambert divides irradiance by PI; undo it for the shared artist-light contract.
    this.directional.intensity = Math.PI
    this.ambient.intensity = Math.PI
  }

  dispose(): void {
    this.directional.dispose()
    this.root.clear()
    this.root.removeFromParent()
  }
}
