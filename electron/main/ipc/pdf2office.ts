/**
 * PDF to Office IPC Handler
 * Purpose: Convert PDF to Word (DOCX), HTML, or PPTX via LibreOffice headless.
 *   Uses writer_pdf_import so Writer opens the PDF; then --convert-to docx/html/pptx.
 * Public methods: registerPdf2OfficeIpc()
 * Dependencies: node:child_process, settings, libreoffice utils
 */

import { ipcMain } from "electron"
import path from "node:path"
import os from "node:os"
import { existsSync, mkdirSync } from "node:fs"
import { spawn } from "node:child_process"
import { loadSettings } from "../utils/settings"
import { detectLibreOffice } from "../utils/libreoffice"

const PDF_INFILTER = "writer_pdf_import"

function libreOfficeProfileUrl(): string {
  const dir = path.join(os.tmpdir(), "dockit-libre-profile")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return "file:///" + path.resolve(dir).replace(/\\/g, "/")
}

export type Pdf2OfficeFormat = "docx" | "html" | "pptx"

export function registerPdf2OfficeIpc(): void {
  ipcMain.handle(
    "convert-pdf-to-office",
    async (
      _,
      pdfPath: string,
      format: Pdf2OfficeFormat
    ): Promise<{ success: boolean; outputPath: string; error?: string }> => {
      if (!pdfPath || !existsSync(pdfPath))
        return { success: false, outputPath: "", error: "文件不存在" }

      const ext = path.extname(pdfPath).toLowerCase()
      if (ext !== ".pdf")
        return { success: false, outputPath: "", error: "请选择 PDF 文件" }

      const sofficePath = detectLibreOffice(loadSettings().libreOfficePath)
      if (!sofficePath)
        return {
          success: false,
          outputPath: "",
          error: "未检测到 LibreOffice，PDF 转 Word/HTML/PPT 需要 LibreOffice。请前往「设置」一键安装或配置路径。",
        }

      const { outputDir } = loadSettings()
      const baseName = path.basename(pdfPath, ".pdf")
      const outExt = format === "docx" ? "docx" : format === "pptx" ? "pptx" : "html"
      const outputPath = path.join(outputDir, `${baseName}.${outExt}`)

      return new Promise((resolve) => {
        const args = [
          "--headless",
          "--infilter",
          PDF_INFILTER,
          "--convert-to",
          outExt,
          "--outdir",
          outputDir,
          pdfPath,
        ]

        const proc = spawn(sofficePath, args, {
          env: { ...process.env, UserInstallation: libreOfficeProfileUrl() },
          windowsHide: true,
        })

        proc.on("close", (code) => {
          if (code === 0 && existsSync(outputPath))
            resolve({ success: true, outputPath })
          else
            resolve({
              success: false,
              outputPath: "",
              error: code !== 0 ? `LibreOffice 退出码 ${code}` : "未生成输出文件",
            })
        })

        proc.on("error", (err) =>
          resolve({
            success: false,
            outputPath: "",
            error: `无法启动 LibreOffice: ${err.message}`,
          })
        )
      })
    }
  )
}
