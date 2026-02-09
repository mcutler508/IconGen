import type { BBox } from './bbox-utils.ts'
import type { CroppedIcon } from './crop-types.ts'
import {
  computePaddedRegion,
  estimateBgColor,
  computeBgConfidence,
  applyAlphaMask,
  shouldRemoveBg,
} from './crop-utils.ts'

/**
 * Process detected bboxes into cropped icon images.
 * Draws the source image once to an offscreen canvas, then extracts
 * each icon region with optional background removal.
 */
export async function processIcons(
  imageSrc: string,
  bboxes: BBox[],
  padding: number,
  bgRemoval: boolean,
): Promise<CroppedIcon[]> {
  if (bboxes.length === 0) return []

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image for cropping'))
    el.src = imageSrc
  })

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = img.naturalWidth
  srcCanvas.height = img.naturalHeight
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.drawImage(img, 0, 0)

  const imgW = img.naturalWidth
  const imgH = img.naturalHeight

  const results: CroppedIcon[] = []

  for (let i = 0; i < bboxes.length; i++) {
    const bbox = bboxes[i]
    const region = computePaddedRegion(bbox, padding, imgW, imgH)

    const imageData = srcCtx.getImageData(region.x, region.y, region.w, region.h)
    const pixels = imageData.data

    let bgRemoved = false
    let bgConfidence = 0

    if (bgRemoval) {
      const bgColor = estimateBgColor(pixels, region.w, region.h)
      const result = computeBgConfidence(pixels, region.w, region.h, bgColor)
      bgConfidence = result.confidence

      if (shouldRemoveBg(bgConfidence)) {
        applyAlphaMask(pixels, region.w, region.h, bgColor)
        bgRemoved = true
      }
    }

    // Render to a temp canvas for data URL
    const tileCanvas = document.createElement('canvas')
    tileCanvas.width = region.w
    tileCanvas.height = region.h
    const tileCtx = tileCanvas.getContext('2d')!
    tileCtx.putImageData(new ImageData(pixels, region.w, region.h), 0, 0)

    results.push({
      index: i,
      bbox,
      dataUrl: tileCanvas.toDataURL('image/png'),
      width: region.w,
      height: region.h,
      paddingApplied: padding,
      bgRemoved,
      bgConfidence,
    })
  }

  return results
}
