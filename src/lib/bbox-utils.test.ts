import { describe, it, expect } from 'vitest'
import {
  roundBBox,
  filterByMinArea,
  sortBBoxes,
  processBBoxes,
  filterFullImage,
  filterContained,
  computeCloseKernelSize,
} from './bbox-utils.ts'
import type { BBox, ImageDims } from './bbox-utils.ts'

describe('roundBBox', () => {
  it('floors x and y, ceils w and h', () => {
    expect(roundBBox({ x: 10.7, y: 20.3, w: 64.1, h: 64.9 })).toEqual({
      x: 10,
      y: 20,
      w: 65,
      h: 65,
    })
  })

  it('keeps integer values unchanged', () => {
    expect(roundBBox({ x: 10, y: 20, w: 64, h: 64 })).toEqual({
      x: 10,
      y: 20,
      w: 64,
      h: 64,
    })
  })

  it('handles zero values', () => {
    expect(roundBBox({ x: 0, y: 0, w: 0, h: 0 })).toEqual({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    })
  })

  it('floors x/y down even from .999', () => {
    expect(roundBBox({ x: 5.999, y: 9.999, w: 1.001, h: 1.001 })).toEqual({
      x: 5,
      y: 9,
      w: 2,
      h: 2,
    })
  })

  it('produces integer results', () => {
    const result = roundBBox({ x: 3.14159, y: 2.71828, w: 100.5, h: 200.5 })
    expect(Number.isInteger(result.x)).toBe(true)
    expect(Number.isInteger(result.y)).toBe(true)
    expect(Number.isInteger(result.w)).toBe(true)
    expect(Number.isInteger(result.h)).toBe(true)
  })
})

describe('filterByMinArea', () => {
  const bboxes: BBox[] = [
    { x: 0, y: 0, w: 10, h: 10 },   // area = 100
    { x: 0, y: 0, w: 20, h: 20 },   // area = 400
    { x: 0, y: 0, w: 5, h: 5 },     // area = 25
    { x: 0, y: 0, w: 15, h: 15 },   // area = 225
  ]

  it('filters out bboxes below min area', () => {
    const result = filterByMinArea(bboxes, 200)
    expect(result).toHaveLength(2)
    expect(result[0].w).toBe(20)
    expect(result[1].w).toBe(15)
  })

  it('keeps bboxes exactly at min area', () => {
    const result = filterByMinArea(bboxes, 100)
    expect(result).toHaveLength(3) // 100, 400, 225
  })

  it('returns all when min area is 0', () => {
    expect(filterByMinArea(bboxes, 0)).toHaveLength(4)
  })

  it('returns empty when min area exceeds all', () => {
    expect(filterByMinArea(bboxes, 10000)).toHaveLength(0)
  })

  it('returns empty for empty input', () => {
    expect(filterByMinArea([], 200)).toHaveLength(0)
  })
})

describe('sortBBoxes', () => {
  it('sorts top-to-bottom, left-to-right', () => {
    const bboxes: BBox[] = [
      { x: 200, y: 0, w: 50, h: 50 },   // row 1, col 2
      { x: 0, y: 100, w: 50, h: 50 },   // row 2, col 1
      { x: 0, y: 0, w: 50, h: 50 },     // row 1, col 1
      { x: 200, y: 100, w: 50, h: 50 },  // row 2, col 2
    ]
    const sorted = sortBBoxes(bboxes)
    expect(sorted.map((b) => [b.x, b.y])).toEqual([
      [0, 0],
      [200, 0],
      [0, 100],
      [200, 100],
    ])
  })

  it('groups icons within 10px tolerance into same row', () => {
    const bboxes: BBox[] = [
      { x: 200, y: 5, w: 50, h: 50 },   // row 1 (y=5, within 10px of y=0)
      { x: 0, y: 0, w: 50, h: 50 },     // row 1 (y=0)
      { x: 100, y: 8, w: 50, h: 50 },   // row 1 (y=8, within 10px of y=0)
    ]
    const sorted = sortBBoxes(bboxes)
    // Should all be in same row, sorted by x
    expect(sorted.map((b) => b.x)).toEqual([0, 100, 200])
  })

  it('separates rows beyond 10px tolerance', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 50, w: 50, h: 50 },    // row 2 (y=50, >10px from y=0)
      { x: 0, y: 0, w: 50, h: 50 },     // row 1 (y=0)
    ]
    const sorted = sortBBoxes(bboxes)
    expect(sorted.map((b) => b.y)).toEqual([0, 50])
  })

  it('handles single bbox', () => {
    const result = sortBBoxes([{ x: 10, y: 20, w: 30, h: 40 }])
    expect(result).toEqual([{ x: 10, y: 20, w: 30, h: 40 }])
  })

  it('handles empty array', () => {
    expect(sortBBoxes([])).toEqual([])
  })

  it('is deterministic for same input', () => {
    const bboxes: BBox[] = [
      { x: 200, y: 5, w: 50, h: 50 },
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 100, y: 3, w: 50, h: 50 },
      { x: 50, y: 100, w: 50, h: 50 },
      { x: 150, y: 102, w: 50, h: 50 },
    ]
    const run1 = sortBBoxes(bboxes)
    const run2 = sortBBoxes(bboxes)
    expect(run1).toEqual(run2)
  })
})

describe('processBBoxes (full pipeline)', () => {
  it('rounds, filters, and sorts', () => {
    const raw: BBox[] = [
      { x: 200.7, y: 5.3, w: 50.1, h: 50.1 },  // area ~= 2510, row 1
      { x: 0.1, y: 0.9, w: 3.1, h: 3.1 },       // area ~= 16, should be filtered at 200
      { x: 100.5, y: 3.2, w: 50.1, h: 50.1 },   // area ~= 2510, row 1
      { x: 50.3, y: 100.8, w: 50.1, h: 50.1 },  // area ~= 2510, row 2
    ]
    const result = processBBoxes(raw, 200)
    expect(result).toHaveLength(3)
    // Row 1 sorted by x: x=100, x=200; Row 2: x=50
    expect(result[0].x).toBe(100)
    expect(result[1].x).toBe(200)
    expect(result[2].x).toBe(50)
    // All values are integers
    result.forEach((b) => {
      expect(Number.isInteger(b.x)).toBe(true)
      expect(Number.isInteger(b.y)).toBe(true)
      expect(Number.isInteger(b.w)).toBe(true)
      expect(Number.isInteger(b.h)).toBe(true)
    })
  })

  it('is deterministic', () => {
    const raw: BBox[] = [
      { x: 200, y: 0, w: 64, h: 64 },
      { x: 0, y: 0, w: 64, h: 64 },
      { x: 100, y: 100, w: 64, h: 64 },
      { x: 0, y: 100, w: 64, h: 64 },
    ]
    const r1 = processBBoxes(raw, 200)
    const r2 = processBBoxes(raw, 200)
    expect(r1).toEqual(r2)
  })
})

describe('filterFullImage', () => {
  const dims: ImageDims = { width: 1000, height: 1000 }

  it('removes bbox covering >90% of image area', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 960, h: 960 },   // 921600 / 1000000 = 92.16% → removed
      { x: 10, y: 10, w: 100, h: 100 },  // kept
    ]
    const result = filterFullImage(bboxes, dims)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBe(10)
  })

  it('keeps bbox at exactly 90% (threshold is strictly <)', () => {
    // 900 * 1000 = 900000 / 1000000 = exactly 0.9 → NOT < 0.9 → removed
    const bboxes: BBox[] = [{ x: 0, y: 0, w: 900, h: 1000 }]
    const result = filterFullImage(bboxes, dims)
    expect(result).toHaveLength(0)
  })

  it('keeps bbox just under 90%', () => {
    // 899 * 1000 = 899000 / 1000000 = 89.9% → kept
    const bboxes: BBox[] = [{ x: 0, y: 0, w: 899, h: 1000 }]
    const result = filterFullImage(bboxes, dims)
    expect(result).toHaveLength(1)
  })

  it('keeps small bboxes', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 100, y: 100, w: 50, h: 50 },
    ]
    const result = filterFullImage(bboxes, dims)
    expect(result).toHaveLength(2)
  })

  it('returns empty for empty input', () => {
    expect(filterFullImage([], dims)).toHaveLength(0)
  })

  it('returns all bboxes when image has zero area', () => {
    const bboxes: BBox[] = [{ x: 0, y: 0, w: 100, h: 100 }]
    const result = filterFullImage(bboxes, { width: 0, height: 0 })
    expect(result).toHaveLength(1)
  })
})

describe('filterContained', () => {
  it('removes bbox fully contained inside a larger bbox', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 200, h: 200 },   // large
      { x: 50, y: 50, w: 50, h: 50 },    // contained → removed
    ]
    const result = filterContained(bboxes)
    expect(result).toHaveLength(1)
    expect(result[0].w).toBe(200)
  })

  it('applies 5px tolerance for containment', () => {
    // Inner bbox extends 3px outside outer on left → within 5px tolerance → still contained
    const bboxes: BBox[] = [
      { x: 10, y: 10, w: 200, h: 200 },  // large
      { x: 7, y: 15, w: 50, h: 50 },      // x=7 < outer x=10, but 10-7=3 <= 5 → contained
    ]
    const result = filterContained(bboxes)
    expect(result).toHaveLength(1)
    expect(result[0].w).toBe(200)
  })

  it('keeps bbox with partial overlap (not fully contained)', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 80, y: 80, w: 100, h: 100 },  // overlaps but extends beyond → kept
    ]
    const result = filterContained(bboxes)
    expect(result).toHaveLength(2)
  })

  it('handles nested containment (3 levels)', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 300, h: 300 },    // outermost
      { x: 50, y: 50, w: 200, h: 200 },   // middle → contained in outer
      { x: 100, y: 100, w: 50, h: 50 },   // inner → contained in middle AND outer
    ]
    const result = filterContained(bboxes)
    expect(result).toHaveLength(1)
    expect(result[0].w).toBe(300)
  })

  it('handles single bbox', () => {
    const bboxes: BBox[] = [{ x: 10, y: 20, w: 30, h: 40 }]
    expect(filterContained(bboxes)).toEqual(bboxes)
  })

  it('handles empty array', () => {
    expect(filterContained([])).toEqual([])
  })

  it('does not remove equal-size bboxes at same position', () => {
    // Both have same area → neither is "strictly larger" → both kept
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 0, y: 0, w: 100, h: 100 },
    ]
    const result = filterContained(bboxes)
    expect(result).toHaveLength(2)
  })

  it('keeps non-overlapping bboxes', () => {
    const bboxes: BBox[] = [
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 200, y: 200, w: 50, h: 50 },
    ]
    const result = filterContained(bboxes)
    expect(result).toHaveLength(2)
  })
})

describe('computeCloseKernelSize', () => {
  it('returns 3 at reference resolution (400x300)', () => {
    expect(computeCloseKernelSize(400, 300)).toBe(3)
  })

  it('returns larger kernel for high-res images', () => {
    const size = computeCloseKernelSize(1024, 768)
    expect(size).toBeGreaterThan(3)
  })

  it('always returns an odd number', () => {
    for (const [w, h] of [[400, 300], [800, 600], [1024, 768], [1920, 1080], [2816, 1536]]) {
      expect(computeCloseKernelSize(w, h) % 2).toBe(1)
    }
  })

  it('caps at max kernel size (15)', () => {
    expect(computeCloseKernelSize(2816, 1536)).toBe(15)
    expect(computeCloseKernelSize(5000, 5000)).toBe(15)
  })

  it('returns base kernel (3) for very small images', () => {
    expect(computeCloseKernelSize(100, 100)).toBe(3)
    expect(computeCloseKernelSize(50, 50)).toBe(3)
  })
})

describe('processBBoxes with imageDims', () => {
  it('removes full-image bbox when imageDims provided', () => {
    const dims: ImageDims = { width: 100, height: 100 }
    const raw: BBox[] = [
      { x: 0, y: 0, w: 95, h: 95 },    // 9025/10000 = 90.25% → removed
      { x: 10, y: 10, w: 20, h: 20 },   // kept
    ]
    const result = processBBoxes(raw, 0, dims)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBe(10)
  })

  it('removes contained bboxes', () => {
    const dims: ImageDims = { width: 1000, height: 1000 }
    const raw: BBox[] = [
      { x: 0, y: 0, w: 200, h: 200 },
      { x: 50, y: 50, w: 50, h: 50 },   // contained → removed
      { x: 300, y: 300, w: 50, h: 50 },  // not contained → kept
    ]
    const result = processBBoxes(raw, 0, dims)
    expect(result).toHaveLength(2)
  })

  it('works without imageDims (backward compatible, skips full-image filter)', () => {
    const raw: BBox[] = [
      { x: 0, y: 0, w: 950, h: 950 },    // no imageDims → full-image filter skipped → kept
      { x: 500, y: 500, w: 100, h: 100 }, // not contained (extends beyond 950x950? no, but separate region)
    ]
    // Without imageDims, full-image filter is skipped. The 100x100 bbox IS contained in the 950x950,
    // so containment filter removes it. That's expected — only full-image filter is skipped.
    const result = processBBoxes(raw, 0)
    expect(result).toHaveLength(1)
    expect(result[0].w).toBe(950)
  })

  it('keeps non-overlapping bboxes without imageDims', () => {
    const raw: BBox[] = [
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 200, y: 200, w: 50, h: 50 },
    ]
    const result = processBBoxes(raw, 0)
    expect(result).toHaveLength(2)
  })
})
