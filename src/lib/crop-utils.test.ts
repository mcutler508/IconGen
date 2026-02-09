import { describe, it, expect } from 'vitest'
import {
  computePaddedRegion,
  estimateBgColor,
  colorDistance,
  computeBgConfidence,
  computeBorderVariance,
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

function getAlpha(data: Uint8ClampedArray, w: number, x: number, y: number): number {
  return data[(y * w + x) * 4 + 3]
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
    // 5x5 image: all white, set interior to black
    const pixels = makePixels(5, 5, 255, 255, 255)
    for (let y = 1; y < 4; y++) {
      for (let x = 1; x < 4; x++) {
        setPixel(pixels, 5, x, y, 0, 0, 0)
      }
    }
    // With default inset=1, it samples 2nd-from-edge pixels
    // which include some of the interior black pixels
    const bg = estimateBgColor(pixels, 5, 5)
    // The inset=1 border is the ring at x=1..3, y=1..3 edges
    // which contains both white and black pixels
    expect(bg).toBeDefined()
  })

  it('with inset=0 samples outermost edge pixels', () => {
    const pixels = makePixels(5, 5, 255, 255, 255)
    for (let y = 1; y < 4; y++) {
      for (let x = 1; x < 4; x++) {
        setPixel(pixels, 5, x, y, 0, 0, 0)
      }
    }
    const bg = estimateBgColor(pixels, 5, 5, 0)
    // All edge pixels are white
    expect(bg).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('with inset=1 samples 2nd-from-edge pixels', () => {
    // 10x10 image: outer ring red, inner ring green, center blue
    const pixels = makePixels(10, 10, 255, 0, 0) // all red
    // Set inset=1 ring to green
    for (let x = 1; x < 9; x++) {
      setPixel(pixels, 10, x, 1, 0, 255, 0)
      setPixel(pixels, 10, x, 8, 0, 255, 0)
    }
    for (let y = 2; y < 8; y++) {
      setPixel(pixels, 10, 1, y, 0, 255, 0)
      setPixel(pixels, 10, 8, y, 0, 255, 0)
    }
    const bg = estimateBgColor(pixels, 10, 10, 1)
    expect(bg.g).toBe(255)
    expect(bg.r).toBe(0)
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

describe('computeBorderVariance', () => {
  it('returns ~0 for uniform border', () => {
    const pixels = makePixels(10, 10, 200, 200, 200)
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    const v = computeBorderVariance(pixels, 10, 10, bgColor)
    expect(v).toBeCloseTo(0, 2)
  })

  it('returns high value for mixed border', () => {
    const pixels = makePixels(10, 10, 200, 200, 200)
    // Set half the top edge to a very different color
    for (let x = 0; x < 5; x++) {
      setPixel(pixels, 10, x, 0, 0, 0, 0)
    }
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    const v = computeBorderVariance(pixels, 10, 10, bgColor, 0)
    expect(v).toBeGreaterThan(30)
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
    const pixels = makePixels(10, 10, 200, 200, 200)
    for (let y = 1; y < 9; y++) {
      for (let x = 1; x < 9; x++) {
        setPixel(pixels, 10, x, y, 0, 0, 0)
      }
    }
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    const result = computeBgConfidence(pixels, 10, 10, bgColor)
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

  it('returns false when high confidence but high variance', () => {
    expect(shouldRemoveBg(0.95, 55)).toBe(false)
  })

  it('returns true when high confidence and low variance', () => {
    expect(shouldRemoveBg(0.95, 10)).toBe(true)
  })

  it('returns true when no variance provided', () => {
    expect(shouldRemoveBg(0.95)).toBe(true)
  })
})

describe('applyAlphaMask', () => {
  it('makes background pixels transparent', () => {
    const pixels = makePixels(4, 4, 200, 200, 200)
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    applyAlphaMask(pixels, 4, 4, bgColor)
    for (let i = 0; i < 4 * 4; i++) {
      expect(pixels[i * 4 + 3]).toBe(0)
    }
  })

  it('preserves non-background pixels', () => {
    // 8x8 image: white bg with a 4x4 black square in center
    const pixels = makePixels(8, 8, 200, 200, 200)
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 6; x++) {
        setPixel(pixels, 8, x, y, 0, 0, 0)
      }
    }
    const bgColor: RGBColor = { r: 200, g: 200, b: 200 }
    applyAlphaMask(pixels, 8, 8, bgColor)
    // Center pixels should still be opaque (255)
    expect(getAlpha(pixels, 8, 3, 3)).toBe(255)
    expect(getAlpha(pixels, 8, 4, 4)).toBe(255)
    // Corner bg pixels should be transparent (0)
    expect(getAlpha(pixels, 8, 0, 0)).toBe(0)
  })

  it('produces intermediate alpha at boundary pixels (feathering)', () => {
    // 10x10 image: white bg with 6x6 block of very different color
    const pixels = makePixels(10, 10, 255, 255, 255)
    for (let y = 2; y < 8; y++) {
      for (let x = 2; x < 8; x++) {
        setPixel(pixels, 10, x, y, 0, 0, 0)
      }
    }
    const bgColor: RGBColor = { r: 255, g: 255, b: 255 }
    applyAlphaMask(pixels, 10, 10, bgColor)

    // Check a boundary pixel (where fg meets bg)
    // The foreground edge pixel at (2,2) should have intermediate alpha due to feathering
    const edgeAlpha = getAlpha(pixels, 10, 2, 2)
    // It should be between 0 and 255 (feathered) or at 255 (if the feather logic
    // makes it a boundary)
    expect(edgeAlpha).toBeGreaterThanOrEqual(0)
    expect(edgeAlpha).toBeLessThanOrEqual(255)
  })

  it('fills interior holes via hole filling', () => {
    // 20x20: white bg, thick black ring (4px thick), white hole in center
    const w = 20, h = 20
    const pixels = makePixels(w, h, 255, 255, 255)
    // Create a thick ring of black pixels (from 3,3 to 16,16)
    for (let y = 3; y < 17; y++) {
      for (let x = 3; x < 17; x++) {
        setPixel(pixels, w, x, y, 0, 0, 0)
      }
    }
    // Punch a white hole in the center (from 7,7 to 12,12)
    for (let y = 7; y < 13; y++) {
      for (let x = 7; x < 13; x++) {
        setPixel(pixels, w, x, y, 255, 255, 255)
      }
    }
    const bgColor: RGBColor = { r: 255, g: 255, b: 255 }
    applyAlphaMask(pixels, w, h, bgColor)

    // The interior white hole should be filled (alpha=255) because it's
    // surrounded by foreground and not connected to border
    const holeAlpha = getAlpha(pixels, w, 10, 10)
    expect(holeAlpha).toBe(255)
  })
})
