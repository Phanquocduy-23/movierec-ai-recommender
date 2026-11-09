<#
.SYNOPSIS
  Sao lưu (backup) và khôi phục (restore) cơ sở dữ liệu PostgreSQL cho dự án MovieRec.
.EXAMPLE
  .\scripts\backup_restore.ps1 -Action backup
  .\scripts\backup_restore.ps1 -Action restore -File .\backups\movierec_20261109_220000.sql
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("backup", "restore")]
  [string]$Action,

  [string]$DbHost = "localhost",
  [int]$DbPort = 5432,
  [string]$DbUser = "movierec",
  [string]$DbName = "movierec",
  [string]$File = ""
)

$ErrorActionPreference = "Stop"
$BackupDir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Tự tìm thư mục bin của PostgreSQL 17 nếu chưa có trong PATH
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  $pgBin = "C:\Program Files\PostgreSQL\17\bin"
  if (Test-Path $pgBin) { $env:PATH = "$pgBin;$env:PATH" }
}

if ($Action -eq "backup") {
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  $outFile = if ($File) { $File } else { Join-Path $BackupDir "movierec_$ts.sql" }
  Write-Host "Đang sao lưu CSDL '$DbName' ra $outFile ..."
  pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists -f $outFile
  Write-Host "Hoàn tất sao lưu: $outFile"
} else {
  if (-not $File -or -not (Test-Path $File)) {
    throw "Vui lòng truyền đường dẫn file backup hợp lệ qua tham số -File"
  }
  Write-Host "Đang khôi phục CSDL '$DbName' từ $File ..."
  psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $File
  Write-Host "Hoàn tất khôi phục CSDL."
}
