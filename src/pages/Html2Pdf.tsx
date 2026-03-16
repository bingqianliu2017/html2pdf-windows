import { useCallback } from "react"
import { PageShell } from "../components/PageShell"
import { DropZone } from "../components/DropZone"
import { ConvertStatus } from "../components/ConvertStatus"
import { useConvert } from "../hooks/useConvert"

const STEPS = ["正在加载文件…", "正在生成 PDF…", "正在保存…"]

export function Html2Pdf() {
  const { status, progress, progressStep, message, resultPath, run, reset } = useConvert()

  const handleFiles = useCallback(
    (paths: string[]) => {
      if (paths[0]) {
        run(() => window.electronAPI.convertHtmlToPdf(paths[0]), STEPS)
      }
    },
    [run]
  )

  return (
    <PageShell
      title="HTML → PDF"
      description="将 HTML 文件转换为 PDF，完美保留 CSS 样式，由 Chromium 引擎渲染"
    >
      <DropZone
        accept={[".html", ".htm"]}
        disabled={status === "processing"}
        onFiles={handleFiles}
        hint="单文件转换，支持内联样式、外部 CSS、图片"
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
