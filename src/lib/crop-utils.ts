import type { BBox } from './bbox-utils.ts'
import type { RGBColor, PaddedRegion, BgConfidenceResult } from './crop-types.ts'
import { BG_CONFIDENCE_THRESHOLD, BG_DISTANCE_THRESHOLD } from './constants.ts'

/**
 * Compute a padded region from a bbox, clamped to image bounds.
 */
export function computePaddedRegion(
  bbox: BBox,
  padding: number,
  imgW: number,
  imgH: number,
): PaddedRegion {
  const x = Math.max(0, bbox.x - padding)
  const y = Math.max(0, bbox.y - padding)
  const right = Math.min(imgW, bbox.x + bbox.w + padding)
  const bottom = Math.min(imgH, bbox.y + bbox.h + padding)
  return { x, y, w: right - x, h: bottom - y }
}

/**
 * Estimate background color from border pixels (1px inward on all 4 edges).
 * Returns mean RGB of all border pixels.
 */
export function estimateBgColor(pixels: Uint8ClampedArray, w: number, h: number): RGBColor {
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  const addPixel = (px: number, py: number) => {
    const i = (py * w + px) * 4
    rSum += pixels[i]
    gSum += pixels[i + 1]
    bSum += pixels[i + 2]
    count++
  }

  // Top and bottom edges
  for (let x = 0; x < w; x++) {
    addPixel(x, 0)
    if (h > 1) addPixel(x, h - 1)
  }
  // Left and right edges (excluding corners already counted)
  for (let y = 1; y < h - 1; y++) {
    addPixel(0, y)
    if (w > 1) addPixel(w - 1, y)
  }

  if (count === 0) return { r: 0, g: 0, b: 0 }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  }
}

/**
 * Euclidean RGB distance between two colors.
 */
export function colorDistance(a: RGBColor, b: RGBColor): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

/**
 * Compute confidence that the image has a uniform removable background.
 * confidence = borderBgRatio * overallBgRatio
 */
export function computeBgConfidence(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  bgColor: RGBColor,
  threshold: number = BG_DISTANCE_THRESHOLD,
): BgConfidenceResult {
  let borderTotal = 0
  let borderBg = 0
  let overallTotal = 0
  let overallBg = 0

  const isBg = (px: number, py: number): boolean => {
    const i = (py * w + px) * 4
    const c: RGBColor = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] }
    return colorDistance(c, bgColor) <= threshold
  }

  // Border pixels
  for (let x = 0; x < w; x++) {
    borderTotal++
    if (isBg(x, 0)) borderBg++
    if (h > 1) {
      borderTotal++
      if (isBg(x, h - 1)) borderBg++
    }
  }
  for (let y = 1; y < h - 1; y++) {
    borderTotal++
    if (isBg(0, y)) borderBg++
    if (w > 1) {
      borderTotal++
      if (isBg(w - 1, y)) borderBg++
    }
  }

  // Overall pixels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      overallTotal++
      if (isBg(x, y)) overallBg++
    }
  }

  const borderBgRatio = borderTotal > 0 ? borderBg / borderTotal : 0
  const overallBgRatio = overallTotal > 0 ? overallBg / overallTotal : 0

  return {
    confidence: borderBgRatio * overallBgRatio,
    borderBgRatio,
    overallBgRatio,
  }
}

/**
 * Set alpha=0 for pixels matching the background color (mutates in-place).
 */
export function applyAlphaMask(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  bgColor: RGBColor,
  threshold: number = BG_DISTANCE_THRESHOLD,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const c: RGBColor = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] }
      if (colorDistance(c, bgColor) <= threshold) {
        pixels[i + 3] = 0
      }
    }
  }
}

/**
 * Whether confidence is high enough to auto-remove background.
 */
export function shouldRemoveBg(confidence: number): boolean {
  return confidence >= BG_CONFIDENCE_THRESHOLD
}
