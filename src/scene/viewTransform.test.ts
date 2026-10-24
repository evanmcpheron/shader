import { expect, test } from 'vitest'
import { createStudioStore } from '../app/studioStore'
import { anchoredZoom, clientToImage, containsPoint, fitPreviewZoom, imageRectangle, imageToClient, stepPreviewZoom } from './viewTransform'

const size = { width: 96, height: 64 }
const viewport = { left: 261, top: 130, width: 601, height: 405 }

test.each([1, 2, 8, 0.625])('rectangular image at %sx round trips through letterbox, pan and CSS coordinates', (zoom) => {
  const rect = imageRectangle(viewport, size, zoom, { x: 27, y: -39 })
  expect(rect.width).toBe(96 * zoom)
  expect(rect.height).toBe(64 * zoom)
  for (const point of [{ x: 0, y: 0 }, { x: 32.5, y: 16.5 }, { x: 95.999, y: 63.999 }]) {
    const client = imageToClient(point, rect, size)
    expect(clientToImage(client, rect, size).x).toBeCloseTo(point.x, 10)
    expect(clientToImage(client, rect, size).y).toBeCloseTo(point.y, 10)
    expect(containsPoint(rect, client)).toBe(true)
  }
  expect(containsPoint(rect, imageToClient({ x: 96, y: 64 }, rect, size))).toBe(false)
})

test('comparison panels preserve image coordinates, scale and pan despite different client origins', () => {
  const left = imageRectangle({ left: 20, top: 80, width: 300, height: 400 }, size, 2, { x: -17, y: 29 })
  const right = imageRectangle({ left: 320, top: 80, width: 300, height: 400 }, size, 2, { x: -17, y: 29 })
  expect(right.left - left.left).toBe(300)
  const pixel = { x: 32, y: 16 }
  expect(clientToImage(imageToClient(pixel, right, size), right, size)).toEqual(pixel)
  expect(left.top).toBe(right.top)
})

test('zoom steps, fit limits and pointer anchoring are bounded and preserve the pixel under the cursor', () => {
  expect(stepPreviewZoom(1, 1)).toBe(2)
  expect(stepPreviewZoom(8, -1)).toBe(7)
  expect(stepPreviewZoom(0.5, 1)).toBe(1)
  expect(stepPreviewZoom(64, 1)).toBe(64)
  expect(stepPreviewZoom(0.125, -1)).toBe(0.125)
  expect(fitPreviewZoom({ width: 500, height: 400 }, size)).toBe(4)
  const small = fitPreviewZoom({ width: 72, height: 64 }, size)
  expect(small).toBe(0.5)
  const preview = { ...createStudioStore().getState().preview, zoom: 2, pan: { x: 21, y: -17 } }
  const rect = imageRectangle(viewport, size, 2, preview.pan)
  const point = imageToClient({ x: 32.5, y: 16.5 }, rect, size)
  const patch = anchoredZoom(preview, 8, point, rect, size)
  const after = imageRectangle(viewport, size, 8, patch.pan!)
  const mapped = imageToClient({ x: 32.5, y: 16.5 }, after, size)
  expect(Math.abs(mapped.x - point.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(mapped.y - point.y)).toBeLessThanOrEqual(1)
})

test('all navigation, comparison and overlay changes affect only the view revision', () => {
  const store = createStudioStore()
  const before = store.getState()
  for (const patch of [{ zoom: 1 }, { zoom: 2 }, { zoom: 8 }, { pan: { x: 107, y: -23 } }, { grid: true }, { checkerboard: false }, { mode: 'side-by-side' as const }, { mode: 'reference' as const }, { tool: 'preview-pan' as const }]) {
    expect(store.getState().actions.setPreview(patch).ok).toBe(true)
    const current = store.getState()
    expect(current.settings).toBe(before.settings)
    expect(current.revisions).toMatchObject({ settings: 0, capture: 0, style: 0, shadow: 0 })
  }
  expect(store.getState().revisions.view).toBeGreaterThan(0)
})
