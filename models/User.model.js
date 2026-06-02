const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor introduce un email válido'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
    username: {
      type: String,
      required: [true, 'El nombre de usuario es obligatorio'],
      unique: true,
      trim: true,
      minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
      maxlength: [30, 'El nombre de usuario no puede exceder 30 caracteres'],
      index: true,
    },
    image: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true; // null/vacío es válido
          return /^https?:\/\/.+/.test(v);
        },
        message: 'La URL de la imagen no es válida',
      },
    },
    // Información adicional del perfil
    bio: {
      type: String,
      maxlength: [500, 'La biografía no puede exceder 500 caracteres'],
      default: '',
    },
    location: {
      type: String,
      maxlength: [100, 'La ubicación no puede exceder 100 caracteres'],
    },
    rutasFav: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ruta',
      },
    ],
    // Rutas creadas por el usuario (para estadísticas)
    rutasCreadas: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ruta',
      },
    ],
    // Reseñas creadas por el usuario
    resenasCreadas: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resena',
      },
    ],
    // Estado de la cuenta
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password; // No devolver password en JSON
        return ret;
      },
    },
  }
);

// Índices compuestos para búsquedas optimizadas
userSchema.index({ email: 1, username: 1 });
userSchema.index({ isActive: 1, createdAt: -1 });

// Método para no devolver el password en las queries
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = model('User', userSchema);

module.exports = User;
