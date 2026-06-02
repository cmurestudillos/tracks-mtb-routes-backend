const { put, del, list, head } = require('@vercel/blob');
const config = require('./index');
const logger = require('./logger');

/**
 * Sube un archivo a Vercel Blob
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} filename - Nombre original del archivo
 * @param {string} folder - Carpeta de destino (rutas, users, resenas, general)
 * @returns {Promise<Object>} Objeto con url, pathname y downloadUrl
 */
async function uploadToBlob(buffer, filename, folder = 'general') {
  try {
    // Sanitizar nombre del archivo
    const sanitizedFilename = filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-');

    // Crear path único con timestamp
    const timestamp = Date.now();
    const path = `${folder}/${timestamp}-${sanitizedFilename}`;

    logger.debug({ path }, 'Subiendo archivo a Vercel Blob');

    // Subir a Vercel Blob
    const blob = await put(path, buffer, {
      access: 'public',
      addRandomSuffix: true,
      token: config.blobToken,
    });

    logger.info({ url: blob.url, pathname: blob.pathname }, 'Archivo subido a Vercel Blob');

    return {
      url: blob.url,
      pathname: blob.pathname,
      downloadUrl: blob.downloadUrl,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ err: error.message }, 'Error subiendo archivo a Vercel Blob');

    if (error.message.includes('token')) {
      throw new Error('Token de Vercel Blob no válido o no configurado');
    }

    throw new Error(`Error al subir la imagen: ${error.message}`);
  }
}

/**
 * Elimina un archivo de Vercel Blob
 * @param {string} url - URL completa del archivo a eliminar
 * @returns {Promise<void>}
 */
async function deleteFromBlob(url) {
  try {
    if (!url || !url.includes('blob.vercel-storage.com')) {
      logger.warn({ url }, 'URL no válida para eliminar de Vercel Blob');
      return;
    }

    logger.debug({ url }, 'Eliminando archivo de Vercel Blob');

    await del(url, {
      token: config.blobToken,
    });

    logger.info({ url }, 'Archivo eliminado de Vercel Blob');
  } catch (error) {
    logger.error({ err: error.message, url }, 'Error eliminando archivo de Vercel Blob');

    // No lanzar error si el archivo ya no existe
    if (error.message.includes('not found') || error.message.includes('404')) {
      logger.warn({ url }, 'El archivo ya no existe en Vercel Blob');
      return;
    }

    throw new Error(`Error al eliminar la imagen: ${error.message}`);
  }
}

/**
 * Lista archivos de una carpeta en Vercel Blob
 * @param {string} prefix - Prefijo/carpeta a listar
 * @param {Object} options - Opciones adicionales (limit, cursor)
 * @returns {Promise<Array>}
 */
async function listBlobFiles(prefix = '', options = {}) {
  try {
    const { limit = 100 } = options;

    logger.debug({ prefix }, 'Listando archivos en Vercel Blob');

    const result = await list({
      prefix,
      limit,
      token: config.blobToken,
      ...options,
    });

    logger.debug({ count: result.blobs.length, prefix }, 'Archivos listados en Vercel Blob');

    return {
      blobs: result.blobs,
      cursor: result.cursor,
      hasMore: result.hasMore,
    };
  } catch (error) {
    logger.error({ err: error.message }, 'Error listando archivos en Vercel Blob');
    throw new Error(`Error al listar archivos: ${error.message}`);
  }
}

/**
 * Obtiene metadata de un archivo en Vercel Blob
 * @param {string} url - URL del archivo
 * @returns {Promise<Object>}
 */
async function getBlobMetadata(url) {
  try {
    const metadata = await head(url, {
      token: config.blobToken,
    });

    return {
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
      pathname: metadata.pathname,
      url: metadata.url,
      contentType: metadata.contentType,
    };
  } catch (error) {
    logger.error({ err: error.message, url }, 'Error obteniendo metadata de Vercel Blob');
    throw new Error(`Error al obtener información del archivo: ${error.message}`);
  }
}

/**
 * Elimina múltiples archivos de Vercel Blob
 * @param {string[]} urls - Array de URLs a eliminar
 * @returns {Promise<Object>} Resultado con éxitos y errores
 */
async function deleteMultipleFromBlob(urls) {
  const results = {
    success: [],
    errors: [],
  };

  for (const url of urls) {
    try {
      await deleteFromBlob(url);
      results.success.push(url);
    } catch (error) {
      results.errors.push({ url, error: error.message });
    }
  }

  logger.info(
    { success: results.success.length, errors: results.errors.length },
    'Eliminación múltiple en Vercel Blob'
  );
  if (results.errors.length > 0) {
    logger.warn({ errors: results.errors }, 'Errores en eliminación múltiple de Vercel Blob');
  }

  return results;
}

module.exports = {
  uploadToBlob,
  deleteFromBlob,
  listBlobFiles,
  getBlobMetadata,
  deleteMultipleFromBlob,
};
