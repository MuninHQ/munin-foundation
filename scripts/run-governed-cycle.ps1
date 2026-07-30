param(
    [Parameter(Mandatory = $true)]
    [string]$Objective,

    [ValidateRange(1, 5)]
    [int]$MaxReviews = 3,

    [ValidateSet('plan', 'default')]
    [string]$PermissionMode = 'plan'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    throw 'Claude Code CLI was not found on PATH.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDir = Join-Path $repoRoot ".munin-runs\$runId"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$prompt = @"
Use the work-orchestrator agent, repository-governor agent, ci-governor agent when CI is in scope, founder-representative agent for strategic decisions, and the governor-loop plus governed-delivery skills.

Objective:
$Objective

Run a governed, read-only planning cycle. Independently inspect repository evidence. Produce a complete plan, delegate independent review, revise all findings, and repeat for at most $MaxReviews governor reviews.

Stop conditions:
- GREEN or GREEN WITH CONDITIONS: return the final execution-ready plan.
- Review limit reached: return unresolved blockers and do not claim readiness.

Classify every action into:
1. safe autonomous branch changes;
2. normal PR-review changes;
3. explicit founder-approval changes.

Include exact validation commands and measurable acceptance criteria. Do not modify files, branches, tags, settings, CI, GitHub objects, credentials, or external systems.
"@

$outputPath = Join-Path $runDir 'result.json'
$promptPath = Join-Path $runDir 'prompt.txt'
$prompt | Set-Content -Path $promptPath -Encoding UTF8

Write-Host "Starting governed cycle: $runId" -ForegroundColor Cyan
Write-Host "Artifacts: $runDir" -ForegroundColor DarkGray

Push-Location $repoRoot
try {
    & claude -p $prompt `
        --permission-mode $PermissionMode `
        --output-format json `
        --max-turns 80 `
        --no-session-persistence | Tee-Object -FilePath $outputPath

    if ($LASTEXITCODE -ne 0) {
        throw "Claude Code exited with code $LASTEXITCODE. Review $outputPath"
    }
}
finally {
    Pop-Location
}

Write-Host ''
Write-Host 'Governed cycle completed.' -ForegroundColor Green
Write-Host "Result: $outputPath" -ForegroundColor Green
Write-Host 'No repository write was authorized by this runner.' -ForegroundColor Yellow
