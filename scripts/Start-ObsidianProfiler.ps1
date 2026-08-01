<#
.SYNOPSIS
    Starts Obsidian with remote debugging and an enlarged V8 heap, waits until
    the DevTools (CDP) endpoint is actually accepting connections, then runs
    the obsidian-profiler.

.DESCRIPTION
    Invoked by the Obsidian workspace startup pane. WezTerm spawns that pane
    with its cwd set to the workspace projectDir (the vault), so -VaultDir
    defaults to the current directory and every other path is derived from it.
    Nothing is hardcoded to a single machine.

.NOTES
    Fixes for the "Failed to connect to Obsidian on port 9222" problem:
      1. Obsidian is SINGLE-INSTANCE. If it is already running, launching the
         exe again just forwards to the existing process and the
         --remote-debugging-port flag is silently discarded. This script
         detects that case and restarts Obsidian with the flag applied.
      2. A fixed 'sleep 5' races against startup. This script polls
         http://127.0.0.1:<port>/json/version until CDP is genuinely ready.

.EXAMPLE
    .\Start-ObsidianProfiler.ps1                 # defaults: port 9222, 8 GB heap
    .\Start-ObsidianProfiler.ps1 -HeapMB 12288   # 12 GB heap
    .\Start-ObsidianProfiler.ps1 -NoProfiler     # just start Obsidian for debugging
#>
param(
    [string] $VaultDir    = (Get-Location).Path,
    [string] $ProfilerDir = (Join-Path $VaultDir 'Data\Scripts\obsidian-profiler'),
    [string] $ObsidianExe = (Join-Path $env:LOCALAPPDATA 'Programs\obsidian\Obsidian.exe'),
    [string] $LogFile     = (Join-Path $env:TEMP 'obsidian-debug.log'),
    [int]    $Port        = 9222,
    [int]    $HeapMB      = 8192,
    [int]    $TimeoutSec  = 45,
    [switch] $NoProfiler
)

# Stop-on-error, so the failure paths below pass -ErrorAction Continue to keep
# Write-Error non-terminating and let the explicit exit code stand.
$ErrorActionPreference = 'Stop'

# Graceful-close budget before we escalate to Stop-Process.
$CloseTimeoutSec = 10
$PollIntervalMs  = 500

function Test-DebugPort {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2 | Out-Null
        return $true
    } catch { return $false }
}

Write-Host 'Consulting the oracle ....' -ForegroundColor Magenta

if (Test-DebugPort) {
    Write-Host "Obsidian already listening on port $Port - reusing it." -ForegroundColor Yellow
} else {
    if (-not (Test-Path -LiteralPath $ObsidianExe)) {
        Write-Error "Obsidian not found at $ObsidianExe. Pass -ObsidianExe with the correct path." -ErrorAction Continue
        exit 1
    }

    # --- 1. Close any instance running WITHOUT the debug port (single-instance lock)
    $procs = Get-Process -Name Obsidian -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Host 'Obsidian is running without debugging enabled - restarting it...'
        # Graceful close first so the vault/index shuts down cleanly.
        $procs | Where-Object { $_.MainWindowHandle -ne 0 } |
            ForEach-Object { $_.CloseMainWindow() | Out-Null }

        $closed        = $false
        $closeDeadline = (Get-Date).AddSeconds($CloseTimeoutSec)
        while ((Get-Date) -lt $closeDeadline) {
            if (-not (Get-Process -Name Obsidian -ErrorAction SilentlyContinue)) { $closed = $true; break }
            Start-Sleep -Milliseconds $PollIntervalMs
        }
        if (-not $closed) {
            Get-Process -Name Obsidian -ErrorAction SilentlyContinue | Stop-Process -Force
            Start-Sleep -Seconds 1
        }
    }

    # --- 2. Launch with debugging, memory and logging flags
    $obsArgs = @(
        "--remote-debugging-port=$Port"              # CDP endpoint for profile.js
        '--remote-allow-origins=*'                   # Chromium 111+ rejects CDP websockets otherwise
        "--js-flags=--max-old-space-size=$HeapMB"    # V8 heap (MB) for main + renderer processes
        '--enable-logging=file'                      # proper Electron/Chromium logging ...
        "--log-file=$LogFile"                        # ... written here
        '--log-level=0'                              # 0 = INFO and above
    )
    Write-Host "Starting Obsidian  (heap: $HeapMB MB, CDP port: $Port)"
    Start-Process -FilePath $ObsidianExe -ArgumentList $obsArgs
}

# --- 3. Poll until the DevTools endpoint is actually ready (no blind sleep)
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while (-not (Test-DebugPort)) {
    if ((Get-Date) -gt $deadline) {
        Write-Error "Obsidian never opened port $Port within $TimeoutSec s. Check the log: $LogFile" -ErrorAction Continue
        exit 1
    }
    Start-Sleep -Milliseconds $PollIntervalMs
}

$info = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version"
Write-Host "DevTools ready: $($info.Browser)  (V8 $($info.'V8-Version'))" -ForegroundColor Green
Write-Host "Chromium log:   $LogFile"

# --- 4. Run the profiler
if (-not $NoProfiler) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProfilerDir 'profile.js'))) {
        Write-Error "profile.js not found in $ProfilerDir. Pass -ProfilerDir with the correct path." -ErrorAction Continue
        exit 1
    }
    Set-Location -LiteralPath $ProfilerDir
    node profile.js
}
