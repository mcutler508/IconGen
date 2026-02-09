import { describe, it, expect } from 'vitest'
import { computeFitWithinDimensions } from './resize-utils.ts'

describe('computeFitWithinDimensions', () => {
  it('scales landscape image correctly', () => {
    const result = computeFitWithinDimensions(800, 400, 256)
    expect(result.width).toBe(256)
    expect(result.height).toBe(128)
  })

  it('scales portrait image correctly', () => {
    const result = computeFitWithinDimensions(400, 800, 256)
    expect(result.width).toBe(128)
    expect(result.height).toBe(256)
  })

  it('scales square image correctly', () => {
    const result = computeFitWithinDimensions(500, 500, 256)
    expect(result.width).toBe(256)
    expect(result.height).toBe(256)
  })

  it('returns original dims when already smaller', () => {
    const result = computeFitWithinDimensions(100, 50, 256)
    expect(result.width).toBe(100)
    expect(result.height).toBe(50)
  })

  it('returns original dims when exact size', () => {
    const result = computeFitWithinDimensions(256, 128, 256)
    expect(result.width).toBe(256)
    expect(result.height).toBe(128)
  })

  it('preserves aspect ratio', () => {
    const srcW = 1920
    const srcH = 1080
    const result = computeFitWithinDimensions(srcW, srcH, 512)
    const originalRatio = srcW / srcH
    const resultRatio = result.width / result.height
    expect(resultRatio).toBeCloseTo(originalRatio, 1)
  })

  it('longest side equals targetPx for large image', () => {
    const result = computeFitWithinDimensions(1000, 600, 256)
    expect(Math.max(result.width, result.height)).toBe(256)
  })
})
