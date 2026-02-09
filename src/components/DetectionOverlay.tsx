import { useRef, useEffect, useState, useCallback } from 'react'
import type { BBox } from '@/lib/bbox-utils.ts'

interface DetectionOverlayProps {
  src: string
  bboxes: BBox[]
  alt: string
}

export function DetectionOverlay({ src, bboxes, alt }: DetectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState({ x: 1, y: 1 })

  const updateScale = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const displayW = img.clientWidth
    const displayH = img.clientHeight
    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    if (naturalW > 0 && naturalH > 0) {
      setScale({ x: displayW / naturalW, y: displayH / naturalH })
    }
  }, [])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete) updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(img)
    return () => observer.disconnect()
  }, [updateScale])

  return (
    <div ref={containerRef} className="relative inline-block" data-testid="detection-overlay">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="max-h-[60vh] object-contain rounded-lg"
        onLoad={updateScale}
        data-testid="overlay-image"
      />
      {bboxes.map((bbox, i) => (
        <div
          key={i}
          className="absolute border-2 border-blue-500 pointer-events-none"
          data-testid="bbox-overlay"
          style={{
            left: `${bbox.x * scale.x}px`,
            top: `${bbox.y * scale.y}px`,
            width: `${bbox.w * scale.x}px`,
            height: `${bbox.h * scale.y}px`,
          }}
        />
      ))}
    </div>
  )
}
