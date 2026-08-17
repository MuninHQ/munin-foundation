param([switch]$Install)
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
$sw = [Diagnostics.Stopwatch]::StartNew()
agent-browser open $target | Out-Null
$openMs = $sw.ElapsedMilliseconds
$sw.Restart()
$snapshot = agent-browser snapshot --json
$snapshotMs = $sw.ElapsedMilliseconds
$title = agent-browser get title --json
$url = agent-browser get url --json
agent-browser close | Out-Null
$result = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  backend = 'agent-browser'
  executable = $cmd.Source
  target = $target
  openMs = $openMs
  snapshotMs = $snapshotMs
  snapshotJson = ($snapshot -join "`n")
  titleJson = ($title -join "`n")
  urlJson = ($url -join "`n")
  readOnlyValidation = $true
}
$out = Join-Path $dir 'latest.json'
$result | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $out
Write-Host "PASS: read-only agent-browser validation completed. Report: $out" -ForegroundColor Green
