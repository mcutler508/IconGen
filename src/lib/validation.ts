import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, LARGE_DIMENSION_WARNING } from './constants.ts'

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateFileType(file: File): ValidationResult {
  if (ACCEPTED_FILE_TYPES.includes(file.type as typeof ACCEPTED_FILE_TYPES[number])) {
    return { valid: true }
  }
  return {
    valid: false,
    error: `Unsupported file type "${file.type || 'unknown'}". Please upload a PNG, JPEG, or WebP image.`,
  }
}

export function validateFileSize(file: File): ValidationResult {
  if (file.size <= MAX_FILE_SIZE_BYTES) {
    return { valid: true }
  }
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
  return {
    valid: false,
    error: `File size (${sizeMB} MB) exceeds the 20 MB limit.`,
  }
}

export interface ImageMeta {
  width: number
  height: number
  name: string
  size: number
  type: string
  warning?: string
}

export function loadImageMeta(file: File): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      URL.revokeObjectURL(url)

      let warning: string | undefined
      if (width > LARGE_DIMENSION_WARNING || height > LARGE_DIMENSION_WARNING) {
        warning = `Large image (${width}×${height}). Processing may be slow.`
      }

      resolve({
        width,
        height,
        name: file.name,
        size: file.size,
        type: file.type,
        warning,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image. The file may be corrupted.'))
    }

    img.src = url
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
