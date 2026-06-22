# Define the bridge files to summarize
$fileList = @(
    "apps/backend/src/modules/auth/users/users.controller.ts",
    "apps/backend/src/modules/auth/users/users.service.ts",
    "apps/backend/src/modules/auth/users/users.module.ts",
    "apps/frontend/app/lib/users/api.ts",
    "apps/frontend/app/lib/users/hooks.ts",
    "apps/frontend/app/lib/users/types.ts"
)

$outputFile = "user_module_summary.txt"

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

Write-Host "Bridge summary complete! Saved to: $outputFile" -ForegroundColor Green