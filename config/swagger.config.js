const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tacks MTB Routes API',
      version: '2.0.0',
      description: `
        ## 🚵 API REST profesional para gestión de rutas de Mountain Bike
        
        Esta API permite a los usuarios:
        - 🔐 Registrarse e iniciar sesión con JWT
        - 📍 Crear, editar y eliminar rutas MTB
        - ⭐ Escribir y gestionar reseñas
        - 📸 Subir imágenes a Vercel Blob
        - 👤 Gestionar su perfil de usuario
        
        ### Autenticación
        La mayoría de endpoints requieren autenticación. Debes incluir el token JWT en el header:
        \`\`\`
        Authorization: Bearer {tu_token_jwt}
        \`\`\`
        
        ### Rate Limiting
        - 100 peticiones por IP cada 15 minutos
        
        ### Respuestas de Error
        La API devuelve errores en formato JSON estándar:
        \`\`\`json
        {
          "error": "Título del error",
          "message": "Descripción detallada"
        }
        \`\`\`
      `,
      contact: {
        name: 'Carlos - Full Stack Developer @ GLS Spain',
        url: 'https://github.com/cmurestudillos',
        email: 'tu-email@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5005',
        description: '🔧 Servidor de desarrollo local',
      },
      {
        url: 'https://tu-api.vercel.app',
        description: '🚀 Servidor de producción en Vercel',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa tu token JWT obtenido al hacer login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@example.com',
            },
            username: {
              type: 'string',
              example: 'mtb_rider_23',
            },
            image: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/avatar.jpg',
            },
            bio: {
              type: 'string',
              example: 'Amante del MTB y la naturaleza',
            },
            location: {
              type: 'string',
              example: 'Madrid, España',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Ruta: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Ruta de la Sierra de Guadarrama',
            },
            description: {
              type: 'string',
              example: 'Increíble ruta con vistas panorámicas',
            },
            difficulty: {
              type: 'string',
              enum: ['fácil', 'media', 'difícil', 'profesional'],
              example: 'media',
            },
            distanciaEnKm: {
              type: 'number',
              example: 25.5,
            },
            desnivelEnM: {
              type: 'number',
              example: 850,
            },
            duracionEnHoras: {
              type: 'number',
              example: 3.5,
            },
            modalidad: {
              type: 'string',
              enum: ['montaña', 'urbano', 'carretera', 'gravel'],
              example: 'montaña',
            },
            provincia: {
              type: 'string',
              example: 'madrid',
            },
            image: {
              type: 'string',
              format: 'uri',
            },
            coordinatesStart: {
              type: 'array',
              items: {
                type: 'number',
              },
              example: [-3.7038, 40.4168],
            },
            coordinatesEnd: {
              type: 'array',
              items: {
                type: 'number',
              },
              example: [-3.7138, 40.4268],
            },
            creador: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            views: {
              type: 'number',
              example: 150,
            },
            likes: {
              type: 'number',
              example: 25,
            },
            isPublic: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Resena: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            title: {
              type: 'string',
              example: 'Excelente ruta para principiantes',
            },
            description: {
              type: 'string',
              example: 'La ruta está muy bien señalizada y el paisaje es increíble',
            },
            rating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              example: 5,
            },
            creador: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            ruta: {
              type: 'string',
              example: '507f1f77bcf86cd799439012',
            },
            image: {
              type: 'string',
              format: 'uri',
            },
            likes: {
              type: 'number',
              example: 10,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Error de validación',
            },
            message: {
              type: 'string',
              example: 'El campo email es obligatorio',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: '🔐 Autenticación y registro de usuarios',
      },
      {
        name: 'Rutas',
        description: '📍 Gestión completa de rutas MTB',
      },
      {
        name: 'Reseñas',
        description: '⭐ Sistema de valoraciones y comentarios',
      },
      {
        name: 'Usuarios',
        description: '👤 Gestión de perfiles y configuración',
      },
      {
        name: 'Upload',
        description: '📸 Subida de imágenes a Vercel Blob',
      },
      {
        name: 'Sistema',
        description: '🔧 Endpoints de sistema y monitoreo',
      },
    ],
  },
  apis: ['./routes/*.js', './index.js'], // Archivos donde están las anotaciones
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
