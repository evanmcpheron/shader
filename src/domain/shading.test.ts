import { expect, test } from 'vitest'
import { createDefaultSettings } from './defaults'
import { lambertIllumination } from './lighting'
import { adjustShadingSignal, generateShadingRamp, illuminationLuminance, rampCoordinate, rampIndex } from './shading'
import { validateSceneSettings } from './validation'

test('Lambert scalar uses linear illumination luminance, clamps negatives and saturates intense energy', () => {
  const light = { direction: { x: 0, y: 0, z: 1 }, directional: { r: 2, g: 0, b: 0 }, ambient: { r: 0.1, g: 0.1, b: 0.1 } }
  expect(illuminationLuminance(lambertIllumination({ x: 0, y: 0, z: 1 }, light))).toBeCloseTo(0.5252)
  expect(illuminationLuminance(lambertIllumination({ x: 0, y: 0, z: -1 }, light))).toBeCloseTo(0.1)
  expect(illuminationLuminance({ r: 10, g: 10, b: 10 })).toBe(1)
  expect(illuminationLuminance({ r: -1, g: -1, b: -1 })).toBe(0)
})

test('nonuniform ramp coordinates have fixed endpoints, half-integer crossings and higher-index equality', () => {
  const thresholds = [0.1, 0.35, 0.9]
  expect(rampCoordinate(-4, thresholds)).toBe(0)
  expect(rampCoordinate(4, thresholds)).toBe(3)
  expect(rampCoordinate(0.05, thresholds)).toBeCloseTo(0.25)
  expect(rampCoordinate(0.225, thresholds)).toBeCloseTo(1)
  expect(rampCoordinate(0.95, thresholds)).toBeCloseTo(2.75)
  thresholds.forEach((threshold, index) => {
    expect(rampCoordinate(threshold, thresholds)).toBe(index + 0.5)
    expect(rampIndex(threshold, thresholds)).toBe(index + 1)
    expect(rampIndex(threshold - 1e-8, thresholds)).toBe(index)
    expect(rampIndex(threshold + 1e-8, thresholds)).toBe(index + 1)
  })
  expect([-1, 0, 0.5, 1, 10].map((value) => rampCoordinate(value, []))).toEqual([0, 0, 0, 0, 0])
  expect([-1, 0, 1, 10].map((value) => rampIndex(value, [0.7]))).toEqual([0, 0, 1, 1])
})

test('signal order is initial saturation, centered contrast, brightness, saturation, then exponent', () => {
  const controls = { contrast: 2, brightness: 0.1, distribution: 2 }
  expect(adjustShadingSignal(0.4, controls)).toBeCloseTo(0.16)
  expect(adjustShadingSignal(4, { ...controls, contrast: 0.5, brightness: -0.25, distribution: 1 })).toBe(0.5)
  expect(adjustShadingSignal(0, { ...controls, contrast: 1, brightness: -1 })).toBe(0)
  expect(adjustShadingSignal(1, controls)).toBe(1)
  expect(adjustShadingSignal(0.25, { contrast: 1, brightness: 0, distribution: 0.5 })).toBe(0.5)
})

test.each([[0, 0.5, 0.8], [0.2, 0.2, 0.8], [0.2, 0.1, 0.8], [0.2, 0.5, 1], [NaN, 0.5, 0.8], [0.2, 0.5]])('invalid boundary state %j is rejected', (...thresholds) => {
  const settings = createDefaultSettings()
  expect(validateSceneSettings({ ...settings, shading: { ...settings.shading, tone: { kind: 'bands', thresholds } } }).ok).toBe(false)
})

test('generated ramps retain exact endpoints and artist order, interpolate linear RGB, and define one/two levels', () => {
  const colors = { shadowColor: '#FFFFFF', baseColor: '#000000', highlightColor: '#FF0000' } as const
  expect(generateShadingRamp(1, colors)).toEqual(['#000000'])
  expect(generateShadingRamp(2, colors)).toEqual(['#FFFFFF', '#FF0000'])
  expect(generateShadingRamp(5, colors)).toEqual(['#FFFFFF', '#BCBCBC', '#000000', '#BC0000', '#FF0000'])
  const ramp = generateShadingRamp(32, createDefaultSettings().shading)
  expect(ramp).toHaveLength(32)
  expect(ramp[0]).toBe('#172038')
  expect(ramp[31]).toBe('#B8D8F0')
})
