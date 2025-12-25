@echo off
echo ========================================
echo   Emilia Cafe - Configuracion Inicial
echo ========================================
echo.

:: Verificar si existe .env en backend
if not exist "backend\.env" (
    echo [1/4] Creando archivo backend\.env...
    (
        echo # Servidor
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # Base de datos PostgreSQL
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=emilia_cafe
        echo DB_USER=postgres
        echo DB_PASSWORD=tu_password_aqui
        echo.
        echo # JWT
        echo JWT_SECRET=emilia_cafe_super_secret_key_2024_muy_segura
        echo JWT_EXPIRES_IN=15m
        echo JWT_REFRESH_SECRET=emilia_cafe_refresh_secret_key_2024
        echo JWT_REFRESH_EXPIRES_IN=7d
        echo.
        echo # CORS
        echo CORS_ORIGIN=http://localhost:5173
    ) > backend\.env
    echo Archivo backend\.env creado!
    echo IMPORTANTE: Edita backend\.env con tu password de PostgreSQL
) else (
    echo [1/4] Archivo backend\.env ya existe, saltando...
)
echo.

:: Verificar si existe .env en frontend
if not exist "frontend\.env" (
    echo [2/4] Creando archivo frontend\.env...
    (
        echo VITE_API_URL=http://localhost:3000/api
        echo VITE_SOCKET_URL=http://localhost:3000
    ) > frontend\.env
    echo Archivo frontend\.env creado!
) else (
    echo [2/4] Archivo frontend\.env ya existe, saltando...
)
echo.

echo [3/4] Ejecutando migraciones de base de datos...
cd backend
call npm run db:migrate
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo la migracion de base de datos
    echo Verifica que PostgreSQL este corriendo y las credenciales en .env sean correctas
    cd ..
    pause
    exit /b 1
)
echo Migraciones completadas!
echo.

echo [4/4] Insertando datos de prueba...
call npm run db:seed
if %errorlevel% neq 0 (
    echo ERROR: Fallo el seed de datos
    cd ..
    pause
    exit /b 1
)
echo Datos de prueba insertados!
echo.

cd ..
echo ========================================
echo   Configuracion completada!
echo ========================================
echo.
echo Usuarios de prueba:
echo   Gerente:  gerente@emiliacafe.com / password123
echo   Empleado: maria@emiliacafe.com / password123
echo.
echo Ejecuta dev.bat para iniciar el servidor de desarrollo
pause
