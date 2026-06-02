# Tracks MTB Routes — Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

**API REST para gestión de rutas de Mountain Bike**

[API Docs](https://tracks-mtb-routes-service.vercel.app/api-docs) · [Health Check](https://tracks-mtb-routes-service.vercel.app/health)

</div>

---

## Stack

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | ≥20.0.0 | Runtime |
| Express | 4.21.2 | Framework HTTP |
| Mongoose | 8.10.0 | ODM para MongoDB Atlas |
| JWT (jsonwebtoken) | 9.0.2 | Autenticación |
| bcryptjs | 3.0.3 | Hash contraseñas (12 rounds) |
| pino | 9.14.0 | Logger estructurado |
| Helmet | 8.1.0 | Headers de seguridad |
| express-rate-limit | 8.5.2 | 100 req/15min en `/api/*` |
| @vercel/blob | 2.0.0 | Storage de imágenes y GPX |
| multer | 2.1.1 | Upload archivos (imágenes + GPX) |
| swagger-ui-express | 5.0.1 | Documentación interactiva |
| pnpm | 11.5.0 | Gestor de paquetes |

---

## Instalación rápida

```bash
pnpm install
cp .env.example .env   # editar con tus valores
pnpm dev               # http://localhost:5005
```

---

## Variables de entorno

```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/tracks-mtb-routes
MONGO_URI_PRODUCTION=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tracks-mtb-routes

# Servidor
PORT=5005
NODE_ENV=development

# CORS — producción: añadir URL del frontend
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=https://tracks-mtb-routes.vercel.app

# JWT
TOKEN_SECRET=secreto_minimo_32_chars_aleatorio
# Generar: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Endpoints principales

### Auth (sin JWT)
```
POST /api/auth/signup    { email, username, password }
POST /api/auth/login     { credential, password }      → { authToken, user }
GET  /api/auth/verify    Authorization: Bearer <token>
```

### Rutas (JWT requerido)
```
GET    /api/rutas                    ?page&limit&difficulty&modalidad&provincia&sort
GET    /api/rutas/user               → rutas del usuario autenticado
GET    /api/rutas/search?q=          → búsqueda por nombre/descripción
GET    /api/rutas/:id
POST   /api/rutas                    { name, difficulty, distanciaEnKm, desnivelEnM,
                                       duracionEnHoras, modalidad, provincia,
                                       image, coordinatesStart, coordinatesEnd, gpxUrl? }
PATCH  /api/rutas/image/:id          { image }
PATCH  /api/rutas/details/:id        { name?, description?, difficulty?, ... }
PATCH  /api/rutas/:id/like
DELETE /api/rutas/:id
```

### Reseñas (JWT requerido)
```
POST   /api/reviews                  { title, description, rating(1-5), ruta, image? }
GET    /api/reviews/rutas/:rutaId    → { resenas, avgRating, pagination }
PATCH  /api/reviews/:id
DELETE /api/reviews/:id
```

### Usuario (JWT requerido)
```
GET    /api/user
PATCH  /api/user/profile             { bio?, location? }
PATCH  /api/user/image               { image }
PATCH  /api/user/password            { currentPassword, newPassword }
PATCH  /api/user/email               { email, password }
PATCH  /api/user/username            { username }
PATCH  /api/user/:rutaId/toggle-favorite
DELETE /api/user/account             { password }
```

### Upload (JWT requerido)
```
POST   /api/upload          form-data: image    → { imageUrl }
POST   /api/upload/multiple form-data: images[] → { images[] }
POST   /api/upload/gpx      form-data: gpx      → { gpxUrl }   (máx 50MB)
DELETE /api/upload          { url }
```

---

## Import GPX

Los archivos GPX (Garmin, Wahoo, Strava, Komoot, etc.) se suben a Vercel Blob en la carpeta `gpx/`. La URL se guarda en el campo `gpxUrl` del modelo Ruta.

El parsing y extracción de estadísticas se hace en el **frontend** (client-side) con `src/utils/gpxParser.js`.

---

## Deploy en Vercel

**`vercel.json`:**
```json
{
  "installCommand": "corepack enable && pnpm install --frozen-lockfile",
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index.js" }]
}
```

`corepack enable` es necesario para que Vercel use pnpm 11 (especificado en `packageManager`). Sin él usa pnpm 9 que no puede leer el lockfile.

**MongoDB Atlas:** Añadir `0.0.0.0/0` en Network Access — Vercel usa IPs dinámicas.

---

## Scripts

```bash
pnpm dev         # desarrollo con hot-reload (nodemon)
pnpm start       # producción
pnpm lint        # ESLint — 0 errores, 0 warnings
pnpm lint:fix    # corregir automáticamente
pnpm format      # Prettier
```
