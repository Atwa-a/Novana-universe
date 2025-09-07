[CmdletBinding()]
param(
  [ValidateSet('setup','start','health','stop')]
  [string]$Cmd = 'start',
  [int]$Port = 8000,
  [string]$VenvPath = '.\.venv-chroma',
  [string]$DataPath = '.\chroma-data'
)

$ErrorActionPreference = 'Stop'

function Resolve-Python {
  $candidates = @('py','python','python3')
  foreach ($c in $candidates) { try { & $c -V | Out-Null; return $c } catch {} }
  throw 'Python 3 is required. Install from https://www.python.org/downloads/ (tick "Add Python to PATH").'
}

function Venv-Python([string]$path) {
  $exe = Join-Path $path 'Scripts\python.exe'
  if (Test-Path $exe) { return $exe } else { return $null }
}

function Ensure-Dirs { param([string]$path)
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force $path | Out-Null }
}

function Setup {
  $py = Resolve-Python
  Ensure-Dirs -path $VenvPath
  if (-not (Venv-Python $VenvPath)) { & $py -m venv $VenvPath }
  $venvPy = Venv-Python $VenvPath
  & $venvPy -m pip install --upgrade pip setuptools wheel
  & $venvPy -m pip install "chromadb==0.5.23" --no-cache-dir
  Write-Host "âœ… Chroma installed in venv: $VenvPath"
}

function Chroma-CLI([string]$path) {
  $bin = Join-Path $path 'Scripts'
  $exe = Join-Path $bin 'chroma.exe'
  if (Test-Path $exe) { return $exe }
  $cmd = Join-Path $bin 'chroma.cmd'
  if (Test-Path $cmd) { return $cmd }
  throw "Chroma CLI not found in $bin. Run setup first:  .\scripts\chroma-local.ps1 setup"
}

function Start-Chroma {
  Ensure-Dirs -path $DataPath
  $cli = Chroma-CLI $VenvPath
  Write-Host "â–¶ Running Chroma on http://127.0.0.1:$Port (data: $DataPath)"
  & $cli run --host 0.0.0.0 --port $Port --path $DataPath
}

function Health {
  $hb = "http://127.0.0.1:$Port/api/v1/heartbeat"
  Write-Host "GET $hb"
  try { (Invoke-WebRequest -UseBasicParsing -Uri $hb -TimeoutSec 3).Content } catch { Write-Error $_ }
}

function Stop-Chroma {
  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Write-Host "ðŸ›‘ stopped PID $($conn.OwningProcess) on port $Port" }
    else { Write-Host "No process is listening on port $Port" }
  } catch { Write-Error $_ }
}

switch ($Cmd) {
  'setup'  { Setup }
  'start'  { Start-Chroma }
  'health' { Health }
  'stop'   { Stop-Chroma }
}
