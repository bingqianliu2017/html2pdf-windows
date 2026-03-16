import type { ConvertStatus as Status } from "../hooks/useConvert"

interface ConvertStatusProps {
  status: Status
  progress: number
  progressStep: number
  message: string
  resultPath?: string | null
  steps?: string[]
}

export function ConvertStatus({
  status,
  progress,
  progressStep,
  message,
  resultPath,
  steps = ["正在处理…", "生成中…", "保存中…"],
}: ConvertStatusProps) {
  if (status === "idle") return null

  if (status === "processing") {
    return (
      <div className="convert-status">
        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-info">
          <span className="progress-step">{steps[progressStep] ?? "处理中…"}</span>
          <span className="progress-percent">{progress}%</span>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="status-message status-message--success">
        <svg className="status-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="status-text">
          {message}
          {resultPath && (
            <button
              type="button"
              className="btn-link"
              onClick={() => window.electronAPI?.openPath(resultPath)}
            >
              点击打开
            </button>
          )}
        </span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="status-message status-message--error">
        <svg className="status-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span className="status-text">{message}</span>
      </div>
    )
  }

  return null
}
