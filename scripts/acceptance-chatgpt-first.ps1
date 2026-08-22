param(
  [string]$ApiUrl = 'http://127.0.0.1:4310',
  [string]$WebUrl = 'http://127.0.0.1:5173'
)

$ErrorActionPreference = 'Stop'
$results = @()

function Add-Result([string]$Name, [bool]$Passed, [string]$Evidence) {
  $script:results += [pscustomobject]@{ name=$Name; passed=$Passed; evidence=$Evidence }
}

function Invoke-WebWithRetry([string]$Uri, [int]$Attempts = 10) {
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try { return Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 5 }
    catch {
      if ($attempt -eq $Attempts) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
}

try {
  $ollama = Get-Process -Name 'ollama' -ErrorAction SilentlyContinue
  Add-Result 'ollama-not-required' $true ($(if ($ollama) { 'Ollama process detected independently; Munin does not require or manage it in ChatGPT-first mode.' } else { 'No Ollama process detected; Munin does not require it.' }))
} catch {
  Add-Result 'ollama-not-required' $false 'Could not inspect Ollama process state.'
}

try {
  $workspace = Invoke-WebWithRetry "$ApiUrl/api/workspace"
  Add-Result 'workspace-api' ($workspace.StatusCode -eq 200) "HTTP $($workspace.StatusCode)"
} catch {
  Add-Result 'workspace-api' $false 'Workspace endpoint unavailable on the configured API URL.'
}

try {
  $webResponse = Invoke-WebWithRetry $WebUrl
  $hasCockpit = $webResponse.Content -match 'chatgpt-operator-bridge'
  Add-Result 'web-chatgpt-cockpit' $hasCockpit ($(if ($hasCockpit) { 'Operator bridge present in Web entrypoint.' } else { 'Operator bridge marker not found.' }))
} catch {
  Add-Result 'web-chatgpt-cockpit' $false 'Web entrypoint unavailable on the configured Web URL.'
}


$linkedinPages = @(
  @{ path='/linkedin.html'; marker='<title>Munin LinkedIn Intelligence</title>' },
  @{ path='/linkedin-compose.html'; marker='<title>Munin LinkedIn Composer</title>' },
  @{ path='/linkedin-brand.html'; marker='<title>Munin Personal Brand Intelligence</title>' },
  @{ path='/linkedin-history.html'; marker='<title>Munin Editorial History</title>' },
  @{ path='/linkedin-assets.html'; marker='<title>Munin Visual Asset Memory</title>' },
  @{ path='/linkedin-publisher.html'; marker='<title>Munin LinkedIn Publisher</title>' }
)
foreach ($page in $linkedinPages) {
  try {
    $response = Invoke-WebWithRetry "$WebUrl$($page.path)"
    $valid = $response.StatusCode -eq 200 -and $response.Content.Contains($page.marker)
    Add-Result "linkedin-page-$($page.path.Trim('/').Replace('.html',''))" $valid ($(if ($valid) { "HTTP 200 with expected release marker." } else { "Unexpected status or content." }))
  } catch {
    Add-Result "linkedin-page-$($page.path.Trim('/').Replace('.html',''))" $false "Published route unavailable."
  }
}

$linkedinApis = @(
  @{ name='content'; path='/api/linkedin-content'; required=@('posts','suggestions','visualProfile') },
  @{ name='composer-status'; path='/api/linkedin-composer/status'; required=@('text','image','brandIntelligence') },
  @{ name='brand'; path='/api/linkedin-composer/brand'; required=@('profile','authorityFlywheel') },
  @{ name='suggestions'; path='/api/linkedin-composer/suggestions'; required=@('suggestions','sourceMode') },
  @{ name='publisher'; path='/api/linkedin-publisher'; required=@('policy','items') },
  @{ name='visual-assets-health'; path='/api/visual-assets/health'; required=@('provider') }
)
foreach ($check in $linkedinApis) {
  try {
    $response = Invoke-WebWithRetry "$ApiUrl$($check.path)"
    $payload = $response.Content | ConvertFrom-Json
    $missing = @($check.required | Where-Object { $null -eq $payload.$_ })
    $valid = $response.StatusCode -eq 200 -and $missing.Count -eq 0
    Add-Result "linkedin-api-$($check.name)" $valid ($(if ($valid) { "HTTP 200 with required contract fields." } else { "Missing fields: $($missing -join ', ')" }))
  } catch {
    Add-Result "linkedin-api-$($check.name)" $false "Read-only API contract unavailable: $($_.Exception.Message)"
  }
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
