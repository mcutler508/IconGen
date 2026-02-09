import { describe, it, expect } from 'vitest'
import {
  computePaddedRegion,
  estimateBgColor,
  colorDistance,
  computeBgConfidence,
  shouldRemoveBg,
  applyAlphaMask,
} from './crop-utils.ts'
import type { RGBColor } from './crop-types.ts'

// Helper: create uniform-color pixel data
function makePixels(w: number, h: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return data
}

// Helper: set a single pixel
function setPixel(data: Uint8ClampedArray, w: number, x: number, y: number, r: number, g: number, b: number, a = 255) {
  const i = (y * w + x) * 4
  data[i] = r
  data[i + 1] = g
  data[i + 2] = b
  data[i + 3] = a
}

describe('computePaddedRegion', () => {
  it('adds padding within image bounds', () => {
    const region = computePaddedRegion({ x: 50, y: 50, w: 100, h: 100 }, 4, 400, 300)
    expect(region).toEqual({ x: 46, y: 46, w: 108, h: 108 })
  })

  it('clamps to left/top edges', () => {
    const region = computePaddedRegion({ x: 2, y: 1, w: 50, h: 50 }, 10, 400, 300)
    expect(region.x).toBe(0)
    expect(region.y).toBe(0)
  })

  it('clamps to right/bottom edges', () => {
    const region = computePaddedRegion({ x: 380, y: 280, w: 20, h: 20 }, 10, 400, 300)
    expect(region.x).toBe(370)
    expect(region.y).toBe(270)
    expect(region.x + region.w).toBeLessThanOrEqual(400)
    expect(region.y + region.h).toBeLessThanOrEqual(300)
  })

  it('handles zero padding', () => {
    const region = computePaddedRegion({ x: 10, y: 20, w: 30, h: 40 }, 0, 100, 100)
    expect(region).toEqual({ x: 10, y: 20, w: 30, h: 40 })
  })

  it('handles bbox at image edge', () => {
    const region = computePaddedRegion({ x: 0, y: 0, w: 400, h: 300 }, 4, 400, 300)
    expect(region).toEqual({ x: 0, y: 0, w: 400, h: 300 })
  })
})

describe('estimateBgColor', () => {
  it('returns uniform color for uniform image', () => {
    const pixels = makePixels(10, 10, 200, 100, 50)
    const bg = estimateBgColor(pixels, 10, 10)
    expect(bg).toEqual({ r: 200, g: 100, b: 50 })
  })

  it('ignores interior pixels', () => {
    // 5x5 image: border is white, interior is black
    const pixels = makePixels(5, 5, 255, 255, 255)
    // Set interior (3x3 center) to black
    for (let y = 1; y < 4; y++) {
      for (let x = 1; x < 4; x++) {
        setPixel(pixels, 5, x, y, 0, 0, 0)
      }
    }
    const bg = estimateBgColor(pixels, 5, 5)
    // All border pixels are white, so bg should be white
    expect(bg).toEqual({ r: 255, g: 255, b: 255 })
  })
})

describe('colorDistance', () => {
  it('returns 0 for identical colors', () => {
    expect(colorDistance({ r: 128, g: 64, b: 32 }, { r: 128, g: 64, b: 32 })).toBe(0)
  })

  it('returns known distance for black vs white', () => {
    const d = colorDistance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })
    expect(d).toBeCloseTo(Math.sqrt(3 * 255 * 255), 5)
  })

  it('returns correct distance for single-channel difference', () => {
    const d = colorDistance({ r: 100, g: 0, b: 0 }, { r: 200, g: 0, b: 0 })
    expect(d).toBe(100)
  })
})

describe('computeBgConfidence', () => {
  it('returns high confidence for uniform background', () => {
    const pixels = makePixels(10, 10, 200, 200, 200)
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    const result = computeBgConfidence(pixels, 10, 10, bgColor)
    expect(result.confidence).toBeCloseTo(1.0, 2)
    expect(result.borderBgRatio).toBeCloseTo(1.0, 2)
    expect(result.overallBgRatio).toBeCloseTo(1.0, 2)
  })

  it('returns low confidence for icon-heavy image', () => {
    // Make an image where interior is very different from border
    const pixels = makePixels(10, 10, 200, 200, 200)
    // Fill interior with drastically different color
    for (let y = 1; y < 9; y++) {
      for (let x = 1; x < 9; x++) {
        setPixel(pixels, 10, x, y, 0, 0, 0)
      }
    }
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    const result = computeBgConfidence(pixels, 10, 10, bgColor)
    // overallBgRatio will be low because most pixels are black
    expect(result.confidence).toBeLessThan(0.85)
  })
})

describe('shouldRemoveBg', () => {
  it('returns true at threshold', () => {
    expect(shouldRemoveBg(0.85)).toBe(true)
  })

  it('returns true above threshold', () => {
    expect(shouldRemoveBg(0.95)).toBe(true)
  })

  it('returns false below threshold', () => {
    expect(shouldRemoveBg(0.84)).toBe(false)
  })
})

describe('applyAlphaMask', () => {
  it('makes background pixels transparent', () => {
    const pixels = makePixels(4, 4, 200, 200, 200)
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    applyAlphaMask(pixels, 4, 4, bgColor)
    // All pixels should now be transparent
    for (let i = 0; i < 4 * 4; i++) {
      expect(pixels[i * 4 + 3]).toBe(0)
    }
  })

  it('preserves non-background pixels', () => {
    const pixels = makePixels(4, 4, 200, 200, 200)
    // Set one pixel to a very different color
    setPixel(pixels, 4, 2, 2, 0, 0, 0)
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    applyAlphaMask(pixels, 4, 4, bgColor)
    // The different pixel should still be opaque
    const idx = (2 * 4 + 2) * 4
    expect(pixels[idx + 3]).toBe(255)
    // Background pixels should be transparent
    expect(pixels[3]).toBe(0)
  })
})
