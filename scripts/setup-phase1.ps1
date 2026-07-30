$ErrorActionPreference = 'Stop'

function Test-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host 'Munin Phase 1 - AI Productivity Stack' -ForegroundColor Cyan
Write-Host 'Checking local prerequisites...' -ForegroundColor Cyan

$missing = @()
foreach ($command in @('git', 'node', 'npm', 'npx', 'claude')) {
    if (Test-Command $command) {
        $version = & $command --version 2>$null | Select-Object -First 1
        Write-Host "[OK] $command $version" -ForegroundColor Green
    }
    else {
        Write-Host "[MISSING] $command" -ForegroundColor Yellow
        $missing += $command
    }
}

if ($missing.Count -gt 0) {
    Write-Host ''
    Write-Host ('Install the missing prerequisites before continuing: ' + ($missing -join ', ')) -ForegroundColor Yellow
    exit 1
}

$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 18) {
    throw "Node.js 18+ is required. Current major version: $nodeMajor"
}

Write-Host ''
Write-Host 'Prerequisites are ready.' -ForegroundColor Green
Write-Host ''
Write-Host 'Run these commands inside Claude Code:' -ForegroundColor Cyan
Write-Host '  /plugin install superpowers@claude-plugins-official'
Write-Host ''
Write-Host 'Then configure Context7 from PowerShell:' -ForegroundColor Cyan
Write-Host '  npx ctx7 setup --claude'
Write-Host 'Choose CLI + Skills first. OAuth or account confirmation may open in your browser.'
Write-Host ''
Write-Host 'Optional Playwright MCP:' -ForegroundColor Cyan
Write-Host '  claude mcp add playwright -- npx @playwright/mcp@latest'
Write-Host ''
Write-Host 'Optional Browser Use (install only for a concrete browser automation task):' -ForegroundColor Cyan
Write-Host '  Follow the official Browser Use CLI installer, then place its SKILL.md under ~/.claude/skills/browser-use/'
Write-Host ''
Write-Host 'Verification:' -ForegroundColor Cyan
Write-Host '  claude mcp list'
Write-Host '  npx ctx7 --help'
Write-Host ''
Write-Host 'No credentials or API keys were written by this script.' -ForegroundColor Green
