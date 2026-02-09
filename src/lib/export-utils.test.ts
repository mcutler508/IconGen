import { describe, it, expect } from 'vitest'
import { dataUrlToBlob, generateFilename, buildZip } from './export-utils.ts'
import type { CroppedIcon } from './crop-types.ts'
import JSZip from 'jszip'

// 1x1 red PNG as a base64 data URL
const RED_PIXEL_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

function makeCroppedIcon(index: number): CroppedIcon {
  return {
    index,
    bbox: { x: 0, y: 0, w: 1, h: 1 },
    dataUrl: RED_PIXEL_DATA_URL,
    width: 1,
    height: 1,
    paddingApplied: 0,
    bgRemoved: false,
    bgConfidence: 0,
  }
}

describe('dataUrlToBlob', () => {
  it('returns a Blob with correct MIME type', () => {
    const blob = dataUrlToBlob(RED_PIXEL_DATA_URL)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('returns a Blob with non-zero size', () => {
    const blob = dataUrlToBlob(RED_PIXEL_DATA_URL)
    expect(blob.size).toBeGreaterThan(0)
  })
})

describe('generateFilename', () => {
  it('pads correctly for single-digit total', () => {
    expect(generateFilename(0, 5)).toBe('icon-1.png')
    expect(generateFilename(4, 5)).toBe('icon-5.png')
  })

  it('pads correctly for double-digit total', () => {
    expect(generateFilename(0, 12)).toBe('icon-01.png')
    expect(generateFilename(11, 12)).toBe('icon-12.png')
  })

  it('pads correctly for triple-digit total', () => {
    expect(generateFilename(0, 100)).toBe('icon-001.png')
    expect(generateFilename(99, 100)).toBe('icon-100.png')
  })
})

describe('buildZip', () => {
  it('returns a valid ZIP blob', async () => {
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1)]
    const blob = await buildZip(icons, new Set())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)

    // Verify it's a valid ZIP by loading it
    const zip = await JSZip.loadAsync(blob)
    const files = Object.keys(zip.files)
    expect(files).toHaveLength(2)
    expect(files).toContain('icon-1.png')
    expect(files).toContain('icon-2.png')
  })

  it('respects exclusions', async () => {
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1), makeCroppedIcon(2)]
    const excluded = new Set([1])
    const blob = await buildZip(icons, excluded)

    const zip = await JSZip.loadAsync(blob)
    const files = Object.keys(zip.files)
    expect(files).toHaveLength(2)
    expect(files).toContain('icon-1.png')
    expect(files).toContain('icon-2.png')
  })

  it('returns empty ZIP when all excluded', async () => {
    const icons = [makeCroppedIcon(0)]
    const excluded = new Set([0])
    const blob = await buildZip(icons, excluded)

    const zip = await JSZip.loadAsync(blob)
    expect(Object.keys(zip.files)).toHaveLength(0)
  })
})
