/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadOpenCV } from './opencv-loader.ts'
import { processBBoxes, computeCloseKernelSize } from './bbox-utils.ts'
import type { BBox, ImageDims } from './bbox-utils.ts'
import { MAX_DETECTIONS_WARNING, MORPH_OPEN_KERNEL } from './constants.ts'

export interface DetectionResult {
  bboxes: BBox[]
  usedFallback: boolean
}

/**
 * Derive adaptive threshold parameters from sensitivity (0–255).
 * Block size must be odd and >= 3.
 */
function deriveThresholdParams(sensitivity: number): { blockSize: number; C: number } {
  const rawBlock = Math.round(3 + ((255 - sensitivity) / 255) * 48)
  const blockSize = rawBlock % 2 === 0 ? rawBlock + 1 : rawBlock
  const C = Math.round(2 + ((255 - sensitivity) / 255) * 18)
  return { blockSize: Math.max(3, blockSize), C }
}

/**
 * Primary detection: adaptiveThreshold → morphology → connectedComponents.
 */
function primaryDetection(cv: any, src: any, sensitivity: number, imageDims: ImageDims, blur: number, mergeGap: number): BBox[] {
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const thresh = new cv.Mat()
  const morphed = new cv.Mat()
  const labels = new cv.Mat()
  const stats = new cv.Mat()
  const centroids = new cv.Mat()

  // Ensure blur kernel is odd and >= 1
  const blurSize = Math.max(1, blur % 2 === 0 ? blur + 1 : blur)

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(blurSize, blurSize), 0)

    const { blockSize, C } = deriveThresholdParams(sensitivity)
    cv.adaptiveThreshold(
      blurred, thresh, 255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      blockSize, C
    )

    // mergeGap 0 = auto-compute from resolution; > 0 = user override (must be odd)
    const closeSize = mergeGap > 0
      ? (mergeGap % 2 === 0 ? mergeGap + 1 : mergeGap)
      : computeCloseKernelSize(imageDims.width, imageDims.height)
    const closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(closeSize, closeSize))
    cv.morphologyEx(thresh, morphed, cv.MORPH_CLOSE, closeKernel)
    closeKernel.delete()

    const openKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(MORPH_OPEN_KERNEL, MORPH_OPEN_KERNEL))
    cv.morphologyEx(morphed, morphed, cv.MORPH_OPEN, openKernel)
    openKernel.delete()

    const numLabels = cv.connectedComponentsWithStats(morphed, labels, stats, centroids)

    const bboxes: BBox[] = []
    for (let i = 1; i < numLabels; i++) {
      bboxes.push({
        x: stats.intAt(i, cv.CC_STAT_LEFT),
        y: stats.intAt(i, cv.CC_STAT_TOP),
        w: stats.intAt(i, cv.CC_STAT_WIDTH),
        h: stats.intAt(i, cv.CC_STAT_HEIGHT),
      })
    }

    return bboxes
  } finally {
    gray.delete()
    blurred.delete()
    thresh.delete()
    morphed.delete()
    labels.delete()
    stats.delete()
    centroids.delete()
  }
}

/**
 * Fallback detection: Canny → dilate/close → contours.
 */
function fallbackDetection(cv: any, src: any): BBox[] {
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const dilated = new cv.Mat()
  const morphed = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.Canny(gray, edges, 50, 150)

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
    cv.dilate(edges, dilated, kernel)
    cv.morphologyEx(dilated, morphed, cv.MORPH_CLOSE, kernel)
    kernel.delete()

    cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const bboxes: BBox[] = []
    for (let i = 0; i < contours.size(); i++) {
      const rect = cv.boundingRect(contours.get(i))
      bboxes.push({
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
      })
    }

    return bboxes
  } finally {
    gray.delete()
    edges.delete()
    dilated.delete()
    morphed.delete()
    contours.delete()
    hierarchy.delete()
  }
}

/**
 * Load an HTMLImageElement into an OpenCV Mat.
 */
function imageToMat(cv: any, img: HTMLImageElement): any {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return cv.matFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
}

/**
 * Main detection entry point. Runs primary path, falls back if needed.
 */
export async function detectIcons(
  imageSrc: string,
  sensitivity: number,
  minArea: number,
  blur: number = 5,
  mergeGap: number = 0,
): Promise<DetectionResult> {
  const cv = await loadOpenCV()

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image for detection'))
    el.src = imageSrc
  })
  const src = imageToMat(cv, img)

  const imageDims: ImageDims = { width: src.cols, height: src.rows }

  try {
    let rawBBoxes = primaryDetection(cv, src, sensitivity, imageDims, blur, mergeGap)
    let usedFallback = false

    const primaryFiltered = processBBoxes(rawBBoxes, minArea, imageDims)
    if (primaryFiltered.length === 0 || rawBBoxes.length > MAX_DETECTIONS_WARNING) {
      rawBBoxes = fallbackDetection(cv, src)
      usedFallback = true
    }

    const bboxes = usedFallback ? processBBoxes(rawBBoxes, minArea, imageDims) : primaryFiltered

    return { bboxes, usedFallback }
  } finally {
    src.delete()
  }
}
