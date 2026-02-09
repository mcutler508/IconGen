import { X, AlertTriangle } from 'lucide-react'
import type { CroppedIcon } from '@/lib/crop-types.ts'

interface IconGridProps {
  icons: CroppedIcon[]
  excludedSet: Set<number>
  onToggleExclude: (index: number) => void
  onIconClick: (icon: CroppedIcon) => void
}

export function IconGrid({ icons, excludedSet, onToggleExclude, onIconClick }: IconGridProps) {
  if (icons.length === 0) return null

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
      data-testid="icon-grid"
    >
      {icons.map((icon) => {
        const excluded = excludedSet.has(icon.index)
        return (
          <div
            key={icon.index}
            className={`relative rounded-lg border p-2 flex flex-col items-center gap-1 transition-opacity cursor-pointer hover:border-primary ${
              excluded ? 'opacity-40' : ''
            }`}
            data-testid="icon-tile"
            onClick={() => onIconClick(icon)}
          >
            {/* Checkerboard background to show transparency */}
            <div
              className="w-full aspect-square rounded overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
              }}
            >
              <img
                src={icon.dataUrl}
                alt={`Icon ${icon.index + 1}`}
                className="w-full h-full object-contain"
                data-testid="icon-image"
              />
            </div>

            <span className="text-xs text-muted-foreground" data-testid="icon-index">
              #{icon.index + 1}
            </span>

            <span className="text-xs text-muted-foreground" data-testid="icon-dimensions">
              {icon.width}×{icon.height}
            </span>

            {/* Warning badge when bg removal was requested but confidence was too low */}
            {!icon.bgRemoved && icon.bgConfidence > 0 && (
              <div
                className="absolute top-1 left-1"
                title={`Background removal skipped (confidence: ${Math.round(icon.bgConfidence * 100)}%)`}
                data-testid="bg-warning-badge"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onToggleExclude(icon.index) }}
              className={`absolute top-1 right-1 rounded-full p-0.5 transition-colors ${
                excluded
                  ? 'bg-muted text-muted-foreground hover:bg-accent'
                  : 'bg-destructive/80 text-destructive-foreground hover:bg-destructive'
              }`}
              title={excluded ? 'Include icon' : 'Exclude icon'}
              data-testid="exclude-toggle"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
