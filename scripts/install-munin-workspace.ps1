$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceAgents = Join-Path $repoRoot 'workspace\agents'
$sourceSkills = Join-Path $repoRoot 'workspace\skills'
$claudeHome = Join-Path $HOME '.claude'
$targetAgents = Join-Path $claudeHome 'agents'
$targetSkills = Join-Path $claudeHome 'skills'

Write-Host 'Munin AI Workspace v1 installer' -ForegroundColor Cyan

foreach ($required in @($sourceAgents, $sourceSkills)) {
    if (-not (Test-Path $required)) { throw "Source directory not found: $required" }
}

New-Item -ItemType Directory -Force -Path $targetAgents, $targetSkills | Out-Null

$agentFiles = Get-ChildItem $sourceAgents -Filter '*.md' -File
if ($agentFiles.Count -eq 0) { throw 'No agent definitions were found.' }
foreach ($file in $agentFiles) {
    Copy-Item $file.FullName (Join-Path $targetAgents $file.Name) -Force
    Write-Host "[OK] Installed agent: $($file.Name)" -ForegroundColor Green
}

$skillDirs = Get-ChildItem $sourceSkills -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }
if ($skillDirs.Count -eq 0) { throw 'No packaged skills were found.' }
foreach ($dir in $skillDirs) {
    $destination = Join-Path $targetSkills $dir.Name
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    Copy-Item (Join-Path $dir.FullName 'SKILL.md') (Join-Path $destination 'SKILL.md') -Force
    Write-Host "[OK] Installed skill: $($dir.Name)" -ForegroundColor Green
}

$missingAgents = $agentFiles | Where-Object { -not (Test-Path (Join-Path $targetAgents $_.Name)) }
$missingSkills = $skillDirs | Where-Object { -not (Test-Path (Join-Path (Join-Path $targetSkills $_.Name) 'SKILL.md')) }
if ($missingAgents -or $missingSkills) { throw 'Post-install verification failed.' }

Write-Host ''
Write-Host "Installed and verified $($agentFiles.Count) agents and $($skillDirs.Count) skills." -ForegroundColor Green
Write-Host 'Restart Claude Code so it reloads the workspace definitions.' -ForegroundColor Yellow
Write-Host 'Smoke test: ask Claude to use product-manager, then invoke discovery-to-spec for a read-only repository proposal.' -ForegroundColor Yellow