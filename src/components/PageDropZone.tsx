/**
 * PageDropZone
 * Purpose: Makes the entire page content area a drag-and-drop target.
 *   Shows a full-screen overlay when dragging, so users can drop files
 *   anywhere on the page rather than needing to aim at a small zone.
 * Dependencies: none
 */

import { useCallback, useRef, useState } from "react"

interface PageDropZoneProps {
  accept: string[]               // e.g. [".jpg", ".png"]
  multiple?: boolean
  disabled?: boolean
  onFiles: (paths: string[]) => void
  overlayText?: string
  children: React.ReactNode
}

export function PageDropZone({
  accept,
  multiple = true,
  disabled = false,
  onFiles,
  overlayText = "松开鼠标以添加文件",
  children,
}: PageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const counter = useRef(0)

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    counter.current++
    if (counter.current === 1) setIsDragOver(true)
  }, [disabled])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    counter.current--
    if (counter.current <= 0) {
      counter.current = 0
      setIsDragOver(false)
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      counter.current = 0
      setIsDragOver(false)
      if (disabled) return

      const paths: string[] = []
      const files = e.dataTransfer.files
      for (let i = 0; i < files.length; i++) {
        const file = files[i] as File & { path?: string }
        const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
        if (accept.includes(ext) && file.path) {
          paths.push(file.path)
          if (!multiple) break
        }
      }
      if (paths.length > 0) onFiles(paths)
    },
    [accept, disabled, multiple, onFiles]
  )

  return (
    <div
      className="page-drop-zone"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragOver && (
        <div className="page-drop-overlay" aria-hidden="true">
          <div className="page-drop-overlay-box">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>{overlayText}</p>
            <span className="page-drop-overlay-hint">
              {accept.join(" · ")}
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
