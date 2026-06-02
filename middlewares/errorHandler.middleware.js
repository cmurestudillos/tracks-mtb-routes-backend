const config = require('../config');
const logger = require('../config/logger');

/**
 * Middleware para manejar errores 404
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    error: 'Recurso no encontrado',
    message: `La ruta ${req.originalUrl} no existe`,
    path: req.originalUrl,
  });
};

/**
 * Middleware para manejar errores generales
 */
// next es requerido por Express para reconocer esta función como error handler (4 parámetros)
const errorHandler = (err, req, res, _next) => {
  logger.error({ err: err.message, stack: err.stack, status: err.status || err.statusCode }, 'Error capturado');

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: err.message,
      details: Object.values(err.errors).map(e => e.message),
    });
  }

  // Error de cast de Mongoose (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID inválido',
      message: `El ID proporcionado no es válido: ${err.value}`,
    });
  }

  // Error de clave duplicada
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: 'Valor duplicado',
      message: `El ${field} ya está en uso`,
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación no es válido',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
    });
  }

  // Error de CORS
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({
      error: 'Origen no permitido',
      message: 'Tu dominio no tiene permiso para acceder a esta API',
    });
  }

  // Error genérico
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor' : message,
    message: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};
