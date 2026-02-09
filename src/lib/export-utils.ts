import JSZip from 'jszip'
import type { CroppedIcon, ExportManifest, ExportedIconMeta } from './crop-types.ts'
// resizeDataUrl is only used by IconDetailModal for single-icon download

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

export function generateFilename(originalIndex: number, totalDetected: number): string {
  const padWidth = String(totalDetected).length
  const padded = String(originalIndex + 1).padStart(padWidth, '0')
  return `icon-${padded}.png`
}

export function buildManifest(
  icons: CroppedIcon[],
  excludedSet: Set<number>,
  sourceName: string,
): ExportManifest {
  const totalDetected = icons.length
  const totalExported = icons.filter((_, i) => !excludedSet.has(i)).length

  const iconsMeta: ExportedIconMeta[] = icons.map((icon, i) => {
    const included = !excludedSet.has(i)
    return {
      filename: generateFilename(icon.index, totalDetected),
      originalIndex: icon.index,
      included,
      bbox: { x: icon.bbox.x, y: icon.bbox.y, w: icon.bbox.w, h: icon.bbox.h },
      croppedSize: { width: icon.width, height: icon.height },
      finalSize: { width: icon.width, height: icon.height },
      paddingApplied: icon.paddingApplied,
      bgRemoved: icon.bgRemoved,
      bgConfidence: icon.bgConfidence,
    }
  })

  return {
    schemaVersion: 1,
    appVersion: '1.1.0',
    exportedAt: new Date().toISOString(),
    sourceFile: sourceName,
    totalDetected,
    totalExported,
    export: {
      sizePx: null,
      mode: 'original',
    },
    icons: iconsMeta,
  }
}

export async function buildZip(
  icons: CroppedIcon[],
  excludedSet: Set<number>,
  sourceName: string = '',
): Promise<Blob> {
  const zip = new JSZip()
  const totalDetected = icons.length

  for (let i = 0; i < icons.length; i++) {
    if (excludedSet.has(i)) continue
    const icon = icons[i]
    const blob = dataUrlToBlob(icon.dataUrl)
    const filename = generateFilename(icon.index, totalDetected)
    zip.file(filename, blob)
  }

  const manifest = buildManifest(icons, excludedSet, sourceName)
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
