@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python -m http.server 8000
  ) else (
    echo Python 3 was not found. Install it from https://www.python.org/downloads/ and try again.
    pause
  )
)
