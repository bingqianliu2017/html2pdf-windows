import { app, BrowserWindow, ipcMain, shell, dialog } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"
import os from "node:os"
import { writeFileSync, existsSync } from "node:fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "../..")
const MAIN_DIST = path.join(process.env.APP_ROOT!, "dist-electron")
const RENDERER_DIST = path.join(process.env.APP_ROOT!, "dist")
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null
const preload = path.join(MAIN_DIST, "preload/index.mjs")
const indexHtml = path.join(RENDERER_DIST, "index.html")

async function createWindow() {
  win = new BrowserWindow({
    width: 720,
    height: 560,
    minWidth: 480,
    minHeight: 400,
    title: "html2pdf-windows - HTML 转 PDF",
    frame: false,
    backgroundColor: "#0f1419",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url)
    return { action: "deny" }
  })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  win = null
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC: 窗口控制（无边框窗口）
ipcMain.handle("window-minimize", () => win?.minimize())
ipcMain.handle("window-maximize", () => {
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})
ipcMain.handle("window-close", () => win?.close())

// IPC: 将拖拽的 HTML 内容写入临时文件（当 file.path 不可用时）
ipcMain.handle("write-temp-html", async (_, contentBase64: string, filename: string) => {
  const tmpDir = os.tmpdir()
  const safeName = path.basename(filename, path.extname(filename)) + "-" + Date.now() + ".html"
  const tmpPath = path.join(tmpDir, safeName)
  const content = Buffer.from(contentBase64, "base64")
  writeFileSync(tmpPath, content)
  return tmpPath
})

// IPC: 打开文件（用系统默认程序）
ipcMain.handle("open-path", async (_, filePath: string) => {
  if (existsSync(filePath)) {
    await shell.openPath(filePath)
  }
})

// IPC: Show file open dialog
ipcMain.handle("show-open-dialog", async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ["openFile"],
    filters: [{ name: "HTML 文件", extensions: ["html", "htm"] }],
  })
  if (result.canceled) return null
  return result.filePaths[0] ?? null
})

// IPC: Convert HTML to PDF using Electron built-in (Chromium printToPDF) - 开箱即用，无需 Python
ipcMain.handle("convert-html-to-pdf", async (event, htmlPath: string) => {
  const sender = event.sender
  const sendProgress = (step: number, percent: number) => {
    sender.send("convert-progress", { step, percent })
  }

  if (!htmlPath || !existsSync(htmlPath)) {
    throw new Error("HTML 文件不存在")
  }

  const baseName = path.basename(htmlPath, path.extname(htmlPath))
  const desktopPath = path.join(os.homedir(), "Desktop")
  const pdfPath = path.join(desktopPath, `${baseName}.pdf`)

  sendProgress(0, 10) // 加载中

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  try {
    await printWin.loadFile(htmlPath)
    sendProgress(1, 40)

    // 等待远程图片等资源加载完成
    await new Promise((r) => setTimeout(r, 1500))
    sendProgress(1, 60)

    const pdfData = await printWin.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: "none" },
      pageSize: "A4",
    })

    sendProgress(2, 90) // 保存中

    writeFileSync(pdfPath, pdfData)

    return pdfPath
  } finally {
    printWin.destroy()
  }
})
