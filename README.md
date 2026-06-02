# Tracks MTB Routes — Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

**API REST para gestión de rutas de Mountain Bike**

[Documentación API](https://tu-api.vercel.app/api-docs) · [Health Check](https://tu-api.vercel.app/health)

</div>

---

## Tabla de Contenidos

- [Stack](#stack)
- [Inicio Rápido](#inicio-rápido)
- [Variables de Entorno](#variables-de-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Autenticación](#autenticación)
- [Modelos de Datos](#modelos-de-datos)
- [Deploy en Vercel](#deploy-en-vercel)
- [Scripts](#scripts)

---

## Stack

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | ≥ 20 | Runtime |
| Express | 4.21 | Framework HTTP |
| Mongoose | 8.x | ODM para MongoDB |
| MongoDB Atlas | — | Base de datos cloud |
| jsonwebtoken | 9.x | Autenticación JWT |
| bcryptjs | 3.x | Hash de contraseñas |
| pino | 9.x | Logger estructurado |
| Helmet | 8.x | Seguridad HTTP headers |
| express-rate-limit | 8.x | Limitación de peticiones |
| @vercel/blob | 2.x | Almacenamiento de imágenes |
| multer | 2.x | Upload de archivos |
| swagger-ui-express | 5.x | Documentación API interactiva |
| ESLint 9 | flat config | Linting |
| Prettier | 3.x | Formateo de código |

---

## Inicio Rápido

### Prerequisitos

```bash
node >= 20.0.0
pnpm >= 11.0.0
```

### Instalación

```bash
# 1. Instala las dependencias
pnpm install

# 2. Copia y configura las variables de entorno
cp .env.example .env
# Edita .env con tus valores reales

# 3. Inicia en modo desarrollo
pnpm dev
```

El servidor arranca en:
- Landing: http://localhost:5005/
- API: http://localhost:5005/api
- Docs Swagger: http://localhost:5005/api-docs
- Health check: http://localhost:5005/health

---

## Variables de Entorno

Copia `.env.example` como `.env` y rellena cada valor:

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `MONGO_URI` | Sí | URI de MongoDB local (desarrollo) |
| `MONGO_URI_PRODUCTION` | Sí en prod | URI de MongoDB Atlas |
| `PORT` | No | Puerto (default: `5005`) |
| `NODE_ENV` | No | `development` \| `production` |
| `ALLOWED_ORIGINS` | Sí | Orígenes CORS separados por comas |
| `TOKEN_SECRET` | Sí | Secreto JWT — mínimo 32 caracteres aleatorios |
| `BLOB_READ_WRITE_TOKEN` | Sí | Token de Vercel Blob Storage |
| `RATE_LIMIT_WINDOW_MS` | No | Ventana rate limit (default: `900000` = 15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Máx. peticiones por ventana (default: `100`) |

**Generar un TOKEN_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Obtener BLOB_READ_WRITE_TOKEN:**
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard) → tu proyecto
2. Storage → Create Store → Blob
3. Copia el token generado

---

## Estructura del Proyecto

```
tracks-mtb-routes-backend/
├── index.js                        # Entry point — Express app + servidor
├── vercel.json                     # Configuración deploy Vercel
├── .env.example                    # Plantilla de variables de entorno
├── eslint.config.mjs               # ESLint v9 flat config
├── .prettierrc                     # Config Prettier
├── config/
│   ├── index.js                    # Configuración centralizada
│   ├── logger.js                   # Logger pino (JSON en prod, pretty en dev)
│   ├── blob.config.js              # Helpers para Vercel Blob
│   └── swagger.config.js           # Spec OpenAPI 3.0
├── db/
│   └── index.js                    # Conexión Mongoose + graceful shutdown
├── middlewares/
│   ├── auth.middlewares.js         # isTokenValid, isAdmin, isOwnerOrAdmin
│   ├── errorHandler.middleware.js  # 404 + error handler global
│   └── upload.middleware.js        # multer (memoryStorage) + fileFilter
├── models/
│   ├── User.model.js
│   ├── Rutas.model.js
│   └── Resenas.model.js
├── routes/
│   ├── index.routes.js             # /api/health, /api/info + subrouters
│   ├── auth.routes.js              # /api/auth/*
│   ├── rutas.routes.js             # /api/rutas/*
│   ├── resenas.routes.js           # /api/reviews/*
│   ├── user.routes.js              # /api/user/*
│   └── upload.routes.js            # /api/upload/*
├── public/
│   └── index.html                  # Landing page del servidor
└── .github/
    └── workflows/
        └── deploy.yml              # CI/CD — lint → deploy preview/prod
```

---

## API Endpoints

### Autenticación

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | — | Registro de usuario |
| `POST` | `/api/auth/login` | — | Login → JWT |
| `GET` | `/api/auth/verify` | JWT | Verificar token |

### Rutas MTB

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/rutas` | JWT | Listar todas las rutas |
| `GET` | `/api/rutas/:rutaId` | JWT | Detalle de una ruta |
| `GET` | `/api/rutas/user` | JWT | Rutas del usuario autenticado |
| `POST` | `/api/rutas` | JWT | Crear ruta |
| `PATCH` | `/api/rutas/image/:rutaId` | JWT | Actualizar imagen |
| `PATCH` | `/api/rutas/details/:rutaId` | JWT | Actualizar detalles |
| `DELETE` | `/api/rutas/:rutaId` | JWT | Eliminar ruta |

### Reseñas

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/reviews/rutas/:rutaId` | JWT | Reseñas de una ruta |
| `POST` | `/api/reviews` | JWT | Crear reseña |
| `PATCH` | `/api/reviews/:reviewId` | JWT | Actualizar reseña |
| `DELETE` | `/api/reviews/:reviewId` | JWT | Eliminar reseña |

### Usuarios

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/user/:userId` | JWT | Perfil de usuario |
| `PUT` | `/api/user/:userId` | JWT | Actualizar perfil |
| `PATCH` | `/api/user/password` | JWT | Cambiar contraseña |
| `PATCH` | `/api/user/email` | JWT | Cambiar email |
| `PATCH` | `/api/user/username` | JWT | Cambiar username |
| `PATCH` | `/api/user/image` | JWT | Actualizar avatar |

### Upload

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/api/upload` | JWT | Subir imagen individual |
| `POST` | `/api/upload/multiple` | JWT | Subir hasta 5 imágenes |
| `DELETE` | `/api/upload` | JWT | Eliminar imagen de Blob |

### Sistema

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/health` | — | Health check |
| `GET` | `/api/health` | — | Health check (API) |
| `GET` | `/api/info` | — | Info y versión de la API |
| `GET` | `/api-docs` | — | Swagger UI |

Documentación completa e interactiva: **`/api-docs`**

---

## Autenticación

La API usa **JWT Bearer tokens**.

```bash
# 1. Login
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"credential": "usuario@example.com", "password": "Password123!"}'

# Respuesta
# { "authToken": "eyJhbGci..." }

# 2. Usar el token en cada petición
curl http://localhost:5005/api/rutas \
  -H "Authorization: Bearer eyJhbGci..."
```

---

## Modelos de Datos

### User
```js
{ email, username, password (bcrypt), image, bio, location,
  rutasFav: [ObjectId], rutasCreadas: [ObjectId], role: 'user'|'admin' }
```

### Ruta
```js
{ name, difficulty: 'fácil'|'media'|'difícil'|'profesional',
  distanciaEnKm, desnivelEnM, duracionEnHoras,
  modalidad: 'montaña'|'urbano'|'carretera'|'gravel',
  provincia, coordinatesStart: [lng, lat], coordinatesEnd: [lng, lat],
  image, images: [String], creador: ObjectId }
```

### Resena
```js
{ title, description, rating: 1-5, creador: ObjectId, ruta: ObjectId,
  image, condiciones: { clima, estadoRuta } }
```

---

## Deploy en Vercel

### Prerequisitos

- Cuenta en [Vercel](https://vercel.com)
- Vercel CLI: `pnpm add -g vercel`
- Cluster en [MongoDB Atlas](https://cloud.mongodb.com)
- Store en Vercel Blob (para imágenes)

### Pasos

```bash
# 1. Autenticarse en Vercel
vercel login

# 2. Vincular el proyecto (primera vez)
vercel link

# 3. Configurar variables de entorno en Vercel
#    Ve a: Dashboard → Proyecto → Settings → Environment Variables
#    Añade todas las variables de .env.example (con valores reales)

# 4. Deploy a producción
vercel --prod
```

El `vercel.json` incluido enruta todas las peticiones al entry point Express.

### Variables de entorno en Vercel

Añade en el Dashboard de Vercel **exactamente** estas variables:

```
MONGO_URI_PRODUCTION   → tu URI de MongoDB Atlas
TOKEN_SECRET           → secreto JWT (mínimo 32 caracteres)
BLOB_READ_WRITE_TOKEN  → token de Vercel Blob
ALLOWED_ORIGINS        → URL del frontend desplegado (ej: https://tu-frontend.netlify.app)
NODE_ENV               → production
```

### CI/CD con GitHub Actions

El workflow `.github/workflows/deploy.yml` ejecuta automáticamente:

1. **En Pull Request** → lint + deploy preview
2. **En push a `main`** → lint + deploy producción + tag de release

Secretos necesarios en GitHub (Settings → Secrets → Actions):

```
VERCEL_TOKEN       → obtenido en vercel.com/account/tokens
VERCEL_ORG_ID      → obtenido con: vercel env pull
VERCEL_PROJECT_ID  → obtenido con: vercel env pull
```

---

## Scripts

```bash
pnpm dev          # Desarrollo con hot-reload (nodemon)
pnpm start        # Producción
pnpm lint         # Verificar ESLint
pnpm lint:fix     # Corregir ESLint automáticamente
pnpm format       # Formatear con Prettier
```

---

## Logger

El proyecto usa **pino** para logging estructurado:

- **Desarrollo:** formato legible en terminal via `pino-pretty`
- **Producción:** JSON por línea, compatible con cualquier agregador de logs (Datadog, Logtail, etc.)

```
# Desarrollo (pino-pretty)
10:32:15 INFO: Servidor iniciado
    url: "http://localhost:5005"
    docs: "http://localhost:5005/api-docs"

# Producción (JSON)
{"level":30,"time":1234567890,"msg":"Servidor iniciado","url":"..."}
```

---

## Seguridad

- Helmet — headers HTTP seguros
- CORS — orígenes configurados por entorno
- Rate limiting — 100 req / 15 min en `/api/*`
- JWT — tokens con expiración de 30 días
- bcryptjs — hash de contraseñas (12 rounds)
- express-validator — validación de inputs en cada endpoint
- Vercel Blob — almacenamiento externo (no en servidor)
