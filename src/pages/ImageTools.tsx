import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../components/PageShell"
import { PageDropZone } from "../components/PageDropZone"
import { DropZone } from "../components/DropZone"
import { FileList, type FileEntry } from "../components/FileList"
import type { ImageTask, ImageResult } from "../types/electron"

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".bmp", ".tiff", ".tif"]

type OutputFormat = "jpeg" | "png" | "webp" | "avif"

interface BatchResult {
  success: number
  failed: number
  items: ImageResult[]
}

export function ImageTools() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpeg")
  const [quality, setQuality] = useState(85)
  const [maxDimension, setMaxDimension] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<BatchResult | null>(null)

  useEffect(() => {
    const unsub = window.electronAPI?.onImageProgress(({ current, total }) => {
      setProgress({ current, total })
    })
    return unsub
  }, [])

  const addFiles = useCallback(
    (paths: string[]) => {
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.path))
        const newEntries: FileEntry[] = paths
          .filter((p) => !existing.has(p))
          .map((p) => ({ path: p, name: p.split(/[/\\]/).pop() ?? p }))
        return [...prev, ...newEntries]
      })
      setResults(null)
    },
    []
  )

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setResults(null)
    setProgress({ current: 0, total: files.length })

    const tasks: ImageTask[] = files.map((f) => ({
      inputPath: f.path,
      outputFormat,
      quality,
      maxDimension,
    }))

    try {
      const res = await window.electronAPI.processImages(tasks)
      const success = res.filter((r) => r.success).length
      setResults({ success, failed: res.length - success, items: res })
    } catch (err) {
      setResults({
        success: 0,
        failed: files.length,
        items: files.map((f) => ({
          inputPath: f.path,
          outputPath: "",
          success: false,
          error: err instanceof Error ? err.message : "未知错误",
        })),
      })
    } finally {
      setIsProcessing(false)
    }
  }, [files, outputFormat, quality, maxDimension])

  const handleReset = useCallback(() => {
    setFiles([])
    setResults(null)
    setProgress({ current: 0, total: 0 })
  }, [])

  return (
    <PageShell
      title="图片工具"
      description="批量压缩图片 / 转换格式，使用 Chromium 内置编解码器，零额外依赖"
    >
      {/* PageDropZone makes the entire content area a valid drop target */}
      <PageDropZone
        accept={IMAGE_EXTS}
        multiple
        disabled={isProcessing}
        onFiles={addFiles}
        overlayText="松开以添加图片"
      >
        {/* When no files yet: show large centered DropZone */}
        {files.length === 0 ? (
          <DropZone
            accept={IMAGE_EXTS}
            multiple
            disabled={isProcessing}
            onFiles={addFiles}
            hint="支持 JPG · PNG · WebP · AVIF · GIF · BMP · TIFF，可多选"
          />
        ) : (
          /* When files exist: compact "add more" bar */
          <div className="add-more-bar">
            <span className="add-more-label">已添加 {files.length} 张图片</span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={isProcessing}
              onClick={async () => {
                const result = await window.electronAPI?.showOpenDialog({
                  filters: [{ name: "图片文件", extensions: IMAGE_EXTS.map((e) => e.slice(1)) }],
                  multiple: true,
                  title: "继续添加图片",
                })
                if (result) addFiles(result)
              }}
            >
              + 继续添加
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={isProcessing}
              onClick={handleReset}
            >
              清空
            </button>
          </div>
        )}

        {/* Settings panel — always visible */}
        <div className="options-panel">
          <div className="options-row">
            <label className="options-label">输出格式</label>
            <div className="options-buttons">
              {(["jpeg", "png", "webp", "avif"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`btn-option ${outputFormat === f ? "btn-option--active" : ""}`}
                  onClick={() => setOutputFormat(f)}
                  disabled={isProcessing}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {outputFormat !== "png" && (
            <div className="options-row">
              <label className="options-label">
                质量 <span className="options-value">{quality}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={isProcessing}
                className="options-slider"
              />
              <div className="options-slider-hints">
                <span>10%（最小体积）</span><span>100%（最高质量）</span>
              </div>
            </div>
          )}

          <div className="options-row">
            <label className="options-label">
              最大边长
              <span className="options-value">
                {maxDimension > 0 ? ` ${maxDimension}px` : "（不限制）"}
              </span>
            </label>
            <div className="options-buttons">
              {([0, 1920, 1280, 800] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn-option ${maxDimension === d ? "btn-option--active" : ""}`}
                  onClick={() => setMaxDimension(d)}
                  disabled={isProcessing}
                >
                  {d === 0 ? "原始" : `${d}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File list */}
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
                onClick={handleProcess}
                disabled={isProcessing}
              >
                {isProcessing
                  ? `处理中… ${progress.current}/${progress.total}`
                  : `处理 ${files.length} 张图片`}
              </button>
            </div>
          </>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="convert-status">
            <div className="progress-wrap">
              <div
                className="progress-bar"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="progress-info">
              <span className="progress-step">
                正在处理第 {progress.current + 1} / {progress.total} 张…
              </span>
              <span className="progress-percent">
                {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        {results && !isProcessing && (
          <div className="image-results">
            <div
              className={`status-message ${
                results.failed === 0 ? "status-message--success" : "status-message--error"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {results.failed === 0 ? (
                  <>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </>
                )}
              </svg>
              <span className="status-text">
                完成：{results.success} 成功，{results.failed} 失败
              </span>
            </div>
            <div className="image-result-list">
              {results.items.map((item) => (
                <div
                  key={item.inputPath}
                  className={`image-result-item ${item.success ? "" : "image-result-item--error"}`}
                >
                  <span className="image-result-name">
                    {item.inputPath.split(/[/\\]/).pop()}
                  </span>
                  {item.success ? (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => window.electronAPI?.openPath(item.outputPath)}
                    >
                      打开
                    </button>
                  ) : (
                    <span className="image-result-error">{item.error}</span>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="btn-reset" onClick={handleReset}>
              重新处理
            </button>
          </div>
        )}
      </PageDropZone>
    </PageShell>
  )
}
