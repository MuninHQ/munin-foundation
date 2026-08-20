param(
  [string]$ApiUrl = 'http://127.0.0.1:4310',
  [string]$WebUrl = 'http://127.0.0.1:5173'
)

$ErrorActionPreference = 'Stop'
$results = @()

function Add-Result([string]$Name, [bool]$Passed, [string]$Evidence) {
  $script:results += [pscustomobject]@{ name=$Name; passed=$Passed; evidence=$Evidence }
}

try {
  $ollama = Get-Process -Name 'ollama' -ErrorAction SilentlyContinue
  Add-Result 'ollama-not-required' ($null -eq $ollama) ($(if ($ollama) { 'Ollama process detected; verify it was not started by Munin.' } else { 'No Ollama process detected.' }))
} catch {
  Add-Result 'ollama-not-required' $false 'Could not inspect Ollama process state.'
}

try {
  $workspace = Invoke-WebRequest -UseBasicParsing -Uri "$ApiUrl/api/workspace" -TimeoutSec 5
  Add-Result 'workspace-api' ($workspace.StatusCode -eq 200) "HTTP $($workspace.StatusCode)"
} catch {
  Add-Result 'workspace-api' $false 'Workspace endpoint unavailable on the configured API URL.'
}

try {
  $home = Invoke-WebRequest -UseBasicParsing -Uri $WebUrl -TimeoutSec 5
  $hasCockpit = $home.Content -match 'chatgpt-operator-bridge'
  Add-Result 'web-chatgpt-cockpit' $hasCockpit ($(if ($hasCockpit) { 'Operator bridge present in Web entrypoint.' } else { 'Operator bridge marker not found.' }))
} catch {
  Add-Result 'web-chatgpt-cockpit' $false 'Web entrypoint unavailable on the configured Web URL.'
}

$failed = @($results | Where-Object { -not $_.passed })
$output = [pscustomobject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  apiUrl = $ApiUrl
  webUrl = $WebUrl
  passed = ($failed.Count -eq 0)
  results = $results
}

$output | ConvertTo-Json -Depth 4
if ($failed.Count -gt 0) { exit 1 }
