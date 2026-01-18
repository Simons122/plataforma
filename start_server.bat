@echo off
echo ==========================================
echo      A INICIAR SERVIDOR LOCAL (Booklyo)
echo ==========================================
echo.
echo Por favor aguarde enquanto o servidor inicia...
echo Quando aparecer "Local: http://localhost:5173", abra esse link no browser.
echo.
call npm install
call npm run dev
pause
