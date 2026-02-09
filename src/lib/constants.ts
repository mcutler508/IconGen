export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
export const MAX_FILE_SIZE_MB = 20
export const LARGE_DIMENSION_WARNING = 8000
export const ACCEPTED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const

export const DEFAULT_SENSITIVITY = 128
export const DEFAULT_MIN_AREA = 200
export const DEFAULT_PADDING = 4
export const DEFAULT_BG_REMOVAL = true
export const BG_CONFIDENCE_THRESHOLD = 0.85
export const MAX_PADDING = 24
export const BG_DISTANCE_THRESHOLD = 50
export const MAX_DETECTIONS_WARNING = 500
export const ROW_SORT_TOLERANCE = 10
export const DEFAULT_ZIP_FILENAME = 'icons.zip'

export const FULL_IMAGE_AREA_THRESHOLD = 0.9
export const CONTAINMENT_TOLERANCE = 5
export const MORPH_CLOSE_BASE_KERNEL = 3
export const MORPH_KERNEL_REFERENCE_DIM = 346 // sqrt(400*300)
export const MORPH_CLOSE_MAX_KERNEL = 15
export const MORPH_OPEN_KERNEL = 3
