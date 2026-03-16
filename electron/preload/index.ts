import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),

  // File system helpers
  openPath: (filePath: string) => ipcRenderer.invoke("open-path", filePath),
  showOpenDialog: (options: {
    filters?: { name: string; extensions: string[] }[]
    multiple?: boolean
    title?: string
  }) => ipcRenderer.invoke("show-open-dialog", options),
  selectOutputDir: () => ipcRenderer.invoke("select-output-dir"),

  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (partial: Record<string, string>) =>
    ipcRenderer.invoke("save-settings", partial),

  // HTML → PDF
  writeTempHtml: (contentBase64: string, filename: string) =>
    ipcRenderer.invoke("write-temp-html", contentBase64, filename),
  convertHtmlToPdf: (htmlPath: string) =>
    ipcRenderer.invoke("convert-html-to-pdf", htmlPath),

  // Word → PDF
  convertDocToPdf: (docPath: string) =>
    ipcRenderer.invoke("convert-doc-to-pdf", docPath),
  checkLibreOffice: () => ipcRenderer.invoke("check-libreoffice"),

  // PPT → PDF
  convertPptToPdf: (pptPath: string) =>
    ipcRenderer.invoke("convert-ppt-to-pdf", pptPath),

  // PDF Merge
  mergePdfs: (filePaths: string[]) => ipcRenderer.invoke("merge-pdfs", filePaths),
  getPdfPageCount: (filePath: string) =>
    ipcRenderer.invoke("get-pdf-page-count", filePath),

  // PDF → Word / HTML / PPT
  convertPdfToOffice: (pdfPath: string, format: "docx" | "html" | "pptx") =>
    ipcRenderer.invoke("convert-pdf-to-office", pdfPath, format),

  // Image Tools
  processImages: (tasks: unknown[]) => ipcRenderer.invoke("process-images", tasks),

  // LibreOffice installer
  installLibreOffice: () => ipcRenderer.invoke("install-libreoffice"),
  getLibreDownloadUrl: () => ipcRenderer.invoke("get-libre-download-url"),
  onLibreInstallProgress: (
    callback: (data: { stage: string; percent: number; message: string }) => void
  ) => {
    const handler = (_: unknown, data: { stage: string; percent: number; message: string }) =>
      callback(data)
    ipcRenderer.on("libre-install-progress", handler)
    return () => ipcRenderer.removeListener("libre-install-progress", handler)
  },

  // Progress event listeners
  onConvertProgress: (
    callback: (data: { step: number; percent: number }) => void
  ) => {
    const handler = (_: unknown, data: { step: number; percent: number }) =>
      callback(data)
    ipcRenderer.on("convert-progress", handler)
    return () => ipcRenderer.removeListener("convert-progress", handler)
  },

  onImageProgress: (
    callback: (data: { current: number; total: number }) => void
  ) => {
    const handler = (_: unknown, data: { current: number; total: number }) =>
      callback(data)
    ipcRenderer.on("image-progress", handler)
    return () => ipcRenderer.removeListener("image-progress", handler)
  },
})
