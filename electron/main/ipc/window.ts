/**
 * Window IPC Handlers
 * Purpose: Handle window control, file dialogs, settings, and path operations
 * Public methods: registerWindowIpc(win)
 * Dependencies: electron, settings util
 */

import { ipcMain, BrowserWindow, dialog, shell } from "electron"
import { existsSync } from "node:fs"
import { loadSettings, saveSettings } from "../utils/settings"

export function registerWindowIpc(win: BrowserWindow): void {
  ipcMain.handle("window-minimize", () => win?.minimize())
  ipcMain.handle("window-maximize", () => {
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.handle("window-close", () => win?.close())

  ipcMain.handle("open-path", async (_, filePath: string) => {
    if (existsSync(filePath)) await shell.openPath(filePath)
  })

  ipcMain.handle("open-external", async (_, url: string) => {
    if (url && (url.startsWith("https:") || url.startsWith("http:")))
      await shell.openExternal(url)
  })

  ipcMain.handle(
    "show-open-dialog",
    async (
      _,
      options: {
        filters?: { name: string; extensions: string[] }[]
        multiple?: boolean
        title?: string
      }
    ) => {
      const properties: ("openFile" | "multiSelections")[] = ["openFile"]
      if (options.multiple) properties.push("multiSelections")

      const result = await dialog.showOpenDialog(win, {
        properties,
        filters: options.filters ?? [],
        title: options.title,
      })
      if (result.canceled) return null
      return result.filePaths
    }
  )

  ipcMain.handle("select-output-dir", async () => {
    const settings = loadSettings()
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "选择输出目录",
      defaultPath: settings.outputDir,
    })
    if (result.canceled) return null
    return result.filePaths[0] ?? null
  })

  ipcMain.handle("get-settings", () => loadSettings())

  ipcMain.handle("save-settings", (_, partial: Record<string, string>) => {
    return saveSettings(partial)
  })
}
