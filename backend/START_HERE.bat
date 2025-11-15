@echo off
echo ============================================================
echo MamaCare AI Backend Server
echo ============================================================
echo.
cd /d %~dp0
echo Current directory: %CD%
echo.
echo Starting server...
echo.
echo IMPORTANT: Keep this window open while using the app!
echo Press Ctrl+C to stop the server
echo.
echo ============================================================
echo.

python run_server.py

if errorlevel 1 (
    echo.
    echo ============================================================
    echo ERROR: Server failed to start
    echo ============================================================
    echo.
    echo Common fixes:
    echo 1. Make sure Python is installed: python --version
    echo 2. Install dependencies: pip install -r requirements.txt
    echo 3. Check for error messages above
    echo.
    pause
)





