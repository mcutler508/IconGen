import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataUrlToBlob, generateFilename, buildZip, buildManifest } from './export-utils.ts'
import type { CroppedIcon } from './crop-types.ts'
import JSZip from 'jszip'

// 1x1 red PNG as a base64 data URL
const RED_PIXEL_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

// Mock resizeDataUrl (no longer used in bulk export, but kept for import validation)
vi.mock('./resize-utils.ts', () => ({
  resizeDataUrl: vi.fn(async (dataUrl: string) => dataUrl),
  computeFitWithinDimensions: vi.fn((srcW: number, srcH: number, targetPx: number) => {
    const maxSide = Math.max(srcW, srcH)
    if (maxSide <= targetPx) return { width: srcW, height: srcH }
    const scale = targetPx / maxSide
    return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) }
  }),
}))

function makeCroppedIcon(index: number, width = 1, height = 1): CroppedIcon {
  return {
    index,
    bbox: { x: index * 10, y: 0, w: width, h: height },
    dataUrl: RED_PIXEL_DATA_URL,
    width,
    height,
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
  it('uses original index (0-based internally, 1-based in filename)', () => {
    expect(generateFilename(0, 5)).toBe('icon-1.png')
    expect(generateFilename(4, 5)).toBe('icon-5.png')
  })

  it('pads based on totalDetected for double digits', () => {
    expect(generateFilename(0, 12)).toBe('icon-01.png')
    expect(generateFilename(11, 12)).toBe('icon-12.png')
  })

  it('pads based on totalDetected for triple digits', () => {
    expect(generateFilename(2, 127)).toBe('icon-003.png')
    expect(generateFilename(49, 127)).toBe('icon-050.png')
  })

  it('pads based on totalDetected, not totalExported', () => {
    // 1000 detected: pad to 4 digits
    expect(generateFilename(0, 1000)).toBe('icon-0001.png')
    expect(generateFilename(999, 1000)).toBe('icon-1000.png')
  })
})

describe('buildZip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes only selected icons with original-index filenames', async () => {
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1), makeCroppedIcon(2)]
    const excluded = new Set([1])
    const blob = await buildZip(icons, excluded, 'test.png')

    const zip = await JSZip.loadAsync(blob)
    const files = Object.keys(zip.files).filter(f => f.endsWith('.png'))
    expect(files).toHaveLength(2)
    expect(files).toContain('icon-1.png')
    expect(files).toContain('icon-3.png')
    expect(files).not.toContain('icon-2.png')
  })

  it('includes manifest.json', async () => {
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1)]
    const blob = await buildZip(icons, new Set(), 'test.png')

    const zip = await JSZip.loadAsync(blob)
    expect(zip.files['manifest.json']).toBeDefined()
  })

  it('does not resize icons in bulk export', async () => {
    const { resizeDataUrl } = await import('./resize-utils.ts')
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1), makeCroppedIcon(2)]
    const excluded = new Set([1])
    await buildZip(icons, excluded, 'test.png')

    expect(resizeDataUrl).not.toHaveBeenCalled()
  })

  it('returns empty ZIP (with manifest only) when all excluded', async () => {
    const icons = [makeCroppedIcon(0)]
    const excluded = new Set([0])
    const blob = await buildZip(icons, excluded, 'test.png')

    const zip = await JSZip.loadAsync(blob)
    const pngs = Object.keys(zip.files).filter(f => f.endsWith('.png'))
    expect(pngs).toHaveLength(0)
    expect(zip.files['manifest.json']).toBeDefined()
  })
})

describe('buildManifest', () => {
  it('has correct schema fields', () => {
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1), makeCroppedIcon(2)]
    const excluded = new Set([1])
    const manifest = buildManifest(icons, excluded, 'source.png')

    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.appVersion).toBe('1.1.0')
    expect(manifest.sourceFile).toBe('source.png')
    expect(manifest.totalDetected).toBe(3)
    expect(manifest.totalExported).toBe(2)
    expect(manifest.export.sizePx).toBeNull()
    expect(manifest.export.mode).toBe('original')
    expect(manifest.exportedAt).toBeDefined()
  })

  it('lists all icons with included flags', () => {
    const icons = [makeCroppedIcon(0), makeCroppedIcon(1), makeCroppedIcon(2)]
    const excluded = new Set([1])
    const manifest = buildManifest(icons, excluded, 'test.png')

    expect(manifest.icons).toHaveLength(3)
    expect(manifest.icons[0].included).toBe(true)
    expect(manifest.icons[1].included).toBe(false)
    expect(manifest.icons[2].included).toBe(true)
  })

  it('includes per-icon metadata', () => {
    const icons = [makeCroppedIcon(0, 800, 400)]
    const manifest = buildManifest(icons, new Set(), 'test.png')
    const iconMeta = manifest.icons[0]

    expect(iconMeta.filename).toBe('icon-1.png')
    expect(iconMeta.originalIndex).toBe(0)
    expect(iconMeta.croppedSize).toEqual({ width: 800, height: 400 })
    expect(iconMeta.finalSize).toEqual({ width: 800, height: 400 })
    expect(iconMeta.bbox).toBeDefined()
    expect(iconMeta.paddingApplied).toBe(0)
    expect(typeof iconMeta.bgRemoved).toBe('boolean')
    expect(typeof iconMeta.bgConfidence).toBe('number')
  })
})
