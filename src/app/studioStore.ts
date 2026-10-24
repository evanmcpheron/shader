import { ImportController } from '../import/importController'
import type { ImportState } from '../import/importController'
import type { FramingReport } from '../pixels/subjectBounds'
import type { GroundReport } from '../scene/groundReceiver'
import type { OutlineReport } from '../pixels/silhouetteOutline'
import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand/vanilla'
import { LIMITS, MAX_PALETTE_COLORS } from '../domain/constraints'
import { createDefaultPrimitive, createDefaultSettings, createDefaultTransform, withPaletteSize } from '../domain/defaults'
import type { GroundSettings, PaletteSettings, PrimitiveKind, SceneSection, SceneSettings, SrgbColor } from '../domain/settings'
import { validateNumber, validateSceneSettings } from '../domain/validation'
import type { ValidationResult } from '../domain/validation'
import { parsePalette } from '../domain/paletteInterchange'
import { generateShadingRamp, resampleShadingRamp, resizeThresholds } from '../domain/shading'

export type PreviewState = Readonly<{
  zoom: number
  pan: Readonly<{ x: number; y: number }>
  grid: boolean
  checkerboard: boolean
  referenceWireframe: boolean
  mode: 'final' | 'reference' | 'side-by-side'
  tool: 'camera' | 'light' | 'preview-pan'
}>

export type StudioStatus =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'busy'; operation: 'render' | 'import' | 'export' }>
  | Readonly<{ kind: 'error'; message: string }>

export type ReferenceStatus =
  | Readonly<{ kind: 'starting' }>
  | Readonly<{ kind: 'ready' }>
  | Readonly<{ kind: 'unavailable'; message: string }>

export type DirtyRevisions = Readonly<{
  settings: number
  capture: number
  style: number
  shadow: number
  view: number
}>

type SettingsResult = ValidationResult<SceneSettings>

export type StudioState = Readonly<{
  settings: SceneSettings
  preview: PreviewState
  status: StudioStatus
  modelImport: ImportState
  referenceStatus: ReferenceStatus
  nativeFraming: Readonly<{ captureRevision: number; report: FramingReport }> | null
  nativeGround: Readonly<{ revision: number; report: GroundReport | null }> | null
  nativeOutline: Readonly<{ revision: number; report: OutlineReport | null }> | null
  revisions: DirtyRevisions
  actions: Readonly<{
    setSection: <K extends SceneSection>(section: K, value: SceneSettings[K]) => SettingsResult
    selectPrimitive: (kind: PrimitiveKind) => SettingsResult
    setPaletteColors: (colors: readonly SrgbColor[]) => SettingsResult
    setShadingLevels: (count: number) => SettingsResult
    generateShadingRamp: () => SettingsResult
    resampleShadingRamp: (count: number) => SettingsResult
    importPalette: (text: string) => SettingsResult
    resetTransforms: () => SettingsResult
    resetSection: (section: SceneSection) => SettingsResult
    resetScene: () => SettingsResult
    restoreSettings: (input: unknown) => SettingsResult
    setPreview: (patch: Partial<PreviewState>) => ValidationResult<PreviewState>
    resetPreview: () => ValidationResult<PreviewState>
    setStatus: (status: StudioStatus) => void
    setReferenceStatus: (status: ReferenceStatus) => void
    setNativeFraming: (value: StudioState['nativeFraming']) => void
    setNativeGround: (value: StudioState['nativeGround']) => void
    setNativeOutline: (value: StudioState['nativeOutline']) => void
  }>
}>

export type StudioStore = Pick<StoreApi<StudioState>, 'getState' | 'getInitialState' | 'subscribe'> & Readonly<{ assets: ImportController }>

export function createDefaultPreview(): PreviewState {
  return { zoom: 8, pan: { x: 0, y: 0 }, grid: false, checkerboard: true, referenceWireframe: false, mode: 'final', tool: 'camera' }
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function groundGeometry(ground: GroundSettings) {
  return ground.kind === 'none' ? ground : {
    kind: ground.kind, position: ground.position, width: ground.width, depth: ground.depth,
  }
}

function changedRevisions(previous: SceneSettings, next: SceneSettings, revisions: DirtyRevisions): DirtyRevisions {
  const capture = !equal(previous.subject, next.subject)
    || !equal(previous.camera, next.camera)
    || !equal(previous.canvas, next.canvas)
    || !equal(previous.framing, next.framing)
    || previous.shading.normals !== next.shading.normals
    || !equal(groundGeometry(previous.ground), groundGeometry(next.ground))
  const shadow = capture
    || !equal(previous.lighting.directional.position, next.lighting.directional.position)
    || !equal(previous.lighting.directional.target, next.lighting.directional.target)
    || !equal(previous.shadows, next.shadows)
  return {
    ...revisions,
    settings: revisions.settings + 1,
    capture: revisions.capture + Number(capture),
    style: revisions.style + 1,
    shadow: revisions.shadow + Number(shadow),
  }
}

function shareUnchangedSections(previous: SceneSettings, next: SceneSettings): SceneSettings {
  const shared = { ...next }
  for (const section of Object.keys(next) as (keyof SceneSettings)[]) {
    if (equal(previous[section], next[section])) Object.assign(shared, { [section]: previous[section] })
  }
  return shared
}

function validatePreview(preview: PreviewState): ValidationResult<PreviewState> {
  if (typeof preview.pan !== 'object' || preview.pan === null) {
    return { ok: false, issues: [{ path: 'preview.pan', message: 'Expected X/Y pan coordinates.' }] }
  }
  for (const [path, value, bounds] of [
    ['zoom', preview.zoom, LIMITS.previewZoom],
    ['pan.x', preview.pan.x, LIMITS.previewPan],
    ['pan.y', preview.pan.y, LIMITS.previewPan],
  ] as const) {
    const result = validateNumber(value, bounds)
    if (!result.ok) return { ok: false, issues: result.issues.map((issue) => ({ ...issue, path: `preview.${path}` })) }
  }
  if (!['final', 'reference', 'side-by-side'].includes(preview.mode)) {
    return { ok: false, issues: [{ path: 'preview.mode', message: 'Unknown preview mode.' }] }
  }
  if (!['camera', 'light', 'preview-pan'].includes(preview.tool)) {
    return { ok: false, issues: [{ path: 'preview.tool', message: 'Unknown interaction tool.' }] }
  }
  if (typeof preview.grid !== 'boolean' || typeof preview.checkerboard !== 'boolean' || typeof preview.referenceWireframe !== 'boolean') {
    return { ok: false, issues: [{ path: 'preview', message: 'Grid, checkerboard and wireframe must be booleans.' }] }
  }
  return { ok: true, value: { ...preview, pan: { ...preview.pan } }, notices: [] }
}

export function createStudioStore(initial: unknown = createDefaultSettings()): StudioStore {
  const validated = validateSceneSettings(initial)
  if (!validated.ok) throw new Error(`Invalid initial scene: ${validated.issues[0].path}: ${validated.issues[0].message}`)

  const store = createStore<StudioState>((set, get) => {
    function commit(input: unknown): SettingsResult {
      const result = validateSceneSettings(input)
      if (!result.ok) return result
      const previous = get()
      if (equal(previous.settings, result.value)) return { ...result, value: previous.settings }
      const nextGeometry = result.value.subject.geometry
      const released = !equal(previous.settings.subject.geometry, nextGeometry) && (nextGeometry.kind !== 'imported' || !assets.getAsset(nextGeometry))
      if (released) assets.release()
      const settings = shareUnchangedSections(previous.settings, result.value)
      set({ settings, revisions: changedRevisions(previous.settings, settings, previous.revisions), ...(released ? { modelImport: { kind: 'idle' as const, message: '' } } : {}) })
      return { ...result, value: settings }
    }

    function applyPalette(palette: PaletteSettings): SettingsResult {
      const settings = get().settings
      const tone = palette.colors.length === settings.palette.colors.length
        ? settings.shading.tone : withPaletteSize(settings.shading.tone, palette.colors.length)
      return commit({ ...settings, palette, shading: { ...settings.shading, tone } })
    }

    function setPreview(patch: Partial<PreviewState>): ValidationResult<PreviewState> {
      const previous = get()
      const result = validatePreview({ ...previous.preview, ...patch })
      if (result.ok && !equal(previous.preview, result.value)) {
        set({ preview: result.value, revisions: { ...previous.revisions, view: previous.revisions.view + 1 } })
      }
      return result
    }

    return {
      settings: validated.value,
      preview: createDefaultPreview(),
      status: { kind: 'idle' },
      referenceStatus: { kind: 'starting' },
      modelImport: { kind: 'idle', message: '' },
      nativeFraming: null,
      nativeOutline: null,
      nativeGround: null,
      revisions: { settings: 0, capture: 0, style: 0, shadow: 0, view: 0 },
      actions: {
        setSection: (section, value) => commit({ ...get().settings, [section]: value }),
        selectPrimitive: (kind) => {
          assets.cancel()
          const settings = get().settings
          return commit({ ...settings, subject: { ...settings.subject, geometry: createDefaultPrimitive(kind) } })
        },
        setPaletteColors: (colors) => applyPalette({ ...get().settings.palette, colors }),
        importPalette: (text) => {
          const parsed = parsePalette(text, get().settings.palette.effectPolicy)
          return parsed.ok ? applyPalette(parsed.value) : parsed
        },
        resampleShadingRamp: (count) => {
          const validation = validateNumber(count, { min: 1, max: MAX_PALETTE_COLORS, integer: true })
          if (!validation.ok) return validation
          return applyPalette({ ...get().settings.palette, colors: resampleShadingRamp(get().settings.palette.colors, count) })
        },
        setShadingLevels: (count) => {
          const validation = validateNumber(count, { min: 1, max: MAX_PALETTE_COLORS, integer: true })
          if (!validation.ok) return validation
          const settings = get().settings
          const colors = settings.palette.colors.slice(0, count)
          while (colors.length < count) colors.push(settings.shading.highlightColor)
          const previousTone = settings.shading.tone
          const tone = previousTone.kind === 'cel' || previousTone.kind === 'bands'
            ? { kind: previousTone.kind, thresholds: resizeThresholds(previousTone.thresholds, count) }
            : previousTone
          return commit({ ...settings, palette: { ...settings.palette, colors }, shading: { ...settings.shading, tone } })
        },
        generateShadingRamp: () => {
          const settings = get().settings
          return commit({ ...settings, palette: { ...settings.palette, colors: generateShadingRamp(settings.palette.colors.length, settings.shading) } })
        },
        resetTransforms: () => {
          const settings = get().settings
          return commit({ ...settings, subject: { ...settings.subject, transform: createDefaultTransform() } })
        },
        resetSection: (section) => {
          const defaults = createDefaultSettings()
          const settings = get().settings
          if (section === 'palette') {
            return commit({
              ...settings,
              palette: defaults.palette,
              shading: { ...settings.shading, tone: withPaletteSize(settings.shading.tone, defaults.palette.colors.length) },
            })
          }
          if (section === 'shading') {
            return commit({
              ...settings,
              shading: { ...defaults.shading, tone: withPaletteSize(defaults.shading.tone, settings.palette.colors.length) },
            })
          }
          return commit({ ...settings, [section]: defaults[section] })
        },
        resetScene: () => { assets.cancel(); return commit(createDefaultSettings()) },
        restoreSettings: (input) => {
          const result = validateSceneSettings(input)
          if (!result.ok) return result
          assets.cancel()
          return commit(result.value)
        },
        setPreview,
        resetPreview: () => setPreview(createDefaultPreview()),
        setStatus: (status) => {
          if (!equal(get().status, status)) set({ status: { ...status } })
        },
        setNativeFraming: (nativeFraming) => {
          if (!equal(get().nativeFraming, nativeFraming)) set({ nativeFraming })
        },
        setNativeGround: (nativeGround) => set({ nativeGround }),
        setNativeOutline: (nativeOutline) => {
          if (!equal(get().nativeOutline, nativeOutline)) set({ nativeOutline })
        },
        setReferenceStatus: (referenceStatus) => {
          if (!equal(get().referenceStatus, referenceStatus)) set({ referenceStatus: { ...referenceStatus } })
        },
      },
    }
  })

  const assets: ImportController = new ImportController((geometry) => {
    const subject = store.getState().settings.subject
    const result = store.getState().actions.setSection('subject', { ...subject, geometry })
    if (!result.ok) throw new Error(result.issues[0].message)
  }, (modelImport) => store.setState({ modelImport }))
  return { getState: store.getState, getInitialState: store.getInitialState, subscribe: store.subscribe, assets }
}

export const studioStore = createStudioStore()
