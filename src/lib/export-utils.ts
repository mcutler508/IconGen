import JSZip from 'jszip'
import type { CroppedIcon } from './crop-types.ts'

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

export function generateFilename(index: number, total: number): string {
  const padWidth = String(total).length
  const padded = String(index + 1).padStart(padWidth, '0')
  return `icon-${padded}.png`
}

export async function buildZip(
  icons: CroppedIcon[],
  excludedSet: Set<number>,
): Promise<Blob> {
  const zip = new JSZip()
  const included = icons.filter((_, i) => !excludedSet.has(i))

  for (let i = 0; i < included.length; i++) {
    const blob = dataUrlToBlob(included[i].dataUrl)
    const filename = generateFilename(i, included.length)
    zip.file(filename, blob)
  }

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
