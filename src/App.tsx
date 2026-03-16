import { useState } from "react"
import { TitleBar } from "./components/TitleBar"
import { Sidebar, type PageId } from "./components/Sidebar"
import { Html2Pdf } from "./pages/Html2Pdf"
import { Doc2Pdf } from "./pages/Doc2Pdf"
import { Ppt2Pdf } from "./pages/Ppt2Pdf"
import { PdfMerge } from "./pages/PdfMerge"
import { Pdf2Office } from "./pages/Pdf2Office"
import { ImageTools } from "./pages/ImageTools"
import { Settings } from "./pages/Settings"
import "./App.css"

function App() {
  const [page, setPage] = useState<PageId>("html2pdf")

  return (
    <div className="app">
      <TitleBar title="DocKit" />
      <div className="layout">
        <Sidebar current={page} onNavigate={setPage} />
        <main className="content">
          {page === "html2pdf"   && <Html2Pdf />}
          {page === "doc2pdf"    && <Doc2Pdf onGoToSettings={() => setPage("settings")} />}
          {page === "ppt2pdf"    && <Ppt2Pdf onGoToSettings={() => setPage("settings")} />}
          {page === "pdfmerge"   && <PdfMerge />}
          {page === "pdf2office" && <Pdf2Office onGoToSettings={() => setPage("settings")} />}
          {page === "imagetools" && <ImageTools />}
          {page === "settings"   && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default App
