$files = @(
  'd:\github\SecBoard\ecosystem.config.cjs',
  'd:\github\SecBoard\secboard.service',
  'd:\github\SecBoard\nginx.conf.example',
  'd:\github\SecBoard\Caddyfile.example',
  'd:\github\SecBoard\.env.example',
  'd:\github\SecBoard\Dockerfile',
  'd:\github\SecBoard\docker-compose.yml',
  'd:\github\SecBoard\scripts\deploy-bun.sh',
  'd:\github\SecBoard\DEPLOYMENT_PRODUCTION.md'
)
foreach ($f in $files) {
  if (Test-Path $f) {
    $lines = (Get-Content $f).Count
    $bytes = (Get-Item $f).Length
    $status = 'exists=True'
  } else {
    $lines = 0
    $bytes = 0
    $status = 'exists=False'
  }
  $lineStr = $lines.ToString() + ' lines'
  $byteStr = $bytes.ToString() + ' bytes'
  Write-Output ($f + '  |  ' + $lineStr + '  |  ' + $byteStr + '  |  ' + $status)
}
