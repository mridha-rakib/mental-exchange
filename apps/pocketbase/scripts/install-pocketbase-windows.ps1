$ErrorActionPreference = "Stop"

$AppDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$Version = (Get-Content (Join-Path $AppDir ".pocketbase-version") -Raw).Trim()
$ExePath = Join-Path $AppDir "pocketbase.exe"
$ArchiveName = "pocketbase_$Version" + "_windows_amd64.zip"
$DownloadUrl = "https://github.com/pocketbase/pocketbase/releases/download/v$Version/$ArchiveName"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("pocketbase-$Version-" + [System.Guid]::NewGuid().ToString("N"))
$ArchivePath = Join-Path $TempDir $ArchiveName

function Get-InstalledPocketBaseVersion {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return $null
  }

  try {
    $VersionOutput = & $Path --version 2>$null
    if ($VersionOutput -match "version\s+([0-9]+\.[0-9]+\.[0-9]+)") {
      return $Matches[1]
    }
  }
  catch {
    return $null
  }

  return $null
}

$InstalledVersion = Get-InstalledPocketBaseVersion -Path $ExePath
if ($InstalledVersion -eq $Version) {
  Write-Host "PocketBase $Version is already installed at $ExePath"
  exit 0
}

New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
  Write-Host "Downloading PocketBase $Version for Windows..."
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath

  Write-Host "Extracting PocketBase..."
  Expand-Archive -Path $ArchivePath -DestinationPath $TempDir -Force

  try {
    Copy-Item -Path (Join-Path $TempDir "pocketbase.exe") -Destination $ExePath -Force
  }
  catch [System.IO.IOException] {
    Write-Error "Cannot replace $ExePath because it is currently in use. Stop the PocketBase dev server, then run npm run setup:windows again."
    throw
  }

  Write-Host "Installed $ExePath"
}
finally {
  if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
  }
}
