import { app, BrowserWindow } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { registerWindowIpc } from "./ipc/window"
import { registerHtml2PdfIpc } from "./ipc/html2pdf"
import { registerDoc2PdfIpc } from "./ipc/doc2pdf"
import { registerPpt2PdfIpc } from "./ipc/ppt2pdf"
import { registerPdfMergeIpc } from "./ipc/pdfmerge"
import { registerImageToolsIpc } from "./ipc/imagetools"
import { registerLibreOfficeInstallerIpc } from "./ipc/libreoffice-installer"
import { registerPdf2OfficeIpc } from "./ipc/pdf2office"

// Suppress GPU shader disk cache errors (common in VM / RDP / restricted environments)
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache")
// Suppress DirectComposition warnings on systems without full DX12 support
app.commandLine.appendSwitch("disable-direct-composition")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "../..")

const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null
const preload = path.join(MAIN_DIST, "preload/index.mjs")
const indexHtml = path.join(RENDERER_DIST, "index.html")

async function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 660,
    minWidth: 840,
    minHeight: 560,
    title: "DocKit",
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
    if (url.startsWith("https:")) {
      import("electron").then(({ shell }) => shell.openExternal(url))
    }
    return { action: "deny" }
  })

  // Register all IPC handlers
  registerWindowIpc(win)
  registerHtml2PdfIpc()
  registerDoc2PdfIpc()
  registerPpt2PdfIpc()
  registerPdfMergeIpc()
  registerImageToolsIpc(RENDERER_DIST, VITE_DEV_SERVER_URL)
  registerLibreOfficeInstallerIpc()
  registerPdf2OfficeIpc()
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  win = null
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
