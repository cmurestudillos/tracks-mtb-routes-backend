const { Schema, model } = require('mongoose');

const rutaSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la ruta es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
      index: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'La descripción no puede exceder 1000 caracteres'],
    },
    difficulty: {
      type: String,
      required: [true, 'La dificultad es obligatoria'],
      enum: {
        values: ['fácil', 'media', 'difícil', 'profesional'],
        message: '{VALUE} no es una dificultad válida',
      },
      index: true,
    },
    distanciaEnKm: {
      type: Number,
      required: [true, 'La distancia es obligatoria'],
      min: [0.1, 'La distancia debe ser mayor a 0'],
      max: [1000, 'La distancia no puede exceder 1000 km'],
    },
    desnivelEnM: {
      type: Number,
      required: [true, 'El desnivel es obligatorio'],
      min: [0, 'El desnivel no puede ser negativo'],
      max: [10000, 'El desnivel no puede exceder 10000 m'],
    },
    duracionEnHoras: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      min: [0.1, 'La duración debe ser mayor a 0'],
      max: [48, 'La duración no puede exceder 48 horas'],
    },
    modalidad: {
      type: String,
      required: [true, 'La modalidad es obligatoria'],
      enum: {
        values: ['montaña', 'urbano', 'carretera', 'gravel'],
        message: '{VALUE} no es una modalidad válida',
      },
      index: true,
    },
    provincia: {
      type: String,
      required: [true, 'La provincia es obligatoria'],
      lowercase: true,
      enum: {
        values: [
          'álava',
          'albacete',
          'alicante',
          'almería',
          'asturias',
          'ávila',
          'badajoz',
          'baleares',
          'barcelona',
          'burgos',
          'cáceres',
          'cádiz',
          'cantabria',
          'castellón',
          'ciudad real',
          'córdoba',
          'cuenca',
          'gerona',
          'granada',
          'guadalajara',
          'guipúzcoa',
          'huelva',
          'huesca',
          'jaén',
          'la coruña',
          'la rioja',
          'las palmas',
          'león',
          'lérida',
          'lugo',
          'madrid',
          'málaga',
          'murcia',
          'navarra',
          'orense',
          'palencia',
          'pontevedra',
          'salamanca',
          'santa cruz de tenerife',
          'segovia',
          'sevilla',
          'soria',
          'tarragona',
          'teruel',
          'toledo',
          'valencia',
          'valladolid',
          'vizcaya',
          'zamora',
          'zaragoza',
          'ceuta',
          'melilla',
        ],
        message: '{VALUE} no es una provincia válida',
      },
      index: true,
    },
    creador: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El creador es obligatorio'],
      index: true,
    },
    image: {
      type: String,
      default: 'https://www.lugaresdeaventura.com/sites/default/files/2018-07/suiza-paraiso-ciclista-portada.jpg',
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'La URL de la imagen no es válida',
      },
    },
    // Array de URLs de imágenes adicionales (galerías)
    images: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+/.test(v);
          },
          message: 'La URL de la imagen no es válida',
        },
      },
    ],
    coordinatesStart: {
      type: [Number],
      validate: {
        validator: function (v) {
          return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Las coordenadas de inicio deben ser [longitud, latitud] válidas',
      },
    },
    coordinatesEnd: {
      type: [Number],
      validate: {
        validator: function (v) {
          return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Las coordenadas de fin deben ser [longitud, latitud] válidas',
      },
    },
    // GPX track (opcional)
    gpxUrl: {
      type: String,
    },
    // Estadísticas
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Referencias a reseñas
    resenas: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resena',
      },
    ],
    // Estado de la ruta
    isPublic: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para búsquedas complejas
rutaSchema.index({ difficulty: 1, modalidad: 1, provincia: 1 });
rutaSchema.index({ creador: 1, isPublic: 1 });
rutaSchema.index({ views: -1, likes: -1 });
rutaSchema.index({ name: 'text', description: 'text' }); // Búsqueda de texto

// Virtual para calcular velocidad media aproximada
rutaSchema.virtual('velocidadMedia').get(function () {
  if (this.duracionEnHoras > 0) {
    return (this.distanciaEnKm / this.duracionEnHoras).toFixed(2);
  }
  return 0;
});

// Virtual para el número de reseñas
rutaSchema.virtual('numResenas').get(function () {
  return this.resenas ? this.resenas.length : 0;
});

// Configurar virtuals en JSON
rutaSchema.set('toJSON', { virtuals: true });
rutaSchema.set('toObject', { virtuals: true });

const Ruta = model('Ruta', rutaSchema);

module.exports = Ruta;
