import type { SceneSettings } from '../domain/settings'
import { validateSceneSettings } from '../domain/validation'
import type { ValidationResult } from '../domain/validation'

export type SavedPreset = Readonly<{ id: string; name: string; settings: SceneSettings }>
export const PRESET_SCHEMA_VERSION = 1
export const MAX_PRESETS = 100
export const MAX_SAVED_CHARACTERS = 2_000_000

function invalid<T>(path: string, message: string): ValidationResult<T> {
  return { ok: false, issues: [{ path, message }] }
}

function parse(text: string): ValidationResult<unknown> {
  if (text.length > MAX_SAVED_CHARACTERS) return invalid('json', 'Saved data exceeds the 2 MB character limit.')
  try { return { ok: true, value: JSON.parse(text) as unknown, notices: [] } }
  catch { return invalid('json', 'Malformed JSON. Original data has been preserved.') }
}

export function deserializeScene(text: string): ValidationResult<SceneSettings> {
  const parsed = parse(text)
  return parsed.ok ? validateSceneSettings(parsed.value) : parsed
}

export function serializeScene(settings: SceneSettings): string {
  const validated = validateSceneSettings(settings)
  if (!validated.ok) throw new Error(`${validated.issues[0].path}: ${validated.issues[0].message}`)
  return JSON.stringify(validated.value)
}

export function validatePresetName(name: string): string | null {
  const normalized = name.trim()
  return normalized.length > 0 && normalized.length <= 80 && !/\p{Cc}/u.test(normalized) ? normalized : null
}

export function deserializePresets(text: string): ValidationResult<readonly SavedPreset[]> {
  const parsed = parse(text)
  if (!parsed.ok) return parsed
  const data = parsed.value
  if (!data || typeof data !== 'object' || Array.isArray(data)) return invalid('presets', 'Expected a preset library object.')
  const record = data as Record<string, unknown>
  if (record.schemaVersion !== PRESET_SCHEMA_VERSION) return invalid('presets.schemaVersion', 'Unsupported preset library version. Original data has been preserved.')
  if (Object.keys(record).some(key => !['schemaVersion', 'presets'].includes(key))) return invalid('presets', 'Unknown library field.')
  if (!Array.isArray(record.presets) || record.presets.length > MAX_PRESETS) return invalid('presets', `Expected at most ${MAX_PRESETS} presets.`)
  const presets: SavedPreset[] = []
  const ids = new Set<string>(), names = new Set<string>()
  for (const [index, item] of record.presets.entries()) {
    const path = `presets[${index}]`
    if (!item || typeof item !== 'object' || Array.isArray(item)) return invalid(path, 'Expected a preset object.')
    const preset = item as Record<string, unknown>
    if (Object.keys(preset).some(key => !['id', 'name', 'settings'].includes(key))) return invalid(path, 'Unknown preset field.')
    if (typeof preset.id !== 'string' || !/^[\w-]{1,80}$/.test(preset.id) || ids.has(preset.id) || preset.id.startsWith('factory-')) return invalid(`${path}.id`, 'Invalid or duplicate preset identifier.')
    const name = typeof preset.name === 'string' ? validatePresetName(preset.name) : null
    if (!name || names.has(name.toLowerCase())) return invalid(`${path}.name`, 'Invalid or duplicate preset name.')
    const scene = validateSceneSettings(preset.settings)
    if (!scene.ok) return scene
    ids.add(preset.id)
    names.add(name.toLowerCase())
    presets.push({ id: preset.id, name, settings: scene.value })
  }
  return { ok: true, value: presets, notices: [] }
}

export function serializePresets(presets: readonly SavedPreset[]): string {
  const text = JSON.stringify({ schemaVersion: PRESET_SCHEMA_VERSION, presets })
  const validated = deserializePresets(text)
  if (!validated.ok) throw new Error(`${validated.issues[0].path}: ${validated.issues[0].message}`)
  return JSON.stringify({ schemaVersion: PRESET_SCHEMA_VERSION, presets: validated.value })
}
