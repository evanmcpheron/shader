// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { ReferenceViewport } from './ReferenceViewport'

const lifecycle = vi.hoisted(() => ({ connectedAtDisposal: [] as boolean[] }))

vi.mock('../scene/referenceRuntime', async () => {
  const { CameraController } = await import('../scene/cameraController')
  return { ReferenceRuntime: class {
    private readonly camera: InstanceType<typeof CameraController>
    private readonly host: HTMLElement
    constructor(host: HTMLElement, store: ReturnType<typeof createStudioStore>) {
      this.host = host
      this.camera = new CameraController(host, store)
    }
    dispose() {
      lifecycle.connectedAtDisposal.push(this.host.isConnected)
      this.camera.dispose()
    }
  } }
})

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/'); lifecycle.connectedAtDisposal = [] })

test('StrictMode, keyed remount and unmount detach real OrbitControls document listeners before the host leaves its root', () => {
  window.history.replaceState({}, '', '/?scene-checks')
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const view = render(<StrictMode><ReferenceViewport store={createStudioStore()} /></StrictMode>)
  for (let index = 0; index < 4; index++) fireEvent.click(screen.getByRole('button', { name: 'Remount reference' }))
  view.unmount()
  expect(lifecycle.connectedAtDisposal.length).toBeGreaterThanOrEqual(6)
  expect(lifecycle.connectedAtDisposal.every(Boolean)).toBe(true)
  const keyListeners = add.mock.calls.filter(([type, , options]) => type === 'keydown' && typeof options === 'object' && options.capture)
  expect(keyListeners.length).toBeGreaterThanOrEqual(6)
  for (const [, listener] of keyListeners) expect(remove.mock.calls.some(([type, callback, options]) => type === 'keydown' && callback === listener && typeof options === 'object' && options.capture)).toBe(true)
})
