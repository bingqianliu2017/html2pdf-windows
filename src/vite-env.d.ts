/// <reference types="vite/client" />

interface ElectronAPI {
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  showOpenDialog: () => Promise<string | null>
  writeTempHtml: (contentBase64: string, filename: string) => Promise<string>
  convertHtmlToPdf: (htmlPath: string) => Promise<string>
  openPath: (filePath: string) => Promise<void>
  onConvertProgress: (callback: (data: { step: number; percent: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
