import { expect, test, vi } from 'vitest'
import { InvalidationScheduler } from './invalidation'

test('invalidation coalesces edits, idles after drawing and cancels final work', () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextId = 0
  let draws = 0
  const scheduler = new InvalidationScheduler(
    () => draws++,
    (callback) => { callbacks.set(++nextId, callback); return nextId },
    (id) => { callbacks.delete(id) },
  )
  function flush() {
    const work = [...callbacks.values()]
    callbacks.clear()
    work.forEach((callback) => callback(0))
  }
  for (let edit = 0; edit < 100; edit++) scheduler.invalidate()
  expect(callbacks.size).toBe(1)
  flush()
  expect(draws).toBe(1)
  expect(callbacks.size).toBe(0)
  scheduler.invalidate()
  scheduler.dispose()
  scheduler.invalidate()
  flush()
  expect(draws).toBe(1)
})

test('an invalidation during drawing requests exactly one follow-up frame', () => {
  const callbacks: FrameRequestCallback[] = []
  let draws = 0
  const scheduler = new InvalidationScheduler(() => {
    if (++draws === 1) { scheduler.invalidate(); scheduler.invalidate() }
  }, (callback) => callbacks.push(callback), () => {})
  scheduler.invalidate()
  callbacks.shift()!(0)
  expect(callbacks).toHaveLength(1)
  callbacks.shift()!(0)
  expect(callbacks).toHaveLength(0)
  expect(draws).toBe(2)
  scheduler.dispose()
})

test('default browser frame functions are not invoked with the scheduler as their receiver', () => {
  vi.stubGlobal('requestAnimationFrame', function (this: unknown) {
    expect(this).not.toBeInstanceOf(InvalidationScheduler)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', function (this: unknown) {
    expect(this).not.toBeInstanceOf(InvalidationScheduler)
  })
  try {
    const scheduler = new InvalidationScheduler(() => {})
    scheduler.invalidate()
    scheduler.dispose()
  } finally {
    vi.unstubAllGlobals()
  }
})

test('capture, style and presentation coalesce while retaining the strongest required work', () => {
  const callbacks: FrameRequestCallback[] = []
  const draw = vi.fn()
  const scheduler = new InvalidationScheduler(draw, (callback) => callbacks.push(callback), () => {})
  scheduler.invalidate('presentation')
  callbacks.shift()!(0)
  expect(draw.mock.lastCall?.[0]).toMatchObject({ capture: false, style: false })
  scheduler.invalidate('style')
  scheduler.invalidate('presentation')
  callbacks.shift()!(0)
  expect(draw.mock.lastCall?.[0]).toMatchObject({ capture: false, style: true })
  scheduler.invalidate('style')
  scheduler.invalidate('capture')
  scheduler.invalidate('presentation')
  expect(callbacks).toHaveLength(1)
  callbacks.shift()!(0)
  expect(draw.mock.lastCall?.[0]).toMatchObject({ capture: true, style: true })
})

test('new camera/light edits and disposed owners reject stale work before publication', () => {
  const callbacks: FrameRequestCallback[] = []
  const completed: { generation: number; capture: boolean; style: boolean }[] = []
  const scheduler = new InvalidationScheduler((work) => completed.push(work), (callback) => callbacks.push(callback), () => {})
  scheduler.invalidate('capture')
  callbacks.shift()!(0)
  const cameraWork = completed[0]
  expect(scheduler.isCurrent(cameraWork)).toBe(true)
  scheduler.invalidate('style')
  expect(scheduler.isCurrent(cameraWork)).toBe(false)
  callbacks.shift()!(0)
  const lightWork = completed[1]
  expect(scheduler.isCurrent(lightWork)).toBe(true)
  scheduler.invalidate('capture')
  expect(scheduler.isCurrent(lightWork)).toBe(false)
  callbacks.shift()!(0)
  expect(scheduler.isCurrent(completed[2])).toBe(true)
  scheduler.dispose()
  expect(scheduler.isCurrent(completed[2])).toBe(false)
})

test('a pinned job runs before the newest preview and survives later invalidations', async () => {
  const callbacks: FrameRequestCallback[] = []
  const order: string[] = []
  let revision = 1
  const scheduler = new InvalidationScheduler(() => order.push(`preview-${revision}`), (callback) => callbacks.push(callback), () => {})
  scheduler.invalidate()
  const clicked = revision
  const pinned = scheduler.pin(() => { order.push(`export-${clicked}`); return clicked })
  revision = 2
  scheduler.invalidate('style')
  revision = 3
  scheduler.invalidate('capture')
  expect(callbacks).toHaveLength(1)
  callbacks.shift()!(0)
  await expect(pinned).resolves.toBe(1)
  expect(order).toEqual(['export-1', 'preview-3'])
  expect(callbacks).toHaveLength(0)
  scheduler.dispose()
})

test('pin rejects repeats, reports capture errors, resumes preview and cancels on disposal', async () => {
  const callbacks: FrameRequestCallback[] = []
  const draw = vi.fn()
  const scheduler = new InvalidationScheduler(draw, (callback) => callbacks.push(callback), () => {})
  const failed = scheduler.pin(() => { throw new Error('readback failed') })
  await expect(scheduler.pin(() => 2)).rejects.toThrow('already queued')
  callbacks.shift()!(0)
  await expect(failed).rejects.toThrow('readback failed')
  expect(draw).toHaveBeenCalledOnce()
  const cancelled = scheduler.pin(() => 3)
  scheduler.dispose()
  await expect(cancelled).rejects.toThrow('Renderer stopped')
  callbacks.shift()!(0)
  expect(draw).toHaveBeenCalledOnce()
  await expect(scheduler.pin(() => 4)).rejects.toThrow('Renderer unavailable')
})
