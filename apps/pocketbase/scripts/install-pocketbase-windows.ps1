$ErrorActionPreference = "Stop"

$AppDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$Version = (Get-Content (Join-Path $AppDir ".pocketbase-version") -Raw).Trim()
$ExePath = Join-Path $AppDir "pocketbase.exe"
$ArchiveName = "pocketbase_$Version" + "_windows_amd64.zip"
$DownloadUrl = "https://github.com/pocketbase/pocketbase/releases/download/v$Version/$ArchiveName"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("pocketbase-$Version-" + [System.Guid]::NewGuid().ToString("N"))
$ArchivePath = Join-Path $TempDir $ArchiveName

New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
  Write-Host "Downloading PocketBase $Version for Windows..."
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath

  Write-Host "Extracting PocketBase..."
  Expand-Archive -Path $ArchivePath -DestinationPath $TempDir -Force

  Copy-Item -Path (Join-Path $TempDir "pocketbase.exe") -Destination $ExePath -Force
  Write-Host "Installed $ExePath"
}
finally {
  if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
  }
}
