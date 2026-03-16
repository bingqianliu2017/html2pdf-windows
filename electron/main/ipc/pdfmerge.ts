/**
 * PDF Merge IPC Handler
 * Purpose: Merge multiple PDF files into one using pdf-lib (pure JS, zero native deps)
 * Public methods: registerPdfMergeIpc()
 * Dependencies: pdf-lib, node:fs, settings
 */

import { ipcMain } from "electron"
import path from "node:path"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { loadSettings } from "../utils/settings"

export function registerPdfMergeIpc(): void {
  ipcMain.handle("merge-pdfs", async (event, filePaths: string[]) => {
    const send = (step: number, percent: number) =>
      event.sender.send("convert-progress", { step, percent })

    if (!filePaths || filePaths.length < 2) {
      throw new Error("至少需要选择 2 个 PDF 文件")
    }

    for (const fp of filePaths) {
      if (!existsSync(fp)) throw new Error(`文件不存在：${path.basename(fp)}`)
    }

    const { PDFDocument } = await import("pdf-lib")
    const { outputDir } = loadSettings()
    send(0, 10)

    const merged = await PDFDocument.create()
    const total = filePaths.length

    for (let i = 0; i < total; i++) {
      const data = readFileSync(filePaths[i])
      const doc = await PDFDocument.load(data)
      const pages = await merged.copyPages(doc, doc.getPageIndices())
      pages.forEach((p) => merged.addPage(p))
      send(1, 10 + Math.round(((i + 1) / total) * 75))
    }

    send(2, 90)
    const pdfBytes = await merged.save()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const outPath = path.join(outputDir, `merged-${timestamp}.pdf`)
    writeFileSync(outPath, pdfBytes)

    return outPath
  })

  // Get page count for a PDF file
  ipcMain.handle("get-pdf-page-count", async (_, filePath: string) => {
    if (!existsSync(filePath)) return 0
    try {
      const { PDFDocument } = await import("pdf-lib")
      const data = readFileSync(filePath)
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  })
}
