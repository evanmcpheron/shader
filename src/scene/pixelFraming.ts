import { Matrix4, Mesh, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { FramingSettings, SceneSettings, Size2 } from '../domain/settings'
import { resolveFitBox } from '../domain/validation'
import type { FramingReport, PixelBounds } from '../pixels/subjectBounds'
import type { StudioCamera } from './referenceCamera'
import { SCENE_LAYERS } from './subject'

export const MAX_FIT_SAMPLES = 12
export type ProjectedExtents = Readonly<{ minX: number; maxX: number; minY: number; maxY: number; nearCrossing: boolean }>
export type FitSample = Readonly<{ scale: number; phaseX: number; phaseY: number }>

export function projectedVertexExtents(root: Object3D, camera: StudioCamera, canvas: Size2): ProjectedExtents | null {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let nearCrossing = false
  const point = new Vector3()
  root.updateWorldMatrix(true, true)
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh) || !object.layers.isEnabled(SCENE_LAYERS.subject)) return
    const positions = object.geometry.getAttribute('position')
    if (!positions) return
    const index = object.geometry.index
    const start = object.geometry.drawRange.start
    const end = Math.min(index?.count ?? positions.count, start + object.geometry.drawRange.count)
    const modelView = new Matrix4().multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld)
    for (let i = start; i < end; i++) {
      point.fromBufferAttribute(positions, index ? index.getX(i) : i).applyMatrix4(modelView)
      if (-point.z <= camera.near || -point.z >= camera.far) nearCrossing = true
      point.applyMatrix4(camera.projectionMatrix)
      const x = point.x * canvas.width / 2
      const y = -point.y * canvas.height / 2
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  })
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return nearCrossing ? { minX: 0, maxX: 0, minY: 0, maxY: 0, nearCrossing } : null
  return { minX, maxX, minY, maxY, nearCrossing }
}

export function fitScale(extents: ProjectedExtents, box: Size2): number | null {
  const width = extents.maxX - extents.minX
  const height = extents.maxY - extents.minY
  if (extents.nearCrossing || Math.min(width, height) <= Math.max(width, height, 1e-12) * 1e-8) return null
  const scale = Math.min(box.width / width, box.height / height)
  return Number.isFinite(scale) && scale > 0 ? scale : null
}

function leadingMargin(spare: number, alignment: string, leading: string, trailing: string): number {
  return alignment.includes(leading) ? 0 : alignment.includes(trailing) ? spare : Math.floor(spare / 2)
}

export function subjectPlacement(canvas: Size2, framing: FramingSettings, occupied: Size2): { x: number; y: number } {
  const { padding, alignment, offset } = framing.fit
  return {
    x: padding.left + leadingMargin(canvas.width - padding.left - padding.right - occupied.width, alignment, 'left', 'right') + offset.x,
    y: padding.top + leadingMargin(canvas.height - padding.top - padding.bottom - occupied.height, alignment, 'top', 'bottom') + offset.y,
  }
}

export function applyFitProjection(camera: StudioCamera, base: Matrix4, extents: ProjectedExtents, canvas: Size2, scale: number, phaseX: number, phaseY: number): void {
  const centerX = (extents.minX + extents.maxX) / 2
  const centerY = (extents.minY + extents.maxY) / 2
  const crop = new Matrix4().set(
    scale, 0, 0, 2 * (phaseX - centerX * scale) / canvas.width,
    0, scale, 0, -2 * (phaseY - centerY * scale) / canvas.height,
    0, 0, 1, 0,
    0, 0, 0, 1,
  )
  camera.projectionMatrix.multiplyMatrices(crop, base)
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}

export function translateProjection(camera: StudioCamera, canvas: Size2, x: number, y: number): void {
  camera.projectionMatrix.premultiply(new Matrix4().makeTranslation(2 * x / canvas.width, -2 * y / canvas.height, 0))
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}

export function calibrateFit(box: Size2, rasterize: (sample: FitSample) => PixelBounds | null, phase = { x: 0, y: 0 }) {
  let lower = 0.875
  let upper = 1.125
  let sample: FitSample = { scale: 1, phaseX: phase.x, phaseY: phase.y }
  let best = sample
  let bestBounds: PixelBounds | null = null
  let bestScore = Infinity
  let iterations = 0
  let converged = false
  for (; iterations < MAX_FIT_SAMPLES;) {
    const bounds = rasterize(sample)
    iterations++
    const overflow = bounds ? Math.max(0, bounds.width - box.width) + Math.max(0, bounds.height - box.height) : 0
    const slack = bounds ? Math.min(box.width - bounds.width, box.height - bounds.height) : Infinity
    const score = bounds ? overflow * 10000 + Math.abs(slack) : Infinity
    if (score < bestScore) { best = sample; bestBounds = bounds; bestScore = score }
    if (bounds && overflow === 0 && slack === 0) { converged = true; break }
    if (overflow > 0) upper = sample.scale
    else lower = sample.scale
    // Alternate quarter-pixel phases to escape raster plateaus without stretching either axis.
    const shift = [0, 0.25, -0.25][iterations % 3]
    sample = { scale: (lower + upper) / 2, phaseX: phase.x + shift, phaseY: phase.y - shift }
  }
  return { sample: best, bounds: bestBounds, iterations, converged }
}

export function projectedClipping(extents: ProjectedExtents | null, canvas: Size2): boolean {
  return Boolean(extents && (extents.nearCrossing || extents.minX < -canvas.width / 2 - 1e-6 || extents.maxX > canvas.width / 2 + 1e-6 || extents.minY < -canvas.height / 2 - 1e-6 || extents.maxY > canvas.height / 2 + 1e-6))
}

export function frameSubject(subject: Object3D, camera: StudioCamera, settings: Pick<SceneSettings, 'canvas' | 'framing'>, rasterize: () => PixelBounds | null): FramingReport {
  const { size: effective, clamped } = resolveFitBox(settings.canvas, settings.framing)
  const extents = projectedVertexExtents(subject, camera, settings.canvas)
  const scale = extents ? fitScale(extents, effective) : null
  const fit = settings.framing.mode === 'pixel-fit'
  let iterations = 1
  let converged = !fit
  let clipped = projectedClipping(extents, settings.canvas)
  let notice = ''
  let actual: PixelBounds | null
  if (fit && extents && scale !== null) {
    const base = camera.projectionMatrix.clone()
    const calibration = calibrateFit(effective, (sample) => {
      applyFitProjection(camera, base, extents, settings.canvas, scale * sample.scale, sample.phaseX, sample.phaseY)
      return rasterize()
    }, {
      x: (Math.round((extents.maxX - extents.minX) * scale) % 2 - settings.canvas.width % 2) / 2,
      y: (Math.round((extents.maxY - extents.minY) * scale) % 2 - settings.canvas.height % 2) / 2,
    })
    iterations = calibration.iterations
    converged = calibration.converged
    const sample = calibration.sample
    applyFitProjection(camera, base, extents, settings.canvas, scale * sample.scale, sample.phaseX, sample.phaseY)
    const calibrationClipped = projectedClipping(projectedVertexExtents(subject, camera, settings.canvas), settings.canvas)
    if (calibrationClipped) converged = false
    const measured = calibration.bounds
    if (measured) {
      const placement = subjectPlacement(settings.canvas, settings.framing, measured)
      translateProjection(camera, settings.canvas, placement.x - measured.x, placement.y - measured.y)
      clipped = calibrationClipped || placement.x < 0 || placement.y < 0 || placement.x + measured.width > settings.canvas.width || placement.y + measured.height > settings.canvas.height
    } else clipped = calibrationClipped
    actual = rasterize()
    iterations++
    if (!converged) notice = `Fit did not converge within ${calibration.iterations} native samples. Showing the best measured result; try a larger box or manual framing.`
  } else {
    actual = rasterize()
    if (fit) notice = extents?.nearCrossing
      ? 'Fit cannot cross the camera near/far plane. Showing manual framing; move the camera away or switch to manual framing.'
      : 'Fit needs visible geometry with area in both projected axes. Showing manual framing; rotate the subject or switch to manual framing.'
  }
  if (!actual) notice += ' No subject pixels are visible at this resolution.'
  if (clipped) notice += ' Subject extends outside the canvas or camera depth range; measured bounds include only visible pixels.'
  if (fit && clamped) notice += ` Requested box clamped to ${effective.width} × ${effective.height} px within the padded canvas.`
  return {
    mode: fit ? scale === null ? 'manual-fallback' : 'pixel-fit' : 'manual',
    requested: settings.framing.fit.box, effective, actual, clipped, converged, iterations, notice: notice.trim(),
  }
}
