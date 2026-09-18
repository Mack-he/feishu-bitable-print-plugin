# Department sync trigger (Windows / PowerShell): calls /api/cron/departments/sync
#
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads .ps1 files using the
# system ANSI codepage (GBK on a Chinese Windows) unless the file has a UTF-8 BOM, so
# non-ASCII text here can break parsing - and XXL-Job's GLUE(PowerShell) writes the
# script to a temp file, where the same problem applies. Detailed Chinese docs live in
# README.md ("定时同步" section) instead.
#
# Usage:
#   $env:DEPARTMENT_SYNC_CRON_SECRET = "xxx"
#   powershell -ExecutionPolicy Bypass -File .\scripts\cron-department-sync.ps1
#
# Environment variables:
#   DEPARTMENT_SYNC_CRON_SECRET  required, must match the app's value
#   APP_BASE_URL                 optional, default http://127.0.0.1:5000
#   SYNC_QUERY                   optional, extra query, e.g. "all=false&userBatchSize=30"
#   SYNC_TIMEOUT_SEC             optional, HTTP timeout seconds, default 300
#
# Positional argument (XXL-Job passes the job param as the first argument):
#   .\cron-department-sync.ps1 "all=false&userBatchSize=30"
#
# Exit codes: 0 success, 1 failure (HTTP non-2xx or network error), 2 missing secret
#             XXL-Job's GLUE(PowerShell) judges task success by this exit code.

param(
    [string]$JobParam = ''
)

$ErrorActionPreference = 'Stop'

$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { 'http://127.0.0.1:5000' }
$secret = $env:DEPARTMENT_SYNC_CRON_SECRET
$timeout = if ($env:SYNC_TIMEOUT_SEC) { [int]$env:SYNC_TIMEOUT_SEC } else { 300 }
$query = if ($JobParam) { $JobParam } elseif ($env:SYNC_QUERY) { $env:SYNC_QUERY } else { '' }

if (-not $secret) {
    Write-Output 'ERROR: env DEPARTMENT_SYNC_CRON_SECRET is not set'
    exit 2
}

# The trailing slash matters: the app sets trailingSlash: true, so a URL without it
# answers 308 before reaching the route handler.
$url = "$($baseUrl.TrimEnd('/'))/api/cron/departments/sync/"
if ($query) { $url = "$url`?$query" }

try {
    # Invoke-RestMethod throws on non-2xx, which is exactly what we want here.
    $response = Invoke-RestMethod -Uri $url -Method Post -TimeoutSec $timeout `
        -Headers @{ 'X-Cron-Secret' = $secret }
    Write-Output ("OK: " + ($response | ConvertTo-Json -Depth 8 -Compress))
    exit 0
}
catch {
    # Read the response body so the app's own error text (503 missing secret / 401 wrong
    # secret / 409 already running ...) ends up in the XXL-Job execution log.
    # Windows PowerShell 5.1 does not fill ErrorDetails for JSON error responses, so fall
    # back to reading the raw response stream.
    $detail = ''
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $detail = $_.ErrorDetails.Message
    }
    elseif ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $detail = $reader.ReadToEnd()
            $reader.Close()
        }
        catch {
            $detail = ''
        }
    }
    Write-Output ("FAILED: " + $_.Exception.Message + " " + $detail)
    exit 1
}