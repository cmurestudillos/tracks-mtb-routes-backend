const router = require('express').Router();
const { isTokenValid } = require('../middlewares/auth.middlewares');

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Information
 * GET /api/info
 */
router.get('/info', (req, res) => {
  res.status(200).json({
    name: 'Tacks MTB Routes API',
    version: '2.0.0',
    description: 'API REST para gestión de rutas MTB, usuarios y reseñas',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
    endpoints: {
      auth: '/api/auth',
      rutas: '/api/rutas',
      reviews: '/api/reviews',
      user: '/api/user',
      upload: '/api/upload',
    },
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Auth Routes
 * /api/auth/*
 */
const authRouter = require('./auth.routes');
router.use('/auth', authRouter);

/**
 * Rutas Routes (Protegidas)
 * /api/rutas/*
 */
const rutasRouter = require('./rutas.routes');
router.use('/rutas', isTokenValid, rutasRouter);

/**
 * Reviews Routes (Protegidas)
 * /api/reviews/*
 */
const resenasRouter = require('./resenas.routes');
router.use('/reviews', isTokenValid, resenasRouter);

/**
 * User Routes (Protegidas)
 * /api/user/*
 */
const userRouter = require('./user.routes');
router.use('/user', isTokenValid, userRouter);

/**
 * Upload Routes (Protegidas)
 * /api/upload/*
 */
const uploadRouter = require('./upload.routes');
router.use('/upload', uploadRouter);

/**
 * 404 Handler para rutas no encontradas dentro de /api
 */
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    availableEndpoints: ['/api/auth', '/api/rutas', '/api/reviews', '/api/user', '/api/upload'],
  });
});

module.exports = router;
