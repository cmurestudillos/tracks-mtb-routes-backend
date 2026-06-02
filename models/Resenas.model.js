const { Schema, model } = require('mongoose');

const resenaSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      minlength: [3, 'El título debe tener al menos 3 caracteres'],
      maxlength: [100, 'El título no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
      maxlength: [2000, 'La descripción no puede exceder 2000 caracteres'],
    },
    // Rating de 1 a 5 estrellas
    rating: {
      type: Number,
      min: [1, 'La valoración mínima es 1'],
      max: [5, 'La valoración máxima es 5'],
      required: [true, 'La valoración es obligatoria'],
    },
    creador: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El creador es obligatorio'],
      index: true,
    },
    ruta: {
      type: Schema.Types.ObjectId,
      ref: 'Ruta',
      required: [true, 'La ruta es obligatoria'],
      index: true,
    },
    image: {
      type: String,
      default: '',
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'La URL de la imagen no es válida',
      },
    },
    // Array de imágenes adicionales
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
    // Fecha en que se realizó la ruta
    fechaRealizada: {
      type: Date,
    },
    // Condiciones del día
    condiciones: {
      clima: {
        type: String,
        enum: ['soleado', 'nublado', 'lluvioso', 'nevado', 'ventoso'],
      },
      estadoRuta: {
        type: String,
        enum: ['excelente', 'bueno', 'regular', 'malo'],
      },
    },
    // Likes de la reseña
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Estado
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

// Índices compuestos
resenaSchema.index({ ruta: 1, rating: -1 });
resenaSchema.index({ creador: 1, createdAt: -1 });

// Un usuario solo puede hacer una reseña por ruta
resenaSchema.index({ ruta: 1, creador: 1 }, { unique: true });

// Middleware pre-save: actualizar el array de reseñas en la Ruta
resenaSchema.post('save', async function () {
  const Ruta = require('./Rutas.model');
  await Ruta.findByIdAndUpdate(this.ruta, {
    $addToSet: { resenas: this._id },
  });
});

// Middleware pre-remove: quitar la reseña del array en la Ruta
resenaSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Ruta = require('./Rutas.model');
    await Ruta.findByIdAndUpdate(doc.ruta, {
      $pull: { resenas: doc._id },
    });
  }
});

const Resena = model('Resena', resenaSchema);

module.exports = Resena;
