import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../components/PageShell"
import { DropZone } from "../components/DropZone"
import { ConvertStatus } from "../components/ConvertStatus"
import { useConvert } from "../hooks/useConvert"

const STEPS = ["正在读取演示文稿…", "正在渲染页面…", "正在保存…"]

interface Ppt2PdfProps {
  onGoToSettings?: () => void
}

export function Ppt2Pdf({ onGoToSettings }: Ppt2PdfProps) {
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
        <div className="tip tip--warn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            未检测到 LibreOffice，PPT 转换暂不可用。
            {onGoToSettings ? (
              <>
                {" "}
                <button type="button" className="tip-link tip-link--btn" onClick={onGoToSettings}>
                  前往「设置」一键安装 LibreOffice（免费）
                </button>
                ，安装完成后即可使用。
              </>
            ) : (
              " 请前往「设置」一键安装 LibreOffice。"
            )}
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
