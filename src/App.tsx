import { useCallback, useState, useEffect } from "react"
import "./App.css"

type Status = "idle" | "loading" | "success" | "error"

const PROGRESS_STEPS = ["正在加载文件…", "正在生成 PDF…", "正在保存…"]

function App() {
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onConvertProgress) return
    const unsub = api.onConvertProgress(({ step, percent }) => {
      setProgressStep(step)
      setProgress(percent)
    })
    return unsub
  }, [])

  const convert = useCallback(async (htmlPath: string) => {
    const api = window.electronAPI
    if (!api) {
      setStatus("error")
      setMessage("无法连接主进程")
      return
    }
    setStatus("loading")
    setPdfPath(null)
    setProgress(0)
    setProgressStep(0)
    setMessage("准备中…")
    try {
      const resultPath = await api.convertHtmlToPdf(htmlPath)
      setProgress(100)
      setProgressStep(2)
      setStatus("success")
      setPdfPath(resultPath)
      setMessage(`已保存到桌面：${resultPath.split(/[/\\]/).pop()}`)
    } catch (err) {
      setStatus("error")
      setPdfPath(null)
      setMessage(err instanceof Error ? err.message : "转换失败")
    }
  }, [])

  const onBrowse = useCallback(async () => {
    const api = window.electronAPI
    if (!api) return
    const path = await api.showOpenDialog()
    if (path) convert(path)
  }, [convert])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext !== "html" && ext !== "htm") {
        setStatus("error")
        setMessage("请选择 .html 或 .htm 文件")
        return
      }
      let htmlPath = (file as File & { path?: string }).path
      if (!htmlPath) {
        const api = window.electronAPI
        if (!api?.writeTempHtml) {
          setStatus("error")
          setMessage("无法获取文件路径，请使用「浏览」选择文件")
          return
        }
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const match = (reader.result as string).match(/^data:[^;]+;base64,(.+)$/)
              resolve(match ? match[1] : "")
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          htmlPath = await api.writeTempHtml(base64, file.name)
        } catch {
          setStatus("error")
          setMessage("读取文件失败，请使用「浏览」选择文件")
          return
        }
      }
      convert(htmlPath)
    },
    [convert]
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

  return (
    <div className="app">
      {/* 自定义标题栏 - 深色，可拖动 */}
      <div className="title-bar">
        <span className="title-bar-drag">html2pdf-windows</span>
        <div className="title-bar-controls">
          <button type="button" className="title-bar-btn" onClick={() => window.electronAPI?.windowMinimize()} aria-label="最小化">
            <svg width="10" height="10" viewBox="0 0 12 12"><rect x="0" y="5" width="12" height="1" fill="currentColor" /></svg>
          </button>
          <button type="button" className="title-bar-btn" onClick={() => window.electronAPI?.windowMaximize()} aria-label="最大化">
            <svg width="10" height="10" viewBox="0 0 12 12"><rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
          <button type="button" className="title-bar-btn title-bar-btn--close" onClick={() => window.electronAPI?.windowClose()} aria-label="关闭">
            <svg width="10" height="10" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
          </button>
        </div>
      </div>
      <header className="header">
        <h1 className="title">HTML 转 PDF</h1>
        <p className="subtitle">拖拽或选择 HTML 文件，自动转换为 PDF 并保存到桌面</p>
      </header>

      <main className="main">
        <div
          className={`dropzone ${isDragOver ? "dropzone--over" : ""} ${status === "loading" ? "dropzone--disabled" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          {status === "loading" ? (
            <div className="dropzone-content">
              <div className="progress-wrap">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">
                {PROGRESS_STEPS[progressStep] ?? "正在完成…"}
              </span>
              <span className="progress-percent">{progress}%</span>
            </div>
          ) : (
            <>
              <div className="dropzone-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="dropzone-text">拖拽 HTML 文件到此处</p>
              <p className="dropzone-hint">或</p>
              <button type="button" className="btn-browse" onClick={onBrowse}>
                浏览选择
              </button>
            </>
          )}
        </div>

        {(status === "success" || status === "error") && message && (
          <div className={`status status--${status}`}>
            {status === "success" && (
              <>
                <svg className="status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="status-message">
                  {message}
                  {pdfPath && (
                    <button
                      type="button"
                      className="status-open-btn"
                      onClick={() => window.electronAPI?.openPath(pdfPath)}
                    >
                      点击打开
                    </button>
                  )}
                </span>
              </>
            )}
            {status === "error" && (
              <>
                <svg className="status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="status-message">{message}</span>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© 2025 <a href="https://github.com/bingqianliu2017/html2pdf-windows" target="_blank" rel="noopener noreferrer">html2pdf-windows</a> · MIT License</p>
      </footer>
    </div>
  )
}

export default App
