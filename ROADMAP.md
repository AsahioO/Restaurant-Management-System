# 🗺️ Roadmap - Emilia Café

Guía de mejoras recomendadas para hacer el proyecto más escalable y profesional.

---

## 📋 Índice

1. [Seguridad](#-seguridad)
2. [Escalabilidad](#-escalabilidad)
3. [Funcionalidades de Negocio](#-funcionalidades-de-negocio)
4. [UX/UI](#-uxui)
5. [DevOps/Infraestructura](#-devopsinfraestructura)
6. [Analytics](#-analytics)
7. [Prioridades Sugeridas](#-prioridades-sugeridas)

---

## 🔐 Seguridad

### Rate Limiting
**Prioridad:** 🔴 Alta  
**Complejidad:** Media

Limitar el número de intentos de login para prevenir ataques de fuerza bruta.

```javascript
// Ejemplo con express-rate-limit
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: 'Demasiados intentos de login, intenta en 15 minutos'
});

app.use('/api/auth/login', loginLimiter);
```

**Archivos a modificar:**
- `backend/src/app.js`
- `backend/src/routes/auth.js`

---

### HTTPS Forzado
**Prioridad:** 🔴 Alta  
**Complejidad:** Baja

Redirigir todo el tráfico HTTP a HTTPS en producción.

```javascript
// Middleware para forzar HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

**Nota:** Railway ya maneja esto automáticamente, pero es buena práctica tenerlo.

---

### Refresh Tokens
**Prioridad:** 🟡 Media  
**Complejidad:** Alta

Implementar tokens de acceso de corta duración (15 min) con refresh tokens de larga duración (7 días).

**Flujo:**
1. Login → Recibe `accessToken` (15 min) + `refreshToken` (7 días)
2. Request con `accessToken` expirado → 401
3. Cliente envía `refreshToken` → Recibe nuevo `accessToken`
4. Refresh token expirado → Redirigir a login

**Archivos a crear/modificar:**
- `backend/src/controllers/authController.js` - Agregar endpoint `/refresh`
- `backend/src/middleware/auth.js` - Validar refresh tokens
- `frontend/src/services/api.js` - Interceptor para renovar tokens

---

### Sanitización de Inputs
**Prioridad:** 🔴 Alta  
**Complejidad:** Baja

Prevenir XSS e inyección SQL sanitizando todos los inputs.

```javascript
// Instalar: npm install express-validator xss-clean
const xss = require('xss-clean');
const { body, validationResult } = require('express-validator');

// Middleware global
app.use(xss());

// Validación específica
const createOrderValidation = [
  body('mesa_id').isInt().optional(),
  body('items').isArray({ min: 1 }),
  body('items.*.menu_item_id').isInt(),
  body('items.*.cantidad').isInt({ min: 1, max: 100 }),
  body('notas').trim().escape().optional(),
];
```

**Archivos a modificar:**
- `backend/src/app.js`
- `backend/src/routes/*.js` - Agregar validaciones

---

### Auditoría de Accesos
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Log detallado de todas las acciones críticas.

**Ya implementado parcialmente** en `utils/permissions.js` con `logAuditAction`.

**Mejoras sugeridas:**
- Crear vista de auditoría en el frontend para gerentes
- Agregar filtros por usuario, fecha, tipo de acción
- Exportar logs a CSV/PDF

**Archivos a crear:**
- `frontend/src/pages/AuditLog.jsx`
- `backend/src/routes/audit.js`

---

## 📈 Escalabilidad

### Redis para Cache
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Usar Redis para cachear datos frecuentes y sesiones.

```javascript
// Instalar: npm install redis
const Redis = require('redis');
const client = Redis.createClient({ url: process.env.REDIS_URL });

// Cachear menú (cambia poco)
const getMenuCached = async () => {
  const cached = await client.get('menu:all');
  if (cached) return JSON.parse(cached);
  
  const menu = await db.query('SELECT * FROM menu_items WHERE disponible = true');
  await client.setEx('menu:all', 300, JSON.stringify(menu.rows)); // 5 min cache
  return menu.rows;
};
```

**Servicios recomendados:**
- Railway Redis (add-on)
- Upstash Redis (serverless, gratis hasta 10k requests/día)

---

### CDN para Assets
**Prioridad:** 🟢 Baja  
**Complejidad:** Baja

Servir imágenes de productos desde un CDN.

**Opciones:**
- Cloudinary (gratis hasta 25GB)
- AWS S3 + CloudFront
- Bunny CDN

**Implementación:**
1. Subir imágenes a CDN
2. Guardar URL en base de datos
3. Mostrar desde CDN en frontend

---

### Paginación Optimizada (Cursor-based)
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Para listas grandes, usar cursor en vez de offset.

```javascript
// En vez de: OFFSET 1000 LIMIT 20 (lento)
// Usar: WHERE id > $cursor LIMIT 20 (rápido)

const getOrders = async (cursor, limit = 20) => {
  const query = cursor
    ? `SELECT * FROM orders WHERE id > $1 ORDER BY id LIMIT $2`
    : `SELECT * FROM orders ORDER BY id LIMIT $1`;
  
  const params = cursor ? [cursor, limit] : [limit];
  return db.query(query, params);
};
```

---

### Índices en Base de Datos
**Prioridad:** 🔴 Alta  
**Complejidad:** Baja

Agregar índices para queries frecuentes.

```sql
-- Índices recomendados
CREATE INDEX idx_orders_estado ON orders(estado);
CREATE INDEX idx_orders_mesero_id ON orders(mesero_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_mesa_id ON orders(mesa_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_menu_items_categoria ON menu_items(categoria_id);
CREATE INDEX idx_ingredients_stock ON ingredients(stock_actual, stock_minimo);
```

**Archivo a modificar:**
- `backend/src/database/migrate.js` - Agregar al final de la migración

---

### Queue de Trabajos
**Prioridad:** 🟢 Baja  
**Complejidad:** Alta

Para tareas pesadas como generar reportes PDF, enviar emails, etc.

```javascript
// Instalar: npm install bull
const Queue = require('bull');
const reportQueue = new Queue('reports', process.env.REDIS_URL);

// Agregar trabajo
reportQueue.add('daily-sales', { date: '2025-12-30' });

// Procesar trabajos
reportQueue.process('daily-sales', async (job) => {
  const { date } = job.data;
  await generateDailySalesReport(date);
  await sendEmailWithReport(date);
});
```

---

## 💼 Funcionalidades de Negocio

### Reportes PDF
**Prioridad:** 🔴 Alta  
**Complejidad:** Media

Generar reportes descargables en PDF.

**Reportes sugeridos:**
- Corte de caja diario
- Ventas por período
- Inventario actual
- Productos más vendidos
- Rendimiento de meseros

```javascript
// Instalar: npm install pdfkit
const PDFDocument = require('pdfkit');

const generateDailySalesReport = async (date) => {
  const doc = new PDFDocument();
  doc.fontSize(20).text('Reporte de Ventas Diario', { align: 'center' });
  doc.fontSize(12).text(`Fecha: ${date}`);
  // ... agregar datos
  return doc;
};
```

**Archivos a crear:**
- `backend/src/services/reportService.js`
- `backend/src/routes/reports.js`
- `frontend/src/pages/Reports.jsx`

---

### Múltiples Sucursales
**Prioridad:** 🟢 Baja  
**Complejidad:** Alta

Soporte para manejar varias sucursales desde una sola plataforma.

**Cambios requeridos:**
1. Agregar tabla `branches` (sucursales)
2. Agregar `branch_id` a: users, orders, tables, ingredients
3. Filtrar todo por sucursal del usuario logueado
4. Dashboard consolidado para dueño

---

### Sistema de Propinas
**Prioridad:** 🟡 Media  
**Complejidad:** Baja

Registrar y distribuir propinas.

```sql
-- Agregar columna a orders
ALTER TABLE orders ADD COLUMN propina DECIMAL(10,2) DEFAULT 0;

-- Reporte de propinas por mesero
SELECT u.nombre, SUM(o.propina) as total_propinas
FROM orders o
JOIN users u ON o.mesero_id = u.id
WHERE o.estado = 'cobrada' AND DATE(o.created_at) = CURRENT_DATE
GROUP BY u.id;
```

---

### Reservaciones
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Sistema de reservas de mesas.

```sql
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  mesa_id INTEGER REFERENCES tables(id),
  cliente_nombre VARCHAR(100) NOT NULL,
  cliente_telefono VARCHAR(20),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  num_personas INTEGER NOT NULL,
  notas TEXT,
  estado VARCHAR(20) DEFAULT 'confirmada',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Archivos a crear:**
- `backend/src/controllers/reservationController.js`
- `backend/src/routes/reservations.js`
- `frontend/src/pages/Reservations.jsx`

---

### Programa de Lealtad
**Prioridad:** 🟢 Baja  
**Complejidad:** Alta

Puntos por compra para clientes frecuentes.

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) UNIQUE,
  email VARCHAR(100),
  puntos INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_id INTEGER REFERENCES orders(id),
  puntos INTEGER NOT NULL,
  tipo VARCHAR(20), -- 'ganado' o 'canjeado'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Caja/Arqueo
**Prioridad:** 🔴 Alta  
**Complejidad:** Media

Control de apertura y cierre de caja.

```sql
CREATE TABLE cash_registers (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES users(id),
  monto_inicial DECIMAL(10,2) NOT NULL,
  monto_final DECIMAL(10,2),
  ventas_efectivo DECIMAL(10,2) DEFAULT 0,
  ventas_tarjeta DECIMAL(10,2) DEFAULT 0,
  diferencia DECIMAL(10,2),
  estado VARCHAR(20) DEFAULT 'abierta',
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);
```

**Flujo:**
1. Gerente abre caja con monto inicial
2. Se registran ventas en efectivo/tarjeta
3. Al cerrar, se calcula diferencia
4. Generar reporte de cierre

---

### Turnos de Empleados
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Control de horarios y asistencia.

```sql
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES users(id),
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  notas TEXT
);
```

---

## 📱 UX/UI

### PWA Completa
**Prioridad:** 🔴 Alta  
**Complejidad:** Media

Hacer la app instalable en móviles y funcional offline.

**Archivos a crear/modificar:**

1. `frontend/public/manifest.json`:
```json
{
  "name": "Emilia Café",
  "short_name": "Emilia",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#be185d",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

2. `frontend/public/sw.js` (Service Worker):
```javascript
const CACHE_NAME = 'emilia-v1';
const urlsToCache = ['/', '/index.html', '/assets/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

3. Registrar en `frontend/src/main.jsx`:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

### Modo Oscuro
**Prioridad:** 🟡 Media  
**Complejidad:** Baja

Tema oscuro especialmente útil para la pantalla de cocina.

```javascript
// En tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
}

// Toggle en el componente
const [darkMode, setDarkMode] = useState(false);
document.documentElement.classList.toggle('dark', darkMode);
```

**Clases CSS:**
```css
.bg-gray-50 { @apply dark:bg-gray-900; }
.text-gray-900 { @apply dark:text-gray-100; }
```

---

### Accesibilidad (a11y)
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Hacer la app accesible para todos los usuarios.

**Mejoras:**
- Agregar `aria-label` a botones con solo iconos
- Asegurar contraste de colores suficiente
- Navegación completa por teclado
- Skip links para lectores de pantalla

```jsx
// Ejemplo
<button 
  onClick={handleDelete}
  aria-label="Eliminar orden"
  className="btn-ghost"
>
  <Trash className="w-4 h-4" />
</button>
```

---

### Atajos de Teclado
**Prioridad:** 🟢 Baja  
**Complejidad:** Baja

Para operaciones frecuentes en cocina y caja.

```javascript
// Hook para atajos
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      navigate('/orders/new');
    }
    if (e.key === 'F5') {
      e.preventDefault();
      fetchOrders();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Atajos sugeridos:**
- `Ctrl+N` → Nueva orden
- `F5` → Refrescar
- `Esc` → Cerrar modal
- `Enter` → Confirmar acción

---

## 🔧 DevOps/Infraestructura

### CI/CD con Tests
**Prioridad:** 🔴 Alta  
**Complejidad:** Media

Automatizar pruebas antes de cada deploy.

**Archivo: `.github/workflows/ci.yml`**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install backend dependencies
        run: cd backend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
      
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      
      - name: Build frontend
        run: cd frontend && npm run build
```

---

### Staging Environment
**Prioridad:** 🟡 Media  
**Complejidad:** Baja

Ambiente de pruebas antes de producción.

**En Railway:**
1. Crear nuevo proyecto "emilia-cafe-staging"
2. Conectar al mismo repo pero rama `develop`
3. Usar base de datos separada

**Flujo:**
```
feature-branch → develop (staging) → main (producción)
```

---

### Backups Automáticos
**Prioridad:** 🔴 Alta  
**Complejidad:** Baja

Respaldos diarios de la base de datos.

**Railway:** Los backups están incluidos en el plan Pro.

**Alternativa manual con cron:**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y-%m-%d)
pg_dump $DATABASE_URL > backups/backup_$DATE.sql
# Subir a S3 o Google Drive
```

**Servicio recomendado:** 
- [SimpleBackups](https://simplebackups.com/) - Gratis hasta 1 backup diario

---

### Monitoreo (APM)
**Prioridad:** 🔴 Alta  
**Complejidad:** Baja

Detectar errores en tiempo real.

**Sentry (recomendado):**
```javascript
// backend/src/app.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());
// ... rutas
app.use(Sentry.Handlers.errorHandler());
```

```javascript
// frontend/src/main.jsx
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: process.env.VITE_SENTRY_DSN });
```

**Gratis:** 5,000 errores/mes

---

### Health Checks
**Prioridad:** 🟡 Media  
**Complejidad:** Baja

Alertas si el servicio cae.

**Ya implementado:** `GET /api/health`

**Servicios de monitoreo:**
- [UptimeRobot](https://uptimerobot.com/) - Gratis, 50 monitores
- [Better Uptime](https://betteruptime.com/) - Gratis, 10 monitores

---

## 📊 Analytics

### Dashboard Avanzado
**Prioridad:** 🟡 Media  
**Complejidad:** Media

Gráficas de tendencias y comparativas.

**Métricas sugeridas:**
- Ventas por hora del día (heatmap)
- Comparativa semana actual vs anterior
- Ticket promedio por mesero
- Tiempo promedio de preparación
- Tasa de cancelación

**Librerías:**
- Recharts (ya instalado)
- React-chartjs-2

---

### Productos Más Vendidos
**Prioridad:** 🟡 Media  
**Complejidad:** Baja

Análisis por hora, día, semana.

```sql
-- Top 10 productos de la semana
SELECT 
  mi.nombre,
  SUM(oi.cantidad) as total_vendido,
  SUM(oi.subtotal) as ingresos
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE o.estado = 'cobrada' 
  AND o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY mi.id
ORDER BY total_vendido DESC
LIMIT 10;
```

---

### Tiempo de Preparación
**Prioridad:** 🟡 Media  
**Complejidad:** Baja

Métricas de eficiencia de cocina.

```sql
-- Agregar timestamps a orders
ALTER TABLE orders ADD COLUMN started_at TIMESTAMP;  -- cuando pasa a en_preparacion
ALTER TABLE orders ADD COLUMN ready_at TIMESTAMP;    -- cuando pasa a lista

-- Tiempo promedio de preparación
SELECT 
  DATE(created_at) as fecha,
  AVG(EXTRACT(EPOCH FROM (ready_at - started_at))/60) as minutos_promedio
FROM orders
WHERE ready_at IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

---

## ⭐ Prioridades Sugeridas

### Fase 1 - Estabilidad (1-2 semanas)
- [ ] Rate Limiting
- [ ] Índices en BD
- [ ] Backups automáticos
- [ ] Monitoreo con Sentry

### Fase 2 - Negocio (2-4 semanas)
- [ ] Reportes PDF (corte de caja)
- [ ] Sistema de caja/arqueo
- [ ] PWA completa

### Fase 3 - Optimización (1-2 meses)
- [ ] Redis para cache
- [ ] Refresh tokens
- [ ] Dashboard avanzado
- [ ] Modo oscuro para cocina

### Fase 4 - Expansión (2-3 meses)
- [ ] Reservaciones
- [ ] Sistema de propinas
- [ ] Turnos de empleados
- [ ] Programa de lealtad

---

## 📝 Notas

- Cada mejora debe probarse en staging antes de producción
- Documentar cambios en CHANGELOG.md
- Hacer commits pequeños y descriptivos
- Mantener tests actualizados

---

*Última actualización: 30 de Diciembre, 2025*
