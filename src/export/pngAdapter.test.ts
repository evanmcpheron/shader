// @vitest-environment jsdom

import { afterEach, expect, test, vi } from 'vitest'
import { downloadPng, encodeNativePng } from './pngExport'
import type { NativeFrame } from '../pixels/nativeFrame'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

test('download starts with the filename and retains its URL until a later task', () => {
  vi.useFakeTimers()
  const revoke = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:local-png', revokeObjectURL: revoke })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('sphere-64x64.png')
    expect(this.href).toBe('blob:local-png')
    expect(this.isConnected).toBe(true)
    expect(revoke).not.toHaveBeenCalled()
  })
  downloadPng(new Blob(), 'sphere-64x64.png')
  expect(click).toHaveBeenCalledOnce()
  expect(document.querySelector('a')).toBeNull()
  expect(revoke).not.toHaveBeenCalled()
  vi.runAllTimers()
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:local-png')
})

test('a failed download immediately revokes its URL and removes its link', () => {
  const revoke = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:failed', revokeObjectURL: revoke })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Download blocked') })
  expect(() => downloadPng(new Blob(), 'sprite.png')).toThrow('Download blocked')
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:failed')
  expect(document.querySelector('a')).toBeNull()
})

test.each(['null', 'throw', 'abort', 'no-context'] as const)('encoding reports %s and releases the scratch canvas', async (failure) => {
  const scratch: HTMLCanvasElement[] = []
  const controller = new AbortController()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    scratch.push(this)
    return failure === 'no-context' ? null : { putImageData: vi.fn() } as unknown as CanvasRenderingContext2D
  })
  vi.stubGlobal('ImageData', class { })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    if (failure === 'throw') throw new Error('Encoder threw')
    if (failure === 'abort') controller.abort(new Error('Context lost'))
    else callback(null)
  })
  const frame = { width: 1, height: 1, rgba: new Uint8ClampedArray([1, 2, 3, 255]) } as NativeFrame
  await expect(encodeNativePng(frame, controller.signal)).rejects.toThrow({ null: 'no PNG', throw: 'Encoder threw', abort: 'Context lost', 'no-context': 'could not be allocated' }[failure])
  expect(scratch[0].width).toBe(0)
  expect(scratch[0].height).toBe(0)
})
