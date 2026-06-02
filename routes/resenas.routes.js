const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Resena = require('../models/Resenas.model');
const User = require('../models/User.model');
const { deleteFromBlob } = require('../config/blob.config');
const logger = require('../config/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Crea una nueva reseña
 *     description: Crea una reseña para una ruta (un usuario solo puede hacer una reseña por ruta)
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - ruta
 *               - rating
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Excelente ruta para principiantes
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: La ruta está muy bien señalizada y el paisaje es increíble. Perfecta para ir en familia.
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               ruta:
 *                 type: string
 *                 description: ID de la ruta a reseñar
 *                 example: 507f1f77bcf86cd799439011
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: https://blob.vercel-storage.com/resena.jpg
 *               fechaRealizada:
 *                 type: string
 *                 format: date
 *                 example: 2024-11-01
 *               condiciones:
 *                 type: object
 *                 properties:
 *                   clima:
 *                     type: string
 *                     enum: [soleado, nublado, lluvioso, nevado, ventoso]
 *                     example: soleado
 *                   estadoRuta:
 *                     type: string
 *                     enum: [excelente, bueno, regular, malo]
 *                     example: excelente
 *     responses:
 *       201:
 *         description: Reseña creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resena'
 *       400:
 *         description: Error de validación o ya existe una reseña
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ya has creado una reseña para esta ruta
 *       401:
 *         description: No autenticado
 */
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('El título es obligatorio'),
    body('description').trim().notEmpty().withMessage('La descripción es obligatoria'),
    body('ruta').isMongoId().withMessage('ID de ruta no válido'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating debe ser entre 1 y 5'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, ruta, rating, image, fechaRealizada, condiciones } = req.body;

      // Verificar si el usuario ya hizo una reseña de esta ruta
      const existingResena = await Resena.findOne({
        creador: req.payload._id,
        ruta,
      });

      if (existingResena) {
        return res.status(400).json({
          message: 'Ya has creado una reseña para esta ruta',
        });
      }

      const nuevaResena = await Resena.create({
        title,
        description,
        rating,
        creador: req.payload._id,
        ruta,
        image,
        fechaRealizada,
        condiciones,
      });

      // Actualizar el array de resenasCreadas del usuario
      await User.findByIdAndUpdate(req.payload._id, {
        $push: { resenasCreadas: nuevaResena._id },
      });

      const resenaPopulada = await Resena.findById(nuevaResena._id).populate('creador', 'username image');

      res.status(201).json(resenaPopulada);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reviews/rutas/{rutaId}:
 *   get:
 *     summary: Obtiene reseñas de una ruta
 *     description: Lista todas las reseñas de una ruta específica con paginación y rating promedio
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la ruta
 *         example: 507f1f77bcf86cd799439011
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
 *           default: 10
 *         description: Reseñas por página
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -createdAt
 *         description: Ordenamiento (ej. -createdAt, rating, -rating)
 *     responses:
 *       200:
 *         description: Reseñas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resenas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resena'
 *                 avgRating:
 *                   type: string
 *                   example: "4.5"
 *                   description: Rating promedio de la ruta
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: ID de ruta no válido
 */
router.get(
  '/rutas/:rutaId',
  [param('rutaId').isMongoId().withMessage('ID de ruta no válido')],
  validate,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [resenas, total, avgRating] = await Promise.all([
        Resena.find({ ruta: req.params.rutaId, isPublic: true })
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('creador', 'username image'),
        Resena.countDocuments({ ruta: req.params.rutaId, isPublic: true }),
        Resena.aggregate([
          { $match: { ruta: req.params.rutaId, isPublic: true } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]),
      ]);

      res.status(200).json({
        resenas,
        avgRating: avgRating.length > 0 ? avgRating[0].avgRating.toFixed(1) : 0,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reviews/user:
 *   get:
 *     summary: Obtiene reseñas del usuario autenticado
 *     description: Lista todas las reseñas creadas por el usuario actual
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reseñas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resena'
 *       401:
 *         description: No autenticado
 */
router.get('/user', async (req, res, next) => {
  try {
    const resenas = await Resena.find({ creador: req.payload._id })
      .sort('-createdAt')
      .populate('ruta', 'name image difficulty')
      .populate('creador', 'username image');

    res.status(200).json(resenas);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Obtiene detalles de una reseña
 *     description: Devuelve información completa de una reseña específica
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reseña
 *     responses:
 *       200:
 *         description: Detalles de la reseña
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resena'
 *       404:
 *         description: Reseña no encontrada
 */
router.get(
  '/:reviewId',
  [param('reviewId').isMongoId().withMessage('ID de reseña no válido')],
  validate,
  async (req, res, next) => {
    try {
      const resena = await Resena.findById(req.params.reviewId)
        .populate('creador', 'username image bio')
        .populate('ruta', 'name image difficulty provincia');

      if (!resena) {
        return res.status(404).json({ message: 'Reseña no encontrada' });
      }

      res.status(200).json(resena);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   patch:
 *     summary: Actualiza una reseña
 *     description: Modifica una reseña existente (solo el creador)
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               image:
 *                 type: string
 *               fechaRealizada:
 *                 type: string
 *                 format: date
 *               condiciones:
 *                 type: object
 *     responses:
 *       200:
 *         description: Reseña actualizada
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Reseña no encontrada
 */
router.patch(
  '/:reviewId',
  [
    param('reviewId').isMongoId().withMessage('ID de reseña no válido'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating debe ser entre 1 y 5'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const resena = await Resena.findById(req.params.reviewId);

      if (!resena) {
        return res.status(404).json({ message: 'Reseña no encontrada' });
      }

      if (resena.creador.toString() !== req.payload._id) {
        return res.status(403).json({ message: 'No tienes permiso para editar esta reseña' });
      }

      const allowedFields = ['title', 'description', 'rating', 'image', 'fechaRealizada', 'condiciones'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          resena[field] = req.body[field];
        }
      });

      await resena.save();

      res.status(200).json(resena);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Elimina una reseña
 *     description: Elimina permanentemente una reseña (solo creador o admin)
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reseña
 *     responses:
 *       200:
 *         description: Reseña eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reseña eliminada correctamente
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Reseña no encontrada
 */
router.delete(
  '/:reviewId',
  [param('reviewId').isMongoId().withMessage('ID de reseña no válido')],
  validate,
  async (req, res, next) => {
    try {
      const resena = await Resena.findById(req.params.reviewId);

      if (!resena) {
        return res.status(404).json({ message: 'Reseña no encontrada' });
      }

      if (resena.creador.toString() !== req.payload._id && req.payload.role !== 'admin') {
        return res.status(403).json({ message: 'No tienes permiso para eliminar esta reseña' });
      }

      // Eliminar imagen de Vercel Blob
      if (resena.image && resena.image.includes('blob.vercel-storage.com')) {
        try {
          await deleteFromBlob(resena.image);
        } catch (error) {
          logger.error({ err: error.message }, 'Error eliminando imagen de reseña');
        }
      }

      // Eliminar imágenes adicionales
      if (resena.images && resena.images.length > 0) {
        for (const imageUrl of resena.images) {
          if (imageUrl.includes('blob.vercel-storage.com')) {
            try {
              await deleteFromBlob(imageUrl);
            } catch (error) {
              logger.error({ err: error.message }, 'Error eliminando imagen adicional de reseña');
            }
          }
        }
      }

      await Resena.findByIdAndDelete(req.params.reviewId);

      // Eliminar referencia del usuario
      await User.findByIdAndUpdate(resena.creador, {
        $pull: { resenasCreadas: resena._id },
      });

      res.status(200).json({ message: 'Reseña eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reviews/{reviewId}/like:
 *   patch:
 *     summary: Da like a una reseña
 *     description: Incrementa el contador de likes de una reseña
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
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
 *                   example: 15
 *       404:
 *         description: Reseña no encontrada
 */
router.patch(
  '/:reviewId/like',
  [param('reviewId').isMongoId().withMessage('ID de reseña no válido')],
  validate,
  async (req, res, next) => {
    try {
      const resena = await Resena.findById(req.params.reviewId);

      if (!resena) {
        return res.status(404).json({ message: 'Reseña no encontrada' });
      }

      resena.likes += 1;
      await resena.save();

      res.status(200).json({ likes: resena.likes });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
