require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

const logger = require('./config/logger');

// Configuración y Base de datos
const config = require('./config');
const connectDB = require('./db');

// Rutas y Middlewares
const indexRoutes = require('./routes/index.routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');

const app = express();

// Conectar a MongoDB
connectDB();

// Configurar Helmet con excepciones para Swagger UI
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      },
    },
  })
);

// Rate limiting global para /api
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMaxRequests,
  message: {
    error: 'Demasiadas peticiones',
    message: 'Has excedido el límite de peticiones. Por favor, intenta de nuevo más tarde.',
  },
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  skip: req => req.path.startsWith('/api-docs') || req.path === '/',
});

app.use('/api/', limiter);

// Configurar CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, mobile, curl, etc)
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.indexOf(origin) !== -1 || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Middlewares generales
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb', extended: true }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Servir archivos estáticos (landing page)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// DOCUMENTACIÓN SWAGGER
// ==========================================

/**
 * @swagger
 * /:
 *   get:
 *     summary: Página principal de la API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Información básica de la API
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del servidor
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Estado del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 */

// Opciones de personalización para Swagger UI
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { 
      display: none; 
    }
    .swagger-ui .info .title {
      font-size: 2.5rem;
      color: #667eea;
    }
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
    }
  `,
  customSiteTitle: 'Tacks MTB Routes API Docs',
  customfavIcon: '/favicon.ico',
};

// Ruta de documentación Swagger
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerOptions));

// Endpoint para obtener el JSON de Swagger (útil para Postman, etc)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

// Landing page (servida desde /public/index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// Rutas de la API
app.use('/api', indexRoutes);

// ==========================================
// MANEJADORES DE ERRORES
// ==========================================

// 404 - Recurso no encontrado
app.use(notFound);

// Manejador global de errores
app.use(errorHandler);

// ==========================================
// INICIO DEL SERVIDOR (solo en desarrollo)
// ==========================================

if (config.nodeEnv !== 'production') {
  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    logger.info(
      {
        url: `http://localhost:${port}`,
        docs: `http://localhost:${port}/api-docs`,
        env: config.nodeEnv,
      },
      'Servidor iniciado'
    );
  });
}

// Exportar la aplicación para Vercel
module.exports = app;
