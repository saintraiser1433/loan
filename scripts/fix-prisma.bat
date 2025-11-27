@echo off
echo Stopping any running Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Cleaning up cache directories...
if exist ".next" (
    rmdir /s /q ".next"
    echo Deleted .next folder
)

if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
    echo Deleted Prisma client cache
)

echo Regenerating Prisma client...
call npx prisma generate

echo.
echo Done! You can now restart your dev server with: npm run dev
pause




echo Stopping any running Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Cleaning up cache directories...
if exist ".next" (
    rmdir /s /q ".next"
    echo Deleted .next folder
)

if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
    echo Deleted Prisma client cache
)

echo Regenerating Prisma client...
call npx prisma generate

echo.
echo Done! You can now restart your dev server with: npm run dev
pause







