@echo off
set "NGROK_URL=hallie-unscholastic-dotty.ngrok-free.dev"
set "PORT=80"
set "TOKEN=365YrV4O0AEbHuVAFNirH2I9I5a_54nUjyH5Tf42zwCpZWRyk"

echo Adding Ngrok authtoken...
ngrok config add-authtoken %TOKEN%

if %errorlevel%==0 (
    echo Authtoken added successfully!
) else (
    echo Failed to add authtoken. Please check your token or Ngrok installation.
    pause
    exit /b
)

echo Starting Ngrok tunnel...
ngrok http --url=%NGROK_URL% %PORT%

pause
