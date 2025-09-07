# scripts/ollama-local.ps1
# Manage Ollama on Windows for Novana.
# Examples:
#   powershell -ExecutionPolicy Bypass -File .\scripts\ollama-local.ps1 setup
#   powershell -ExecutionPolicy Bypass -File .\scripts\ollama-local.ps1 start
#   powershell -ExecutionPolicy Bypass -File .\scripts\ollama-local.ps1 pull
#   powershell -ExecutionPolicy Bypass -File .\scripts\ollama-local.ps1 health
#   powershell -ExecutionPolicy Bypass -File .\scripts\ollama-local.ps1 stop

[CmdletBinding()]
param(
  [ValidateSet('setup','start','pull','health','run','stop')]
  [string]$Cmd = 'start',
  [string]$HostUrl = 'http://127.0.0.1:11434',
  [string[]]$Models = @('llama3.2:3b','nomic-embed-text:latest')
)

$ErrorActionPreference = 'Stop'

function Ensure-Ollama {
  try { ollama --version | Out-Null } catch { throw 'Ollama CLI not found. Install from https://ollama.com/download and reopen PowerShell.' }
}

function Setup {
  Ensure-Ollama
  Write-Host "Setting OLLAMA_HOST for this session: $HostUrl"
  $env:OLLAMA_HOST = $HostUrl
  Write-Host "Pulling models: $($Models -join ', ')"
  foreach ($m in $Models) { ollama pull $m }
  Write-Host '✅ Setup done.'
}

function Start-Ollama {
  Ensure-Ollama
  $env:OLLAMA_HOST = $HostUrl
  Write-Host "Starting Ollama server at $HostUrl ..."
  # background start (new window minimized)
  $p = Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Minimized -PassThru
  Start-Sleep -Seconds 2
  Write-Host "PID: $($p.Id)"
}

function Health {
  $env:OLLAMA_HOST = $HostUrl
  $url = "$HostUrl/api/tags"
  Write-Host "GET $url"
  try { (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3).Content } catch { Write-Error $_ }
}

function Pull {
  Ensure-Ollama
  $env:OLLAMA_HOST = $HostUrl
  foreach ($m in $Models) { Write-Host "Pulling $m"; ollama pull $m }
}

function RunQuickDemo {
  Ensure-Ollama
  $env:OLLAMA_HOST = $HostUrl
  Write-Host '> demo prompt with llama3:8b' -ForegroundColor Cyan
  ollama run 'llama3:8b' "Say 'hello from ollama' in one short line."
}

function Stop-Ollama {
  # try graceful stop via process kill (Ollama has no HTTP shutdown)
  $procs = Get-Process ollama -ErrorAction SilentlyContinue
  if ($procs) { $procs | Stop-Process -Force; Write-Host "🛑 Stopped Ollama ($($procs.Count) processes)" } else { Write-Host 'No ollama process found.' }
}

switch ($Cmd) {
  'setup'  { Setup }
  'start'  { Start-Ollama }
  'pull'   { Pull }
  'health' { Health }
  'run'    { RunQuickDemo }
  'stop'   { Stop-Ollama }
}



