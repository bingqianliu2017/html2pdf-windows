export interface ImageTask {
  inputPath: string
  outputFormat: "jpeg" | "png" | "webp" | "avif"
  quality: number
  maxDimension: number
}

export interface ImageResult {
  inputPath: string
  outputPath: string
  success: boolean
  error?: string
}

export interface AppSettings {
  outputDir: string
  libreOfficePath: string
}

declare global {
  interface Window {
    electronAPI: {
      // Window controls
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>

      // File system
      openPath: (filePath: string) => Promise<void>
      showOpenDialog: (options: {
        filters?: { name: string; extensions: string[] }[]
        multiple?: boolean
        title?: string
      }) => Promise<string[] | null>
      selectOutputDir: () => Promise<string | null>

      // Settings
      getSettings: () => Promise<AppSettings>
      saveSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>

      // HTML → PDF
      writeTempHtml: (contentBase64: string, filename: string) => Promise<string>
      convertHtmlToPdf: (htmlPath: string) => Promise<string>

      // Word → PDF
      convertDocToPdf: (docPath: string) => Promise<string>
      checkLibreOffice: () => Promise<{ found: boolean; path: string | null }>

      // PPT → PDF
      convertPptToPdf: (pptPath: string) => Promise<string>

      // PDF Merge
      mergePdfs: (filePaths: string[]) => Promise<string>
      getPdfPageCount: (filePath: string) => Promise<number>

      // PDF → Word / HTML / PPT
      convertPdfToOffice: (
        pdfPath: string,
        format: "docx" | "html" | "pptx"
      ) => Promise<{ success: boolean; outputPath: string; error?: string }>

      // Image Tools
      processImages: (tasks: ImageTask[]) => Promise<ImageResult[]>

      // LibreOffice installer
      installLibreOffice: () => Promise<{ success: boolean; path: string | null }>
      getLibreDownloadUrl: () => Promise<string>
      onLibreInstallProgress: (
        callback: (data: { stage: string; percent: number; message: string }) => void
      ) => () => void

      // Events
      onConvertProgress: (
        callback: (data: { step: number; percent: number }) => void
      ) => () => void
      onImageProgress: (
        callback: (data: { current: number; total: number }) => void
      ) => () => void
    }
  }
}
