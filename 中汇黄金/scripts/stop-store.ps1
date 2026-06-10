$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $root 'runtime\node.exe'
$pidFile = Join-Path $root 'runtime\server.pid'

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host '中汇黄金行情服务当前没有运行。'
  Read-Host '按回车键关闭此窗口'
  exit 0
}

$savedPid = [int](Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue)
$savedProcess = Get-Process -Id $savedPid -ErrorAction SilentlyContinue

if ($savedProcess -and $savedProcess.Path -eq $nodePath) {
  Stop-Process -Id $savedPid -Force
  Write-Host '中汇黄金行情服务已停止。' -ForegroundColor Green
} else {
  Write-Host '没有找到对应的中汇黄金服务进程。'
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Read-Host '按回车键关闭此窗口'
