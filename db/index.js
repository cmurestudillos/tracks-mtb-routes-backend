const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(config.mongoUri, options);

    const dbName = mongoose.connection.name;
    logger.info({ dbName, env: config.nodeEnv }, 'Conectado a MongoDB');

    mongoose.connection.on('error', err => {
      logger.error({ err: err.message }, 'Error de MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado de MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconectado a MongoDB');
    });

    const gracefulShutdown = async signal => {
      logger.info({ signal }, 'Cerrando conexion a MongoDB...');
      try {
        await mongoose.connection.close();
        logger.info('Conexion a MongoDB cerrada correctamente');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error.message }, 'Error cerrando conexion a MongoDB');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    logger.error(
      {
        err: error.message,
        uri: config.mongoUri.replace(/\/\/.*:.*@/, '//<credentials>@'),
      },
      'Error conectando a MongoDB'
    );
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('Desconectado de MongoDB');
  } catch (error) {
    logger.error({ err: error.message }, 'Error desconectando de MongoDB');
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
