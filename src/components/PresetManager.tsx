import { useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { LocalPersistence } from '../persistence/localPersistence'
import type { StudioStore } from '../app/studioStore'
import { serializeScene } from '../persistence/sceneCodec'

export function PresetManager({ store, persistence, onRestore }: { store: StudioStore; persistence: LocalPersistence; onRestore: () => void }) {
  const state = useStore(persistence)
  const settings = useStore(store, state => state.settings)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState('factory-sphere')
  const [confirm, setConfirm] = useState<'overwrite' | 'delete' | 'replace' | null>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const selectedPreset = state.presets.find(preset => preset.id === selected)
  const currentJson = JSON.stringify(settings)
  const factories = useMemo(() => persistence.factories.map(preset => ({ ...preset, json: serializeScene(preset.settings) })), [persistence])
  const currentFactory = factories.find(preset => preset.json === currentJson)
  const currentNamed = state.presets.find(preset => JSON.stringify(preset.settings) === currentJson)

  function close() { setOpen(false); setConfirm(null); toggle.current?.focus() }

  return (
    <div className="preset-manager">
      <button ref={toggle} type="button" aria-expanded={open} aria-controls="preset-panel" onClick={() => { setOpen(!open); setConfirm(null) }}>Presets</button>
      {open && <section id="preset-panel" className="preset-panel" aria-label="Local scene presets" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
        <div className="preset-heading"><h2>Local scene presets</h2><button type="button" onClick={close}>Close presets</button></div>
        <p>Complete scenes, including canvas size. Preview tools and zoom stay as they are. Imported files must be reselected after reload.</p>
        <p>Current scene: {currentFactory ? `Factory · ${currentFactory.name}` : currentNamed ? `Saved · ${currentNamed.name}` : 'Custom · unsaved as a named preset'}. Autosave status is shown below.</p>
        <label className="field-label" htmlFor="scene-preset">Saved scene</label>
        <select id="scene-preset" value={selected} onChange={event => { setSelected(event.target.value); setConfirm(null) }}>
          <optgroup label="Factory scenes">{persistence.factories.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</optgroup>
          {state.presets.length > 0 && <optgroup label="Your local scenes">{state.presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</optgroup>}
        </select>
        <p className="field-description">Choosing a saved scene does not apply it until Restore scene. Factory scenes are read-only; save a new name to customize one.</p>
        <div className="preset-actions">
          <button type="button" onClick={() => { setConfirm(null); if (persistence.restore(selected)) onRestore() }}>Restore scene</button>
          <button type="button" disabled={!selectedPreset} onClick={() => setConfirm('overwrite')}>Overwrite selected…</button>
          <button type="button" disabled={!selectedPreset} onClick={() => setConfirm('delete')}>Delete selected…</button>
        </div>
        <form onSubmit={event => {
          event.preventDefault()
          setConfirm(null)
          const id = persistence.save(name)
          if (id) { setSelected(id); setName('') }
        }}>
          <label className="field-label" htmlFor="preset-name">New preset name</label>
          <input id="preset-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} />
          <button type="submit">Save new preset</button>
        </form>
        {state.message && <p role="status">{state.message}</p>}
        <p role="status">{state.currentStatus}</p>
        {state.presetStatus && <p role="status">{state.presetStatus}</p>}
        <div className="preset-actions">
          <button type="button" onClick={() => persistence.retry()}>Retry local save</button>
          <a className="download-settings" download="pixel-shading-studio-settings-recovery.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(persistence.recoveryJson())}`}>Download settings & recovery JSON</a>
          {state.recovery.length > 0 && <button type="button" onClick={() => setConfirm('replace')}>Replace unreadable data…</button>}
        </div>
        {confirm && <div className="preset-confirm" role="group" aria-label="Confirm preset change">
          <p>{confirm === 'replace' ? 'Back up the unreadable original under a separate local recovery key, then replace it with this session’s settings/presets? If the backup fails, the original stays untouched.' : confirm === 'overwrite' ? `Replace all saved settings in “${selectedPreset?.name}” with the current scene?` : `Delete “${selectedPreset?.name}”? The current scene will stay as it is.`}</p>
          <button type="button" onClick={() => {
            if (confirm === 'replace') persistence.replaceUnreadable()
            else if (confirm === 'overwrite') persistence.overwrite(selected)
            else { persistence.delete(selected); setSelected('factory-sphere') }
            setConfirm(null)
          }}>{confirm === 'replace' ? 'Back up & replace' : confirm === 'overwrite' ? 'Confirm overwrite' : 'Confirm delete'}</button>
          <button type="button" onClick={() => setConfirm(null)}>Cancel</button>
        </div>}
      </section>}
    </div>
  )
}
