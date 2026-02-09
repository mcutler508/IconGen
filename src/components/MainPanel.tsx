import { Upload, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { ImagePreview } from '@/components/ImagePreview.tsx'
import { DetectionOverlay } from '@/components/DetectionOverlay.tsx'
import { IconGrid } from '@/components/IconGrid.tsx'
import type { ImageMeta } from '@/lib/validation.ts'
import type { BBox } from '@/lib/bbox-utils.ts'
import type { CroppedIcon } from '@/lib/crop-types.ts'
import { MAX_DETECTIONS_WARNING } from '@/lib/constants.ts'

interface MainPanelProps {
  imageSrc: string | null
  meta: ImageMeta | null
  error: string | null
  bboxes: BBox[]
  hasDetection: boolean
  usedFallback: boolean
  croppedIcons: CroppedIcon[]
  excludedSet: Set<number>
  onToggleExclude: (index: number) => void
  isProcessing: boolean
}

export function MainPanel({
  imageSrc,
  meta,
  error,
  bboxes,
  hasDetection,
  usedFallback,
  croppedIcons,
  excludedSet,
  onToggleExclude,
  isProcessing,
}: MainPanelProps) {
  const selectedCount = croppedIcons.length - excludedSet.size

  return (
    <main className="flex-1 overflow-y-auto p-6">
      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="error-message"
          role="alert"
        >
          {error}
        </div>
      )}

      {usedFallback && hasDetection && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-400"
          data-testid="fallback-info"
        >
          <Info className="h-4 w-4 shrink-0" />
          Detection refined — adjusted algorithm for better results.
        </div>
      )}

      {bboxes.length > MAX_DETECTIONS_WARNING && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400"
          data-testid="high-count-warning"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          High detection count. Consider increasing Min Area to filter noise.
        </div>
      )}

      {!imageSrc && !error && (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground" data-testid="empty-state">
          <Upload className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Upload an icon splash image</p>
          <p className="text-sm mt-1">Drag and drop or use the upload area in the sidebar</p>
        </div>
      )}

      {imageSrc && meta && !hasDetection && <ImagePreview src={imageSrc} meta={meta} />}

      {imageSrc && meta && hasDetection && (
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
          <div className="w-full overflow-hidden rounded-lg border flex justify-center">
            <DetectionOverlay
              src={imageSrc}
              bboxes={bboxes}
              alt={`Detection results for ${meta.name}`}
            />
          </div>
          <p className="text-sm text-muted-foreground" data-testid="detection-count-main">
            {bboxes.length} icon{bboxes.length !== 1 ? 's' : ''} detected
          </p>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="processing-indicator">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing icons...
            </div>
          )}

          {croppedIcons.length > 0 && !isProcessing && (
            <div className="w-full" data-testid="icon-grid-section">
              <h3 className="text-sm font-medium mb-3">
                {selectedCount} of {croppedIcons.length} selected
              </h3>
              <IconGrid
                icons={croppedIcons}
                excludedSet={excludedSet}
                onToggleExclude={onToggleExclude}
              />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
