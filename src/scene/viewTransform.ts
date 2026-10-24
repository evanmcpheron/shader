import { LIMITS } from '../domain/constraints'
import type { PreviewState } from '../app/studioStore'
import type { Size2 } from '../domain/settings'
import type { ViewRect } from './lightHandle'

export type Point2 = Readonly<{ x: number; y: number }>

export function imageRectangle(viewport: ViewRect, size: Size2, zoom: number, pan: Point2): ViewRect {
  const width = size.width * zoom
  const height = size.height * zoom
  return {
    left: Math.round(viewport.left + (viewport.width - width) / 2) + pan.x,
    top: Math.round(viewport.top + (viewport.height - height) / 2) + pan.y,
    width, height,
  }
}

export function clientToImage(point: Point2, rect: ViewRect, size: Size2): Point2 {
  return { x: (point.x - rect.left) * size.width / rect.width, y: (point.y - rect.top) * size.height / rect.height }
}

export function imageToClient(point: Point2, rect: ViewRect, size: Size2): Point2 {
  return { x: rect.left + point.x * rect.width / size.width, y: rect.top + point.y * rect.height / size.height }
}

export function containsPoint(rect: ViewRect, point: Point2): boolean {
  return point.x >= rect.left && point.y >= rect.top && point.x < rect.left + rect.width && point.y < rect.top + rect.height
}

export function clampPreviewZoom(zoom: number): number {
  return Math.max(LIMITS.previewZoom.min, Math.min(LIMITS.previewZoom.max, zoom))
}

export function stepPreviewZoom(zoom: number, direction: number): number {
  const next = direction > 0 ? Math.floor(zoom) + 1 : Math.ceil(zoom) - 1
  return clampPreviewZoom(next)
}

export function fitPreviewZoom(viewport: Size2, size: Size2): number {
  const available = Math.min(Math.max(1, viewport.width - 24) / size.width, Math.max(1, viewport.height - 24) / size.height)
  return clampPreviewZoom(available >= 1 ? Math.floor(available) : available)
}

export function anchoredZoom(preview: PreviewState, zoom: number, point: Point2, rect: ViewRect, size: Size2): Partial<PreviewState> {
  const image = clientToImage(point, rect, size)
  const ratio = zoom / preview.zoom
  const bound = (value: number) => Math.max(LIMITS.previewPan.min, Math.min(LIMITS.previewPan.max, Math.round(value)))
  return {
    zoom,
    pan: {
      x: bound(preview.pan.x + (size.width / 2 - image.x) * preview.zoom * (ratio - 1)),
      y: bound(preview.pan.y + (size.height / 2 - image.y) * preview.zoom * (ratio - 1)),
    },
  }
}
