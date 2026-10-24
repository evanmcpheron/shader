import { useStore } from 'zustand'
import type { LocalPersistence } from '../persistence/localPersistence'

export function LocalSaveStatus({ persistence }: { persistence: LocalPersistence }) {
  const currentStatus = useStore(persistence, state => state.currentStatus)
  const presetStatus = useStore(persistence, state => state.presetError ? state.presetStatus : '')
  return <span className="muted" role="status" aria-label="Local save status">{currentStatus}{presetStatus && ` Presets: ${presetStatus}`}</span>
}
