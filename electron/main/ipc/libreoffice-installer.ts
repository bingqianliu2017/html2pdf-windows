/**
 * LibreOffice Auto-Installer IPC Handler
 * Purpose: Download and silently install LibreOffice in the background.
 *   Progress events are streamed to the renderer via "libre-install-progress".
 * Public methods: registerLibreOfficeInstallerIpc()
 * Dependencies: node:https, node:fs, node:child_process, node:os, node:path
 */

import { ipcMain, BrowserWindow } from "electron"
import https from "node:https"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { spawn } from "node:child_process"
import { detectLibreOffice } from "../utils/libreoffice"

const LIBRE_VERSION = "26.2.1"
const LIBRE_MSI_URL =
  `https://download.documentfoundation.org/libreoffice/stable/${LIBRE_VERSION}/win/x86_64/LibreOffice_${LIBRE_VERSION}_Win_x86-64.msi`
const MSI_FILENAME = `LibreOffice_${LIBRE_VERSION}_Win_x86-64.msi`

export function registerLibreOfficeInstallerIpc(): void {
  ipcMain.handle("install-libreoffice", async () => {
    const send = (stage: string, percent: number, message: string) => {
      // Send to all renderer windows
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("libre-install-progress", { stage, percent, message })
      })
    }

    const msiPath = path.join(os.tmpdir(), MSI_FILENAME)

    try {
      // ── Step 1: Download ─────────────────────────────────────
      send("download", 0, "正在连接下载服务器…")

      await downloadFile(LIBRE_MSI_URL, msiPath, (downloaded, total) => {
        const pct = total > 0 ? Math.round((downloaded / total) * 70) : 0
        const dlMB = (downloaded / 1024 / 1024).toFixed(0)
        const totalMB = total > 0 ? (total / 1024 / 1024).toFixed(0) : "?"
        send("download", pct, `正在下载… ${dlMB} / ${totalMB} MB`)
      })

      send("install", 72, "下载完成，正在静默安装…")

      // ── Step 2: Silent install ────────────────────────────────
      await installMsi(msiPath, (pct, msg) => {
        send("install", 72 + Math.round(pct * 0.25), msg)
      })

      send("install", 98, "安装完成，正在检测…")

      // ── Step 3: Verify ────────────────────────────────────────
      const found = detectLibreOffice()
      if (!found) {
        // Sometimes the install needs a moment to finalize
        await new Promise((r) => setTimeout(r, 2000))
        const found2 = detectLibreOffice()
        if (!found2) {
          throw new Error("安装流程完成但未能检测到 soffice.exe，请重启应用或手动配置路径。")
        }
      }

      send("done", 100, "LibreOffice 安装成功！")
      return { success: true, path: detectLibreOffice() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      send("error", 0, `安装失败：${msg}`)
      // Clean up partial download
      try { fs.unlinkSync(msiPath) } catch { /* ignore */ }
      throw err
    }
  })

  ipcMain.handle("get-libre-download-url", () => LIBRE_MSI_URL)
}

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadFile(
  url: string,
  dest: string,
  onProgress: (downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error("Too many redirects"))
        return
      }

      const lib = requestUrl.startsWith("https://") ? https : http
      lib.get(requestUrl, (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location, redirectCount + 1)
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} downloading LibreOffice`))
          return
        }

        const total = parseInt(res.headers["content-length"] ?? "0", 10)
        let downloaded = 0
        const file = fs.createWriteStream(dest)

        res.on("data", (chunk: Buffer) => {
          downloaded += chunk.length
          onProgress(downloaded, total)
        })

        res.pipe(file)
        file.on("finish", () => file.close(() => resolve()))
        file.on("error", (err) => {
          fs.unlink(dest, () => {})
          reject(err)
        })
      }).on("error", reject)
    }

    doRequest(url)
  })
}

// ─── MSI silent install helper ────────────────────────────────────────────────

function installMsi(
  msiPath: string,
  onProgress: (pct: number, msg: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    onProgress(0, "正在静默安装 LibreOffice（约 1-3 分钟）…")

    const proc = spawn("msiexec.exe", [
      "/i", msiPath,
      "/qn",          // Quiet, no UI
      "/norestart",   // Do not reboot automatically
      "ALLUSERS=1",   // Install for all users
    ], { windowsHide: true })

    let progressTick = 10
    const ticker = setInterval(() => {
      if (progressTick < 95) {
        progressTick += 5
        onProgress(progressTick, `正在安装中… ${progressTick}%`)
      }
    }, 3000)

    proc.on("close", (code) => {
      clearInterval(ticker)
      if (code === 0 || code === 3010) {
        // 3010 = success, reboot required (we suppress reboot)
        onProgress(100, "安装完成")
        resolve()
      } else {
        reject(new Error(`msiexec 退出码 ${code}。请以管理员身份运行应用或手动安装 LibreOffice。`))
      }
    })

    proc.on("error", (err) => {
      clearInterval(ticker)
      reject(new Error(`无法启动安装程序: ${err.message}`))
    })
  })
}
