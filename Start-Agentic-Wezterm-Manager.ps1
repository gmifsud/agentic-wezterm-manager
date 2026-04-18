# Start Agentic Wezterm Manager
$ErrorActionPreference = "Stop"
$ProjectPath = $PSScriptRoot

Write-Host "Starting Agentic WezTerm Manager..." -ForegroundColor Cyan

Set-Location -LiteralPath $ProjectPath

# Check if node modules exist
if (-not (Test-Path "$ProjectPath\node_modules")) {
    Write-Host "Installing dependencies... This may take a moment." -ForegroundColor Yellow
    npm install
}

Write-Host "Dependencies verified. Starting local application..." -ForegroundColor Green
Write-Host "Please keep this powershell window open. Press Ctrl+C to stop." -ForegroundColor DarkGray

# Wait a second before trying to open browser to give vite time to load up
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5173"
} | Out-Null

npm run dev
