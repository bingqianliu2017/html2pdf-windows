import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  showOpenDialog: () => ipcRenderer.invoke("show-open-dialog"),
  writeTempHtml: (contentBase64: string, filename: string) =>
    ipcRenderer.invoke("write-temp-html", contentBase64, filename),
  convertHtmlToPdf: (htmlPath: string) => ipcRenderer.invoke("convert-html-to-pdf", htmlPath),
  openPath: (filePath: string) => ipcRenderer.invoke("open-path", filePath),
  onConvertProgress: (callback: (data: { step: number; percent: number }) => void) => {
    const handler = (_: unknown, data: { step: number; percent: number }) => callback(data)
    ipcRenderer.on("convert-progress", handler)
    return () => ipcRenderer.removeListener("convert-progress", handler)
  },
})
