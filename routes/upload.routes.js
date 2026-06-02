const router = require('express').Router();
const { upload, gpxUpload, handleMulterError } = require('../middlewares/upload.middleware');
const { uploadToBlob, deleteFromBlob } = require('../config/blob.config');
const { isTokenValid } = require('../middlewares/auth.middlewares');
const logger = require('../config/logger');

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Sube una imagen a Vercel Blob
 *     description: Permite subir una imagen (máx 5MB) y la almacena en Vercel Blob Storage
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           enum: [rutas, users, resenas, general]
 *           default: general
 *         description: Carpeta de destino en Vercel Blob
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen (JPEG, PNG, WebP, GIF - máx 5MB)
 *     responses:
 *       200:
 *         description: Imagen subida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Imagen subida correctamente
 *                 imageUrl:
 *                   type: string
 *                   format: uri
 *                   example: https://blob.vercel-storage.com/rutas/1699876543210-imagen.jpg
 *                 downloadUrl:
 *                   type: string
 *                   format: uri
 *                   example: https://blob.vercel-storage.com/rutas/1699876543210-imagen.jpg
 *                 pathname:
 *                   type: string
 *                   example: rutas/1699876543210-imagen.jpg
 *       400:
 *         description: Error en la subida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No se ha proporcionado ninguna imagen
 *       401:
 *         description: No autenticado
 */
router.post('/', isTokenValid, upload.single('image'), handleMulterError, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se ha proporcionado ninguna imagen',
      });
    }

    logger.debug({ filename: req.file.originalname, size: req.file.size }, 'Subiendo archivo');

    // Determinar carpeta según el contexto (query param)
    const folder = req.query.folder || 'general';

    // Subir a Vercel Blob
    const result = await uploadToBlob(req.file.buffer, req.file.originalname, folder);

    res.status(200).json({
      message: 'Imagen subida correctamente',
      imageUrl: result.url,
      downloadUrl: result.downloadUrl,
      pathname: result.pathname,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error al subir imagen');
    next(error);
  }
});

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Sube múltiples imágenes a Vercel Blob
 *     description: Permite subir hasta 5 imágenes simultáneamente
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           enum: [rutas, users, resenas, general]
 *           default: general
 *         description: Carpeta de destino en Vercel Blob
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Array de imágenes (máx 5 archivos, 5MB cada uno)
 *     responses:
 *       200:
 *         description: Imágenes subidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 3 imágenes subidas correctamente
 *                 images:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         format: uri
 *                       downloadUrl:
 *                         type: string
 *                         format: uri
 *                       pathname:
 *                         type: string
 *       400:
 *         description: Error en la subida
 *       401:
 *         description: No autenticado
 */
router.post('/multiple', isTokenValid, upload.array('images', 5), handleMulterError, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No se han proporcionado imágenes',
      });
    }

    const folder = req.query.folder || 'general';
    const uploadPromises = req.files.map(file => uploadToBlob(file.buffer, file.originalname, folder));

    const results = await Promise.all(uploadPromises);

    res.status(200).json({
      message: `${results.length} imágenes subidas correctamente`,
      images: results.map(r => ({
        url: r.url,
        downloadUrl: r.downloadUrl,
        pathname: r.pathname,
      })),
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error al subir imágenes');
    next(error);
  }
});

/**
 * @swagger
 * /api/upload:
 *   delete:
 *     summary: Elimina una imagen de Vercel Blob
 *     description: Elimina permanentemente una imagen del storage
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL completa de la imagen a eliminar
 *                 example: https://blob.vercel-storage.com/rutas/1699876543210-imagen.jpg
 *     responses:
 *       200:
 *         description: Imagen eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Imagen eliminada correctamente
 *       400:
 *         description: URL no proporcionada o inválida
 *       401:
 *         description: No autenticado
 */
router.delete('/', isTokenValid, async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Se requiere la URL de la imagen a eliminar',
      });
    }

    await deleteFromBlob(url);

    res.status(200).json({
      message: 'Imagen eliminada correctamente',
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error al eliminar imagen');
    next(error);
  }
});

/**
 * @swagger
 * /api/upload/gpx:
 *   post:
 *     summary: Sube un archivo GPX a Vercel Blob
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               gpx:
 *                 type: string
 *                 format: binary
 *                 description: Archivo GPX (máx 50MB)
 *     responses:
 *       200:
 *         description: GPX subido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gpxUrl:
 *                   type: string
 *                   format: uri
 *       400:
 *         description: Archivo no válido o no proporcionado
 */
router.post('/gpx', isTokenValid, gpxUpload.single('gpx'), handleMulterError, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo GPX' });
    }

    logger.debug({ filename: req.file.originalname, size: req.file.size }, 'Subiendo GPX');

    const result = await uploadToBlob(req.file.buffer, req.file.originalname, 'gpx');

    res.status(200).json({
      message: 'GPX subido correctamente',
      gpxUrl: result.url,
      pathname: result.pathname,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error al subir GPX');
    next(error);
  }
});

module.exports = router;
