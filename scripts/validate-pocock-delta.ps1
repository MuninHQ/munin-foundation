param([switch]$SkipFullSuite)
$ErrorActionPreference = 'Stop'
Write-Host 'Munin Pocock Delta validation' -ForegroundColor Cyan

if (-not $SkipFullSuite) {
  Write-Host '1/4 Full repository test suite'
  npm test
  if ($LASTEXITCODE -ne 0) { throw "npm test failed with exit code $LASTEXITCODE" }
} else {
  Write-Host '1/4 Full suite skipped by explicit flag' -ForegroundColor Yellow
}

Write-Host '2/4 Context Profiler smoke test'
$temp = Join-Path $env:TEMP 'munin-context-profile-smoke.json'
@'
[
  {"name":"tools","kind":"tools","chars":9000},
  {"name":"history","kind":"history","chars":2500},
  {"name":"glossary","kind":"steering","chars":600}
]
'@ | Set-Content -Encoding UTF8 $temp
npm run context:profile -- $temp --json
if ($LASTEXITCODE -ne 0) { throw "context:profile failed with exit code $LASTEXITCODE" }
Remove-Item $temp -Force -ErrorAction SilentlyContinue

Write-Host '3/4 Content-video manifest smoke test'
$output = npm run video:content:plan -- '--topic=Wirecard' '--script=Approved smoke-test script' '--aspect=9:16'
if ($LASTEXITCODE -ne 0) { throw "video:content:plan failed with exit code $LASTEXITCODE" }
if (($output -join [Environment]::NewLine) -notmatch 'money-printer-local-v1') { throw 'content-video manifest version missing from output' }
Write-Host 'PASS: money-printer-local-v1 manifest emitted' -ForegroundColor Green

Write-Host '4/4 Host renderer inventory (read-only)'
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
$remotion = Get-Command remotion -ErrorAction SilentlyContinue
Write-Host ("FFmpeg: " + $(if ($ffmpeg) { $ffmpeg.Source } else { 'NOT INSTALLED / NOT ON PATH' }))
Write-Host ("Remotion CLI: " + $(if ($remotion) { $remotion.Source } else { 'OPTIONAL / NOT ON PATH' }))
Write-Host 'No packages, models or services were installed by this script.'
Write-Host 'Pocock Delta repository validation PASS' -ForegroundColor Green
