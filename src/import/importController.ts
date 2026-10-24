import type { ImportedSubject } from '../domain/settings'
import { loadModel } from './modelAsset'
import type { ModelAsset } from './modelAsset'

export type ImportState = Readonly<{ kind: 'idle' | 'loading' | 'ready' | 'error'; message: string }>
type Loader = typeof loadModel

export class ImportController {
  private asset?: ModelAsset
  private pending?: AbortController
  private revision = 0
  private readonly publish: (descriptor: ImportedSubject) => void
  private readonly status: (state: ImportState) => void
  private readonly loader: Loader

  constructor(publish: (descriptor: ImportedSubject) => void, status: (state: ImportState) => void, loader: Loader = loadModel) {
    this.publish = publish
    this.status = status
    this.loader = loader
  }

  getAsset(descriptor: ImportedSubject): ModelAsset | undefined {
    return JSON.stringify(this.asset?.descriptor) === JSON.stringify(descriptor) ? this.asset : undefined
  }

  async select(files: readonly File[], expected?: ImportedSubject): Promise<void> {
    this.cancel()
    const revision = this.revision
    const pending = new AbortController()
    this.pending = pending
    this.status({ kind: 'loading', message: 'Loading local model… Previous subject remains available.' })
    try {
      const asset = await this.loader(files, pending.signal)
      if (pending.signal.aborted || revision !== this.revision) { asset.release(); return }
      if (expected && (asset.descriptor.asset.sha256 !== expected.asset.sha256 || asset.descriptor.asset.format !== expected.asset.format)) {
        asset.release()
        throw new Error(`This file does not match saved model ${expected.asset.fileName}. Select the original file and companions; saved settings were kept.`)
      }
      if (this.asset && JSON.stringify(this.asset.descriptor) === JSON.stringify(asset.descriptor)) {
        asset.release()
        this.status({ kind: 'ready', message: `Reselected ${asset.descriptor.asset.fileName}. Current model retained.` })
        return
      }
      const previous = this.asset
      this.asset = asset
      try { this.publish(asset.descriptor) }
      catch (error) { this.asset = previous; asset.release(); throw error }
      previous?.release()
      this.status({ kind: 'ready', message: `Loaded ${asset.descriptor.asset.fileName}. Appearance uses studio shading; size normalized to 2 world units.` })
    } catch (error) {
      if (revision === this.revision && !pending.signal.aborted) this.status({ kind: 'error', message: error instanceof Error ? error.message : 'Could not import this model. Export a static GLB/glTF 2.0 mesh.' })
    } finally {
      if (this.pending === pending) this.pending = undefined
    }
  }

  cancel(announce = true): void {
    const wasPending = this.pending !== undefined
    this.revision++
    this.pending?.abort()
    this.pending = undefined
    if (announce && wasPending) this.status({ kind: 'idle', message: 'Import cancelled. Previous subject retained.' })
  }

  release(): void {
    this.cancel(false)
    this.asset?.release()
    this.asset = undefined
  }
}
