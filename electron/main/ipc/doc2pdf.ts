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
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs"
import { spawn } from "node:child_process"
import { loadSettings } from "../utils/settings"
import { detectLibreOffice } from "../utils/libreoffice"

/**
 * Build file:// URL for LibreOffice UserInstallation.
 * Using a clean profile avoids user-customized paragraph/line spacing that can increase page count.
 * If page count still differs from Word, install the same fonts as in the document (font substitution can change line breaks).
 */
function libreOfficeProfileUrl(): string {
  const dir = path.join(os.tmpdir(), "dockit-libre-profile")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const absolute = path.resolve(dir)
  return "file:///" + absolute.replace(/\\/g, "/")
}

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
    const profileUrl = libreOfficeProfileUrl()
    const proc = spawn(sofficePath, [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ], {
      env: { ...process.env, UserInstallation: profileUrl },
      windowsHide: true,
    })

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

  // Layout tuned for 1:1 page match with Word: tight line-height and margins,
  // @page for print so PDF uses same content area as typical Word A4.
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2cm; }
  body {
    font-family: "SimSun", "宋体", serif;
    max-width: 21cm;
    margin: 0 auto;
    padding: 0 0.5rem;
    line-height: 1.35;
    font-size: 14px;
    color: #111;
  }
  @media print {
    body { margin: 0; padding: 0; max-width: none; }
  }
  h1,h2,h3,h4,h5,h6 { font-family: "SimHei", "黑体", sans-serif; margin: 0.6em 0 0.35em; }
  p { margin: 0.25em 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
  th { background: #f5f5f5; font-weight: bold; }
  ul, ol { padding-left: 1.5em; }
  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 0.8em; color: #555; }
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

    // Use 2cm margins (20000 microns) to match typical Word; @page in HTML backs this up.
    const pdfData = await printWin.webContents.printToPDF({
      printBackground: false,
      margins: {
        marginType: "custom",
        top: 20000,
        bottom: 20000,
        left: 20000,
        right: 20000,
      },
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
