param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4184
)

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'Node.js is required to launch the Deck Sage preview.'
}

& $nodeCommand.Source (Join-Path $PSScriptRoot 'preview\tools\serve.cjs') --port $Port
