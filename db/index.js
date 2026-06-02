const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

// Caché de conexión para reutilizar en Vercel serverless (warm starts)
let isConnecting = false;

const connectDB = async () => {
  // Reutilizar conexión existente
  if (mongoose.connection.readyState === 1) return;

  // Evitar múltiples conexiones simultáneas en cold start
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  }

  isConnecting = true;

  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000, // Falla rápido si Atlas no responde
      socketTimeoutMS: 10000,
      bufferCommands: false, // No esperar — falla inmediatamente si no hay conexión
    });

    logger.info({ dbName: mongoose.connection.name }, 'Conectado a MongoDB');

    mongoose.connection.on('error', err => {
      logger.error({ err: err.message }, 'Error de MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado de MongoDB');
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error conectando a MongoDB');
  } finally {
    isConnecting = false;
  }
};

module.exports = connectDB;
