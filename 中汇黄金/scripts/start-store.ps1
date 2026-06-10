$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $root 'runtime\node.exe'
$serverPath = Join-Path $root 'server.js'
$runtimeDir = Join-Path $root 'runtime'
$logsDir = Join-Path $root 'logs'
$pidFile = Join-Path $runtimeDir 'server.pid'
$stdoutLog = Join-Path $logsDir 'server.out.log'
$stderrLog = Join-Path $logsDir 'server.err.log'

function Get-LanAddress {
  $configuration = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object {
      $_.NetAdapter.Status -eq 'Up' -and
      $_.IPv4DefaultGateway -and
      $_.IPv4Address
    } |
    Select-Object -First 1

  if ($configuration) {
    return $configuration.IPv4Address.IPAddress
  }

  $address = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
      $_.AddressState -eq 'Preferred'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress

  if ($address) { return $address }
  return '127.0.0.1'
}

if (-not (Test-Path -LiteralPath $nodePath)) {
  Write-Host '部署包不完整：缺少 runtime\node.exe。' -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

$lanIp = Get-LanAddress
$localUrl = 'http://127.0.0.1:3001/'
$lanUrl = "http://${lanIp}:3001/"

if (Test-Path -LiteralPath $pidFile) {
  $savedPid = [int](Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue)
  $savedProcess = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
  if ($savedProcess -and $savedProcess.Path -eq $nodePath) {
    Write-Host '中汇黄金行情服务已经在运行。' -ForegroundColor Green
    Write-Host "本机访问：$localUrl"
    Write-Host "手机访问：$lanUrl"
    Start-Process $localUrl
    Read-Host '按回车键关闭此窗口'
    exit 0
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$portOwner = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($portOwner) {
  Write-Host "端口 3001 已被其他程序占用，进程号：$($portOwner.OwningProcess)" -ForegroundColor Red
  exit 1
}

$env:HOST = '0.0.0.0'
$env:PORT = '3001'
$env:LAN_HOST = $lanIp

$process = Start-Process `
  -FilePath $nodePath `
  -ArgumentList 'server.js' `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health?format=json' -TimeoutSec 2
    if ($health.status -eq 'ok') {
      $ready = $true
      break
    }
  } catch {
    # Wait for the service to finish starting.
  }
}

if (-not $ready) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  Write-Host "启动失败，请查看日志：$stderrLog" -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '中汇黄金行情网站已启动。' -ForegroundColor Green
Write-Host "本机访问：$localUrl"
Write-Host "手机访问：$lanUrl"
Write-Host '手机必须与门店电脑连接同一个路由器或 Wi-Fi。'
Write-Host ''

Start-Process $localUrl
Read-Host '按回车键关闭此窗口，网站会继续运行'
