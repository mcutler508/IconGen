import { useState, useCallback, useEffect, useRef } from 'react'
import { TopBar } from '@/components/TopBar.tsx'
import { Sidebar } from '@/components/Sidebar.tsx'
import { MainPanel } from '@/components/MainPanel.tsx'
import { useTheme } from '@/hooks/useTheme.ts'
import { validateFileType, validateFileSize, loadImageMeta } from '@/lib/validation.ts'
import type { ImageMeta } from '@/lib/validation.ts'
import { detectIcons } from '@/lib/detection.ts'
import { processIcons } from '@/lib/crop-pipeline.ts'
import type { BBox } from '@/lib/bbox-utils.ts'
import type { CroppedIcon } from '@/lib/crop-types.ts'
import { DEFAULT_SENSITIVITY, DEFAULT_MIN_AREA, DEFAULT_PADDING, DEFAULT_BG_REMOVAL, DEFAULT_ZIP_FILENAME } from '@/lib/constants.ts'
import { buildZip, downloadBlob } from '@/lib/export-utils.ts'
import { IconDetailModal } from '@/components/IconDetailModal.tsx'

function App() {
  const { theme, toggleTheme } = useTheme()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [meta, setMeta] = useState<ImageMeta | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Detection state
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY)
  const [minArea, setMinArea] = useState(DEFAULT_MIN_AREA)
  const [bboxes, setBboxes] = useState<BBox[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [hasDetection, setHasDetection] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  // Crop/preview state
  const [padding, setPadding] = useState(DEFAULT_PADDING)
  const [bgRemoval, setBgRemoval] = useState(DEFAULT_BG_REMOVAL)
  const [croppedIcons, setCroppedIcons] = useState<CroppedIcon[]>([])
  const [excludedSet, setExcludedSet] = useState<Set<number>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<CroppedIcon | null>(null)

  // Refs for debounced re-processing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialProcessDone = useRef(false)

  const handleFileSelected = useCallback(async (file: File) => {
    setError(null)

    const typeResult = validateFileType(file)
    if (!typeResult.valid) {
      setError(typeResult.error)
      return
    }

    const sizeResult = validateFileSize(file)
    if (!sizeResult.valid) {
      setError(sizeResult.error)
      return
    }

    try {
      const imgMeta = await loadImageMeta(file)
      const url = URL.createObjectURL(file)
      setImageSrc(url)
      setMeta(imgMeta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image.')
    }
  }, [])

  const handleReset = useCallback(() => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc)
    }
    setImageSrc(null)
    setMeta(null)
    setError(null)
    setBboxes([])
    setIsDetecting(false)
    setHasDetection(false)
    setUsedFallback(false)
    setSensitivity(DEFAULT_SENSITIVITY)
    setMinArea(DEFAULT_MIN_AREA)
    setPadding(DEFAULT_PADDING)
    setBgRemoval(DEFAULT_BG_REMOVAL)
    setCroppedIcons([])
    setExcludedSet(new Set())
    setIsProcessing(false)
    setIsExporting(false)
    setSelectedIcon(null)
    initialProcessDone.current = false
  }, [imageSrc])

  const runProcessing = useCallback(async (src: string, boxes: BBox[], pad: number, bgRem: boolean) => {
    setIsProcessing(true)
    try {
      const icons = await processIcons(src, boxes, pad, bgRem)
      setCroppedIcons(icons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Icon processing failed.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDetect = useCallback(async () => {
    if (!imageSrc) return
    setIsDetecting(true)
    setError(null)
    initialProcessDone.current = false

    try {
      const result = await detectIcons(imageSrc, sensitivity, minArea)
      setBboxes(result.bboxes)
      setUsedFallback(result.usedFallback)
      setHasDetection(true)
      setExcludedSet(new Set())

      // Auto-trigger crop processing after detection
      await runProcessing(imageSrc, result.bboxes, padding, bgRemoval)
      initialProcessDone.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed.')
    } finally {
      setIsDetecting(false)
    }
  }, [imageSrc, sensitivity, minArea, padding, bgRemoval, runProcessing])

  const handleToggleExclude = useCallback((index: number) => {
    setExcludedSet((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setExcludedSet(new Set())
  }, [])

  const handleIconClick = useCallback((icon: CroppedIcon) => {
    setSelectedIcon(icon)
  }, [])

  const handleSelectNone = useCallback(() => {
    setExcludedSet(new Set(croppedIcons.map((_, i) => i)))
  }, [croppedIcons])

  const handleExport = useCallback(async () => {
    if (croppedIcons.length === 0) return
    setIsExporting(true)
    try {
      const blob = await buildZip(croppedIcons, excludedSet, meta?.name ?? '')
      downloadBlob(blob, DEFAULT_ZIP_FILENAME)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setIsExporting(false)
    }
  }, [croppedIcons, excludedSet, meta])

  // Debounced re-processing when padding or bgRemoval changes
  useEffect(() => {
    if (!hasDetection || !imageSrc || bboxes.length === 0 || !initialProcessDone.current) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      runProcessing(imageSrc, bboxes, padding, bgRemoval)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [padding, bgRemoval, hasDetection, imageSrc, bboxes, runProcessing])

  const selectedCount = croppedIcons.length - excludedSet.size

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        theme={theme}
        onToggleTheme={toggleTheme}
        onReset={handleReset}
        hasImage={!!imageSrc}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onFileSelected={handleFileSelected}
          meta={meta}
          hasImage={!!imageSrc}
          sensitivity={sensitivity}
          onSensitivityChange={setSensitivity}
          minArea={minArea}
          onMinAreaChange={setMinArea}
          onDetect={handleDetect}
          isDetecting={isDetecting}
          hasDetection={hasDetection}
          detectionCount={bboxes.length}
          padding={padding}
          onPaddingChange={setPadding}
          bgRemoval={bgRemoval}
          onBgRemovalChange={setBgRemoval}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onExport={handleExport}
          isExporting={isExporting}
        />
        <MainPanel
          imageSrc={imageSrc}
          meta={meta}
          error={error}
          bboxes={bboxes}
          hasDetection={hasDetection}
          usedFallback={usedFallback}
          croppedIcons={croppedIcons}
          excludedSet={excludedSet}
          onToggleExclude={handleToggleExclude}
          onIconClick={handleIconClick}
          isProcessing={isProcessing}
        />
      </div>
      <IconDetailModal
        icon={selectedIcon}
        totalDetected={croppedIcons.length}
        open={selectedIcon !== null}
        onOpenChange={(open) => { if (!open) setSelectedIcon(null) }}
      />
    </div>
  )
}

export default App
