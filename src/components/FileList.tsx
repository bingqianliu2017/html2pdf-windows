import { useCallback, useRef } from "react"

export interface FileEntry {
  path: string
  name: string
  meta?: string  // e.g. page count, file size
}

interface FileListProps {
  files: FileEntry[]
  onReorder: (files: FileEntry[]) => void
  onRemove: (index: number) => void
  disabled?: boolean
}

export function FileList({ files, onReorder, onRemove, disabled = false }: FileListProps) {
  const dragIndex = useRef<number | null>(null)

  const onDragStart = useCallback((index: number) => {
    dragIndex.current = index
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === index) return
    const next = [...files]
    const [item] = next.splice(from, 1)
    next.splice(index, 0, item)
    dragIndex.current = index
    onReorder(next)
  }, [files, onReorder])

  const onDragEnd = useCallback(() => {
    dragIndex.current = null
  }, [])

  if (files.length === 0) return null

  return (
    <div className={`file-list ${disabled ? "file-list--disabled" : ""}`}>
      {files.map((file, index) => (
        <div
          key={file.path + index}
          className="file-item"
          draggable={!disabled}
          onDragStart={() => onDragStart(index)}
          onDragOver={(e) => onDragOver(e, index)}
          onDragEnd={onDragEnd}
        >
          <span className="file-item-drag" aria-hidden="true">⠿</span>
          <div className="file-item-info">
            <span className="file-item-name" title={file.path}>{file.name}</span>
            {file.meta && <span className="file-item-meta">{file.meta}</span>}
          </div>
          <button
            type="button"
            className="file-item-remove"
            onClick={() => onRemove(index)}
            disabled={disabled}
            aria-label="移除"
          >
            <svg width="14" height="14" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
