const multer = require('multer');
const config = require('../config');

// Configuración de Multer para almacenar en memoria (buffer)
const storage = multer.memoryStorage();

/**
 * Filtro para validar tipos de archivo
 */
const fileFilter = (req, file, cb) => {
  if (config.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: ${config.allowedImageTypes.join(', ')}`
      )
    );
  }
};

/**
 * Configuración de Multer
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: config.maxFiles,
  },
});

/**
 * Middleware para manejar errores de Multer
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Errores específicos de Multer
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'Archivo demasiado grande',
          message: `El archivo excede el límite de ${config.maxFileSize / (1024 * 1024)}MB`,
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Demasiados archivos',
          message: `Solo puedes subir un máximo de ${config.maxFiles} archivos`,
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Campo de archivo inesperado',
          message: 'El nombre del campo no coincide con el esperado',
        });
      default:
        return res.status(400).json({
          error: 'Error de carga',
          message: err.message,
        });
    }
  }

  // Error personalizado (del fileFilter)
  if (err) {
    return res.status(400).json({
      error: 'Error de validación',
      message: err.message,
    });
  }

  next();
};

/**
 * Middleware para validar que se haya subido un archivo
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      error: 'Archivo requerido',
      message: 'Debes proporcionar al menos un archivo',
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError,
  validateFileUpload,
};
