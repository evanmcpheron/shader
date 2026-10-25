import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { studioStore } from './app/studioStore'
import type { PreviewState, StudioStore } from './app/studioStore'
import { useWorkspaceLayout } from './app/useCompactLayout'
import { useVisualViewport } from './app/useVisualViewport'
import { WorkspaceDialog } from './components/WorkspaceDialog'
import { Disclosure, DisclosureToggle, SelectField } from './components/controls'
import { Inspector } from './components/Inspector'
import { CameraInspector } from './components/CameraInspector'
import { SubjectInspector } from './components/SubjectInspector'
import { GroundShadowInspector } from './components/GroundShadowInspector'
import { LightInspector } from './components/LightInspector'
import { FramingInspector } from './components/FramingInspector'
import { CanvasInspector } from './components/CanvasInspector'
import { PaletteInspector } from './components/PaletteInspector'
import { ShadingInspector } from './components/ShadingInspector'
import { DitherInspector } from './components/DitherInspector'
import { OutlineInspector } from './components/OutlineInspector'
import { ReferenceViewport } from './components/ReferenceViewport'
import type { ReferenceHandle } from './components/ReferenceViewport'
import { LocalSaveStatus } from './components/LocalSaveStatus'
import { PresetManager } from './components/PresetManager'
import type { LocalPersistence } from './persistence/localPersistence'
import './App.css'

const tools = [
  { value: 'camera', label: 'Camera orbit' },
  { value: 'light', label: 'Move light' },
  { value: 'preview-pan', label: 'Pan preview' },
] as const

type Panel = 'scene' | 'pixel'

function App({ store = studioStore, persistence }: { store?: StudioStore; persistence?: LocalPersistence }) {
  useEffect(() => () => store.assets.release(), [store])
  const framingMode = useStore(store, (state) => state.settings.framing.mode)
  const tool = useStore(store, (state) => state.preview.tool)
  const status = useStore(store, (state) => state.status)
  const referenceStatus = useStore(store, (state) => state.referenceStatus)
  const actions = useStore(store, (state) => state.actions)
  const layout = useWorkspaceLayout()
  const compact = layout !== 'desktop'
  const studioRef = useRef<HTMLDivElement>(null)
  useVisualViewport(studioRef)
  const [activityOpen, setActivityOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [desktopPanels, setDesktopPanels] = useState({ scene: true, pixel: true })
  const [compactPanel, setCompactPanel] = useState<Panel | null>(null)
  const [notice, setNotice] = useState('')
  const [subjectEditorKey, setSubjectEditorKey] = useState(0)
  const [exportState, setExportState] = useState<{ kind: 'idle' | 'busy' | 'success' | 'error'; message: string }>({ kind: 'idle', message: '' })
  const exportPending = useRef(false)
  const reference = useRef<ReferenceHandle>(null)
  const sceneToggle = useRef<HTMLButtonElement>(null)
  const pixelToggle = useRef<HTMLButtonElement>(null)
  const sceneOpen = compact ? compactPanel === 'scene' : desktopPanels.scene
  const pixelOpen = compact ? compactPanel === 'pixel' : desktopPanels.pixel
  const selectedTool = tools.find((option) => option.value === tool)!.label
  const referenceMessage = referenceStatus.kind === 'unavailable'
    ? [notice, referenceStatus.message].filter(Boolean).join(' ')
    : notice || 'Final and original share native framing. Wheel zooms the preview; Export PNG saves the native canvas dimensions.'

  async function exportPng() {
    if (exportPending.current) return
    exportPending.current = true
    setExportState({ kind: 'busy', message: 'Preparing the clicked revision for PNG export…' })
    try {
      if (!reference.current) throw new Error('Renderer unavailable. Retry renderer before exporting.')
      const filename = await reference.current.exportPng()
      setExportState({ kind: 'success', message: `PNG download started: ${filename}` })
    } catch (error) {
      setExportState({ kind: 'error', message: `PNG export failed. ${error instanceof Error ? error.message : 'Could not encode or start the download.'} Retry Export PNG when the renderer is ready.` })
    } finally { exportPending.current = false }
  }

  function togglePanel(panel: Panel) {
    if (compact) { setCompactPanel((current) => current === panel ? null : panel); setExpanded(false) }
    else setDesktopPanels((current) => ({ ...current, [panel]: !current[panel] }))
  }

  function resetScene() {
    const result = actions.resetScene()
    if (result.ok) setSubjectEditorKey((key) => key + 1)
    setNotice(result.ok ? 'Scene settings restored to defaults. View settings were kept.' : result.issues[0].message)
  }

  function resetView() {
    const result = actions.resetPreview()
    setNotice(result.ok ? 'View settings restored to defaults. Scene settings were kept.' : result.issues[0].message)
  }

  function selectTool(value: PreviewState['tool']) {
    const result = actions.setPreview({ tool: value })
    setNotice(result.ok ? `${tools.find((option) => option.value === value)!.label} selected. ${value === 'camera' ? framingMode === 'pixel-fit' ? 'Drag to orbit. Pixel fit locks camera pan/zoom; switch to manual framing to unlock.' : 'Drag to orbit, middle-drag to dolly/zoom, Shift-drag to pan. Wheel zooms preview.' : value === 'light' ? 'Drag the amber handle to move the light; Escape cancels. Empty space orbits.' : 'Drag to pan the image; arrows pan and Shift+arrows move faster. Escape cancels. Wheel zooms preview.'}` : result.issues[0].message)
  }

  return (
    <div ref={studioRef} className="studio" data-layout={layout} data-panel={compact ? compactPanel ?? 'none' : 'desktop'} data-expanded={expanded}>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <header className="toolbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2 2h9v9H2zm11 0h9v9h-9zM2 13h9v9H2zm11 0h4v4h-4zm5 5h4v4h-4z" />
          </svg>
          <div>
            <h1>Pixel Shading Studio</h1>
            <span className="muted">A workspace for deliberate pixels</span>
          </div>
        </div>
        <div className="toolbar-actions" role="group" aria-label="Workspace actions">
          <div className="panel-toggles" role="group" aria-label="Inspectors">
            <DisclosureToggle ref={sceneToggle} controls="scene-inspector" expanded={sceneOpen} onToggle={() => togglePanel('scene')}>Scene</DisclosureToggle>
            <DisclosureToggle ref={pixelToggle} controls="pixel-inspector" expanded={pixelOpen} onToggle={() => togglePanel('pixel')}>Pixels</DisclosureToggle>
            {persistence && <PresetManager store={store} persistence={persistence} onRestore={() => setSubjectEditorKey(key => key + 1)} />}
          </div>
          <div className="desktop-actions">
            <button type="button" onClick={resetScene} aria-describedby="reset-scene-help">Reset scene</button>
            <button type="button" onClick={resetView} aria-describedby="reset-view-help">Reset view</button>
          </div>
          <button className="export-button" type="button" disabled={referenceStatus.kind !== 'ready' || exportState.kind === 'busy'} onClick={() => void exportPng()} aria-describedby="png-export-help">{exportState.kind === 'busy' ? 'Exporting PNG…' : 'Export PNG'}</button>
          <span id="png-export-help" className="sr-only">Save the final native canvas pixels as PNG. Preview zoom and overlays do not affect the file.</span>
          <span id="reset-scene-help" className="sr-only">Restore all stored scene settings to domain defaults. Keeps view settings.</span>
          <span id="reset-view-help" className="sr-only">Restore view settings and tool selection. Keeps scene settings.</span>
        </div>
      </header>

      <div className="studio-body">
        <Inspector
          id="scene-inspector"
          title="Scene inspector"
          open={sceneOpen}
          toggleRef={sceneToggle}
          onClose={() => togglePanel('scene')}
          compact={compact}
          expanded={expanded}
          onExpand={() => setExpanded(value => !value)}
          sections={['Subject', 'Object transforms', 'Camera', 'Lighting', 'Ground & shadows', 'Interaction tool']}
        >
          <p className="inspector-intro">Edit the subject, camera and lighting independently.</p>
          <SubjectInspector key={`subject-${subjectEditorKey}`} store={store} />
          <CameraInspector key={`camera-${subjectEditorKey}`} store={store} />
          <LightInspector key={`lighting-${subjectEditorKey}`} store={store} />
          <GroundShadowInspector key={`ground-${subjectEditorKey}`} store={store} />
          <Disclosure title="Interaction tool">
            <SelectField
              label="Selected tool"
              value={tool}
              options={tools}
              onValueChange={selectTool}
              description="Camera orbit enables orbit; manual framing enables Shift-drag camera pan and middle-drag dolly/zoom. Move light enables the amber handle; empty space orbits. Pan preview moves only the image. Wheel always zooms preview. Numeric controls are in each section."
            />
          </Disclosure>
        </Inspector>

        <main id="workspace" className="workspace" tabIndex={-1} aria-labelledby="workspace-title">
          <div className="workspace-heading">
            <h2 id="workspace-title">Workspace</h2>
            <span className="badge">3D reference · {referenceStatus.kind === 'ready' ? 'ready' : referenceStatus.kind === 'starting' ? 'starting' : 'unavailable'}</span>
          </div>
          <div className="workspace-stage">
            <ReferenceViewport ref={reference} store={store} />
          </div>
          <div className="workspace-info">
            <span>Selected tool <strong>{selectedTool}</strong></span>
            <span>{tool === 'camera' ? framingMode === 'pixel-fit' ? 'Drag orbit · wheel preview zoom' : 'Drag orbit · Shift-drag camera pan · middle-drag dolly/zoom' : tool === 'light' ? 'Amber handle moves light · Escape cancels · empty space orbits' : 'Drag or arrows pan image · Escape cancels · wheel preview zoom'}</span>
          </div>
        </main>

        <Inspector
          id="pixel-inspector"
          title="Pixel inspector"
          open={pixelOpen}
          toggleRef={pixelToggle}
          onClose={() => togglePanel('pixel')}
          compact={compact}
          expanded={expanded}
          onExpand={() => setExpanded(value => !value)}
          sections={['Canvas pixels', 'Output background', 'Subject framing', 'Shading', 'Dithering', 'Palette & ramp', 'Outline']}
        >
          <p className="inspector-intro">Native canvas, framing, shading, dithering, palette and outline.</p>
          <CanvasInspector key={`canvas-${subjectEditorKey}`} store={store} />
          <FramingInspector key={`framing-${subjectEditorKey}`} store={store} />
          <ShadingInspector key={`shading-${subjectEditorKey}`} store={store} />
          <DitherInspector key={`dither-${subjectEditorKey}`} store={store} />
          <PaletteInspector key={`palette-${subjectEditorKey}`} store={store} />
          <OutlineInspector key={`outline-${subjectEditorKey}`} store={store} />
        </Inspector>
      </div>

      <footer className="status-area">
        <div className="status-line">
          <span className="status-label"><span className="status-dot" aria-hidden="true" />{referenceStatus.kind === 'ready' ? 'Reference ready' : referenceStatus.kind === 'starting' ? 'Starting renderer' : 'Renderer unavailable'}</span>
          <>{persistence ? <LocalSaveStatus persistence={persistence} /> : <span className="muted">Settings held in memory</span>}</>
        </div>
        <button className="activity-toggle" type="button" onClick={() => setActivityOpen(true)}>Activity & help{status.kind === 'error' || exportState.kind === 'error' ? ' !' : ''}</button>
        <p role="status" className={`status-message ${status.kind === 'error' || exportState.kind === 'error' ? 'has-error' : 'routine-status'}`}>{status.kind === 'error' ? status.message : status.kind === 'busy' ? status.operation === 'render' ? 'Updating native pixels… You can keep editing; intermediate edits may be skipped.' : `${status.operation} in progress…` : referenceMessage}</p>
        {exportState.kind !== 'idle' && <p role={exportState.kind === 'error' ? 'alert' : 'status'} className={exportState.kind === 'error' ? 'field-error' : 'status-message'}>{exportState.kind === 'success' ? 'PNG downloaded · details in Activity & help' : exportState.message}</p>}
        <WorkspaceDialog open={activityOpen} title="Activity & help" onClose={() => setActivityOpen(false)}>
          <div className="compact-actions" hidden={!compact}>
            <button type="button" onClick={resetScene}>Reset scene</button>
            <button type="button" onClick={resetView}>Reset view</button>
          </div>
          <p>{referenceMessage}</p>
          <p>{status.kind === 'error' ? status.message : status.kind === 'busy' ? 'Updating…' : 'Scene ready for editing.'}</p>
          {exportState.message && <p className={exportState.kind === 'error' ? 'field-error' : ''}>{exportState.message}</p>}
          {persistence && <LocalSaveStatus persistence={persistence} detailed />}
          <Disclosure title="Workspace help" defaultOpen={false} className="workspace-help">
            <p>Use Tab to move between controls, Enter or Space to toggle panels and sections, and arrow keys to choose a tool in the select menu. Press Escape inside an inspector to close it and return to its toolbar button.</p>
            <p>Final only, Original only and Compare share the same W×H framing and navigation. Camera and light tools work in every view. Wheel zooms presentation; F fits, N shows native size, 0 resets view. Pan preview uses drag or arrows. In manual framing, middle-drag changes camera distance/zoom and Shift-drag pans the camera. Native pixels use nearest-neighbor display scaling, independent of DPR. Canvas controls set actual image dimensions. Transparent pixels have zero RGB; the checkerboard is display only. Subject framing separates the requested maximum box from measured native bounds. Pixel fit locks camera pan/zoom; switch to manual framing for camera placement. Shading controls style final only; Original keeps continuous lighting and the selected normals. Palette & ramp edits exact local colors; palette JSON/hex interchange is available.</p>
            <p>Export PNG saves Final at exactly the canvas width × height, including the active transparent or solid background and pixel effects. Preview zoom, DPR, checkerboard, grid and handles do not enter the PNG. Export pins the validated settings at the click; you can continue editing while it finishes. Wait for the download or retry a visible error. The browser controls the download destination.</p>
            <p>Camera gestures move the viewpoint, while object transforms move the subject. Roll survives orbit and projection changes. Reframe reference explicitly centers and sizes the camera; it never runs automatically. Reset camera restores only camera defaults.</p>
            <p>Move light rotates the directional source around its target using a screen arcball. The reference-only amber handle shows direction at a display radius, not the source distance. A drag preserves that distance and target. Escape, pointer cancellation or lost capture restores the starting light position. Lighting presets/reset preserve camera, object and palette. Ground & shadows controls one finite receiver and directional self/ground shadows. Reset ground & shadows keeps lighting. Reset lighting keeps ground and shadows.</p>
            <p>Bayer and blue noise select exact ramp/palette colors using fixed native thresholds. Strength and ramp transition width control the blend; pattern scale enlarges threshold cells. Floyd–Steinberg instead passes strength-scaled quantization error to later pixels in a fixed scan. Zero strength equals None. Continuous shading and Original stay undithered. Reset dithering preserves shading and palette.</p>
            <p>Silhouette outlines add 1–8 opaque native pixels around the subject after dithering. Square dilation grows hole edges too; holes narrower than the diameter can close. Explicit color can add one disclosed effect color; strict palette maps it to an active entry. Clipped outlines keep the canvas size. Reset outline preserves framing and styling.</p>
            <p>Reset scene restores the stored scene defaults. Reset view restores presentation settings and tool selection. Neither changes the other. Presets saves complete named scenes locally. The current scene autosaves after a short pause and on leaving the page when storage is available. Preset overwrite/delete require an explicit confirmation. Resets keep named presets. Storage failures retain in-memory work: keep the tab open, retry saving, or download settings and recovery JSON from Presets. Imported models store a filename/hash only; reselect matching files or explicitly use a built-in sphere.</p>
          </Disclosure>
        </WorkspaceDialog>
      </footer>
    </div>
  )
}

export default App
