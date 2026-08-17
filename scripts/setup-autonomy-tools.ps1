param(
  [switch]$Install,
  [switch]$EnableCapabilities
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Has-Command([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Write-Check([string]$Name, [bool]$Ok, [string]$Detail) {
  $state = if ($Ok) { 'OK' } else { 'MISSING' }
  Write-Host ("[{0}] {1} - {2}" -f $state, $Name, $Detail)
}

Write-Host "Munin Autonomous Engineering local bootstrap"
Write-Host "Repository: $repo"
Write-Host "Mode: $(if ($Install) { 'install missing optional tools' } else { 'check only' })"
Write-Host ''

$nodeReady = Has-Command 'node'
$npmReady = Has-Command 'npm'
Write-Check 'Node.js' $nodeReady ($(if ($nodeReady) { (node --version) } else { 'required by Munin/Playwright CLI' }))
Write-Check 'npm' $npmReady ($(if ($npmReady) { (npm --version) } else { 'required to install Playwright CLI' }))
if (-not $nodeReady -or -not $npmReady) {
  throw 'Node.js/npm are required before this bootstrap can continue.'
}

$playwrightReady = Has-Command 'playwright-cli'
if (-not $playwrightReady -and $Install) {
  Write-Host 'Installing official @playwright/cli globally via npm...'
  & npm install -g '@playwright/cli@latest'
  if ($LASTEXITCODE -ne 0) { throw 'Playwright CLI installation failed.' }
  $playwrightReady = Has-Command 'playwright-cli'
}
Write-Check 'Playwright CLI' $playwrightReady ($(if ($playwrightReady) { (& playwright-cli --help 2>&1 | Select-Object -First 1) } else { 'run this script with -Install' }))

$uvReady = Has-Command 'uv'
Write-Check 'uv' $uvReady ($(if ($uvReady) { (& uv --version) } else { 'required to install Serena; install uv first using its official instructions' }))

$serenaReady = Has-Command 'serena'
if (-not $serenaReady -and $Install -and $uvReady) {
  Write-Host 'Installing Serena locally with uv tool install -p 3.13 serena-agent...'
  & uv tool install -p 3.13 serena-agent
  if ($LASTEXITCODE -ne 0) { throw 'Serena installation failed.' }
  $serenaReady = Has-Command 'serena'
}
Write-Check 'Serena' $serenaReady ($(if ($serenaReady) { 'CLI found; project health will be checked by autonomy:doctor' } elseif (-not $uvReady) { 'blocked only for semantic enhancement until uv is installed' } else { 'run this script with -Install' }))

if ($EnableCapabilities) {
  [Environment]::SetEnvironmentVariable('MUNIN_RUNTIME_CAPABILITIES', '1', 'User')
  $env:MUNIN_RUNTIME_CAPABILITIES = '1'
  Write-Host '[OK] MUNIN_RUNTIME_CAPABILITIES=1 saved for the current user.'
} else {
  Write-Host '[INFO] Runtime capability seam was not enabled. Pass -EnableCapabilities to opt in explicitly.'
}

Write-Host ''
Write-Host 'Running Munin readiness doctor...'
Push-Location $repo
try {
  & npm run autonomy:doctor
  $doctorExit = $LASTEXITCODE
} finally {
  Pop-Location
}

if ($doctorExit -eq 2) {
  throw 'Munin readiness doctor found a required blocker.'
}
if ($doctorExit -ne 0) {
  throw "Munin readiness doctor failed with exit code $doctorExit."
}

if (-not $serenaReady -and -not $uvReady) {
  Write-Host ''
  Write-Host '[NEXT] Serena remains optional. Install uv from its official source, then rerun this script with -Install.'
}
