/**
 * Image Tools IPC Handler
 * Purpose: Image compression and format conversion using a hidden BrowserWindow with Canvas API.
 *   Zero extra npm dependencies — leverages Chromium's built-in image codecs.
 *   Supports: read JPEG/PNG/WebP/AVIF/GIF/BMP/TIFF, write JPEG/PNG/WebP/AVIF
 * Public methods: registerImageToolsIpc(rendererDist, devServerUrl)
 * Dependencies: electron BrowserWindow, node:fs, node:url, settings
 */

import { ipcMain, BrowserWindow } from "electron"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { existsSync, writeFileSync } from "node:fs"
import { loadSettings } from "../utils/settings"

export interface ImageTask {
  inputPath: string
  outputFormat: "jpeg" | "png" | "webp" | "avif"
  quality: number      // 1–100
  maxDimension: number // 0 = no resize
}

export interface ImageResult {
  inputPath: string
  outputPath: string
  success: boolean
  error?: string
}

let processorWin: BrowserWindow | null = null

function getProcessorWin(rendererDist: string, devServerUrl: string | undefined): BrowserWindow {
  if (processorWin && !processorWin.isDestroyed()) return processorWin

  processorWin = new BrowserWindow({
    show: false,
    webPreferences: {
      webSecurity: false, // Required to load file:// URLs for local images
      nodeIntegration: false,
      contextIsolation: false, // Allow executeJavaScript to access window globals
    },
  })

  if (devServerUrl) {
    processorWin.loadURL(devServerUrl + "image-processor.html")
  } else {
    processorWin.loadFile(path.join(rendererDist, "image-processor.html"))
  }

  processorWin.on("closed", () => { processorWin = null })
  return processorWin
}

export function registerImageToolsIpc(rendererDist: string, devServerUrl: string | undefined): void {
  ipcMain.handle("process-images", async (event, tasks: ImageTask[]) => {
    if (!tasks || tasks.length === 0) throw new Error("未选择任何文件")

    const send = (current: number, total: number) =>
      event.sender.send("image-progress", { current, total })

    const win = getProcessorWin(rendererDist, devServerUrl)

    // Wait for processor window to be ready
    if (win.webContents.isLoading()) {
      await new Promise<void>((resolve) => {
        win.webContents.once("did-finish-load", () => resolve())
      })
    }

    const { outputDir } = loadSettings()
    const results: ImageResult[] = []

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      send(i, tasks.length)

      if (!existsSync(task.inputPath)) {
        results.push({
          inputPath: task.inputPath,
          outputPath: "",
          success: false,
          error: "文件不存在",
        })
        continue
      }

      try {
        const fileUrl = pathToFileURL(task.inputPath).href
        const params = JSON.stringify({
          fileUrl,
          outputFormat: task.outputFormat,
          quality: task.quality,
          maxDimension: task.maxDimension,
        })

        const result = await win.webContents.executeJavaScript(
          `window.__processImage(${params})`
        ) as { success: boolean; data?: string; error?: string }

        if (!result.success || !result.data) {
          throw new Error(result.error ?? "图片处理失败")
        }

        const inputExt = path.extname(task.inputPath)
        const baseName = path.basename(task.inputPath, inputExt)
        const outExt = task.outputFormat === "jpeg" ? "jpg" : task.outputFormat
        const suffix = task.outputFormat === inputExt.slice(1).toLowerCase() ? "_compressed" : ""
        const outPath = path.join(outputDir, `${baseName}${suffix}.${outExt}`)

        writeFileSync(outPath, Buffer.from(result.data, "base64"))
        results.push({ inputPath: task.inputPath, outputPath: outPath, success: true })
      } catch (err) {
        results.push({
          inputPath: task.inputPath,
          outputPath: "",
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    send(tasks.length, tasks.length)
    return results
  })
}
