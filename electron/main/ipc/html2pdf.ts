/**
 * HTML to PDF IPC Handler
 * Purpose: Convert local HTML files to PDF using Electron's built-in Chromium printToPDF
 * Public methods: registerHtml2PdfIpc()
 * Dependencies: electron BrowserWindow, node:fs, node:os, settings
 */

import { ipcMain, BrowserWindow } from "electron"
import path from "node:path"
import os from "node:os"
import { existsSync, writeFileSync } from "node:fs"
import { loadSettings } from "../utils/settings"

export function registerHtml2PdfIpc(): void {
  // Write dragged HTML content (as base64) to a temp file when file.path is unavailable
  ipcMain.handle("write-temp-html", async (_, contentBase64: string, filename: string) => {
    const safeName = path.basename(filename, path.extname(filename)) + "-" + Date.now() + ".html"
    const tmpPath = path.join(os.tmpdir(), safeName)
    writeFileSync(tmpPath, Buffer.from(contentBase64, "base64"))
    return tmpPath
  })

  ipcMain.handle("convert-html-to-pdf", async (event, htmlPath: string) => {
    const send = (step: number, percent: number) =>
      event.sender.send("convert-progress", { step, percent })

    if (!htmlPath || !existsSync(htmlPath)) throw new Error("HTML 文件不存在")

    const { outputDir } = loadSettings()
    const baseName = path.basename(htmlPath, path.extname(htmlPath))
    const pdfPath = path.join(outputDir, `${baseName}.pdf`)

    send(0, 10)
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { webSecurity: true, allowRunningInsecureContent: false },
    })

    try {
      await printWin.loadFile(htmlPath)
      send(1, 40)
      await new Promise((r) => setTimeout(r, 1500))
      send(1, 65)

      const pdfData = await printWin.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: "none" },
        pageSize: "A4",
      })

      send(2, 90)
      writeFileSync(pdfPath, pdfData)
      return pdfPath
    } finally {
      printWin.destroy()
    }
  })
}
