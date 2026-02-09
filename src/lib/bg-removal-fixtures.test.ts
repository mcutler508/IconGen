import { describe, it, expect } from 'vitest'
import {
  estimateBgColor,
  computeBorderVariance,
  shouldRemoveBg,
  computeBgConfidence,
  applyAlphaMask,
} from './crop-utils.ts'

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

describe('BG removal fixture tests', () => {
  it('white bg + colored square → bg removed, foreground fully opaque', () => {
    // 30x30 white bg, small 6x6 red square in center (high bg ratio)
    const w = 30, h = 30
    const pixels = makePixels(w, h, 255, 255, 255)
    for (let y = 12; y < 18; y++) {
      for (let x = 12; x < 18; x++) {
        setPixel(pixels, w, x, y, 200, 0, 0)
      }
    }

    const bgColor = estimateBgColor(pixels, w, h, 0)
    const variance = computeBorderVariance(pixels, w, h, bgColor, 0)
    const conf = computeBgConfidence(pixels, w, h, bgColor)

    // Border is all white, overall mostly white → high confidence
    expect(conf.confidence).toBeGreaterThanOrEqual(0.85)
    expect(shouldRemoveBg(conf.borderBgRatio, variance)).toBe(true)

    applyAlphaMask(pixels, w, h, bgColor)

    // Background corner should be transparent
    expect(getAlpha(pixels, w, 0, 0)).toBe(0)
    // Foreground center should be fully opaque
    expect(getAlpha(pixels, w, 15, 15)).toBe(255)
  })

  it('off-white bg + colored shape → bg removed, foreground preserved', () => {
    // 30x30 off-white bg, small blue square
    const w = 30, h = 30
    const pixels = makePixels(w, h, 240, 240, 235)
    for (let y = 12; y < 18; y++) {
      for (let x = 12; x < 18; x++) {
        setPixel(pixels, w, x, y, 0, 50, 200)
      }
    }

    const bgColor = estimateBgColor(pixels, w, h, 0)
    const variance = computeBorderVariance(pixels, w, h, bgColor, 0)
    const conf = computeBgConfidence(pixels, w, h, bgColor)

    expect(conf.confidence).toBeGreaterThanOrEqual(0.85)
    expect(shouldRemoveBg(conf.borderBgRatio, variance)).toBe(true)

    applyAlphaMask(pixels, w, h, bgColor)

    expect(getAlpha(pixels, w, 0, 0)).toBe(0)
    expect(getAlpha(pixels, w, 15, 15)).toBe(255)
  })

  it('multi-colored border → bg removal skipped (variance too high)', () => {
    // 20x20 image with diverse border colors
    const w = 20, h = 20
    const pixels = makePixels(w, h, 128, 128, 128)

    // Make border pixels very different colors
    for (let x = 0; x < w; x++) {
      setPixel(pixels, w, x, 0, x * 12, 255 - x * 12, 100)
      setPixel(pixels, w, x, h - 1, 255 - x * 12, x * 12, 50)
    }
    for (let y = 1; y < h - 1; y++) {
      setPixel(pixels, w, 0, y, y * 12, 100, 255 - y * 12)
      setPixel(pixels, w, w - 1, y, 255 - y * 12, y * 12, 100)
    }

    const bgColor = estimateBgColor(pixels, w, h, 0)
    const variance = computeBorderVariance(pixels, w, h, bgColor, 0)

    // Variance should be high due to diverse border
    expect(variance).toBeGreaterThan(30)

    // Should skip removal
    const conf = computeBgConfidence(pixels, w, h, bgColor)
    expect(shouldRemoveBg(conf.borderBgRatio, variance)).toBe(false)
  })

  it('near-white bg with subtle gradient → bg still removed', () => {
    // 30x30 image with gradient from white to near-white, small dark square
    const w = 30, h = 30
    const pixels = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = (x + y) / (w + h - 2)
        const v = Math.round(255 - t * 10) // gradient from 255 to 245
        const i = (y * w + x) * 4
        pixels[i] = v
        pixels[i + 1] = v
        pixels[i + 2] = v
        pixels[i + 3] = 255
      }
    }
    // Small dark square in center
    for (let y = 12; y < 18; y++) {
      for (let x = 12; x < 18; x++) {
        setPixel(pixels, w, x, y, 30, 30, 30)
      }
    }

    const bgColor = estimateBgColor(pixels, w, h, 0)
    const variance = computeBorderVariance(pixels, w, h, bgColor, 0)
    const conf = computeBgConfidence(pixels, w, h, bgColor)

    // Subtle gradient → low variance
    expect(variance).toBeLessThan(30)
    // High bg ratio (mostly white-ish)
    expect(conf.confidence).toBeGreaterThanOrEqual(0.85)
    expect(shouldRemoveBg(conf.borderBgRatio, variance)).toBe(true)

    applyAlphaMask(pixels, w, h, bgColor)
    // bg corners transparent
    expect(getAlpha(pixels, w, 0, 0)).toBe(0)
    // foreground opaque
    expect(getAlpha(pixels, w, 15, 15)).toBe(255)
  })

  it('dark bg + large foreground → bg still removed (borderBgRatio high)', () => {
    // 20x20 dark blue bg, 12x12 red square in center
    const w = 20, h = 20
    const pixels = makePixels(w, h, 20, 30, 80)  // dark blue bg
    for (let y = 4; y < 16; y++) {
      for (let x = 4; x < 16; x++) {
        setPixel(pixels, w, x, y, 200, 0, 0)  // red foreground
      }
    }

    const bgColor = estimateBgColor(pixels, w, h, 0)
    const variance = computeBorderVariance(pixels, w, h, bgColor, 0)
    const conf = computeBgConfidence(pixels, w, h, bgColor)

    // borderBgRatio is high (border is all dark blue)
    expect(conf.borderBgRatio).toBeGreaterThanOrEqual(0.85)
    // overallBgRatio is low (large red foreground)
    expect(conf.overallBgRatio).toBeLessThan(0.85)
    // The old product-based confidence would be too low:
    expect(conf.confidence).toBeLessThan(0.85)
    // But using borderBgRatio, removal should proceed:
    expect(shouldRemoveBg(conf.borderBgRatio, variance)).toBe(true)

    applyAlphaMask(pixels, w, h, bgColor)
    expect(getAlpha(pixels, w, 0, 0)).toBe(0)      // bg corner transparent
    expect(getAlpha(pixels, w, 10, 10)).toBe(255)   // foreground opaque
  })
})
