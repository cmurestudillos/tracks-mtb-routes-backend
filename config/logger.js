const pino = require('pino');
const config = require('./index');

const isDev = config.nodeEnv !== 'production';

const logger = pino(
  isDev
    ? {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: 'info',
      }
);

module.exports = logger;
