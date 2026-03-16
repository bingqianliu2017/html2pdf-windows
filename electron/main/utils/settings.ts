/**
 * Settings Manager
 * Purpose: Persist user preferences (output directory, LibreOffice path) to userData/settings.json
 * Public methods: loadSettings(), saveSettings(partial)
 * Dependencies: electron app, node:fs, node:path
 */

import { app } from "electron"
import path from "node:path"
import os from "node:os"
import { readFileSync, writeFileSync, existsSync } from "node:fs"

export interface AppSettings {
  outputDir: string
  libreOfficePath: string
}

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json")
}

function getDefaults(): AppSettings {
  return {
    outputDir: path.join(os.homedir(), "Desktop"),
    libreOfficePath: "",
  }
}

export function loadSettings(): AppSettings {
  try {
    const settingsPath = getSettingsPath()
    if (existsSync(settingsPath)) {
      const raw = readFileSync(settingsPath, "utf-8")
      return { ...getDefaults(), ...JSON.parse(raw) }
    }
  } catch {
    // ignore parse errors, return defaults
  }
  return getDefaults()
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = loadSettings()
  const updated: AppSettings = { ...current, ...partial }
  writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), "utf-8")
  return updated
}
