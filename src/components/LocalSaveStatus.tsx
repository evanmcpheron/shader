import { useStore } from 'zustand'
import type { LocalPersistence } from '../persistence/localPersistence'

function compactStatus(message: string, error: boolean) {
  if (error) return 'Save needs attention · open Presets'
  if (message.includes('pending')) return 'Saving locally…'
  if (message.includes('no local save')) return 'Not saved yet'
  return 'Saved locally'
}

export function LocalSaveStatus({ persistence, detailed = false }: { persistence: LocalPersistence; detailed?: boolean }) {
  const currentStatus = useStore(persistence, state => state.currentStatus)
  const presetStatus = useStore(persistence, state => state.presetError ? state.presetStatus : '')
  const currentError = useStore(persistence, state => state.currentError)
  return <span data-save-error={Boolean(currentError || presetStatus)} className="muted" role="status" aria-label="Local save status">{detailed ? currentStatus : compactStatus(currentStatus, Boolean(currentError || presetStatus))}{detailed && presetStatus && ` Presets: ${presetStatus}`}</span>
}
