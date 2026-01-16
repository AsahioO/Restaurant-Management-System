@echo off
echo ========================================
echo   Restaurant Management System - Install
echo ========================================
echo.

echo [1/2] Instalando dependencias del backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion del backend
    pause
    exit /b 1
)
echo Backend instalado correctamente!
echo.

echo [2/2] Instalando dependencias del frontend...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion del frontend
    pause
    exit /b 1
)
echo Frontend instalado correctamente!
echo.

cd ..
echo ========================================
echo   Instalacion completada!
echo ========================================
echo.
echo Siguiente paso: Ejecuta setup.bat para configurar el proyecto
pause
