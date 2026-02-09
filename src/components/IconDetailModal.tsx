import { useState, useEffect } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { CroppedIcon } from '@/lib/crop-types.ts'
import { generateFilename, dataUrlToBlob, downloadBlob } from '@/lib/export-utils.ts'
import { resizeDataUrl } from '@/lib/resize-utils.ts'
import { EXPORT_SIZE_PRESETS, EXPORT_SIZE_MIN, EXPORT_SIZE_MAX } from '@/lib/constants.ts'

interface IconDetailModalProps {
  icon: CroppedIcon | null
  totalDetected: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IconDetailModal({ icon, totalDetected, open, onOpenChange }: IconDetailModalProps) {
  const defaultSize = icon ? Math.max(icon.width, icon.height) : 256
  const [exportSize, setExportSize] = useState(defaultSize)
  const [customSize, setCustomSize] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Reset size when a different icon is selected
  useEffect(() => {
    if (icon) {
      const longest = Math.max(icon.width, icon.height)
      setExportSize(longest)
      setCustomSize(!EXPORT_SIZE_PRESETS.includes(longest as typeof EXPORT_SIZE_PRESETS[number]))
    }
  }, [icon])

  if (!icon) return null

  const isPreset = EXPORT_SIZE_PRESETS.includes(exportSize as typeof EXPORT_SIZE_PRESETS[number])
  const filename = generateFilename(icon.index, totalDetected)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const resized = await resizeDataUrl(icon.dataUrl, exportSize)
      const blob = dataUrlToBlob(resized)
      downloadBlob(blob, filename)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="icon-detail-modal">
        <DialogHeader>
          <DialogTitle>Icon #{icon.index + 1}</DialogTitle>
        </DialogHeader>

        {/* Large preview on checkerboard */}
        <div
          className="w-full aspect-square rounded-lg overflow-hidden border"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        >
          <img
            src={icon.dataUrl}
            alt={`Icon ${icon.index + 1}`}
            className="w-full h-full object-contain"
            data-testid="icon-detail-image"
          />
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Dimensions</span>
          <span>{icon.width} x {icon.height}</span>
          <span className="text-muted-foreground">Index</span>
          <span>#{icon.index + 1} of {totalDetected}</span>
          <span className="text-muted-foreground">Padding</span>
          <span>{icon.paddingApplied}px</span>
          <span className="text-muted-foreground">BG Removed</span>
          <span className="flex items-center gap-1">
            {icon.bgRemoved ? 'Yes' : 'No'}
            {!icon.bgRemoved && icon.bgConfidence > 0 && (
              <span className="inline-flex items-center gap-0.5 text-yellow-600 dark:text-yellow-400" title={`Confidence: ${Math.round(icon.bgConfidence * 100)}%`}>
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">Skipped</span>
              </span>
            )}
          </span>
        </div>

        {/* Size picker */}
        <div>
          <label className="text-sm font-medium">Export Size (px)</label>
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={customSize || !isPreset ? 'custom' : exportSize}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'custom') {
                setCustomSize(true)
              } else {
                setCustomSize(false)
                setExportSize(Number(val))
              }
            }}
            data-testid="modal-export-size-select"
          >
            {EXPORT_SIZE_PRESETS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value="custom">Custom...</option>
          </select>
          {(customSize || !isPreset) && (
            <input
              type="number"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              min={EXPORT_SIZE_MIN}
              max={EXPORT_SIZE_MAX}
              value={exportSize}
              onChange={(e) => {
                const v = Math.max(EXPORT_SIZE_MIN, Math.min(EXPORT_SIZE_MAX, Number(e.target.value) || EXPORT_SIZE_MIN))
                setExportSize(v)
              }}
              data-testid="modal-export-size-input"
            />
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Resizes longest side; aspect ratio preserved.
          </p>
        </div>

        {/* Download button */}
        <Button
          className="w-full"
          onClick={handleDownload}
          disabled={isDownloading}
          data-testid="modal-download-button"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Downloading...' : 'Download PNG'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
