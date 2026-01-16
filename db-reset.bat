@echo off
echo ========================================
echo   Restaurant Management System - DB Reset
echo ========================================
echo.
echo ADVERTENCIA: Esto eliminara todos los datos y los recreara!
echo.
set /p confirm=Estas seguro? (S/N): 
if /i not "%confirm%"=="S" (
    echo Operacion cancelada.
    pause
    exit /b 0
)
echo.

echo Reseteando base de datos...
cd backend
call npm run db:reset
if %errorlevel% neq 0 (
    echo ERROR: Fallo el reset de base de datos
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   Base de datos reseteada!
echo ========================================
echo.
echo Demo users:
echo   Manager:  admin@demo.com / password123
echo   Employee: employee@demo.com / password123
pause
