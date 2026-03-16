import { useCallback, useState } from "react"

interface DropZoneProps {
  accept: string[]            // e.g. [".html", ".htm"]
  multiple?: boolean
  disabled?: boolean
  onFiles: (paths: string[]) => void
  children?: React.ReactNode
  hint?: string
}

export function DropZone({ accept, multiple = false, disabled = false, onFiles, hint }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const extractPaths = useCallback(
    async (files: FileList): Promise<string[]> => {
      const paths: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
        if (!accept.includes(ext)) continue
        const p = (file as File & { path?: string }).path
        if (p) {
          paths.push(p)
        } else {
          // Fallback: write to temp via main process (for HTML drag from browser)
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const match = (reader.result as string).match(/^data:[^;]+;base64,(.+)$/)
              resolve(match ? match[1] : "")
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          const tmpPath = await window.electronAPI?.writeTempHtml(base64, file.name)
          if (tmpPath) paths.push(tmpPath)
        }
        if (!multiple) break
      }
      return paths
    },
    [accept, multiple]
  )

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (disabled) return
      const paths = await extractPaths(e.dataTransfer.files)
      if (paths.length > 0) onFiles(paths)
    },
    [disabled, extractPaths, onFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const onBrowse = useCallback(async () => {
    if (disabled) return
    const exts = accept.map((e) => e.replace(".", ""))
    const result = await window.electronAPI?.showOpenDialog({
      filters: [{ name: "支持的文件", extensions: exts }],
      multiple,
    })
    if (result && result.length > 0) onFiles(result)
  }, [accept, disabled, multiple, onFiles])

  return (
    <div
      className={[
        "dropzone",
        isDragOver ? "dropzone--over" : "",
        disabled ? "dropzone--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="dropzone-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="dropzone-text">
        拖拽文件到此处{multiple ? "（支持多文件）" : ""}
      </p>
      {hint && <p className="dropzone-hint-text">{hint}</p>}
      <p className="dropzone-sep">或</p>
      <button type="button" className="btn-primary" onClick={onBrowse}>
        浏览选择
      </button>
      <p className="dropzone-accept">
        支持格式：{accept.join(" / ")}
      </p>
    </div>
  )
}
