require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInputs } = require('./middleware/sanitize');
const { initializeSocket } = require('./sockets');
const logger = require('./utils/logger');
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./utils/sentry');

// Inicializar Sentry (APM) - debe ser lo primero
initSentry();

// Crear aplicación Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Inicializar WebSocket handlers
initializeSocket(io);

// Middleware para pasar io a los controladores
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middlewares de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite de requests por ventana
  message: { 
    success: false, 
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limiting más estricto para login (prevenir fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { 
    success: false, 
    message: 'Demasiados intentos de login, intenta en 15 minutos' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Sentry request handler (debe ir antes de otros handlers)
app.use(sentryRequestHandler());

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitización de inputs (prevenir XSS e inyección)
app.use(sanitizeInputs);

// Rutas de API
app.use('/api', routes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    name: 'Emilia Café API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health',
  });
});

// Sentry error handler (debe ir antes del error handler final)
app.use(sentryErrorHandler());

// Manejadores de error
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
const PORT = config.port;

server.listen(PORT, () => {
  logger.info(`🚀 Servidor Emilia Café corriendo en puerto ${PORT}`);
  logger.info(`📡 WebSocket activo`);
  logger.info(`🌍 Ambiente: ${config.env}`);
  logger.info(`🔗 CORS habilitado para: ${config.cors.origin}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('Forzando cierre del servidor');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server, io };
