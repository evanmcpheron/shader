import { afterEach, expect, test, vi } from 'vitest'
import complete from '../../tests/fixtures/scenes/complete-v1.json'
import { createStudioStore } from '../app/studioStore'
import { createDefaultSettings } from '../domain/defaults'
import { AUTOSAVE_DELAY, AUTOSAVE_MAX_WAIT, LocalPersistence, STORAGE_KEYS } from './localPersistence'
import { serializeScene } from './sceneCodec'

function storage() {
  const data = new Map<string, string>()
  return { data, getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value) }) }
}
const active: LocalPersistence[] = []
function setup(port = storage(), initial = createDefaultSettings()) {
  const store = createStudioStore(initial)
  const persistence = new LocalPersistence(store, () => port)
  active.push(persistence)
  return { port, store, persistence }
}
afterEach(() => { for (const item of active.splice(0)) item.dispose(); vi.useRealTimers() })

test('hydration writes nothing and loads the complete scene before subscribers start', () => {
  const port = storage()
  port.data.set(STORAGE_KEYS.current, JSON.stringify(complete))
  const { store, persistence } = setup(port)
  expect(store.getState().settings).toEqual(complete)
  persistence.flush()
  expect(port.setItem).not.toHaveBeenCalled()
})

test('atomic restore cancels pending autosave, writes only the intended scene and invalidates once', () => {
  vi.useFakeTimers()
  const { store, port } = setup()
  store.getState().actions.selectPrimitive('cube')
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  const before = store.getState().revisions
  expect(store.getState().actions.restoreSettings(complete).ok).toBe(true)
  expect(listener).toHaveBeenCalledTimes(1)
  expect(store.getState().revisions.settings).toBe(before.settings + 1)
  expect(store.getState().revisions.capture).toBe(before.capture + 1)
  expect(port.setItem).not.toHaveBeenCalled()
  vi.advanceTimersByTime(AUTOSAVE_DELAY)
  expect(port.setItem).toHaveBeenCalledTimes(1)
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!)).toEqual(complete)
  unsubscribe()
  port.setItem.mockClear()
  store.getState().actions.restoreSettings({ ...complete, schemaVersion: 99 })
  vi.advanceTimersByTime(AUTOSAVE_MAX_WAIT)
  expect(port.setItem).not.toHaveBeenCalled()
  expect(store.getState().settings).toEqual(complete)
})

test('debounce is bounded during continuous edits and preview state never saves', () => {
  vi.useFakeTimers()
  const { store, port, persistence } = setup()
  for (let index = 0; index < 10; index++) {
    store.getState().actions.setSection('camera', { ...store.getState().settings.camera, roll: index + 1 })
    vi.advanceTimersByTime(AUTOSAVE_MAX_WAIT / 10)
  }
  expect(port.setItem).toHaveBeenCalledTimes(1)
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!).camera.roll).toBe(10)
  store.getState().actions.setPreview({ zoom: 3, grid: true })
  persistence.flush()
  expect(port.setItem).toHaveBeenCalledTimes(1)
})

test('save/overwrite/delete work in memory and after reload without changing reset boundaries', () => {
  const { store, port, persistence } = setup()
  store.getState().actions.restoreSettings(complete)
  const id = persistence.save('  Torus study  ')!
  expect(persistence.save('torus study')).toBeNull()
  expect(persistence.getState().presets[0].name).toBe('Torus study')
  store.getState().actions.resetSection('palette')
  expect(store.getState().settings.camera).toEqual(complete.camera)
  expect(persistence.getState().presets[0].settings).toEqual(complete)
  store.getState().actions.resetSection('camera')
  expect(store.getState().settings.subject).toEqual(complete.subject)
  store.getState().actions.resetScene()
  expect(persistence.getState().presets).toHaveLength(1)
  expect(persistence.restore(id)).toBe(true)
  expect(store.getState().settings).toEqual(complete)
  store.getState().actions.selectPrimitive('cube')
  persistence.overwrite(id)
  const reload = setup(port)
  expect(reload.persistence.restore(id)).toBe(true)
  expect(reload.store.getState().settings.subject.geometry.kind).toBe('cube')
  const before = reload.store.getState()
  reload.persistence.delete(id)
  expect(reload.store.getState()).toBe(before)
  expect(reload.persistence.getState().presets).toEqual([])
  expect(reload.persistence.restore('factory-sphere')).toBe(true)
  expect(reload.store.getState().settings).toEqual(createDefaultSettings())
})

test.each(['{bad', JSON.stringify({ ...complete, schemaVersion: 99 }), JSON.stringify({ ...complete, canvas: null })])('preserves unreadable data until explicit backed-up replacement', raw => {
  const port = storage()
  port.data.set(STORAGE_KEYS.current, raw)
  port.data.set('other-app', 'untouched')
  const { persistence, store } = setup(port)
  expect(store.getState().settings).toEqual(createDefaultSettings())
  store.getState().actions.restoreSettings(complete)
  persistence.flush()
  expect(port.data.get(STORAGE_KEYS.current)).toBe(raw)
  expect(persistence.getState().recovery[0].raw).toBe(raw)
  expect(JSON.parse(persistence.recoveryJson()).current).toEqual(complete)
  persistence.replaceUnreadable()
  expect([...port.data].find(([key]) => key.startsWith(`${STORAGE_KEYS.current}:recovery:`))?.[1]).toBe(raw)
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!)).toEqual(complete)
  expect(port.data.get('other-app')).toBe('untouched')
})

test.each(['QuotaExceededError', 'SecurityError', 'Error'])('failed writes retain current work and unsaved presets; retry commits latest', name => {
  const { port, persistence, store } = setup()
  port.data.set(STORAGE_KEYS.current, serializeScene(createDefaultSettings()))
  port.setItem.mockImplementation(() => { throw Object.assign(new Error('denied'), { name }) })
  store.getState().actions.restoreSettings(complete)
  const id = persistence.save('Unsaved study')!
  expect(persistence.getState().currentStatus).toMatch(/in memory/)
  expect(persistence.getState().presetStatus).toMatch(/in memory/)
  expect(store.getState().settings).toEqual(complete)
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!)).toEqual(createDefaultSettings())
  expect(persistence.getState().presets[0].id).toBe(id)
  port.setItem.mockImplementation((key, value) => { port.data.set(key, value) })
  persistence.retry()
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!)).toEqual(complete)
  expect(JSON.parse(port.data.get(STORAGE_KEYS.presets)!).presets[0].id).toBe(id)
})

test('unavailable storage getters remain protected until retry; lifecycle flushes latest and detaches', () => {
  const port = storage(), store = createStudioStore()
  let available = false
  const persistence = new LocalPersistence(store, () => { if (!available) throw Object.assign(new Error('blocked'), { name: 'SecurityError' }); return port })
  active.push(persistence)
  store.getState().actions.restoreSettings(complete)
  persistence.save('Offline')
  persistence.flush()
  expect(persistence.getState().currentStatus).toMatch(/unavailable/)
  available = true
  persistence.retry()
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!)).toEqual(complete)
  const target = new EventTarget(), doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' })
  persistence.connectLifecycle(target as Window, doc as Document)
  store.getState().actions.selectPrimitive('cube')
  target.dispatchEvent(new Event('pagehide'))
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!).subject.geometry.kind).toBe('cube')
  store.getState().actions.selectPrimitive('plane')
  doc.dispatchEvent(new Event('visibilitychange'))
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!).subject.geometry.kind).toBe('plane')
  persistence.dispose()
  port.setItem.mockClear()
  target.dispatchEvent(new Event('pagehide'))
  expect(port.setItem).not.toHaveBeenCalled()
})

test('unreadable library and failed recovery backup do not erase original data or current work', () => {
  const port = storage()
  const raw = '{"schemaVersion":8,"presets":["future"]}'
  port.data.set(STORAGE_KEYS.presets, raw)
  const { persistence } = setup(port)
  persistence.save('In memory')
  expect(port.data.get(STORAGE_KEYS.presets)).toBe(raw)
  port.setItem.mockImplementation(() => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }) })
  persistence.replaceUnreadable()
  expect(persistence.getState().presets).toHaveLength(1)
  expect(persistence.getState().recovery).toHaveLength(1)
  expect(port.data.get(STORAGE_KEYS.presets)).toBe(raw)
})

test('retry after an initially blocked read merges stored and in-memory presets without replacing unsaved scene edits', () => {
  const port = storage()
  port.data.set(STORAGE_KEYS.presets, JSON.stringify({ schemaVersion: 1, presets: [{ id: 'earlier', name: 'Same name', settings: createDefaultSettings() }] }))
  port.data.set(STORAGE_KEYS.current, serializeScene(createDefaultSettings()))
  const store = createStudioStore()
  let blocked = true
  const persistence = new LocalPersistence(store, () => { if (blocked) throw new Error('Unavailable'); return port })
  active.push(persistence)
  store.getState().actions.restoreSettings(complete)
  persistence.save('Same name')
  blocked = false
  persistence.retry()
  expect(persistence.getState().presets).toHaveLength(2)
  expect(new Set(persistence.getState().presets.map(preset => preset.name)).size).toBe(2)
  expect(persistence.getState().presets.find(preset => preset.id === 'earlier')?.settings).toEqual(createDefaultSettings())
  expect(JSON.parse(port.data.get(STORAGE_KEYS.current)!)).toEqual(complete)
})

test('retry clears an empty-library startup error and blocked-backup quota errors remain actionable', () => {
  const port = storage(), store = createStudioStore()
  let blocked = true
  const persistence = new LocalPersistence(store, () => { if (blocked) throw new Error('Unavailable'); return port })
  active.push(persistence)
  expect(persistence.getState().presetError).toBe(true)
  blocked = false
  persistence.retry()
  expect(persistence.getState().presetError).toBe(false)
  port.data.set(STORAGE_KEYS.current, '{broken')
  const restored = setup(port)
  port.setItem.mockImplementation(() => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }) })
  restored.persistence.replaceUnreadable()
  expect(restored.persistence.getState().currentStatus).toMatch(/storage is full/)
  expect(port.data.get(STORAGE_KEYS.current)).toBe('{broken')
})
