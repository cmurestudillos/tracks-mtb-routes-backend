const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Rutas = require('../models/Rutas.model');
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
 * /api/user:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     description: Devuelve información completa del perfil incluyendo rutas favoritas y creadas
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.payload._id)
      .populate('rutasFav', 'name image difficulty provincia')
      .populate('rutasCreadas', 'name image createdAt')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/{userId}:
 *   get:
 *     summary: Obtiene el perfil público de un usuario
 *     description: Devuelve información pública de cualquier usuario por su ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Perfil público del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 image:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 location:
 *                   type: string
 *                 rutasCreadas:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -email -rutasFav')
      .populate('rutasCreadas', 'name image difficulty provincia views likes');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/stats/dashboard:
 *   get:
 *     summary: Obtiene estadísticas del usuario
 *     description: Devuelve métricas y estadísticas del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rutasCreadas:
 *                   type: integer
 *                   example: 12
 *                 rutasFavoritas:
 *                   type: integer
 *                   example: 25
 *                 resenasCreadas:
 *                   type: integer
 *                   example: 8
 *                 totalViews:
 *                   type: integer
 *                   example: 1523
 *                   description: Total de visualizaciones en todas las rutas del usuario
 *                 totalLikes:
 *                   type: integer
 *                   example: 342
 *                   description: Total de likes en todas las rutas del usuario
 */
router.get('/stats/dashboard', async (req, res, next) => {
  try {
    const [rutasCreadas, rutasFavoritas, resenasCreadas] = await Promise.all([
      Rutas.countDocuments({ creador: req.payload._id }),
      User.findById(req.payload._id).select('rutasFav'),
      require('../models/Resenas.model').countDocuments({ creador: req.payload._id }),
    ]);

    const rutasStats = await Rutas.aggregate([
      { $match: { creador: req.payload._id } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
        },
      },
    ]);

    res.status(200).json({
      rutasCreadas,
      rutasFavoritas: rutasFavoritas?.rutasFav?.length || 0,
      resenasCreadas,
      totalViews: rutasStats[0]?.totalViews || 0,
      totalLikes: rutasStats[0]?.totalLikes || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: Actualiza el perfil del usuario
 *     description: Modifica información del perfil como bio y ubicación
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: Amante del MTB y la naturaleza. Explorador de rutas en la Sierra.
 *               location:
 *                 type: string
 *                 maxLength: 100
 *                 example: Madrid, España
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación
 */
router.patch(
  '/profile',
  [
    body('bio').optional().isLength({ max: 500 }).withMessage('La bio no puede exceder 500 caracteres'),
    body('location').optional().isLength({ max: 100 }).withMessage('La ubicación no puede exceder 100 caracteres'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const allowedFields = ['bio', 'location'];
      const updates = {};

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const user = await User.findByIdAndUpdate(req.payload._id, updates, {
        new: true,
        runValidators: true,
      }).select('-password');

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/image:
 *   patch:
 *     summary: Actualiza la imagen de perfil
 *     description: Cambia la foto de perfil del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
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
 *                 example: https://blob.vercel-storage.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Imagen actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Imagen actualizada correctamente
 *                 image:
 *                   type: string
 */
router.patch(
  '/image',
  [body('image').isURL().withMessage('URL de imagen no válida')],
  validate,
  async (req, res, next) => {
    try {
      const { image } = req.body;
      const user = await User.findById(req.payload._id);

      if (user.image && user.image.includes('blob.vercel-storage.com') && user.image !== image) {
        try {
          await deleteFromBlob(user.image);
        } catch (error) {
          logger.error({ err: error.message }, 'Error eliminando imagen anterior de usuario');
        }
      }

      user.image = image;
      await user.save();

      res.status(200).json({
        message: 'Imagen actualizada correctamente',
        image: user.image,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/password:
 *   patch:
 *     summary: Cambia la contraseña del usuario
 *     description: Actualiza la contraseña requiriendo la contraseña actual
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: OldPass123!
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewPass456!
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contraseña actualizada correctamente
 *       400:
 *         description: Contraseña actual incorrecta o nueva contraseña no válida
 */
router.patch(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('La contraseña actual es obligatoria'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z])/)
      .withMessage('La contraseña debe contener al menos 1 mayúscula, 1 minúscula y 1 número'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.payload._id);

      const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          message: 'La nueva contraseña debe ser diferente a la actual',
        });
      }

      const salt = await bcrypt.genSalt(12);
      const hashPassword = await bcrypt.hash(newPassword, salt);

      user.password = hashPassword;
      await user.save();

      res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/email:
 *   patch:
 *     summary: Cambia el email del usuario
 *     description: Actualiza el email requiriendo la contraseña como confirmación
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newemail@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MyPassword123!
 *     responses:
 *       200:
 *         description: Email actualizado
 *       400:
 *         description: Email ya registrado o contraseña incorrecta
 */
router.patch(
  '/email',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email no válido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria para cambiar el email'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findById(req.payload._id);
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.payload._id) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }

      user.email = email;
      await user.save();

      res.status(200).json({
        message: 'Email actualizado correctamente',
        email: user.email,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/username:
 *   patch:
 *     summary: Cambia el username del usuario
 *     description: Actualiza el nombre de usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: new_username_2024
 *     responses:
 *       200:
 *         description: Username actualizado
 *       400:
 *         description: Username ya registrado o no válido
 */
router.patch(
  '/username',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('El username debe tener entre 3 y 30 caracteres')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('El username solo puede contener letras, números, guiones y guiones bajos'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { username } = req.body;

      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== req.payload._id) {
        return res.status(400).json({ message: 'El username ya está registrado' });
      }

      const user = await User.findByIdAndUpdate(
        req.payload._id,
        { username },
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        message: 'Username actualizado correctamente',
        username: user.username,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/{rutaId}/toggle-favorite:
 *   patch:
 *     summary: Agrega o quita una ruta de favoritos
 *     description: Toggle para marcar/desmarcar una ruta como favorita
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rutaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la ruta
 *     responses:
 *       200:
 *         description: Estado de favorito actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ruta añadida a favoritos
 *                 isFavorite:
 *                   type: boolean
 *                   example: true
 *                 rutasFav:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.patch('/:rutaId/toggle-favorite', async (req, res, next) => {
  try {
    const { rutaId } = req.params;

    const user = await User.findById(req.payload._id);

    const isFavorite = user.rutasFav.includes(rutaId);

    if (isFavorite) {
      user.rutasFav = user.rutasFav.filter(id => id.toString() !== rutaId);
    } else {
      user.rutasFav.push(rutaId);
    }

    await user.save();

    res.status(200).json({
      message: isFavorite ? 'Ruta eliminada de favoritos' : 'Ruta añadida a favoritos',
      isFavorite: !isFavorite,
      rutasFav: user.rutasFav,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/favorites/list:
 *   get:
 *     summary: Obtiene las rutas favoritas del usuario
 *     description: Lista completa de rutas marcadas como favoritas
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de rutas favoritas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ruta'
 */
router.get('/favorites/list', async (req, res, next) => {
  try {
    const user = await User.findById(req.payload._id).populate({
      path: 'rutasFav',
      populate: { path: 'creador', select: 'username image' },
    });

    res.status(200).json(user.rutasFav);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/account:
 *   delete:
 *     summary: Desactiva la cuenta del usuario
 *     description: Soft delete - desactiva la cuenta sin eliminar datos (requiere contraseña)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Cuenta desactivada
 *       400:
 *         description: Contraseña incorrecta
 */
router.delete(
  '/account',
  [body('password').notEmpty().withMessage('La contraseña es obligatoria')],
  validate,
  async (req, res, next) => {
    try {
      const { password } = req.body;

      const user = await User.findById(req.payload._id);

      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }

      user.isActive = false;
      await user.save();

      res.status(200).json({
        message: 'Cuenta desactivada correctamente. Contacta con soporte para reactivarla.',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
