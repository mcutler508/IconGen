/**
 * Compute dimensions that fit within a target pixel size while preserving aspect ratio.
 * The longest side becomes targetPx. If source already fits, return original dims.
 */
export function computeFitWithinDimensions(
  srcW: number,
  srcH: number,
  targetPx: number,
): { width: number; height: number } {
  const maxSide = Math.max(srcW, srcH)
  if (maxSide <= targetPx) {
    return { width: srcW, height: srcH }
  }
  const scale = targetPx / maxSide
  return {
    width: Math.round(srcW * scale),
    height: Math.round(srcH * scale),
  }
}

/**
 * Resize a data URL image so its longest side equals targetPx (aspect ratio preserved).
 * Uses high-quality image smoothing. Returns a PNG data URL.
 */
export async function resizeDataUrl(
  dataUrl: string,
  targetPx: number,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image for resizing'))
    el.src = dataUrl
  })

  const { width, height } = computeFitWithinDimensions(
    img.naturalWidth,
    img.naturalHeight,
    targetPx,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/png')
}
