$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $repoRoot "data\runtime\succession"
$template = Join-Path $repoRoot "docs\succession\PRIVATE_CONTEXT_TEMPLATE.md"
$profile = Join-Path $runtimeRoot "operator-profile.local.md"

Write-Host "Munin successor bootstrap"
Write-Host "Repository: $repoRoot"

if (-not (Test-Path $runtimeRoot)) {
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
    Write-Host "Created local successor runtime directory."
}

if ((Test-Path $template) -and -not (Test-Path $profile)) {
    Copy-Item $template $profile
    Write-Host "Created private local profile template: $profile"
} elseif (Test-Path $profile) {
    Write-Host "Private local profile already exists; leaving it unchanged."
}

$stateFiles = @(
    "briefing-state.json",
    "career-radar-state.json",
    "regulatory-radar-state.json",
    "linkedin-review-state.json"
)

foreach ($name in $stateFiles) {
    $path = Join-Path $runtimeRoot $name
    if (-not (Test-Path $path)) {
        '{"version":1,"items":[],"updatedAt":null}' | Set-Content -Path $path -Encoding UTF8
        Write-Host "Created local state: $name"
    }
}

git -C $repoRoot check-ignore "data/runtime/succession/" *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Safety check failed: data/runtime/succession is not ignored by Git."
}
Write-Host "Git privacy check passed: successor runtime is ignored."

$agy = Get-Command agy -ErrorAction SilentlyContinue
if ($null -eq $agy) {
    Write-Host "Antigravity CLI (agy) not detected."
    Write-Host "Install it only from Google's current official Antigravity documentation, then rerun this script."
} else {
    Write-Host "Antigravity CLI detected at: $($agy.Source)"
}

Write-Host ""
Write-Host "Next:"
Write-Host "1. Fill data/runtime/succession/operator-profile.local.md locally."
Write-Host "2. Open this repository as an Antigravity project."
Write-Host "3. Run /munin-sitrep."
Write-Host "4. Create the schedules documented in docs/succession/SCHEDULED_TASKS.md."
Write-Host "5. Complete the host acceptance checklist in docs/succession/ANTIGRAVITY_BOOTSTRAP.md."
