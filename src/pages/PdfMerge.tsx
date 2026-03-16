import { useCallback, useState } from "react"
import { PageShell } from "../components/PageShell"
import { PageDropZone } from "../components/PageDropZone"
import { DropZone } from "../components/DropZone"
import { FileList, type FileEntry } from "../components/FileList"
import { ConvertStatus } from "../components/ConvertStatus"
import { useConvert } from "../hooks/useConvert"

const STEPS = ["正在读取文件…", "正在合并页面…", "正在保存…"]

export function PdfMerge() {
  const { status, progress, progressStep, message, resultPath, run, reset } = useConvert()
  const [files, setFiles] = useState<FileEntry[]>([])
  const isProcessing = status === "processing"

  const addFiles = useCallback(
    async (paths: string[]) => {
      const newEntries: FileEntry[] = []
      for (const p of paths) {
        // Skip duplicates
        if (files.some((f) => f.path === p)) continue
        const name = p.split(/[/\\]/).pop() ?? p
        const pages = await window.electronAPI?.getPdfPageCount(p)
        newEntries.push({ path: p, name, meta: pages ? `${pages} 页` : undefined })
      }
      if (newEntries.length > 0) setFiles((prev) => [...prev, ...newEntries])
    },
    [files]
  )

  const handleMerge = useCallback(() => {
    if (files.length < 2) return
    run(() => window.electronAPI.mergePdfs(files.map((f) => f.path)), STEPS)
  }, [files, run])

  const handleReset = useCallback(() => {
    reset()
    setFiles([])
  }, [reset])

  const onBrowse = useCallback(async () => {
    const result = await window.electronAPI?.showOpenDialog({
      filters: [{ name: "PDF 文件", extensions: ["pdf"] }],
      multiple: true,
      title: "选择要合并的 PDF 文件",
    })
    if (result) addFiles(result)
  }, [addFiles])

  return (
    <PageShell
      title="PDF 合并"
      description="将多个 PDF 文件按顺序合并为一个，拖拽可调整页面顺序"
    >
      <PageDropZone
        accept={[".pdf"]}
        multiple
        disabled={isProcessing}
        onFiles={addFiles}
        overlayText="松开以添加 PDF 文件"
      >
        {/* Empty state: large dropzone */}
        {files.length === 0 ? (
          <DropZone
            accept={[".pdf"]}
            multiple
            disabled={isProcessing}
            onFiles={addFiles}
            hint="选择 2 个或更多 PDF 文件以合并"
          />
        ) : (
          /* Files exist: compact add-more bar */
          <div className="add-more-bar">
            <span className="add-more-label">
              已添加 {files.length} 个文件（拖拽列表项可调整顺序）
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={isProcessing}
              onClick={onBrowse}
            >
              + 继续添加
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={isProcessing}
              onClick={() => setFiles([])}
            >
              清空
            </button>
          </div>
        )}

        {/* File list with drag-reorder */}
        {files.length > 0 && (
          <>
            <FileList
              files={files}
              onReorder={setFiles}
              onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={isProcessing}
            />
            <div className="merge-actions">
              <button
                type="button"
                className="btn-primary btn-large"
                onClick={handleMerge}
                disabled={files.length < 2 || isProcessing}
              >
                {isProcessing ? "合并中…" : `合并 ${files.length} 个文件`}
              </button>
            </div>
          </>
        )}

        <ConvertStatus
          status={status}
          progress={progress}
          progressStep={progressStep}
          message={message}
          resultPath={resultPath}
          steps={STEPS}
        />
        {(status === "success" || status === "error") && (
          <button type="button" className="btn-reset" onClick={handleReset}>
            重新合并
          </button>
        )}
      </PageDropZone>
    </PageShell>
  )
}
