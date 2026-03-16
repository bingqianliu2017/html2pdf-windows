import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../components/PageShell"
import { DropZone } from "../components/DropZone"
import { ConvertStatus } from "../components/ConvertStatus"
import { useConvert } from "../hooks/useConvert"

const STEPS = ["正在读取演示文稿…", "正在渲染页面…", "正在保存…"]

export function Ppt2Pdf() {
  const { status, progress, progressStep, message, resultPath, run, reset } = useConvert()
  const [libreFound, setLibreFound] = useState<boolean | null>(null)

  useEffect(() => {
    window.electronAPI?.checkLibreOffice().then((r) => setLibreFound(r.found))
  }, [])

  const handleFiles = useCallback(
    (paths: string[]) => {
      if (paths[0]) {
        run(() => window.electronAPI.convertPptToPdf(paths[0]), STEPS)
      }
    },
    [run]
  )

  return (
    <PageShell
      title="PPT → PDF"
      description="将 PPT / PPTX 演示文稿转换为 PDF，每张幻灯片对应一页"
    >
      {libreFound === false && (
        <div className="tip tip--error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>
            <strong>PPT 转换需要 LibreOffice（免费）</strong>，未检测到系统安装。
            请先
            <a href="https://www.libreoffice.org" target="_blank" rel="noreferrer" className="tip-link">
              下载并安装 LibreOffice
            </a>
            ，然后前往「设置」配置安装路径。
          </span>
        </div>
      )}
      {libreFound === true && (
        <div className="tip tip--ok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>已检测到 LibreOffice，可以开始转换</span>
        </div>
      )}
      <DropZone
        accept={[".pptx", ".ppt"]}
        disabled={status === "processing" || libreFound === false}
        onFiles={handleFiles}
        hint="支持 .pptx（推荐）和 .ppt 格式"
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
