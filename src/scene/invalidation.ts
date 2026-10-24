export type InvalidationStage = 'capture' | 'style' | 'presentation'
export type FrameWork = Readonly<{ generation: number; capture: boolean; style: boolean }>

export class InvalidationScheduler {
  private pending: number | undefined
  private disposed = false
  private generation = 0
  private capture = false
  private style = false
  private pinned?: { run: () => void; cancel: () => void }
  private readonly draw: (work: FrameWork) => void
  private readonly request: typeof requestAnimationFrame
  private readonly cancel: typeof cancelAnimationFrame

  constructor(draw: (work: FrameWork) => void, request: typeof requestAnimationFrame = (callback) => requestAnimationFrame(callback), cancel: typeof cancelAnimationFrame = (id) => cancelAnimationFrame(id)) {
    this.draw = draw
    this.request = request
    this.cancel = cancel
  }

  invalidate(stage: InvalidationStage = 'capture'): void {
    if (this.disposed) return
    this.generation++
    this.capture ||= stage === 'capture'
    this.style ||= stage !== 'presentation'
    if (this.pending !== undefined) return
    this.pending = this.request(() => {
      this.pending = undefined
      const pinned = this.pinned
      this.pinned = undefined
      if (!this.disposed) pinned?.run()
      const work = { generation: this.generation, capture: this.capture, style: this.style }
      this.capture = false
      this.style = false
      if (!this.disposed) this.draw(work)
    })
  }

  pin<T>(job: () => T): Promise<T> {
    if (this.disposed) return Promise.reject(new Error('Renderer unavailable. Retry renderer, then export again.'))
    if (this.pinned) return Promise.reject(new Error('A native export is already queued.'))
    return new Promise<T>((resolve, reject) => {
      this.pinned = {
        run: () => { try { resolve(job()) } catch (error) { reject(error) } },
        cancel: () => reject(new Error('Renderer stopped before export. Retry renderer, then export again.')),
      }
      this.invalidate('capture')
    })
  }

  isCurrent(work: FrameWork): boolean {
    return !this.disposed && work.generation === this.generation
  }

  dispose(): void {
    this.disposed = true
    this.pinned?.cancel()
    this.pinned = undefined
    if (this.pending !== undefined) this.cancel(this.pending)
    this.pending = undefined
  }
}
