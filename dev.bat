@echo off
echo ========================================
echo   Restaurant Management System - Dev Mode
echo ========================================
echo.
echo Iniciando Backend y Frontend...
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Presiona Ctrl+C en cada ventana para detener
echo ========================================
echo.

:: Iniciar backend en nueva ventana
start "RMS - Backend" cmd /k "cd backend && npm run dev"

:: Esperar 2 segundos para que el backend inicie primero
timeout /t 2 /nobreak > nul

:: Iniciar frontend en nueva ventana
start "RMS - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Servidores iniciados en ventanas separadas!
echo.
echo Para detener: Cierra las ventanas o presiona Ctrl+C en cada una
pause
