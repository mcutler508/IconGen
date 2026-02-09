import { UploadZone } from '@/components/UploadZone.tsx'
import { FileMetaDisplay } from '@/components/ImagePreview.tsx'
import { Slider } from '@/components/ui/slider.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Scan, Loader2, Download } from 'lucide-react'
import type { ImageMeta } from '@/lib/validation.ts'
import { MAX_PADDING } from '@/lib/constants.ts'

interface SidebarProps {
  onFileSelected: (file: File) => void
  meta: ImageMeta | null
  hasImage: boolean
  sensitivity: number
  onSensitivityChange: (value: number) => void
  minArea: number
  onMinAreaChange: (value: number) => void
  onDetect: () => void
  isDetecting: boolean
  hasDetection: boolean
  detectionCount: number
  padding: number
  onPaddingChange: (value: number) => void
  bgRemoval: boolean
  onBgRemovalChange: (value: boolean) => void
  selectedCount: number
  onExport: () => void
  isExporting: boolean
}

export function Sidebar({
  onFileSelected,
  meta,
  hasImage,
  sensitivity,
  onSensitivityChange,
  minArea,
  onMinAreaChange,
  onDetect,
  isDetecting,
  hasDetection,
  detectionCount,
  padding,
  onPaddingChange,
  bgRemoval,
  onBgRemovalChange,
  selectedCount,
  onExport,
  isExporting,
}: SidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r p-4 flex flex-col gap-4 overflow-y-auto">
      <UploadZone onFileSelected={onFileSelected} disabled={hasImage} />

      {meta && (
        <>
          <div className="border-t pt-4">
            <FileMetaDisplay meta={meta} />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Sensitivity</label>
                <span className="text-sm text-muted-foreground" data-testid="sensitivity-value">
                  {sensitivity}
                </span>
              </div>
              <Slider
                value={[sensitivity]}
                onValueChange={([v]) => onSensitivityChange(v)}
                min={0}
                max={255}
                step={1}
                data-testid="sensitivity-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Min Area (px²)</label>
                <span className="text-sm text-muted-foreground" data-testid="min-area-value">
                  {minArea}
                </span>
              </div>
              <Slider
                value={[minArea]}
                onValueChange={([v]) => onMinAreaChange(v)}
                min={0}
                max={10000}
                step={10}
                data-testid="min-area-slider"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Button
              className="w-full"
              onClick={onDetect}
              disabled={isDetecting}
              data-testid="detect-button"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  Detect Icons
                </>
              )}
            </Button>

            {hasDetection && (
              <p className="text-xs text-muted-foreground text-center" data-testid="detection-count">
                {detectionCount} icon{detectionCount !== 1 ? 's' : ''} detected
              </p>
            )}
          </div>

          {hasDetection && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Padding (px)</label>
                  <span className="text-sm text-muted-foreground" data-testid="padding-value">
                    {padding}
                  </span>
                </div>
                <Slider
                  value={[padding]}
                  onValueChange={([v]) => onPaddingChange(v)}
                  min={0}
                  max={MAX_PADDING}
                  step={1}
                  data-testid="padding-slider"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="bg-removal-toggle">
                  Remove Background
                </label>
                <Switch
                  id="bg-removal-toggle"
                  checked={bgRemoval}
                  onCheckedChange={onBgRemovalChange}
                  data-testid="bg-removal-switch"
                  aria-label="Remove background"
                />
              </div>

              <p className="text-xs text-muted-foreground text-center" data-testid="selected-count">
                {selectedCount} icon{selectedCount !== 1 ? 's' : ''} selected for export
              </p>

              <Button
                className="w-full"
                onClick={onExport}
                disabled={selectedCount === 0 || isExporting}
                data-testid="export-button"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export ZIP
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
