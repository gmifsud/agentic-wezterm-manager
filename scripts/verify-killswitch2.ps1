Set-Location D:\Repos\CLI\agentic-wezterm-manager\release
Get-Process agentic-wezterm-manager,cmd -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item agentic-wezterm-manager.boot.log,agentic-wezterm-manager.ready.json,agentic-wezterm-manager.started -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\agentic-wezterm-manager-status.bat" -ErrorAction SilentlyContinue
$env:NO_OPEN = '0'
$env:PORT = '4099'

Write-Output "=== launch ==="
$proc = Start-Process -FilePath '.\agentic-wezterm-manager.exe' -PassThru
Start-Sleep -Seconds 4

Write-Output ""
Write-Output "=== initial state ==="
Write-Output ("exe alive: " + (-not $proc.HasExited))
$wrapperLine = Get-Content 'agentic-wezterm-manager.boot.log' | Select-String -Pattern 'wrapper pid='
Write-Output $wrapperLine
$wrapperPid = [int]($wrapperLine -replace '.*wrapper pid=(\d+).*', '$1')
Write-Output ("wrapper pid: " + $wrapperPid)
$port = (Get-NetTCPConnection -LocalPort 4099 -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Output ("port bound: " + ($port -gt 0))

Write-Output ""
Write-Output "=== simulate closing the status window: kill the wrapper's child tree ==="
# The wrapper is `cmd /c start ... /WAIT cmd /K bat`. Killing the actual
# visible cmd (child of the wrapper via start) is what closing the window
# does. Find and kill it.
$innerCmd = Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" |
  Where-Object { $_.CommandLine -like '*agentic-wezterm-manager-status.bat*' -and $_.CommandLine -notlike '*start*' }
foreach ($c in $innerCmd) {
  Write-Output ("killing inner cmd pid=" + $c.ProcessId)
  Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Output ""
Write-Output "=== waiting up to 5s for poller (750ms) to detect and shut down ==="
$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline -and -not $proc.HasExited) {
  Start-Sleep -Milliseconds 300
}
Write-Output ("exe alive after wait: " + (-not $proc.HasExited))
$port = (Get-NetTCPConnection -LocalPort 4099 -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Output ("port still bound: " + ($port -gt 0))
Write-Output ("ready.json removed: " + (-not (Test-Path 'agentic-wezterm-manager.ready.json')))

Write-Output ""
Write-Output "=== boot log tail ==="
Get-Content 'agentic-wezterm-manager.boot.log' -Tail 6 -ErrorAction SilentlyContinue

Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Get-Process cmd -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue