param([switch]$Install,[int]$TimeoutSeconds=30)
$ErrorActionPreference = 'Stop'
Write-Host 'Munin agent-browser local validation'
$cmd = Get-Command agent-browser -ErrorAction SilentlyContinue
if (-not $cmd -and $Install) {
  npm install -g agent-browser
  agent-browser install
  $cmd = Get-Command agent-browser -ErrorAction SilentlyContinue
}
if (-not $cmd) {
  Write-Host 'agent-browser is not installed. Re-run with -Install to opt in.' -ForegroundColor Yellow
  exit 2
}

$dir = Join-Path $PWD 'runtime-data\agent-browser-benchmark'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$target = 'https://example.com'

function Invoke-AgentBrowserBounded {
  param([string[]]$Arguments,[string]$Step)
  $stdout = Join-Path $dir ("$Step-stdout.txt")
  $stderr = Join-Path $dir ("$Step-stderr.txt")
  Remove-Item $stdout,$stderr -Force -ErrorAction SilentlyContinue
  $proc = Start-Process -FilePath $cmd.Source -ArgumentList $Arguments -NoNewWindow -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  if (-not $proc.WaitForExit($TimeoutSeconds * 1000)) {
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
    $outText = if (Test-Path $stdout) { Get-Content $stdout -Raw } else { '' }
    $errText = if (Test-Path $stderr) { Get-Content $stderr -Raw } else { '' }
    throw "agent-browser '$Step' timed out after ${TimeoutSeconds}s. stdout=$outText stderr=$errText"
  }
  $outText = if (Test-Path $stdout) { Get-Content $stdout -Raw } else { '' }
  $errText = if (Test-Path $stderr) { Get-Content $stderr -Raw } else { '' }
  if ($proc.ExitCode -ne 0) { throw "agent-browser '$Step' exited $($proc.ExitCode). stdout=$outText stderr=$errText" }
  return $outText.Trim()
}

try {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  Invoke-AgentBrowserBounded -Arguments @('open',$target) -Step 'open' | Out-Null
  $openMs = $sw.ElapsedMilliseconds
  $sw.Restart()
  $snapshot = Invoke-AgentBrowserBounded -Arguments @('snapshot','--json') -Step 'snapshot'
  $snapshotMs = $sw.ElapsedMilliseconds
  $title = Invoke-AgentBrowserBounded -Arguments @('get','title','--json') -Step 'title'
  $url = Invoke-AgentBrowserBounded -Arguments @('get','url','--json') -Step 'url'
  try { Invoke-AgentBrowserBounded -Arguments @('close','--all') -Step 'close' | Out-Null } catch {}
  $result = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    backend = 'agent-browser'
    executable = $cmd.Source
    target = $target
    openMs = $openMs
    snapshotMs = $snapshotMs
    snapshotJson = $snapshot
    titleJson = $title
    urlJson = $url
    readOnlyValidation = $true
    verdict = 'pass'
  }
  $out = Join-Path $dir 'latest.json'
  $result | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $out
  Write-Host "PASS: read-only agent-browser validation completed. Report: $out" -ForegroundColor Green
} catch {
  try { Get-Process agent-browser -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
  $result = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    backend = 'agent-browser'
    executable = $cmd.Source
    target = $target
    readOnlyValidation = $false
    verdict = 'blocked'
    reason = $_.Exception.Message
    knownWindowsRisk = 'vercel-labs/agent-browser#1308 reports first-open pre-handshake hangs on Windows 11.'
  }
  $out = Join-Path $dir 'latest.json'
  $result | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $out
  Write-Host "BLOCKED: agent-browser validation failed safely; Playwright remains the promoted Munin backend. Report: $out" -ForegroundColor Yellow
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 3
}
