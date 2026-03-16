/**
 * LibreOffice Detector
 * Purpose: Find soffice.exe on Windows using multiple strategies:
 *   1. Bundled copy shipped with the app (resources/libreoffice/)
 *   2. User-configured custom path (from settings)
 *   3. Windows registry (HKLM\SOFTWARE\LibreOffice)
 *   4. Scan common Program Files directories for any LibreOffice* folder
 *   5. System PATH
 * Public methods: detectLibreOffice(customPath?), detectLibreOfficeAll()
 * Dependencies: node:fs, node:child_process, node:path
 */

import { existsSync, readdirSync } from "node:fs"
import { execSync } from "node:child_process"
import path from "node:path"

const PROGRAM_FILES_DIRS = [
  process.env["ProgramFiles"]  ?? "C:\\Program Files",
  process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
  process.env["ProgramW6432"] ?? "C:\\Program Files",
]

/**
 * Returns the first working soffice.exe path found, or null.
 * Priority: bundled > custom > registry > scan > PATH
 */
export function detectLibreOffice(customPath?: string): string | null {
  // 1. Bundled copy packaged with the app (developer ran prepare-libreoffice script)
  const bundled = detectBundled()
  if (bundled) return bundled

  // 2. User-configured custom path
  if (customPath?.trim() && existsSync(customPath.trim())) return customPath.trim()

  // 3. Registry-based detection
  const fromReg = detectFromRegistry()
  if (fromReg) return fromReg

  // 4. Scan Program Files for LibreOffice* directories
  const fromScan = detectFromProgramFiles()
  if (fromScan) return fromScan

  // 5. System PATH
  const fromPath = detectFromPath()
  if (fromPath) return fromPath

  return null
}

/**
 * Returns all found soffice.exe paths (for UI listing / debugging).
 */
export function detectLibreOfficeAll(): string[] {
  const results: string[] = []
  const seen = new Set<string>()
  const add = (p: string | null) => {
    if (p && !seen.has(p)) { seen.add(p); results.push(p) }
  }
  add(detectBundled())
  add(detectFromRegistry())
  for (const p of scanProgramFiles()) add(p)
  add(detectFromPath())
  return results
}

// ---- Strategy implementations ------------------------------------------------

function detectBundled(): string | null {
  try {
    // process.resourcesPath points to the app's resources/ directory in production
    // In dev mode it may not exist, so guard with try/catch
    const rp: string = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? ""
    if (rp) {
      const candidate = path.join(rp, "libreoffice", "program", "soffice.exe")
      if (existsSync(candidate)) return candidate
    }
  } catch {
    // resourcesPath not available (dev mode without proper setup)
  }
  return null
}

function detectFromRegistry(): string | null {
  // Strategy A: reg query HKLM\SOFTWARE\LibreOffice
  const queries = [
    'reg query "HKLM\\SOFTWARE\\LibreOffice" /s /f "soffice.exe" 2>nul',
    'reg query "HKLM\\SOFTWARE\\WOW6432Node\\LibreOffice" /s /f "soffice.exe" 2>nul',
  ]
  for (const q of queries) {
    try {
      const out = execSync(q, { encoding: "utf-8", timeout: 3000 }).trim()
      // Parse lines like: "    Path    REG_SZ    C:\Program Files\LibreOffice\program"
      for (const line of out.split("\n")) {
        const m = line.match(/REG_SZ\s+(.+)$/)
        if (m) {
          const dir = m[1].trim()
          const exe = dir.endsWith("soffice.exe") ? dir : path.join(dir, "soffice.exe")
          if (existsSync(exe)) return exe
        }
      }
    } catch {
      // registry key not found
    }
  }

  // Strategy B: PowerShell to read InstallPath from any LibreOffice registry key
  try {
    const ps = `powershell -NoProfile -Command "` +
      `Get-ChildItem 'HKLM:\\SOFTWARE\\LibreOffice' -ErrorAction SilentlyContinue | ` +
      `Get-ItemProperty | Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue" 2>nul`
    const out = execSync(ps, { encoding: "utf-8", timeout: 4000 }).trim()
    for (const line of out.split("\n")) {
      const dir = line.trim()
      if (!dir) continue
      const candidates = [
        path.join(dir, "soffice.exe"),
        path.join(dir, "program", "soffice.exe"),
      ]
      for (const c of candidates) {
        if (existsSync(c)) return c
      }
    }
  } catch {
    // PowerShell unavailable or key missing
  }

  return null
}

function scanProgramFiles(): string[] {
  const found: string[] = []
  const uniqueDirs = [...new Set(PROGRAM_FILES_DIRS)]

  for (const pfDir of uniqueDirs) {
    if (!existsSync(pfDir)) continue
    try {
      const entries = readdirSync(pfDir)
      for (const entry of entries) {
        if (!entry.toLowerCase().startsWith("libreoffice")) continue
        // Standard layout: LibreOffice\program\soffice.exe
        const candidate = path.join(pfDir, entry, "program", "soffice.exe")
        if (existsSync(candidate)) found.push(candidate)
      }
    } catch {
      // permission error reading directory
    }
  }
  return found
}

function detectFromProgramFiles(): string | null {
  const found = scanProgramFiles()
  return found[0] ?? null
}

function detectFromPath(): string | null {
  try {
    const out = execSync("where soffice 2>nul", { encoding: "utf-8" }).trim()
    const first = out.split("\n")[0]?.trim()
    if (first && existsSync(first)) return first
  } catch {
    // soffice not in PATH
  }
  return null
}
