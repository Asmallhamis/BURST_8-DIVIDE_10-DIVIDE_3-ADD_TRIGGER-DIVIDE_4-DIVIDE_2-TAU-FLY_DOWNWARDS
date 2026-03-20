@echo off
echo Starting local test server on port 18542...
echo.
echo 1. Keep this window open.
echo 2. Open your browser and go to: http://localhost:18542
echo 3. Press Ctrl+C in this window to stop the server when finished.
echo.
python -m http.server 18542
pause
