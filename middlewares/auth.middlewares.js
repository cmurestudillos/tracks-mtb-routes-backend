const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Middleware para validar JWT
 * Verifica que el token sea válido y no haya expirado
 */
function isTokenValid(req, res, next) {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Token no proporcionado',
        message: 'Debes estar autenticado para acceder a este recurso',
      });
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Formato de token inválido',
        message: 'El formato debe ser: Bearer <token>',
      });
    }

    const token = parts[1];

    // Verificar y decodificar el token
    const payload = jwt.verify(token, config.tokenSecret);

    // Adjuntar el payload al request para usarlo en las rutas
    req.payload = payload;

    logger.debug({ username: payload.username }, 'Usuario autenticado');

    next();
  } catch (error) {
    // Manejo de errores específicos de JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El token proporcionado no es válido.',
      });
    }

    // Error genérico
    logger.error({ err: error.message }, 'Error validando token');
    return res.status(401).json({
      error: 'Error de autenticación',
      message: 'No se pudo validar tu token de autenticación.',
    });
  }
}

/**
 * Middleware opcional para autenticación
 * No bloquea si no hay token, solo lo adjunta si existe
 */
function isTokenValidOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(); // Continuar sin autenticación
    }

    const parts = authHeader.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const payload = jwt.verify(token, config.tokenSecret);
      req.payload = payload;
    }

    next();
  } catch {
    // Si hay error con el token, continuar sin payload
    next();
  }
}

/**
 * Middleware para verificar rol de administrador
 */
function isAdmin(req, res, next) {
  if (!req.payload) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Debes estar autenticado para acceder a este recurso',
    });
  }

  if (req.payload.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos de administrador para realizar esta acción',
    });
  }

  next();
}

/**
 * Middleware para verificar que el usuario sea el propietario o admin
 * @param {string} paramName - Nombre del parámetro que contiene el userId
 */
function isOwnerOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.payload) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes estar autenticado para acceder a este recurso',
      });
    }

    const resourceUserId = req.params[paramName] || req.body.creador || req.body.userId;

    // Si es admin o el propietario del recurso
    if (req.payload.role === 'admin' || req.payload._id === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permiso para realizar esta acción',
    });
  };
}

module.exports = {
  isTokenValid,
  isTokenValidOptional,
  isAdmin,
  isOwnerOrAdmin,
};
