import { AlertTriangle } from 'lucide-react'
import type { ImageMeta } from '@/lib/validation.ts'
import { formatFileSize } from '@/lib/validation.ts'

interface ImagePreviewProps {
  src: string
  meta: ImageMeta
}

export function ImagePreview({ src, meta }: ImagePreviewProps) {
  return (
    <div className="flex flex-col items-center gap-4" data-testid="image-preview">
      {meta.warning && (
        <div
          className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400"
          data-testid="dimension-warning"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {meta.warning}
        </div>
      )}
      <div className="w-full overflow-hidden rounded-lg border">
        <img
          src={src}
          alt={`Preview of ${meta.name}`}
          className="mx-auto max-h-[60vh] object-contain"
          data-testid="preview-image"
        />
      </div>
    </div>
  )
}

interface FileMetaDisplayProps {
  meta: ImageMeta
}

export function FileMetaDisplay({ meta }: FileMetaDisplayProps) {
  return (
    <div className="space-y-1 text-sm" data-testid="file-metadata">
      <div className="flex justify-between">
        <span className="text-muted-foreground">File</span>
        <span className="font-medium truncate ml-2 max-w-[180px]" title={meta.name}>
          {meta.name}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Dimensions</span>
        <span className="font-medium">{meta.width}×{meta.height}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Size</span>
        <span className="font-medium">{formatFileSize(meta.size)}</span>
      </div>
    </div>
  )
}
