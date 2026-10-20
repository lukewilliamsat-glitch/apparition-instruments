param(
 [Parameter(Mandatory=$true)][string]$Baseline,
 [Parameter(Mandatory=$true)][string]$Manifest,
 [string]$Evidence = "$PSScriptRoot/evidence"
)
$ErrorActionPreference = 'Stop'
function Invoke-Docker {
 param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
 & docker @Arguments
 if ($LASTEXITCODE -ne 0) { throw "Docker failed ($LASTEXITCODE); stop. No application acceptance claimed." }
}
$Root = (Resolve-Path "$PSScriptRoot/../..").Path
$Baseline = (Resolve-Path $Baseline).Path
$Manifest = (Resolve-Path $Manifest).Path
$Pin = (Get-FileHash -Algorithm SHA256 $Manifest).Hash.ToLowerInvariant()
if ($Pin -ne 'f69ee4fa0b73b46a53eb6f3a575fb6e43eb46b37b94ebb41fc99a67fe1438450') { throw 'Wrong frozen Phase2F candidate manifest' }
if (Test-Path $Evidence) { throw 'Choose a fresh evidence directory; existing evidence is preserved' }
New-Item -ItemType Directory -Path $Evidence | Out-Null
$Evidence = (Resolve-Path $Evidence).Path
Invoke-Docker @('info','--format','{{.OSType}}')
$Tags = @{ NODE_IMAGE='node:22.20.0-bookworm'; COMPILER_IMAGE='gcc:14.2.0'; BROWSER_IMAGE='mcr.microsoft.com/playwright:v1.62.1-noble' }
$Pins = @{}
foreach ($Name in $Tags.Keys) {
 Invoke-Docker @('pull',$Tags[$Name])
 $Digest = (& docker image inspect --format '{{index .RepoDigests 0}}' $Tags[$Name]).Trim()
 if ($LASTEXITCODE -ne 0 -or $Digest -notmatch '@sha256:[a-f0-9]{64}$') { throw 'Image digest unavailable' }
 if ($Name -eq 'BROWSER_IMAGE' -and $Digest -ne 'mcr.microsoft.com/playwright@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e') { throw 'Reviewed official browser-image digest changed; stop for provenance review' }
 $Pins[$Name] = $Digest
}
$Pins | ConvertTo-Json | Set-Content -Encoding utf8 "$Evidence/image-pins.json"
@{ source=$Pins.BROWSER_IMAGE; playwright='1.62.1'; node='22.20.0'; integrity='Official registry image resolved to recorded digest. Signature not independently verified.' } | ConvertTo-Json | Set-Content -Encoding utf8 "$Evidence/engine-provenance.json"
$Build = @('build','--file',"$PSScriptRoot/Dockerfile",'--tag','atlas-browser-owner:phase2g')
foreach ($Name in $Pins.Keys) { $Build += @('--build-arg',"$Name=$($Pins[$Name])") }
$Build += $Root
Invoke-Docker $Build
(& docker image inspect --format '{{.Id}}' 'atlas-browser-owner:phase2g') | Set-Content "$Evidence/runner-image-id.txt"
# No host network, published ports, Docker socket, credentials or writable source mounts.
# Internet is impossible in the container; inherited seccomp is an independent boundary.
Invoke-Docker @('run','--rm','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=1g','--shm-size','512m','--mount',"type=bind,source=$Baseline,target=/candidate,readonly",'--mount',"type=bind,source=$Manifest,target=/manifest.json,readonly",'--mount',"type=bind,source=$Evidence,target=/evidence",'atlas-browser-owner:phase2g',$Pin)
Get-Content "$Evidence/browser-validation.json"
Write-Host "Evidence: $Evidence. A completed run may report real failures; do not relabel them passed."
