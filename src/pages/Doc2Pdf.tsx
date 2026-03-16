import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../components/PageShell"
import { DropZone } from "../components/DropZone"
import { ConvertStatus } from "../components/ConvertStatus"
import { useConvert } from "../hooks/useConvert"

const STEPS = ["正在读取文档…", "正在转换…", "正在保存…"]

export function Doc2Pdf() {
  const { status, progress, progressStep, message, resultPath, run, reset } = useConvert()
  const [libreFound, setLibreFound] = useState<boolean | null>(null)

  useEffect(() => {
    window.electronAPI?.checkLibreOffice().then((r) => setLibreFound(r.found))
  }, [])

  const handleFiles = useCallback(
    (paths: string[]) => {
      if (paths[0]) {
        run(() => window.electronAPI.convertDocToPdf(paths[0]), STEPS)
      }
    },
    [run]
  )

  return (
    <PageShell
      title="Word → PDF"
      description="将 DOC / DOCX 文件转换为 PDF"
    >
      {libreFound === false && (
        <div className="tip tip--warn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            未检测到 LibreOffice — DOCX 将使用内置引擎转换（还原度有限）；DOC 格式需要 LibreOffice。
            <a href="https://www.libreoffice.org" target="_blank" rel="noreferrer" className="tip-link">
              免费下载 LibreOffice
            </a>
            ，安装后前往「设置」配置路径可获得最佳还原效果。
          </span>
        </div>
      )}
      {libreFound === true && (
        <div className="tip tip--ok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>已检测到 LibreOffice，将使用高还原度模式转换</span>
        </div>
      )}
      <DropZone
        accept={[".docx", ".doc"]}
        disabled={status === "processing"}
        onFiles={handleFiles}
        hint="支持 .docx（推荐）和 .doc 格式"
      />
      <ConvertStatus
        status={status}
        progress={progress}
        progressStep={progressStep}
        message={message}
        resultPath={resultPath}
        steps={STEPS}
      />
      {(status === "success" || status === "error") && (
        <button type="button" className="btn-reset" onClick={reset}>
          继续转换
        </button>
      )}
    </PageShell>
  )
}
