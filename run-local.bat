@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo Starting local server...
echo Opening http://127.0.0.1:5173/
start "" "http://127.0.0.1:5173/"
call npm run dev -- --port 5173 --host 127.0.0.1
