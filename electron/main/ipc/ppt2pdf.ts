/**
 * PowerPoint to PDF IPC Handler
 * Purpose: Convert PPT/PPTX files to PDF via LibreOffice headless (only viable free solution)
 * Public methods: registerPpt2PdfIpc()
 * Dependencies: node:child_process, settings, libreoffice utils
 */

import { ipcMain } from "electron"
import path from "node:path"
import os from "node:os"
import { existsSync, mkdirSync } from "node:fs"
import { spawn } from "node:child_process"
import { loadSettings } from "../utils/settings"
import { detectLibreOffice } from "../utils/libreoffice"

function libreOfficeProfileUrl(): string {
  const dir = path.join(os.tmpdir(), "dockit-libre-profile")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return "file:///" + path.resolve(dir).replace(/\\/g, "/")
}

export function registerPpt2PdfIpc(): void {
  ipcMain.handle("convert-ppt-to-pdf", async (event, pptPath: string) => {
    const send = (step: number, percent: number) =>
      event.sender.send("convert-progress", { step, percent })

    if (!existsSync(pptPath)) throw new Error("文件不存在")

    const { outputDir, libreOfficePath } = loadSettings()
    const ext = path.extname(pptPath).toLowerCase()
    const baseName = path.basename(pptPath, ext)
    const pdfPath = path.join(outputDir, `${baseName}.pdf`)

    const sofficePath = detectLibreOffice(libreOfficePath)
    if (!sofficePath) {
      throw new Error(
        "未检测到 LibreOffice。PPT/PPTX 转换需要 LibreOffice，请前往「设置」配置路径，或访问 https://www.libreoffice.org 免费下载安装（约 300MB）。"
      )
    }

    return new Promise<string>((resolve, reject) => {
      send(0, 10)
      const proc = spawn(sofficePath, [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        pptPath,
      ], {
        env: { ...process.env, UserInstallation: libreOfficeProfileUrl() },
        windowsHide: true,
      })

      const t1 = setTimeout(() => send(1, 35), 800)
      const t2 = setTimeout(() => send(1, 65), 2500)

      proc.on("close", (code) => {
        clearTimeout(t1)
        clearTimeout(t2)
        if (code === 0 && existsSync(pdfPath)) {
          send(2, 100)
          resolve(pdfPath)
        } else {
          reject(new Error(`LibreOffice 转换失败（退出码 ${code}）`))
        }
      })

      proc.on("error", (err) =>
        reject(new Error(`无法启动 LibreOffice: ${err.message}`))
      )
    })
  })
}
