import type { PaletteSettings } from './settings'
import { validatePalette } from './validation'
import type { ValidationResult } from './validation'

export const MAX_PALETTE_TEXT_LENGTH = 16_384
export type PaletteFormat = 'json' | 'hex'

export function parsePalette(text: string, currentPolicy: PaletteSettings['effectPolicy']): ValidationResult<PaletteSettings> {
  const failure = (message: string): ValidationResult<PaletteSettings> => ({ ok: false, issues: [{ path: 'palette import', message }] })
  if (text.length > MAX_PALETTE_TEXT_LENGTH) return failure('Palette text exceeds 16 KiB. Use 1–32 colors.')
  const trimmed = text.trim()
  if (!trimmed) return failure('Enter 1–32 hex colors or version-1 palette JSON.')
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data: unknown
    try { data = JSON.parse(trimmed) } catch { return failure('Malformed JSON. Expected {"schemaVersion":1,"colors":["#RRGGBB"],"effectPolicy":"explicit"}.') }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return failure('Expected a version-1 palette object, not an array.')
    const record = data as Record<string, unknown>
    if (record.schemaVersion !== 1) return failure('Unsupported palette schemaVersion. Expected 1.')
    if (Object.keys(record).some((key) => !['schemaVersion', 'colors', 'effectPolicy'].includes(key))) return failure('Unknown palette JSON field. Expected schemaVersion, colors and effectPolicy only.')
    return validatePalette({ colors: record.colors, effectPolicy: record.effectPolicy })
  }
  return validatePalette({ colors: trimmed.split(/[\s,]+/).map((color) => /^[0-9a-f]{6}$/i.test(color) ? `#${color}` : color), effectPolicy: currentPolicy })
}

export function serializePalette(palette: PaletteSettings, format: PaletteFormat): string {
  return format === 'hex' ? palette.colors.join('\n') : JSON.stringify({ schemaVersion: 1, ...palette }, null, 2)
}
