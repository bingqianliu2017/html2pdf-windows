interface TitleBarProps {
  title?: string
}

export function TitleBar({ title = "DocKit" }: TitleBarProps) {
  return (
    <div className="title-bar">
      <span className="title-bar-drag">{title}</span>
      <div className="title-bar-controls">
        <button
          type="button"
          className="title-bar-btn"
          onClick={() => window.electronAPI?.windowMinimize()}
          aria-label="最小化"
        >
          <svg width="10" height="10" viewBox="0 0 12 12">
            <rect x="0" y="5" width="12" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="title-bar-btn"
          onClick={() => window.electronAPI?.windowMaximize()}
          aria-label="最大化"
        >
          <svg width="10" height="10" viewBox="0 0 12 12">
            <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          type="button"
          className="title-bar-btn title-bar-btn--close"
          onClick={() => window.electronAPI?.windowClose()}
          aria-label="关闭"
        >
          <svg width="10" height="10" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  )
}
