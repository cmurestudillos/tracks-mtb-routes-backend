require('dotenv').config();

const config = {
  // Servidor
  port: process.env.PORT || 5005,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB
  mongoUri:
    process.env.NODE_ENV === 'production'
      ? process.env.MONGO_URI_PRODUCTION || process.env.MONGODB_URI
      : process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tacks-mtb-routes',

  // JWT
  tokenSecret: process.env.TOKEN_SECRET,
  tokenExpiration: '30d',

  // CORS — combina ALLOWED_ORIGINS + FRONTEND_URL (más fácil de gestionar en Vercel)
  allowedOrigins: (() => {
    const base = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000'];
    if (process.env.FRONTEND_URL && !base.includes(process.env.FRONTEND_URL)) {
      base.push(process.env.FRONTEND_URL);
    }
    return base;
  })(),

  // Vercel Blob
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Upload
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
};

// Advertir sobre variables faltantes (sin process.exit — incompatible con Vercel serverless)
if (config.nodeEnv === 'production') {
  const requiredEnvVars = ['MONGO_URI_PRODUCTION', 'TOKEN_SECRET', 'BLOB_READ_WRITE_TOKEN'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    console.error('WARN: Variables de entorno faltantes:', missingEnvVars.join(', '));
  }
}

module.exports = config;
