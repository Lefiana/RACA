# Adjusted paths based on your actual directory structure
$fileList = @(
    "apps/frontend/app/lib/requests/types.ts",
    "apps/frontend/app/lib/requests/api.ts",
    "apps/frontend/app/lib/requests/hooks.ts",
    "apps/frontend/app/lib/approvals/types.ts",
    "apps/frontend/app/lib/approvals/api.ts",
    "apps/frontend/app/lib/approvals/hooks.ts",
    "apps/frontend/app/lib/users/types.ts"
)

$outputFile = "combined_api_summary.txt"

# Clear previous output file if it exists
if (Test-Path $outputFile) { Remove-Item $outputFile }

foreach ($file in $fileList) {
    if (Test-Path $file) {
        "===========================================================" | Out-File -FilePath $outputFile -Append
        "FILE: $file" | Out-File -FilePath $outputFile -Append
        "===========================================================" | Out-File -FilePath $outputFile -Append
        Get-Content $file | Out-File -FilePath $outputFile -Append
        "`n`n" | Out-File -FilePath $outputFile -Append
    } else {
        "WARNING: File not found - $file" | Out-File -FilePath $outputFile -Append
    }
}

Write-Host "Success! Summary saved to: $outputFile" -ForegroundColor Green