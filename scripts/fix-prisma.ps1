# PowerShell script to fix Prisma client issues
Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Cleaning up cache directories..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Deleted .next folder" -ForegroundColor Green
}

if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
    Write-Host "Deleted Prisma client cache" -ForegroundColor Green
}

Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "Done! You can now restart your dev server with: npm run dev" -ForegroundColor Green




Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Cleaning up cache directories..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Deleted .next folder" -ForegroundColor Green
}

if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
    Write-Host "Deleted Prisma client cache" -ForegroundColor Green
}

Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "Done! You can now restart your dev server with: npm run dev" -ForegroundColor Green







