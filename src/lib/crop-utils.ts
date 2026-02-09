import type { BBox } from './bbox-utils.ts'
import type { RGBColor, PaddedRegion, BgConfidenceResult } from './crop-types.ts'
import {
  BG_CONFIDENCE_THRESHOLD,
  BG_DISTANCE_THRESHOLD,
  BG_EDGE_FEATHER_PX,
  BG_BORDER_SAMPLE_INSET_PX,
  BG_MAX_BG_VARIANCE,
} from './constants.ts'

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
 * Estimate background color from border pixels at the given inset.
 * Returns mean RGB of all border pixels sampled at `inset` pixels from edges.
 */
export function estimateBgColor(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  inset: number = BG_BORDER_SAMPLE_INSET_PX,
): RGBColor {
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  // Clamp inset so it doesn't exceed image bounds
  const safeInset = Math.min(inset, Math.floor((Math.min(w, h) - 1) / 2))
  const effectiveInset = Math.max(0, safeInset)

  const addPixel = (px: number, py: number) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return
    const i = (py * w + px) * 4
    rSum += pixels[i]
    gSum += pixels[i + 1]
    bSum += pixels[i + 2]
    count++
  }

  // Top and bottom edges at inset
  for (let x = effectiveInset; x < w - effectiveInset; x++) {
    addPixel(x, effectiveInset)
    if (h > 1 + 2 * effectiveInset) addPixel(x, h - 1 - effectiveInset)
  }
  // Left and right edges at inset (excluding corners already counted)
  for (let y = effectiveInset + 1; y < h - 1 - effectiveInset; y++) {
    addPixel(effectiveInset, y)
    if (w > 1 + 2 * effectiveInset) addPixel(w - 1 - effectiveInset, y)
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
 * Compute standard deviation of colorDistance values across border pixels at the given inset.
 * High variance = non-uniform background.
 */
export function computeBorderVariance(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  bgColor: RGBColor,
  inset: number = BG_BORDER_SAMPLE_INSET_PX,
): number {
  const distances: number[] = []

  const safeInset = Math.min(inset, Math.floor((Math.min(w, h) - 1) / 2))
  const effectiveInset = Math.max(0, safeInset)

  const addDist = (px: number, py: number) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return
    const i = (py * w + px) * 4
    const c: RGBColor = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] }
    distances.push(colorDistance(c, bgColor))
  }

  for (let x = effectiveInset; x < w - effectiveInset; x++) {
    addDist(x, effectiveInset)
    if (h > 1 + 2 * effectiveInset) addDist(x, h - 1 - effectiveInset)
  }
  for (let y = effectiveInset + 1; y < h - 1 - effectiveInset; y++) {
    addDist(effectiveInset, y)
    if (w > 1 + 2 * effectiveInset) addDist(w - 1 - effectiveInset, y)
  }

  if (distances.length === 0) return 0

  const mean = distances.reduce((s, d) => s + d, 0) / distances.length
  const variance = distances.reduce((s, d) => s + (d - mean) ** 2, 0) / distances.length
  return Math.sqrt(variance)
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
 * Whether confidence is high enough to auto-remove background.
 * If borderVariance is provided and exceeds BG_MAX_BG_VARIANCE, returns false.
 */
export function shouldRemoveBg(confidence: number, borderVariance?: number): boolean {
  if (borderVariance !== undefined && borderVariance > BG_MAX_BG_VARIANCE) {
    return false
  }
  return confidence >= BG_CONFIDENCE_THRESHOLD
}

// --- Morphological helpers (pure pixel manipulation, no OpenCV) ---

function erode3x3(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let min = 255
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            min = Math.min(min, mask[ny * w + nx])
          } else {
            min = 0
          }
        }
      }
      out[y * w + x] = min
    }
  }
  return out
}

function dilate3x3(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let max = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            max = Math.max(max, mask[ny * w + nx])
          }
        }
      }
      out[y * w + x] = max
    }
  }
  return out
}

function morphOpen(mask: Uint8Array, w: number, h: number): Uint8Array {
  return dilate3x3(erode3x3(mask, w, h), w, h)
}

function morphClose(mask: Uint8Array, w: number, h: number): Uint8Array {
  return erode3x3(dilate3x3(mask, w, h), w, h)
}

/**
 * Flood-fill from border pixels on binary mask to identify exterior background.
 * Interior alpha=0 regions not connected to border → set to 255 (foreground).
 */
function holeFill(mask: Uint8Array, w: number, h: number): Uint8Array {
  const visited = new Uint8Array(w * h)
  const queue: number[] = []

  // Seed from all border pixels that are background (0)
  for (let x = 0; x < w; x++) {
    if (mask[x] === 0 && !visited[x]) {
      visited[x] = 1
      queue.push(x)
    }
    const bottom = (h - 1) * w + x
    if (mask[bottom] === 0 && !visited[bottom]) {
      visited[bottom] = 1
      queue.push(bottom)
    }
  }
  for (let y = 1; y < h - 1; y++) {
    const left = y * w
    if (mask[left] === 0 && !visited[left]) {
      visited[left] = 1
      queue.push(left)
    }
    const right = y * w + w - 1
    if (mask[right] === 0 && !visited[right]) {
      visited[right] = 1
      queue.push(right)
    }
  }

  // BFS
  while (queue.length > 0) {
    const idx = queue.shift()!
    const x = idx % w
    const y = Math.floor(idx / w)
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ]
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const ni = ny * w + nx
        if (!visited[ni] && mask[ni] === 0) {
          visited[ni] = 1
          queue.push(ni)
        }
      }
    }
  }

  // Any unvisited background pixel is an interior hole → fill it
  const result = new Uint8Array(mask)
  for (let i = 0; i < w * h; i++) {
    if (mask[i] === 0 && !visited[i]) {
      result[i] = 255
    }
  }
  return result
}

/**
 * Edge feathering: box blur on alpha channel at boundary pixels only.
 * A boundary pixel is alpha=0 with a neighbor at alpha=255 (or vice versa).
 */
function edgeFeather(mask: Uint8Array, w: number, h: number, radius: number = BG_EDGE_FEATHER_PX): Uint8Array {
  const result = new Uint8Array(mask)

  // Identify boundary pixels
  const isBoundary = (x: number, y: number): boolean => {
    const val = mask[y * w + x]
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nval = mask[ny * w + nx]
          if ((val === 0 && nval === 255) || (val === 255 && nval === 0)) {
            return true
          }
        }
      }
    }
    return false
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isBoundary(x, y)) continue

      // Box blur around this pixel
      let sum = 0
      let count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += mask[ny * w + nx]
            count++
          }
        }
      }
      result[y * w + x] = Math.round(sum / count)
    }
  }

  return result
}

/**
 * Apply alpha mask with v2 algorithm:
 * 1. Per-pixel color distance → soft alpha
 * 2. Binarize at alpha=128
 * 3. Morphological open (remove noise)
 * 4. Morphological close (fill small gaps)
 * 5. Hole filling (flood-fill from border)
 * 6. Edge feathering (box blur at boundaries only)
 */
export function applyAlphaMask(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  bgColor: RGBColor,
  threshold: number = BG_DISTANCE_THRESHOLD,
): void {
  const size = w * h

  // Step 1: Soft alpha from color distance
  const softAlpha = new Uint8Array(size)
  const softThreshold = threshold * 0.6
  for (let i = 0; i < size; i++) {
    const pi = i * 4
    const c: RGBColor = { r: pixels[pi], g: pixels[pi + 1], b: pixels[pi + 2] }
    const dist = colorDistance(c, bgColor)
    if (dist <= softThreshold) {
      softAlpha[i] = 0
    } else if (dist >= threshold) {
      softAlpha[i] = 255
    } else {
      softAlpha[i] = Math.round(((dist - softThreshold) / (threshold - softThreshold)) * 255)
    }
  }

  // Step 2: Binarize at 128
  const binaryMask = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    binaryMask[i] = softAlpha[i] >= 128 ? 255 : 0
  }

  // Step 3: Morphological open (erode → dilate) — remove small noise
  const opened = morphOpen(binaryMask, w, h)

  // Step 4: Morphological close (dilate → erode) — fill small gaps
  const closed = morphClose(opened, w, h)

  // Step 5: Hole filling
  const filled = holeFill(closed, w, h)

  // Step 6: Edge feathering
  const feathered = edgeFeather(filled, w, h)

  // Apply final alpha
  for (let i = 0; i < size; i++) {
    pixels[i * 4 + 3] = feathered[i]
  }
}
