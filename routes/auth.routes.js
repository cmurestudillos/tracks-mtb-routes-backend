const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isTokenValid } = require('../middlewares/auth.middlewares');
const config = require('../config');

// Validadores reutilizables
const emailValidator = body('email').trim().isEmail().normalizeEmail().withMessage('Email no válido');

const passwordValidator = body('password')
  .trim()
  .isLength({ min: 8 })
  .withMessage('La contraseña debe tener al menos 8 caracteres')
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z])/)
  .withMessage('La contraseña debe contener al menos 1 mayúscula, 1 minúscula y 1 número');

const usernameValidator = body('username')
  .trim()
  .isLength({ min: 3, max: 30 })
  .withMessage('El username debe tener entre 3 y 30 caracteres')
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('El username solo puede contener letras, números, guiones y guiones bajos');

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Registra un nuevo usuario
 *     description: Crea una cuenta de usuario nueva y devuelve automáticamente un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email único del usuario
 *                 example: usuario@example.com
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 description: Nombre de usuario único (solo letras, números, guiones)
 *                 example: mtb_rider_23
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Contraseña (mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número)
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario registrado correctamente
 *                 authToken:
 *                   type: string
 *                   description: Token JWT para autenticación
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     username:
 *                       type: string
 *                       example: mtb_rider_23
 *                     email:
 *                       type: string
 *                       example: usuario@example.com
 *                     image:
 *                       type: string
 *                       example: https://example.com/default-avatar.jpg
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               emailDuplicado:
 *                 value:
 *                   message: El correo ya está registrado
 *               usernameDuplicado:
 *                 value:
 *                   message: El username ya está registrado
 *               validationError:
 *                 value:
 *                   errors:
 *                     - msg: Email no válido
 *                       param: email
 */
router.post('/signup', [emailValidator, usernameValidator, passwordValidator], async (req, res, next) => {
  // Validar errores
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password } = req.body;

  try {
    // Validar que el usuario no exista
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'El correo ya está registrado' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ message: 'El username ya está registrado' });
      }
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(12);
    const hashPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const newUser = await User.create({
      email,
      password: hashPassword,
      username,
    });

    // Generar token automáticamente después del registro
    const payload = {
      _id: newUser._id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
    };

    const authToken = jwt.sign(payload, config.tokenSecret, {
      algorithm: 'HS256',
      expiresIn: config.tokenExpiration,
    });

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      authToken,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        image: newUser.image,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     description: Autentica un usuario con email/username y contraseña, devuelve un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *               - password
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Email o username del usuario
 *                 example: usuario@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authToken:
 *                   type: string
 *                   description: Token JWT válido por 30 días
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     image:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Credenciales incorrectas
 *       403:
 *         description: Cuenta desactivada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cuenta desactivada
 */
router.post(
  '/login',
  [
    body('credential').trim().notEmpty().withMessage('Credential es obligatorio'),
    body('password').trim().notEmpty().withMessage('Password es obligatorio'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { credential, password } = req.body;

    try {
      // Buscar usuario por email o username
      const foundUser = await User.findOne({
        $or: [{ email: credential }, { username: credential }],
      });

      if (!foundUser) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      // Verificar si la cuenta está activa
      if (!foundUser.isActive) {
        return res.status(403).json({ message: 'Cuenta desactivada' });
      }

      // Verificar contraseña
      const isPasswordCorrect = await bcrypt.compare(password, foundUser.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      // Generar token
      const payload = {
        _id: foundUser._id,
        email: foundUser.email,
        username: foundUser.username,
        role: foundUser.role,
      };

      const authToken = jwt.sign(payload, config.tokenSecret, {
        algorithm: 'HS256',
        expiresIn: config.tokenExpiration,
      });

      res.status(200).json({
        authToken,
        user: {
          _id: foundUser._id,
          username: foundUser.username,
          email: foundUser.email,
          image: foundUser.image,
          role: foundUser.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verifica el token JWT
 *     description: Valida el token JWT y devuelve los datos actualizados del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 image:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token expirado
 *                 message:
 *                   type: string
 *                   example: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
 */
router.get('/verify', isTokenValid, async (req, res, next) => {
  try {
    // Obtener datos actualizados del usuario
    const user = await User.findById(req.payload._id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    res.json({
      _id: user._id,
      email: user.email,
      username: user.username,
      image: user.image,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cierra la sesión del usuario
 *     description: Endpoint para cerrar sesión (opcional, principalmente para limpiar cookies del lado del cliente)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sesión cerrada correctamente
 */
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Sesión cerrada correctamente' });
});

module.exports = router;
