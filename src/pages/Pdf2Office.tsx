import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../components/PageShell"
import { DropZone } from "../components/DropZone"
import { ConvertStatus } from "../components/ConvertStatus"
type Pdf2OfficeFormat = "docx" | "html" | "pptx"

type ConvertState = "idle" | "processing" | "success" | "error"

export function Pdf2Office({ onGoToSettings }: { onGoToSettings?: () => void }) {
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [format, setFormat] = useState<Pdf2OfficeFormat>("docx")
  const [state, setState] = useState<ConvertState>("idle")
  const [resultPath, setResultPath] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [libreFound, setLibreFound] = useState<boolean | null>(null)

  useEffect(() => {
    window.electronAPI?.checkLibreOffice().then((r) => setLibreFound(r.found))
  }, [])

  const handleFiles = useCallback((paths: string[]) => {
    if (paths[0]) {
      setPdfPath(paths[0])
      setState("idle")
      setResultPath("")
      setErrorMessage("")
    }
  }, [])

  const handleConvert = useCallback(async () => {
    if (!pdfPath || !window.electronAPI?.convertPdfToOffice) return
    setState("processing")
    setErrorMessage("")
    setResultPath("")
    try {
      const res = await window.electronAPI.convertPdfToOffice(pdfPath, format)
      if (res.success && res.outputPath) {
        setState("success")
        setResultPath(res.outputPath)
      } else {
        setState("error")
        setErrorMessage(res.error ?? "转换失败")
      }
    } catch (err) {
      setState("error")
      setErrorMessage(err instanceof Error ? err.message : "转换失败")
    }
  }, [pdfPath, format])

  const reset = useCallback(() => {
    setState("idle")
    setPdfPath(null)
    setResultPath("")
    setErrorMessage("")
  }, [])

  const isProcessing = state === "processing"

  return (
    <PageShell
      title="PDF 转换"
      description="将 PDF 转为 Word（DOCX）、HTML 或 PPT（PPTX），需 LibreOffice"
    >
      {libreFound === false && (
        <div className="tip tip--warn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            未检测到 LibreOffice。
            {onGoToSettings ? (
              <>
                <button type="button" className="tip-link tip-link--btn" onClick={onGoToSettings}>
                  前往「设置」一键安装 LibreOffice（免费）
                </button>
                后即可使用 PDF 转 Word/HTML/PPT。
              </>
            ) : (
              " 请前往「设置」安装或配置 LibreOffice。"
            )}
          </span>
        </div>
      )}

      {libreFound === true && (
        <div className="tip tip--ok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>已检测到 LibreOffice，可进行 PDF 转 Word / HTML / PPT</span>
        </div>
      )}

      <div className="options-panel" style={{ marginBottom: 12 }}>
        <div className="options-row">
          <label className="options-label">输出格式</label>
          <div className="options-buttons">
            {(["docx", "html", "pptx"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`btn-option ${format === f ? "btn-option--active" : ""}`}
                onClick={() => setFormat(f)}
                disabled={isProcessing}
              >
                {f === "docx" ? "Word" : f === "html" ? "HTML" : "PPT"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DropZone
        accept={[".pdf"]}
        multiple={false}
        disabled={isProcessing || libreFound !== true}
        onFiles={handleFiles}
        hint="选择要转换的 PDF 文件"
      />

      {pdfPath && (
        <div className="merge-actions" style={{ marginTop: 12 }}>
          <span className="add-more-label" style={{ marginRight: 8 }}>
            {pdfPath.split(/[/\\]/).pop()}
          </span>
          <button
            type="button"
            className="btn-primary btn-large"
            onClick={handleConvert}
            disabled={isProcessing}
          >
            {isProcessing ? "转换中…" : `转为 ${format === "docx" ? "Word" : format === "html" ? "HTML" : "PPT"}`}
          </button>
        </div>
      )}

      {state === "processing" && (
        <div className="convert-status">
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: "50%" }} />
          </div>
          <div className="progress-info">
            <span className="progress-step">正在转换…</span>
          </div>
        </div>
      )}

      {(state === "success" || state === "error") && (
        <>
          <ConvertStatus
            status={state}
            progress={100}
            progressStep={2}
            message={state === "error" ? errorMessage : ""}
            resultPath={resultPath}
            steps={["正在读取 PDF…", "正在转换…", "正在保存…"]}
          />
          <button type="button" className="btn-reset" onClick={reset}>
            继续转换
          </button>
        </>
      )}
    </PageShell>
  )
}
