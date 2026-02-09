import type { BBox } from './bbox-utils.ts'

export interface RGBColor {
  r: number
  g: number
  b: number
}

export interface PaddedRegion {
  x: number
  y: number
  w: number
  h: number
}

export interface BgConfidenceResult {
  confidence: number
  borderBgRatio: number
  overallBgRatio: number
}

export interface CroppedIcon {
  index: number
  bbox: BBox
  dataUrl: string
  width: number
  height: number
  paddingApplied: number
  bgRemoved: boolean
  bgConfidence: number
}

export interface ExportedIconMeta {
  filename: string
  originalIndex: number
  included: boolean
  bbox: { x: number; y: number; w: number; h: number }
  croppedSize: { width: number; height: number }
  finalSize: { width: number; height: number }
  paddingApplied: number
  bgRemoved: boolean
  bgConfidence: number
}

export interface ExportManifest {
  schemaVersion: 1
  appVersion: string
  exportedAt: string
  sourceFile: string
  totalDetected: number
  totalExported: number
  export: {
    sizePx: number | null
    mode: 'contain' | 'original'
  }
  icons: ExportedIconMeta[]
}
