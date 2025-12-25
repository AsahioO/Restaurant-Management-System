# 📋 Changelog - Emilia Café

Documentación de todas las modificaciones, errores y soluciones aplicadas después de la versión inicial del proyecto.

---

## 🗓️ 25 de Diciembre, 2025

### Versión 1.0.0 → 1.1.0

---

## 🐛 Errores Encontrados y Soluciones

### 1. Error de Conexión a PostgreSQL

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa:** PostgreSQL no estaba instalado en el sistema.

**Solución:**
1. Instalar PostgreSQL desde https://www.postgresql.org/download/
2. Crear la base de datos `emilia_cafe`
3. Configurar credenciales en `backend/.env`

**Archivos afectados:** `backend/.env`

---

### 2. Error de Login - 500 Internal Server Error

**Error:**
```
POST /api/auth/login 500 (Internal Server Error)
```

**Causa:** El proxy de Vite apuntaba al puerto incorrecto (3001 en lugar de 3000).

**Solución:**
Modificar `frontend/vite.config.js`:

```javascript
// Antes (incorrecto)
target: 'http://localhost:3001'

// Después (correcto)
target: 'http://localhost:3000'
```

**Archivos modificados:** `frontend/vite.config.js`

---

### 3. Página de Usuarios en Blanco

**Error:**
```
TypeError: users.filter is not a function at Users (Users.jsx:97:31)
```

**Causa:** La API devuelve `{ users: [...], pagination: {...} }` pero el frontend esperaba un array directamente.

**Solución:**
Modificar `frontend/src/pages/Users.jsx`:

```javascript
// Antes (incorrecto)
setUsers(response.data.data)

// Después (correcto)
setUsers(response.data.data.users || [])
```

**Archivos modificados:** `frontend/src/pages/Users.jsx`

---

## 🚀 Configuración para Deploy en la Nube (Railway)

### 4. Soporte para DATABASE_URL de Railway

**Problema:** Railway usa una variable `DATABASE_URL` en lugar de variables individuales.

**Solución:**
Modificar `backend/src/config/database.js` para soportar ambos modos:

```javascript
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // ...
    }
  : {
      host: config.db.host,
      port: config.db.port,
      // ...
    };
```

**Archivos modificados:** `backend/src/config/database.js`

---

### 5. Error en Deploy - Missing Script "db:migrate"

**Error:**
```
npm error Missing script: "db:migrate"
```

**Causa:** El `railway.json` usaba `npm run db:migrate` pero Railway no encontraba el script.

**Solución:**
Cambiar el comando de inicio en `backend/railway.json`:

```json
// Antes
"startCommand": "npm run db:migrate && npm run db:seed && npm start"

// Después
"startCommand": "node src/database/migrate.js && node src/database/seed.js && npm start"
```

**Archivos modificados:** `backend/railway.json`

---

### 6. Frontend 502 Bad Gateway - "Application failed to respond"

**Error:**
```
502 Bad Gateway - Application failed to respond
```

**Causa:** 
1. Las variables `VITE_*` son de build-time, no runtime
2. Faltaba un servidor para servir archivos estáticos en producción

**Solución:**

1. Agregar `serve` como dependencia en `frontend/package.json`:
```json
"dependencies": {
  "serve": "^14.2.1"
}
```

2. Agregar script de inicio:
```json
"scripts": {
  "start": "serve dist -s -l $PORT"
}
```

3. Hardcodear las URLs de producción en el código:

`frontend/src/services/api.js`:
```javascript
const API_URL = import.meta.env.PROD 
  ? 'https://emilia-cafe-backend-production.up.railway.app/api'
  : '/api'
```

`frontend/src/contexts/SocketContext.jsx`:
```javascript
const SOCKET_URL = import.meta.env.PROD 
  ? 'https://emilia-cafe-backend-production.up.railway.app'
  : window.location.origin
```

4. Crear `frontend/railway.json`:
```json
{
  "build": {
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve dist -s -l $PORT"
  }
}
```

**Archivos modificados:**
- `frontend/package.json`
- `frontend/src/services/api.js`
- `frontend/src/contexts/SocketContext.jsx`
- `frontend/railway.json` (nuevo)

---

### 7. Error de Variables de Entorno en Build

**Error:**
```
secret VITE_SOCKET_URL: not found
```

**Causa:** Railway no podía encontrar las variables VITE_* durante el build.

**Solución:** Hardcodear las URLs directamente en el código usando `import.meta.env.PROD` para detectar producción (ver punto 6).

---

## 🎨 Mejoras de UI/UX

### 8. Productos y Categorías Duplicados

**Problema:** Los productos aparecían repetidos 4-5 veces en la página de Nueva Orden.

**Causa:** El script de seed se ejecutó múltiples veces durante los deploys, creando datos duplicados.

**Solución:**

1. Crear endpoint temporal para limpiar duplicados:
```javascript
router.get('/clean-duplicates', async (req, res) => {
  // Actualizar order_items para apuntar a IDs originales
  // Eliminar menu_ingredients de items duplicados
  // Eliminar items, categorías, ingredientes y mesas duplicados
});
```

2. Ejecutar el endpoint manualmente
3. Modificar `backend/railway.json` para no ejecutar seed en cada deploy:
```json
"startCommand": "npm start"  // Sin migrate ni seed
```

**Archivos modificados:**
- `backend/src/routes/index.js` (temporal)
- `backend/railway.json`
- `backend/src/database/clean-duplicates.js` (nuevo)

---

### 9. Categorías con Scroll Horizontal

**Problema:** Las categorías requerían scroll horizontal, dificultando la navegación.

**Solución:**
Cambiar de `overflow-x-auto` a `flex-wrap` en `frontend/src/pages/NewOrder.jsx`:

```jsx
// Antes
<div className="flex gap-2 overflow-x-auto pb-2">

// Después
<div className="flex flex-wrap gap-2 pb-2">
```

También se mejoró el grid de productos:
```jsx
// Antes
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">

// Después
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
```

**Archivos modificados:** `frontend/src/pages/NewOrder.jsx`

---

## 🎨 Cambio de Paleta de Colores

### 10. Actualización a Rosa Pastel

**Solicitud:** Cambiar la paleta de colores a tonos rosa pastel.

**Cambios:**

`frontend/tailwind.config.js`:
```javascript
colors: {
  primary: {
    50: '#fdf2f4',
    100: '#fce7ea',
    // ... tonos rosa
    500: '#e54d6d',
    // ...
  },
  accent: {
    // ... tonos fucsia/pink
    500: '#ec4899',
    // ...
  }
}
```

`frontend/src/index.css`:
```css
:root {
  --color-primary: #f472b6;
  --color-accent: #ec4899;
}
```

**Archivos modificados:**
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

---

## 📁 Archivos Nuevos Creados

| Archivo | Descripción |
|---------|-------------|
| `backend/railway.json` | Configuración de deploy para Railway |
| `backend/Procfile` | Comando de inicio para Heroku/Railway |
| `backend/src/database/clean-duplicates.js` | Script para limpiar datos duplicados |
| `frontend/railway.json` | Configuración de deploy para Railway |
| `frontend/vercel.json` | Configuración para Vercel (no usado) |

---

## 📊 Resumen de Commits

| # | Commit | Descripción |
|---|--------|-------------|
| 1 | `feat: Emilia Cafe - Sistema completo` | Versión inicial |
| 2 | `feat: configuracion para deploy en Railway y Vercel` | Archivos de deploy |
| 3 | `fix: corregir comando de deploy en Railway` | Arreglo de scripts |
| 4 | `fix: agregar serve para produccion` | Servidor estático frontend |
| 5 | `fix: hardcodear URLs de produccion` | URLs de API/Socket |
| 6 | `fix: limpiar duplicados y mejorar layout` | UI y datos |
| 7 | `fix: quitar script de limpieza del inicio` | Evitar re-ejecución |
| 8 | `feat: agregar endpoint temporal para limpiar duplicados` | Limpieza BD |
| 9 | `fix: manejar foreign keys al limpiar duplicados` | FK constraints |
| 10 | `chore: eliminar endpoint temporal de limpieza` | Limpieza código |

---

## ✅ Estado Final

| Componente | Estado | URL |
|------------|--------|-----|
| Frontend | ✅ Online | https://emilia-cafe-frontend-production.up.railway.app |
| Backend | ✅ Online | https://emilia-cafe-backend-production.up.railway.app |
| PostgreSQL | ✅ Online | Railway managed |
| GitHub | ✅ Actualizado | https://github.com/AsahioO/Cafeteria-EC |

---

## 📝 Lecciones Aprendidas

1. **Variables de entorno en Vite:** Las variables `VITE_*` se inyectan en build-time, no runtime. Para producción, es más seguro hardcodear o usar detección de entorno.

2. **Seeds y migraciones:** No ejecutar seeds automáticamente en cada deploy para evitar duplicados. Usar `ON CONFLICT DO NOTHING` con campos únicos.

3. **Foreign Keys:** Al eliminar datos, respetar el orden de dependencias (order_items → menu_items → categories).

4. **Railway:** 
   - Usar `DATABASE_URL` con SSL habilitado
   - El `Root Directory` es importante para monorepos
   - Las variables se pueden referenciar entre servicios

5. **Proxy de Vite:** Verificar que el puerto del proxy coincida con el puerto del backend.

---

*Documentación creada el 25 de Diciembre, 2025*
