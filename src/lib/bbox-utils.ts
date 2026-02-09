import {
  ROW_SORT_TOLERANCE,
  FULL_IMAGE_AREA_THRESHOLD,
  CONTAINMENT_TOLERANCE,
  MORPH_CLOSE_BASE_KERNEL,
  MORPH_KERNEL_REFERENCE_DIM,
  MORPH_CLOSE_MAX_KERNEL,
} from './constants.ts'

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ImageDims {
  width: number
  height: number
}

/**
 * Round bbox values to integers per PRD Section 6:
 * x, y: Math.floor()
 * w, h: Math.ceil()
 */
export function roundBBox(bbox: BBox): BBox {
  return {
    x: Math.floor(bbox.x),
    y: Math.floor(bbox.y),
    w: Math.ceil(bbox.w),
    h: Math.ceil(bbox.h),
  }
}

/**
 * Filter bboxes by minimum area.
 */
export function filterByMinArea(bboxes: BBox[], minArea: number): BBox[] {
  return bboxes.filter((b) => b.w * b.h >= minArea)
}

/**
 * Sort bboxes top-to-bottom, left-to-right with row grouping.
 * Icons within ROW_SORT_TOLERANCE px vertical distance are same row,
 * then sorted by X within that row.
 */
export function sortBBoxes(bboxes: BBox[]): BBox[] {
  if (bboxes.length === 0) return []

  // First sort by Y to group into rows
  const sorted = [...bboxes].sort((a, b) => a.y - b.y)

  // Group into rows using tolerance
  const rows: BBox[][] = []
  let currentRow: BBox[] = [sorted[0]]
  let rowY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - rowY) <= ROW_SORT_TOLERANCE) {
      currentRow.push(sorted[i])
    } else {
      rows.push(currentRow)
      currentRow = [sorted[i]]
      rowY = sorted[i].y
    }
  }
  rows.push(currentRow)

  // Sort each row by X, then flatten
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x))
}

/**
 * Compute adaptive CLOSE kernel size based on image resolution.
 * At reference size (400x300, geomean=346) → 3. Scales linearly, capped at MORPH_CLOSE_MAX_KERNEL.
 * Always returns an odd number >= MORPH_CLOSE_BASE_KERNEL.
 */
export function computeCloseKernelSize(width: number, height: number): number {
  const geomean = Math.sqrt(width * height)
  const raw = Math.round(MORPH_CLOSE_BASE_KERNEL * (geomean / MORPH_KERNEL_REFERENCE_DIM))
  const clamped = Math.max(MORPH_CLOSE_BASE_KERNEL, Math.min(MORPH_CLOSE_MAX_KERNEL, raw))
  return clamped % 2 === 0 ? clamped + 1 : clamped
}

/**
 * Remove bboxes that cover >= FULL_IMAGE_AREA_THRESHOLD of the total image area.
 */
export function filterFullImage(bboxes: BBox[], imageDims: ImageDims): BBox[] {
  const imageArea = imageDims.width * imageDims.height
  if (imageArea <= 0) return bboxes
  return bboxes.filter((b) => (b.w * b.h) / imageArea < FULL_IMAGE_AREA_THRESHOLD)
}

/**
 * Remove any bbox fully contained inside a strictly larger bbox (with CONTAINMENT_TOLERANCE px tolerance).
 * O(n²) — fine for typical detection counts.
 */
export function filterContained(bboxes: BBox[]): BBox[] {
  if (bboxes.length <= 1) return bboxes
  const tol = CONTAINMENT_TOLERANCE
  return bboxes.filter((a) => {
    const aArea = a.w * a.h
    return !bboxes.some((b) => {
      if (a === b) return false
      const bArea = b.w * b.h
      if (bArea <= aArea) return false
      return (
        a.x >= b.x - tol &&
        a.y >= b.y - tol &&
        a.x + a.w <= b.x + b.w + tol &&
        a.y + a.h <= b.y + b.h + tol
      )
    })
  })
}

/**
 * Full processing pipeline: round → filterByMinArea → filterFullImage → filterContained → sort.
 */
export function processBBoxes(raw: BBox[], minArea: number, imageDims?: ImageDims): BBox[] {
  const rounded = raw.map(roundBBox)
  const filtered = filterByMinArea(rounded, minArea)
  const noFullImage = imageDims ? filterFullImage(filtered, imageDims) : filtered
  const noContained = filterContained(noFullImage)
  return sortBBoxes(noContained)
}
