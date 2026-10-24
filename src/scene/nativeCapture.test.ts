import { Color, MeshBasicMaterial, Scene, Sphere, Vector4, WebGLRenderTarget } from 'three'
import type { WebGLRenderer } from 'three'
import { expect, test } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { NativeCapture } from './nativeCapture'

function captureHarness() {
  const scene = new Scene()
  scene.overrideMaterial = new MeshBasicMaterial()
  scene.background = new Color('#123456')
  const initialTarget = new WebGLRenderTarget(3, 2)
  const state = {
    target: initialTarget, face: 2, mip: 1,
    viewport: new Vector4(2, 3, 4, 5), scissor: new Vector4(6, 7, 8, 9), scissorTest: true,
    clear: new Color('#345678'), alpha: 0.6, dither: true,
  }
  let failRender = false
  let reads = 0
  const targets = new Set<WebGLRenderTarget>()
  let released = 0
  const gl = {
    MAX_VIEWPORT_DIMS: 1, MAX_RENDERBUFFER_SIZE: 2, FRAMEBUFFER: 3, FRAMEBUFFER_COMPLETE: 4, DITHER: 5, NO_ERROR: 0,
    getParameter: (parameter: number) => parameter === 1 ? new Int32Array([1024, 1024]) : 1024,
    isEnabled: () => state.dither,
    enable: () => { state.dither = true }, disable: () => { state.dither = false },
    checkFramebufferStatus: () => 4, getError: () => 0, isContextLost: () => false,
  }
  const renderer = {
    capabilities: { maxTextureSize: 1024 }, autoClear: true, toneMapping: 3,
    getContext: () => gl, getRenderTarget: () => state.target,
    getActiveCubeFace: () => state.face, getActiveMipmapLevel: () => state.mip,
    getViewport: (value: Vector4) => value.copy(state.viewport), getScissor: (value: Vector4) => value.copy(state.scissor),
    getScissorTest: () => state.scissorTest,
    getClearColor: (value: Color) => value.copy(state.clear), getClearAlpha: () => state.alpha,
    setRenderTarget: (target: WebGLRenderTarget, face = 0, mip = 0) => {
      state.target = target; state.face = face; state.mip = mip
      if (target !== initialTarget && !targets.has(target)) {
        targets.add(target)
        target.addEventListener('dispose', () => released++)
      }
    },
    setViewport: (value: Vector4 | number, y: number, z: number, w: number) => {
      if (value instanceof Vector4) state.viewport.copy(value)
      else state.viewport.set(value, y, z, w)
    },
    setScissor: (value: Vector4) => state.scissor.copy(value), setScissorTest: (value: boolean) => { state.scissorTest = value },
    setClearColor: (value: Color | number, alpha: number) => { state.clear.set(value); state.alpha = alpha },
    clear: () => {},
    render: () => {
      expect(state.dither).toBe(false)
      expect(scene.overrideMaterial).not.toBe(initialOverride)
      expect(scene.background).toBeNull()
      if (failRender) throw new Error('Driver rejected capture')
    },
    readRenderTargetPixels: (_target: WebGLRenderTarget, _x: number, _y: number, _w: number, _h: number, output: Uint8Array) => {
      reads++
      for (let i = 0; i < output.length; i += 4) output.set([128, 128, 255, 255], i)
    },
  }
  const initialOverride = scene.overrideMaterial
  const snapshot = () => ({ ...state, viewport: state.viewport.toArray(), scissor: state.scissor.toArray(), clear: state.clear.toArray(), autoClear: renderer.autoClear, toneMapping: renderer.toneMapping, override: scene.overrideMaterial, background: scene.background })
  const initialState = snapshot()
  const native = new NativeCapture(renderer as unknown as WebGLRenderer, scene)
  return { native, snapshot, initialState, fail: () => { failRender = true }, counts: () => ({ reads, released, allocated: targets.size }) }
}

test.each([false, true])('capture restores renderer/scene state on success or driver failure (%s)', (failure) => {
  const harness = captureHarness()
  const { settings, revisions } = createStudioStore().getState()
  try {
    if (failure) {
      harness.fail()
      expect(() => harness.native.update(settings, revisions, new Sphere(), () => true)).toThrow('Driver rejected capture')
    } else {
      expect(harness.native.update(settings, revisions, new Sphere(), () => true)).toBeDefined()
    }
    expect(harness.snapshot()).toEqual(harness.initialState)
  } finally {
    harness.native.dispose()
  }
})

test('stale work cannot publish; light edits reuse capture and retain published byte ownership', () => {
  const { native, counts } = captureHarness()
  const store = createStudioStore()
  const update = (current = true) => native.update(store.getState().settings, store.getState().revisions, new Sphere(), () => current)
  try {
    expect(update(false)).toBeUndefined()
    expect(native.getFrame(0)).toBeUndefined()
    const first = update()!
    const firstBytes = first.rgba.slice()
    const reads = counts().reads
    store.getState().actions.setPaletteColors(['#000000', '#FFFFFF'])
    const paletteFrame = update()!
    expect(counts().reads).toBe(reads)
    expect(paletteFrame.framing).toEqual(first.framing)
    const lighting = store.getState().settings.lighting
    store.getState().actions.setSection('lighting', { ...lighting, ambient: { color: '#FF0000', intensity: 2 } })
    expect(native.getFrame(store.getState().revisions.settings)).toBeUndefined()
    const second = update()!
    expect(counts().reads).toBe(reads)
    expect(second.rgba).not.toEqual(firstBytes)
    expect(first.rgba).toEqual(firstBytes)
    expect(second.revision).toBe(store.getState().revisions.settings)
    expect(second.captureRevision).toBe(first.captureRevision)
    expect(native.getFrame(second.revision)).toBe(second)
    store.getState().actions.setSection('canvas', { width: 96, height: 64 })
    update()
    expect(counts()).toMatchObject({ allocated: 2, released: 1 })
    native.dispose()
    native.dispose()
    expect(counts()).toMatchObject({ allocated: 2, released: 2 })
    expect(native.diagnostics().buffers).toEqual({ raw: 0, normals: 0, work: 0, styled: 0, ring: 0, horizontal: 0 })
    expect(update()).toBeUndefined()
    expect(native.getFrame(store.getState().revisions.settings)).toBeUndefined()
  } finally {
    native.dispose()
  }
})

test('continuous before cache is current, independently owned, and stable through view-only edits', () => {
  const { native } = captureHarness()
  const store = createStudioStore()
  const update = () => native.update(store.getState().settings, store.getState().revisions, new Sphere(), () => true)
  try {
    const final = update()!
    const before = native.getBeforeFrame(final.revision)!
    expect([...before.rgba.slice(0, 4)]).toEqual([88, 130, 176, 255])
    expect([...final.rgba.slice(0, 4)]).toEqual([184, 216, 240, 255])
    expect(before.rgba).not.toBe(final.rgba)
    const saved = before.rgba.slice()
    store.getState().actions.setPreview({ zoom: 2, grid: true, mode: 'side-by-side' })
    expect(native.getBeforeFrame(final.revision)).toBe(before)
    expect(native.getFrame(final.revision)).toBe(final)
    const captures = native.diagnostics().captures
    store.getState().actions.setSection('shading', { ...store.getState().settings.shading, brightness: -1 })
    const dark = update()!
    expect([...dark.rgba.slice(0, 4)]).toEqual([23, 32, 56, 255])
    expect(native.getBeforeFrame(dark.revision)!.rgba).toEqual(saved)
    expect(native.diagnostics().captures).toBe(captures)
    const { settings, actions } = store.getState()
    actions.setSection('lighting', { ...settings.lighting, ambient: { ...settings.lighting.ambient, intensity: 0.9 } })
    expect(native.getBeforeFrame(store.getState().revisions.settings)).toBeUndefined()
    update()
    expect(native.getBeforeFrame(store.getState().revisions.settings)!.rgba).not.toEqual(saved)
    expect(before.rgba).toEqual(saved)
  } finally { native.dispose() }
  expect(native.getBeforeFrame(store.getState().revisions.settings)).toBeUndefined()
  expect(native.getCamera()).toBeUndefined()
})

test('all dither edits reuse capture, target, buffers and framing while Original remains undithered', () => {
  const { native, counts } = captureHarness()
  const store = createStudioStore()
  const update = () => native.update(store.getState().settings, store.getState().revisions, new Sphere(), () => true)!
  try {
    const first = update()
    const firstBytes = first.rgba.slice()
    const original = native.getBeforeFrame(first.revision)!.rgba.slice()
    const baseline = native.diagnostics()
    const reads = counts().reads
    for (const matrixSize of [2, 4, 8] as const) {
      for (const strength of [0, 0.5, 1]) {
        store.getState().actions.setSection('dither', { kind: 'bayer', matrixSize, strength, patternScale: 2, transitionWidth: 0.7 })
        const frame = update()
        expect(frame.captureRevision).toBe(first.captureRevision)
        expect(frame.framing).toBe(first.framing)
        expect(native.getBeforeFrame(frame.revision)!.rgba).toEqual(original)
        expect(native.diagnostics()).toMatchObject({ captures: baseline.captures, rasterizations: baseline.rasterizations, targetLifecycle: baseline.targetLifecycle, buffers: baseline.buffers })
        expect(counts().reads).toBe(reads)
      }
    }
    for (const kind of ['blue-noise', 'floyd-steinberg'] as const) {
      store.getState().actions.setSection('dither', kind === 'blue-noise' ? { kind, strength: 1, patternScale: 2, transitionWidth: 0.7 } : { kind, strength: 1 })
      const frame = update()
      expect(native.getBeforeFrame(frame.revision)!.rgba).toEqual(original)
      expect(first.rgba).toEqual(firstBytes)
      expect(native.diagnostics()).toMatchObject({ captures: baseline.captures, rasterizations: baseline.rasterizations, targetLifecycle: baseline.targetLifecycle, buffers: baseline.buffers })
      expect(counts().reads).toBe(reads)
      expect(native.getFrame(frame.revision)).toBe(frame)
      store.getState().actions.setSection('dither', kind === 'blue-noise' ? { kind, strength: 0, patternScale: 1, transitionWidth: 1 } : { kind, strength: 0 })
      expect(native.getFrame(store.getState().revisions.settings)).toBeUndefined()
      native.update(store.getState().settings, store.getState().revisions, new Sphere(), () => false)
      expect(native.getFrame(store.getState().revisions.settings)).toBeUndefined()
    }
  } finally { native.dispose() }
})


test('outline-only edits composite cached lighting and styling, preserve frame ownership and skip fit/capture', () => {
  const { native, counts } = captureHarness()
  const store = createStudioStore()
  const update = (current = true) => native.update(store.getState().settings, store.getState().revisions, new Sphere(), () => current)!
  try {
    const first = update()
    const original = native.getBeforeFrame(first.revision)!.rgba.slice()
    const saved = first.rgba.slice()
    const baseline = native.diagnostics()
    const reads = counts().reads
    for (const thickness of [1, 2, 8]) for (const color of ['#01FE80', '#ABCDEF'] as const) {
      store.getState().actions.setSection('outline', { kind: 'silhouette', thickness, color })
      const frame = update()
      expect(frame.framing).toBe(first.framing)
      expect(frame.captureRevision).toBe(first.captureRevision)
      expect(frame.outline).toMatchObject({ color, thickness, clipped: true })
      expect(native.getBeforeFrame(frame.revision)!.rgba).toEqual(original)
      expect(native.diagnostics()).toMatchObject({ captures: baseline.captures, rasterizations: baseline.rasterizations, processes: baseline.processes, buffers: baseline.buffers })
      expect(counts().reads).toBe(reads)
      expect(first.rgba).toEqual(saved)
    }
    store.getState().actions.resetSection('outline')
    expect(update().rgba).toEqual(saved)
    expect(native.diagnostics().processes).toBe(baseline.processes)
    expect(native.diagnostics().composites).toBe(baseline.composites + 7)
    const shading = store.getState().settings.shading
    store.getState().actions.setSection('shading', { ...shading, brightness: -1 })
    update(false)
    store.getState().actions.setSection('shading', shading)
    expect(update().rgba).toEqual(saved)
  } finally { native.dispose() }
})
