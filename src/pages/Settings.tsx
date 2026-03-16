import { useCallback, useEffect, useRef, useState } from "react"
import { PageShell } from "../components/PageShell"
import type { AppSettings } from "../types/electron"

/** 赞助/捐赠链接，可改为 爱发电、Ko-fi 等 */
const DONATION_URL = "https://github.com/sponsors/bingqianliu2017"

type SaveState = "idle" | "saving" | "saved" | "error"
type LibreStatus = "unknown" | "checking" | "found" | "not-found"
type InstallState = "idle" | "downloading" | "installing" | "done" | "error"

export function Settings() {
  const [outputDir, setOutputDir] = useState("")
  const [libreOfficePath, setLibreOfficePath] = useState("")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [libreStatus, setLibreStatus] = useState<LibreStatus>("unknown")
  const [libreDetectedPath, setLibreDetectedPath] = useState<string | null>(null)

  const [installState, setInstallState] = useState<InstallState>("idle")
  const [installPercent, setInstallPercent] = useState(0)
  const [installMessage, setInstallMessage] = useState("")
  const unsubInstall = useRef<(() => void) | null>(null)

  useEffect(() => {
    window.electronAPI?.getSettings().then((s: AppSettings) => {
      setOutputDir(s.outputDir)
      setLibreOfficePath(s.libreOfficePath)
    })
    window.electronAPI?.checkLibreOffice().then((r) => {
      if (r.found && r.path) {
        setLibreStatus("found")
        setLibreDetectedPath(r.path)
      } else {
        setLibreStatus("not-found")
      }
    })

    return () => {
      unsubInstall.current?.()
    }
  }, [])

  const handleBrowseOutput = useCallback(async () => {
    const dir = await window.electronAPI?.selectOutputDir()
    if (dir) setOutputDir(dir)
  }, [])

  const handleBrowseLibre = useCallback(async () => {
    const result = await window.electronAPI?.showOpenDialog({
      filters: [{ name: "LibreOffice soffice.exe", extensions: ["exe"] }],
      title: "选择 soffice.exe（在 LibreOffice 安装目录的 program 子文件夹内）",
    })
    if (result?.[0]) {
      setLibreOfficePath(result[0])
      setLibreStatus("unknown")
    }
  }, [])

  const handleDetect = useCallback(async () => {
    setLibreStatus("checking")
    const r = await window.electronAPI?.checkLibreOffice()
    if (r?.found && r.path) {
      setLibreStatus("found")
      setLibreDetectedPath(r.path)
      setLibreOfficePath(r.path)
    } else {
      setLibreStatus("not-found")
      setLibreDetectedPath(null)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    setInstallState("downloading")
    setInstallPercent(0)
    setInstallMessage("正在准备…")

    // Subscribe to install progress events
    unsubInstall.current?.()
    unsubInstall.current = window.electronAPI?.onLibreInstallProgress(({ stage, percent, message }) => {
      setInstallPercent(percent)
      setInstallMessage(message)
      if (stage === "download") setInstallState("downloading")
      else if (stage === "install") setInstallState("installing")
      else if (stage === "done") setInstallState("done")
      else if (stage === "error") setInstallState("error")
    })

    try {
      await window.electronAPI?.installLibreOffice()
      setInstallState("done")
      setInstallPercent(100)
      // Re-detect after install
      const r = await window.electronAPI?.checkLibreOffice()
      if (r?.found && r.path) {
        setLibreStatus("found")
        setLibreDetectedPath(r.path)
        setLibreOfficePath(r.path)
      }
    } catch (err) {
      setInstallState("error")
      setInstallMessage(err instanceof Error ? err.message : "安装失败，请重试")
    }
  }, [])

  const handleSave = useCallback(async () => {
    setSaveState("saving")
    try {
      await window.electronAPI?.saveSettings({ outputDir, libreOfficePath })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 2500)
    } catch {
      setSaveState("error")
      setTimeout(() => setSaveState("idle"), 2500)
    }
  }, [outputDir, libreOfficePath])

  const isInstalling = installState === "downloading" || installState === "installing"

  return (
    <PageShell title="设置" description="配置输出目录和第三方工具路径">
      <div className="settings-form">

        {/* ── Output directory ──────────────────────────────── */}
        <div className="settings-section">
          <h2 className="settings-section-title">输出目录</h2>
          <p className="settings-section-desc">所有转换结果保存到此目录（默认为桌面）</p>
          <div className="settings-row">
            <input
              type="text"
              className="settings-input"
              value={outputDir}
              readOnly
              placeholder="C:\Users\...\Desktop"
            />
            <button type="button" className="btn-secondary" onClick={handleBrowseOutput}>
              浏览
            </button>
          </div>
        </div>

        <div className="settings-divider" />

        {/* ── LibreOffice ───────────────────────────────────── */}
        <div className="settings-section">
          <h2 className="settings-section-title">LibreOffice</h2>
          <p className="settings-section-desc">
            用于 Word / PPT 高还原度转换。可一键自动安装，或检测已有安装。
          </p>

          {/* Status badge */}
          {libreStatus === "found" && (
            <div className="tip tip--ok" style={{ marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>
                已找到 LibreOffice
                <span className="libre-path-badge">{libreDetectedPath}</span>
              </span>
            </div>
          )}

          {libreStatus === "not-found" && installState === "idle" && (
            <div className="tip tip--warn" style={{ marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>未检测到 LibreOffice，Word / PPT 转换功能暂不可用。</span>
            </div>
          )}

          {/* ── One-click install panel ── */}
          {libreStatus === "not-found" && (
            <div className="libre-install-panel">
              <div className="libre-install-panel-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <div>
                  <p className="libre-install-title">一键安装 LibreOffice（免费，约 350 MB）</p>
                  <p className="libre-install-desc">自动下载并静默安装，全程无需手动操作，安装完成后立即可用。</p>
                </div>
              </div>

              {/* Progress */}
              {isInstalling && (
                <div className="libre-install-progress">
                  <div className="progress-wrap">
                    <div className="progress-bar" style={{ width: `${installPercent}%` }} />
                  </div>
                  <div className="progress-info">
                    <span className="progress-step">{installMessage}</span>
                    <span className="progress-percent">{installPercent}%</span>
                  </div>
                  <p className="libre-install-note">
                    {installState === "downloading"
                      ? "正在从 LibreOffice 官方服务器下载，请保持网络连接…"
                      : "正在安装中，请勿关闭应用…"}
                  </p>
                </div>
              )}

              {installState === "done" && (
                <div className="tip tip--ok" style={{ marginTop: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>安装成功！Word / PPT 转换功能已就绪。</span>
                </div>
              )}

              {installState === "error" && (
                <div className="tip tip--warn" style={{ marginTop: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span>{installMessage}</span>
                </div>
              )}

              <div className="libre-install-actions">
                <button
                  type="button"
                  className="btn-primary btn-large"
                  onClick={handleInstall}
                  disabled={isInstalling}
                >
                  {isInstalling
                    ? (installState === "downloading" ? "下载中…" : "安装中…")
                    : installState === "error"
                      ? "重试安装"
                      : "一键安装 LibreOffice"}
                </button>
                <span className="libre-install-hint">
                  需要网络连接 · 安装到系统（所有用户）· 来源：libreoffice.org
                </span>
              </div>
            </div>
          )}

          {/* Manual detect / custom path (always visible as secondary option) */}
          <div className="settings-section-sub">
            <p className="settings-section-desc" style={{ marginBottom: 8 }}>
              已手动安装？填写路径或点击检测：
            </p>
            <div className="settings-row">
              <input
                type="text"
                className="settings-input"
                value={libreOfficePath}
                onChange={(e) => { setLibreOfficePath(e.target.value); setLibreStatus("unknown") }}
                placeholder="留空则自动检测 — 或手动填写 soffice.exe 完整路径"
              />
              <button type="button" className="btn-secondary" onClick={handleBrowseLibre}>
                浏览
              </button>
            </div>
            <div className="settings-actions-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDetect}
                disabled={libreStatus === "checking" || isInstalling}
              >
                {libreStatus === "checking" ? "检测中…" : "自动检测"}
              </button>
              {libreStatus === "found" && (
                <span className="detect-result detect-result--ok">✓ 检测成功</span>
              )}
              {libreStatus === "not-found" && installState === "idle" && (
                <span className="detect-result detect-result--error">✗ 未找到</span>
              )}
            </div>
          </div>
        </div>

        <div className="settings-divider" />

        {/* ── Save ──────────────────────────────────────────── */}
        <div className="settings-footer">
          <button
            type="button"
            className="btn-primary btn-large"
            onClick={handleSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" && "保存中…"}
            {saveState === "saved" && "✓ 已保存"}
            {saveState === "error" && "保存失败，请重试"}
            {saveState === "idle" && "保存设置"}
          </button>
        </div>

        {/* ── 赞助 / 捐赠 ───────────────────────────────────── */}
        <div className="settings-about settings-donation">
          <p className="settings-donation-title">请我喝杯咖啡</p>
          <p className="settings-donation-desc">
            如果 DocKit 对你有帮助，欢迎通过赞助支持后续开发与维护。
          </p>
          <button
            type="button"
            className="btn-donation"
            onClick={() => window.electronAPI?.openExternal(DONATION_URL)}
          >
            <span className="btn-donation-icon">☕</span>
            赞助开发
          </button>
        </div>

        {/* ── About ─────────────────────────────────────────── */}
        <div className="settings-about">
          <p>
            DocKit v2.0 · MIT License ·{" "}
            <a href="https://github.com/bingqianliu2017/html2pdf-windows" target="_blank" rel="noreferrer" className="settings-link">
              GitHub
            </a>
          </p>
          <p className="settings-about-tech">
            HTML→PDF: Chromium printToPDF · Word→PDF: mammoth / LibreOffice · PPT→PDF: LibreOffice ·
            图片: Canvas API · PDF合并: pdf-lib
          </p>
        </div>
      </div>
    </PageShell>
  )
}
