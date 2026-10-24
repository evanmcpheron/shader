import { createStore } from 'zustand/vanilla'
import type { StudioStore } from '../app/studioStore'
import { createFactoryPresets } from './factoryPresets'
import { deserializePresets, deserializeScene, MAX_PRESETS, serializePresets, serializeScene, validatePresetName } from './sceneCodec'
import type { SavedPreset } from './sceneCodec'

export const STORAGE_KEYS = { current: 'pixel-shading-studio:current', presets: 'pixel-shading-studio:presets' } as const
export const AUTOSAVE_DELAY = 400
export const AUTOSAVE_MAX_WAIT = 2000

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
type Slot = keyof typeof STORAGE_KEYS
type Recovery = Readonly<{ slot: Slot; raw: string; reason: string }>
type PersistenceState = Readonly<{
  presets: readonly SavedPreset[]
  currentStatus: string
  presetStatus: string
  presetError: boolean
  message: string
  recovery: readonly Recovery[]
}>

function storageFailure(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'QuotaExceededError') return 'Local storage is full. Free browser space, then retry saving.'
  if (name === 'SecurityError') return 'Browser storage is blocked. Allow local storage for this site, then retry saving.'
  return 'Local storage is unavailable. Enable browser storage, then retry saving.'
}

export class LocalPersistence {
  private readonly state = createStore<PersistenceState>(() => ({ presets: [], currentStatus: 'Current scene has no local save yet.', presetStatus: '', presetError: false, message: '', recovery: [] }))
  readonly getState = this.state.getState
  readonly getInitialState = this.state.getInitialState
  readonly subscribe = this.state.subscribe
  readonly factories = createFactoryPresets()
  private readonly store: StudioStore
  private readonly storage: () => StoragePort
  private readonly blocked = new Set<Slot>()
  private readonly unread = new Set<Slot>()
  private readonly dirty = new Set<Slot>()
  private timer?: ReturnType<typeof setTimeout>
  private deadline?: ReturnType<typeof setTimeout>
  private readonly unsubscribe: () => void
  private disconnect?: () => void

  constructor(store: StudioStore, storage: () => StoragePort = () => window.localStorage) {
    this.store = store
    this.storage = storage
    this.read('current', true)
    this.read('presets', true)
    this.unsubscribe = store.subscribe((state, previous) => {
      if (state.settings === previous.settings) return
      this.dirty.add('current')
      this.setStatus('current', 'Current changes are in memory; local save pending…')
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.flush(), AUTOSAVE_DELAY)
      this.deadline ??= setTimeout(() => this.flush(), AUTOSAVE_MAX_WAIT)
    })
  }

  private setStatus(slot: Slot, message: string, error = false): void {
    this.state.setState(slot === 'current' ? { currentStatus: message } : { presetStatus: message, presetError: error })
  }

  private read(slot: Slot, initialize: boolean): boolean {
    let raw: string | null
    try { raw = this.storage().getItem(STORAGE_KEYS[slot]) }
    catch (error) {
      this.unread.add(slot)
      this.setStatus(slot, `${storageFailure(error)} Editing and PNG export still work; keep this tab open or download settings.`, true)
      return false
    }
    this.unread.delete(slot)
    if (raw === null) {
      this.setStatus(slot, slot === 'current' ? 'Current scene has no local save yet.' : 'No named presets saved locally yet.')
      return true
    }
    const result = slot === 'current' ? deserializeScene(raw) : deserializePresets(raw)
    if (!result.ok) {
      this.blocked.add(slot)
      const reason = `${result.issues[0].path}: ${result.issues[0].message}`
      this.state.setState({ recovery: [...this.getState().recovery.filter(item => item.slot !== slot), { slot, raw, reason }] })
      this.setStatus(slot, `Saved ${slot} data was not loaded: ${reason} Original kept. Download recovery data or explicitly replace unreadable data.`, true)
      return false
    }
    if (slot === 'current') {
      if (initialize) this.store.getState().actions.restoreSettings(result.value)
      this.setStatus(slot, initialize ? 'Current scene restored from local storage.' : 'Local storage available; retrying current save.')
    } else {
      const saved = result.value as readonly SavedPreset[]
      const local = this.getState().presets
      const merged = initialize ? saved : [
        ...saved.filter(item => !local.some(preset => preset.id === item.id)),
        ...local.map(item => saved.some(preset => preset.name.toLowerCase() === item.name.toLowerCase() && preset.id !== item.id)
          ? { ...item, name: `${item.name.slice(0, 60)} (recovered ${item.id.slice(-6)})` } : item),
      ]
      this.state.setState({ presets: merged })
      this.setStatus(slot, 'Local presets loaded.')
    }
    return true
  }

  connectLifecycle(target: Window = window, doc: Document = document): void {
    this.disconnect?.()
    const flush = () => this.flush()
    const hidden = () => { if (doc.visibilityState === 'hidden') this.flush() }
    target.addEventListener('pagehide', flush)
    doc.addEventListener('visibilitychange', hidden)
    this.disconnect = () => { target.removeEventListener('pagehide', flush); doc.removeEventListener('visibilitychange', hidden) }
  }

  flush(): void {
    clearTimeout(this.timer)
    clearTimeout(this.deadline)
    this.timer = this.deadline = undefined
    for (const slot of this.dirty) {
      if (this.blocked.has(slot)) continue
      if (this.unread.has(slot)) {
        this.setStatus(slot, 'Local storage is unavailable. Changes remain in memory; keep this tab open, download settings or retry local save.', true)
        continue
      }
      try {
        const text = slot === 'current' ? serializeScene(this.store.getState().settings) : serializePresets(this.getState().presets)
        this.storage().setItem(STORAGE_KEYS[slot], text)
        this.dirty.delete(slot)
        this.setStatus(slot, slot === 'current' ? 'Current scene saved locally.' : 'Named presets saved locally.')
      } catch (error) {
        this.setStatus(slot, `${storageFailure(error)} Changes remain in memory; keep this tab open or download settings.`, true)
      }
    }
    for (const recovery of this.getState().recovery) this.setStatus(recovery.slot, `Unreadable ${recovery.slot} data kept untouched. ${recovery.reason} Download recovery data or explicitly replace unreadable data. Current edits remain in memory.`, true)
  }

  retry(): void {
    for (const slot of this.unread) this.read(slot, false)
    this.dirty.add('current')
    this.flush()
  }

  replaceUnreadable(): void {
    const failures: { slot: Slot; message: string }[] = []
    for (const recovery of this.getState().recovery) {
      try {
        const backupKey = `${STORAGE_KEYS[recovery.slot]}:recovery:${crypto.randomUUID()}`
        this.storage().setItem(backupKey, recovery.raw)
        this.blocked.delete(recovery.slot)
        this.dirty.add(recovery.slot)
        this.state.setState({ recovery: this.getState().recovery.filter(item => item.slot !== recovery.slot) })
        this.setStatus(recovery.slot, `Original data backed up locally at ${backupKey}.`)
      } catch (error) { failures.push({ slot: recovery.slot, message: `Original data kept untouched. ${storageFailure(error)} Download recovery data first.` }) }
    }
    this.flush()
    for (const failure of failures) this.setStatus(failure.slot, failure.message, true)
  }

  save(nameInput: string): string | null {
    const name = validatePresetName(nameInput)
    if (!name) { this.state.setState({ message: 'Enter a preset name of 1–80 characters, without control characters.' }); return null }
    if (this.getState().presets.some(preset => preset.name.toLowerCase() === name.toLowerCase())) {
      this.state.setState({ message: 'That name already exists. Select it and explicitly overwrite, or use another name.' }); return null
    }
    if (this.getState().presets.length >= MAX_PRESETS) { this.state.setState({ message: `Keep at most ${MAX_PRESETS} named presets. Delete one before saving another.` }); return null }
    const id = crypto.randomUUID()
    this.state.setState({ presets: [...this.getState().presets, { id, name, settings: this.store.getState().settings }], message: `Saved “${name}” in this session.` })
    this.commitPresets()
    return id
  }

  overwrite(id: string): void {
    const preset = this.getState().presets.find(item => item.id === id)
    if (!preset) return
    this.state.setState({ presets: this.getState().presets.map(item => item.id === id ? { ...item, settings: this.store.getState().settings } : item), message: `Overwrote “${preset.name}” with the current scene.` })
    this.commitPresets()
  }

  delete(id: string): void {
    const preset = this.getState().presets.find(item => item.id === id)
    if (!preset) return
    this.state.setState({ presets: this.getState().presets.filter(item => item.id !== id), message: `Deleted “${preset.name}”. Current scene was kept.` })
    this.commitPresets()
  }

  restore(id: string): boolean {
    const preset = [...this.factories, ...this.getState().presets].find(item => item.id === id)
    if (!preset) return false
    const result = this.store.getState().actions.restoreSettings(preset.settings)
    this.state.setState({ message: result.ok ? `Restored “${preset.name}”. View settings were kept.` : result.issues[0].message })
    return result.ok
  }

  private commitPresets(): void {
    this.dirty.add('presets')
    this.flush()
  }

  recoveryJson(): string {
    return JSON.stringify({ current: this.store.getState().settings, library: { schemaVersion: 1, presets: this.getState().presets }, preserved: this.getState().recovery }, null, 2)
  }

  dispose(): void {
    this.flush()
    this.unsubscribe()
    this.disconnect?.()
  }
}
