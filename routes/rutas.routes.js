const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Rutas = require('../models/Rutas.model');
const User = require('../models/User.model');
const { deleteFromBlob } = require('../config/blob.config');
const logger = require('../config/logger');

// Middleware para validar errores
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/rutas:
 *   get:
 *     summary: Obtiene todas las rutas públicas
 *     description: Lista todas las rutas públicas con paginación y filtros opcionales
 *     tags: [Rutas]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número de resultados por página
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [fácil, media, difícil, profesional]
 *         description: Filtrar por dificultad
 *       - in: query
 *         name: modalidad
 *         schema:
 *           type: string
 *           enum: [montaña, urbano, carretera, gravel]
 *         description: Filtrar por modalidad
 *       - in: query
 *         name: provincia
 *         schema:
 *           type: string
 *         description: Filtrar por provincia
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -createdAt
 *         description: Campo de ordenamiento (ej. -createdAt, views, likes)
 *     responses:
 *       200:
 *         description: Lista de rutas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rutas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ruta'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pages:
 *                       type: integer
 *                       example: 8
 *                     limit:
 *                       type: integer
 *                       example: 20
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, difficulty, modalidad, provincia, sort = '-createdAt' } = req.query;

    const filters = { isPublic: true };
    if (difficulty) filters.difficulty = difficulty;
    if (modalidad) filters.modalidad = modalidad;
    if (provincia) filters.provincia = provincia.toLowerCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rutas, total] = await Promise.all([
      Rutas.find(filters).sort(sort).skip(skip).limit(parseInt(limit)).populate('creador', 'username image').lean(),
      Rutas.countDocuments(filters),
    ]);

    res.status(200).json({
      rutas,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/rutas/user:
 *   get:
 *     summary: Obtiene las rutas del usuario autenticado
 *     description: Lista todas las rutas creadas por el usuario actual
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de rutas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ruta'
 *       401:
 *         description: No autenticado
 */
router.get('/user', async (req, res, next) => {
  try {
    const rutas = await Rutas.find({ creador: req.payload._id })
      .sort('-createdAt')
      .populate('creador', 'username image');

    res.status(200).json(rutas);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/rutas/search:
 *   get:
 *     summary: Búsqueda de texto completo en rutas
 *     description: Busca rutas por nombre o descripción usando búsqueda de texto completo
 *     tags: [Rutas]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *         example: guadarrama
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rutas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ruta'
 *                 pagination:
 *                   type: object
 *       400:
 *         description: Parámetro de búsqueda requerido
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rutas, total] = await Promise.all([
      Rutas.find({
        $text: { $search: q },
        isPublic: true,
      })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('creador', 'username image')
        .lean(),
      Rutas.countDocuments({
        $text: { $search: q },
        isPublic: true,
      }),
    ]);

    res.status(200).json({
      rutas,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/rutas/query:
 *   get:
 *     summary: Búsqueda con filtros múltiples (Legacy)
 *     description: Busca rutas por provincia, dificultad o modalidad
 *     tags: [Rutas]
 *     parameters:
 *       - in: query
 *         name: queryValue
 *         required: true
 *         schema:
 *           type: string
 *         description: Valor a buscar (provincia, dificultad o modalidad)
 *         example: madrid
 *     responses:
 *       200:
 *         description: Rutas encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ruta'
 */
router.get('/query', async (req, res, next) => {
  const { queryValue } = req.query;

  if (!queryValue) {
    return res.status(400).json({ message: 'queryValue es requerido' });
  }

  const searchValue = queryValue.toLowerCase();

  try {
    const rutas = await Rutas.find({
      $or: [{ provincia: searchValue }, { difficulty: searchValue }, { modalidad: searchValue }],
      isPublic: true,
    }).populate('creador', 'username image');

    res.status(200).json(rutas);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/rutas/{rutaId}:
 *   get:
 *     summary: Obtiene detalles de una ruta específica
 *     description: Devuelve información completa de una ruta incluyendo creador y reseñas
 *     tags: [Rutas]
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la ruta
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Detalles de la ruta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ruta'
 *       404:
 *         description: Ruta no encontrada
 */
router.get(
  '/:rutaId',
  [param('rutaId').isMongoId().withMessage('ID de ruta no válido')],
  validate,
  async (req, res, next) => {
    try {
      const ruta = await Rutas.findById(req.params.rutaId)
        .populate('creador', 'username image bio location')
        .populate({
          path: 'resenas',
          populate: { path: 'creador', select: 'username image' },
          options: { sort: '-createdAt', limit: 10 },
        });

      if (!ruta) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      // Incrementar vistas
      ruta.views += 1;
      await ruta.save();

      res.status(200).json(ruta);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rutas:
 *   post:
 *     summary: Crea una nueva ruta
 *     description: Crea una ruta MTB con todos sus detalles
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - difficulty
 *               - distanciaEnKm
 *               - desnivelEnM
 *               - duracionEnHoras
 *               - modalidad
 *               - provincia
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ruta de la Sierra de Guadarrama
 *               description:
 *                 type: string
 *                 example: Increíble ruta con vistas panorámicas
 *               difficulty:
 *                 type: string
 *                 enum: [fácil, media, difícil, profesional]
 *                 example: media
 *               distanciaEnKm:
 *                 type: number
 *                 example: 25.5
 *               desnivelEnM:
 *                 type: number
 *                 example: 850
 *               duracionEnHoras:
 *                 type: number
 *                 example: 3.5
 *               modalidad:
 *                 type: string
 *                 enum: [montaña, urbano, carretera, gravel]
 *                 example: montaña
 *               provincia:
 *                 type: string
 *                 example: madrid
 *               image:
 *                 type: string
 *                 example: https://blob.vercel-storage.com/ruta.jpg
 *               coordinatesStart:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [-3.7038, 40.4168]
 *               coordinatesEnd:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [-3.7138, 40.4268]
 *     responses:
 *       201:
 *         description: Ruta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ruta'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('difficulty').isIn(['fácil', 'media', 'difícil', 'profesional']).withMessage('Dificultad no válida'),
    body('distanciaEnKm').isFloat({ min: 0.1 }).withMessage('Distancia debe ser mayor a 0'),
    body('desnivelEnM').isFloat({ min: 0 }).withMessage('Desnivel no válido'),
    body('duracionEnHoras').isFloat({ min: 0.1 }).withMessage('Duración debe ser mayor a 0'),
    body('modalidad').isIn(['montaña', 'urbano', 'carretera', 'gravel']).withMessage('Modalidad no válida'),
    body('provincia').trim().notEmpty().withMessage('La provincia es obligatoria'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const rutaData = {
        ...req.body,
        creador: req.payload._id,
        provincia: req.body.provincia.toLowerCase(),
      };

      const nuevaRuta = await Rutas.create(rutaData);

      await User.findByIdAndUpdate(req.payload._id, {
        $push: { rutasCreadas: nuevaRuta._id },
      });

      const rutaPopulada = await Rutas.findById(nuevaRuta._id).populate('creador', 'username image');

      res.status(201).json(rutaPopulada);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rutas/image/{rutaId}:
 *   patch:
 *     summary: Actualiza la imagen de una ruta
 *     description: Cambia la imagen principal de la ruta (solo el creador)
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: https://blob.vercel-storage.com/nueva-imagen.jpg
 *     responses:
 *       200:
 *         description: Imagen actualizada
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Ruta no encontrada
 */
router.patch(
  '/image/:rutaId',
  [
    param('rutaId').isMongoId().withMessage('ID de ruta no válido'),
    body('image').isURL().withMessage('URL de imagen no válida'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const ruta = await Rutas.findById(req.params.rutaId);

      if (!ruta) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      if (ruta.creador.toString() !== req.payload._id) {
        return res.status(403).json({ message: 'No tienes permiso para editar esta ruta' });
      }

      if (ruta.image && ruta.image.includes('blob.vercel-storage.com') && ruta.image !== req.body.image) {
        try {
          await deleteFromBlob(ruta.image);
        } catch (error) {
          logger.error({ err: error.message }, 'Error eliminando imagen anterior de ruta');
        }
      }

      ruta.image = req.body.image;
      await ruta.save();

      res.status(200).json(ruta);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rutas/details/{rutaId}:
 *   patch:
 *     summary: Actualiza los detalles de una ruta
 *     description: Modifica información de la ruta (solo el creador)
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               difficulty:
 *                 type: string
 *               distanciaEnKm:
 *                 type: number
 *               desnivelEnM:
 *                 type: number
 *               duracionEnHoras:
 *                 type: number
 *               modalidad:
 *                 type: string
 *               provincia:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ruta actualizada
 *       403:
 *         description: No tienes permiso
 */
router.patch(
  '/details/:rutaId',
  [param('rutaId').isMongoId().withMessage('ID de ruta no válido')],
  validate,
  async (req, res, next) => {
    try {
      const ruta = await Rutas.findById(req.params.rutaId);

      if (!ruta) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      if (ruta.creador.toString() !== req.payload._id) {
        return res.status(403).json({ message: 'No tienes permiso para editar esta ruta' });
      }

      const allowedFields = [
        'name',
        'description',
        'difficulty',
        'distanciaEnKm',
        'desnivelEnM',
        'duracionEnHoras',
        'modalidad',
        'provincia',
        'coordinatesStart',
        'coordinatesEnd',
      ];

      const updates = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (updates.provincia) {
        updates.provincia = updates.provincia.toLowerCase();
      }

      Object.assign(ruta, updates);
      await ruta.save();

      res.status(200).json(ruta);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rutas/{rutaId}:
 *   delete:
 *     summary: Elimina una ruta
 *     description: Elimina permanentemente una ruta y sus imágenes (solo creador o admin)
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ruta eliminada
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Ruta no encontrada
 */
router.delete(
  '/:rutaId',
  [param('rutaId').isMongoId().withMessage('ID de ruta no válido')],
  validate,
  async (req, res, next) => {
    try {
      const ruta = await Rutas.findById(req.params.rutaId);

      if (!ruta) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      if (ruta.creador.toString() !== req.payload._id && req.payload.role !== 'admin') {
        return res.status(403).json({ message: 'No tienes permiso para eliminar esta ruta' });
      }

      if (ruta.image && ruta.image.includes('blob.vercel-storage.com')) {
        try {
          await deleteFromBlob(ruta.image);
        } catch (error) {
          logger.error({ err: error.message }, 'Error eliminando imagen de ruta');
        }
      }

      if (ruta.images && ruta.images.length > 0) {
        for (const imageUrl of ruta.images) {
          if (imageUrl.includes('blob.vercel-storage.com')) {
            try {
              await deleteFromBlob(imageUrl);
            } catch (error) {
              logger.error({ err: error.message }, 'Error eliminando imagen adicional de ruta');
            }
          }
        }
      }

      await Rutas.findByIdAndDelete(req.params.rutaId);

      await User.findByIdAndUpdate(ruta.creador, {
        $pull: { rutasCreadas: ruta._id, rutasFav: ruta._id },
      });

      res.status(200).json({ message: 'Ruta eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rutas/{rutaId}/like:
 *   patch:
 *     summary: Da like a una ruta
 *     description: Incrementa el contador de likes de una ruta
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 likes:
 *                   type: number
 *                   example: 26
 */
router.patch(
  '/:rutaId/like',
  [param('rutaId').isMongoId().withMessage('ID de ruta no válido')],
  validate,
  async (req, res, next) => {
    try {
      const ruta = await Rutas.findById(req.params.rutaId);

      if (!ruta) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      ruta.likes += 1;
      await ruta.save();

      res.status(200).json({ likes: ruta.likes });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
