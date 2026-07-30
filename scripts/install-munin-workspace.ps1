$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceAgents = Join-Path $repoRoot 'workspace\agents'
$claudeHome = Join-Path $HOME '.claude'
$targetAgents = Join-Path $claudeHome 'agents'

Write-Host 'Munin AI Workspace v1 installer' -ForegroundColor Cyan

if (-not (Test-Path $sourceAgents)) {
    throw "Agent source directory not found: $sourceAgents"
}

New-Item -ItemType Directory -Force -Path $targetAgents | Out-Null

$agentFiles = Get-ChildItem $sourceAgents -Filter '*.md' -File
if ($agentFiles.Count -eq 0) {
    throw 'No agent definitions were found.'
}

foreach ($file in $agentFiles) {
    $destination = Join-Path $targetAgents $file.Name
    Copy-Item $file.FullName $destination -Force
    Write-Host "[OK] Installed agent: $($file.Name)" -ForegroundColor Green
}

Write-Host ''
Write-Host "Installed $($agentFiles.Count) global agents in $targetAgents" -ForegroundColor Green
Write-Host 'Restart Claude Code so it reloads the agent definitions.' -ForegroundColor Yellow
Write-Host 'Then ask: "Use the product-manager agent to inspect this repository and prepare a scoped next-step specification."' -ForegroundColor Yellow
