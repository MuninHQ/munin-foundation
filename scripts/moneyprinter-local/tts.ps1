$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $culture = $env:MONEYPRINTER_LANGUAGE
    $voice = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq $culture } | Select-Object -First 1
    if (-not $voice) { throw "No installed offline voice for $culture" }
    $synth.SelectVoice($voice.VoiceInfo.Name)
    $synth.Rate = 0
    $synth.SetOutputToWaveFile($env:MONEYPRINTER_WAV)
    $synth.Speak([System.IO.File]::ReadAllText($env:MONEYPRINTER_TEXT, [System.Text.Encoding]::UTF8))
    Write-Output $voice.VoiceInfo.Name
} finally { $synth.Dispose() }
