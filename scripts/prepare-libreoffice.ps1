<#
.SYNOPSIS
    Integrates LibreOffice into the DocKit project for bundled distribution.
    Run once before `npm run build`. Output goes to libreoffice/ in the project root.

.DESCRIPTION
    Strategies (tried in order):
      1. Copy from an existing system installation
      2. Extract from a downloaded MSI (msiexec /a administrative install)
      3. Download the MSI automatically, then extract

.USAGE
    From project root (run PowerShell as Administrator for best results):
        .\scripts\prepare-libreoffice.ps1

    Use a cached MSI to skip download:
        .\scripts\prepare-libreoffice.ps1 -MsiPath "C:\path\to\LibreOffice.msi"
#>

param(
    [string]$MsiPath = "",
    [string]$Version = "25.2.1"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$OutputDir   = Join-Path $ProjectRoot "libreoffice"
$TempMsi     = "$env:TEMP\LibreOffice_${Version}.msi"
$TempExtract = "$env:TEMP\LibreOffice_extract_${Version}"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DocKit - LibreOffice Integration Script    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Project : $ProjectRoot"
Write-Host "  Output  : $OutputDir"
Write-Host ""

# ─── Helper: verify soffice.exe exists in a folder ───────────────────────────
function Test-SofficeIn([string]$dir) {
    Test-Path (Join-Path $dir "program\soffice.exe")
}

# ─── Step 1: Try system installation ─────────────────────────────────────────
$sourceDir = $null
$candidates = @(
    "C:\Program Files\LibreOffice",
    "C:\Program Files (x86)\LibreOffice"
)
foreach ($pf in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:ProgramW6432) | Select-Object -Unique) {
    if (!$pf) { continue }
    try {
        Get-ChildItem $pf -Filter "LibreOffice*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            if (Test-SofficeIn $_.FullName) { $candidates += $_.FullName }
        }
    } catch {}
}
foreach ($c in $candidates) {
    if (Test-SofficeIn $c) { $sourceDir = $c; break }
}

if ($sourceDir) {
    Write-Host "[✓] Found system installation: $sourceDir" -ForegroundColor Green
} else {
    Write-Host "[ ] No system installation found." -ForegroundColor Yellow
}

# ─── Step 2: Extract from MSI if no system install ───────────────────────────
if (-not $sourceDir) {
    # Determine MSI path
    if ($MsiPath -and (Test-Path $MsiPath)) {
        $TempMsi = $MsiPath
        Write-Host "[✓] Using provided MSI: $TempMsi" -ForegroundColor Green
    } elseif (Test-Path $TempMsi) {
        $sizeMB = [math]::Round((Get-Item $TempMsi).Length / 1MB, 1)
        Write-Host "[✓] Found cached MSI ($sizeMB MB): $TempMsi" -ForegroundColor Green
    } else {
        Write-Host "[ ] MSI not found, downloading LibreOffice $Version (~350 MB)..." -ForegroundColor Yellow
        $arch = if ([System.Environment]::Is64BitOperatingSystem) { "x86_64" } else { "x86" }
        $url  = "https://download.documentfoundation.org/libreoffice/stable/$Version/win/$arch/LibreOffice_${Version}_Win_${arch}.msi"
        Write-Host "    URL: $url"

        $progress = 0
        $wc = New-Object System.Net.WebClient
        $wc.add_DownloadProgressChanged({
            param($s, $e)
            if ($e.ProgressPercentage -ne $progress) {
                $progress = $e.ProgressPercentage
                Write-Host "    $progress% - $([math]::Round($e.BytesReceived/1MB,1)) MB / $([math]::Round($e.TotalBytesToReceive/1MB,1)) MB" -NoNewline
                Write-Host "`r" -NoNewline
            }
        })
        $task = $wc.DownloadFileTaskAsync($url, $TempMsi)
        $task.Wait()
        Write-Host ""
        Write-Host "[✓] Downloaded: $TempMsi" -ForegroundColor Green
    }

    # Extract MSI using administrative install (creates portable layout)
    Write-Host ""
    Write-Host "[ ] Extracting MSI to temp directory (this takes 1-3 minutes)..." -ForegroundColor Yellow
    if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $TempExtract | Out-Null

    $proc = Start-Process msiexec.exe `
        -ArgumentList "/a `"$TempMsi`" /qn TARGETDIR=`"$TempExtract`"" `
        -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) {
        Write-Error "msiexec extraction failed (exit $($proc.ExitCode)). Try running as Administrator."
        exit 1
    }

    # Find the LibreOffice directory inside extraction output
    $found = Get-ChildItem $TempExtract -Directory -Filter "LibreOffice*" -Recurse -Depth 4 |
             Where-Object { Test-SofficeIn $_.FullName } |
             Select-Object -First 1
    if (-not $found) {
        # Some MSI versions place it differently
        $found = Get-ChildItem $TempExtract -Directory -Recurse -Depth 4 |
                 Where-Object { Test-SofficeIn $_.FullName } |
                 Select-Object -First 1
    }
    if (-not $found) {
        Write-Error "Could not find soffice.exe in extracted MSI at $TempExtract. Try running as Administrator."
        exit 1
    }

    $sourceDir = $found.FullName
    Write-Host "[✓] Extracted to: $sourceDir" -ForegroundColor Green
}

# ─── Step 3: Copy to project libreoffice/ ────────────────────────────────────
Write-Host ""
Write-Host "[ ] Copying to $OutputDir ..." -ForegroundColor Yellow

if (Test-Path $OutputDir) {
    Write-Host "    Removing old copy..."
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Copy essential directories (skips unnecessary docs/help to save space ~100 MB)
$keep = @("program", "share", "ure", "ure-link", "URE")
$skipped = @("help", "readmes", "sdk", "sdk_examples")
foreach ($d in Get-ChildItem $sourceDir -Directory) {
    if ($skipped -contains $d.Name.ToLower()) {
        Write-Host "    Skipping $($d.Name)/ (not needed for headless PDF)"
        continue
    }
    Write-Host "    Copying $($d.Name)/ ..."
    Copy-Item $d.FullName -Destination $OutputDir -Recurse -Force
}
# Copy root-level files (.dll etc.)
Get-ChildItem $sourceDir -File | ForEach-Object {
    Copy-Item $_.FullName -Destination $OutputDir -Force
}

# ─── Verify ──────────────────────────────────────────────────────────────────
$sofficePath = Join-Path $OutputDir "program\soffice.exe"
if (-not (Test-Path $sofficePath)) {
    Write-Error "soffice.exe not found at expected location: $sofficePath"
    exit 1
}

$sizeMB = [math]::Round((Get-ChildItem $OutputDir -Recurse | Measure-Object Length -Sum).Sum / 1MB, 0)
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Integration Complete!           ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "  Location : $sofficePath"
Write-Host "  Size     : $sizeMB MB"
Write-Host ""
Write-Host "  Next step: npm run build" -ForegroundColor Cyan
Write-Host "  The installer will include LibreOffice automatically." -ForegroundColor Cyan
Write-Host ""
