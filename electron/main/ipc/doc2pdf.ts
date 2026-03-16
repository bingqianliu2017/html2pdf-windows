/**
 * Word to PDF IPC Handler
 * Purpose: Convert DOC/DOCX files to PDF.
 *   - Primary: LibreOffice headless (high fidelity, requires system installation)
 *   - Fallback for .docx: mammoth → HTML → Chromium printToPDF
 * Public methods: registerDoc2PdfIpc()
 * Dependencies: mammoth, electron BrowserWindow, node:child_process, settings, libreoffice utils
 */

import { ipcMain, BrowserWindow } from "electron"
import path from "node:path"
import os from "node:os"
import { existsSync, writeFileSync, unlinkSync } from "node:fs"
import { spawn } from "node:child_process"
import { loadSettings } from "../utils/settings"
import { detectLibreOffice } from "../utils/libreoffice"

export function registerDoc2PdfIpc(): void {
  ipcMain.handle("convert-doc-to-pdf", async (event, docPath: string) => {
    const send = (step: number, percent: number) =>
      event.sender.send("convert-progress", { step, percent })

    if (!existsSync(docPath)) throw new Error("文件不存在")

    const { outputDir, libreOfficePath } = loadSettings()
    const ext = path.extname(docPath).toLowerCase()
    const baseName = path.basename(docPath, ext)
    const pdfPath = path.join(outputDir, `${baseName}.pdf`)

    send(0, 10)

    const sofficePath = detectLibreOffice(libreOfficePath)
    if (sofficePath) {
      return convertWithLibreOffice(sofficePath, docPath, outputDir, pdfPath, send)
    }

    // Fallback: mammoth (DOCX only)
    if (ext !== ".docx") {
      throw new Error(
        ".doc 格式需要 LibreOffice 才能转换。请前往「设置」配置 LibreOffice 路径，或访问 https://www.libreoffice.org 免费下载安装。"
      )
    }

    return convertDocxWithMammoth(docPath, pdfPath, send)
  })

  ipcMain.handle("check-libreoffice", () => {
    const { libreOfficePath } = loadSettings()
    const found = detectLibreOffice(libreOfficePath)
    return { found: !!found, path: found }
  })
}

function convertWithLibreOffice(
  sofficePath: string,
  inputPath: string,
  outputDir: string,
  pdfPath: string,
  send: (step: number, percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    send(0, 20)
    const proc = spawn(sofficePath, [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ])

    const progressTimer1 = setTimeout(() => send(1, 50), 1200)
    const progressTimer2 = setTimeout(() => send(1, 80), 3500)

    proc.on("close", (code) => {
      clearTimeout(progressTimer1)
      clearTimeout(progressTimer2)
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
}

async function convertDocxWithMammoth(
  docxPath: string,
  pdfPath: string,
  send: (step: number, percent: number) => void
): Promise<string> {
  const mammoth = await import("mammoth")
  send(0, 25)

  const result = await mammoth.convertToHtml({ path: docxPath })

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: "SimSun", "宋体", serif; max-width: 800px; margin: 40px auto; line-height: 1.8; font-size: 14px; color: #111; }
  h1,h2,h3,h4,h5,h6 { font-family: "SimHei", "黑体", sans-serif; margin: 1em 0 0.5em; }
  p { margin: 0.5em 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  td, th { border: 1px solid #ccc; padding: 6px 10px; }
  th { background: #f5f5f5; font-weight: bold; }
  ul, ol { padding-left: 2em; }
  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #555; }
</style>
</head>
<body>${result.value}</body>
</html>`

  const tmpPath = path.join(os.tmpdir(), `dockit-${Date.now()}.html`)
  writeFileSync(tmpPath, html, "utf-8")
  send(1, 50)

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { webSecurity: false },
  })

  try {
    await printWin.loadFile(tmpPath)
    send(1, 75)
    await new Promise((r) => setTimeout(r, 800))

    const pdfData = await printWin.webContents.printToPDF({
      printBackground: false,
      margins: { marginType: "default" },
      pageSize: "A4",
    })

    send(2, 95)
    writeFileSync(pdfPath, pdfData)
    return pdfPath
  } finally {
    printWin.destroy()
    try {
      unlinkSync(tmpPath)
    } catch {
      // ignore cleanup errors
    }
  }
}
