# Nenúfar Backend

API backend del proyecto **Nenúfar**, construido con **NestJS**, **Prisma** y **PostgreSQL**. Preparado para despliegue en **Render**.

---

## 🧱 Stack

- **Node.js** (18+)
- **NestJS** (REST)
- **Prisma** (ORM)
- **PostgreSQL**
- **JWT** para autenticación

---

## ✅ Requisitos previos

- Node 18+ y npm o yarn
- PostgreSQL local (opcional para desarrollo)
- Cuenta en Render.com

---

## ⚙️ Variables de entorno

Crea un archivo `.env` en la raíz con:

```env
# Base de datos (local o Render)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"

# JWT
JWT_SECRET="cambia-esto-por-un-secreto-largo"
JWT_EXPIRES_IN="1d" # opcional

# Entorno/app
NODE_ENV="development"
PORT=3000 # En Render, Render inyecta PORT automáticamente; el código debe usar process.env.PORT

# Frontend
FRONTEND_URL="http://localhost:5173"

# Welcome email con Resend
RESEND_ENABLED="false"
RESEND_API_KEY=""
EMAIL_FROM="Nenúfar <hola@tudominio.com>"
```

> Asegúrate de **NO** commitear `.env`. Manténlo fuera del control de versiones.

---

## 🔧 Puesta en marcha local

```bash
# 1) Dependencias
npm ci # o npm install

# 2) Generar Prisma client
npx prisma generate

# 3) Crear migraciones (si aún no existen)
# crea una migración inicial a partir del schema.prisma
npx prisma migrate dev --name init

# 4) Levantar en desarrollo
npm run start:dev
```

### Probar el welcome email en local

- Con `RESEND_ENABLED="false"` el login sigue funcionando y el backend no intenta enviar emails.
- Con `RESEND_ENABLED="true"` necesitas definir `RESEND_API_KEY`, `EMAIL_FROM` y `FRONTEND_URL`.
- El welcome email se intenta enviar solo en el primer login exitoso de usuarios con `welcomeEmailSentAt = null`.
- Si Resend falla, el login no se rompe y `welcomeEmailSentAt` no se marca.

Scripts típicos en `package.json` (ajusta si es necesario):

```json
{
  "scripts": {
    "start": "node dist/src/main.js",
    "start:dev": "nest start --watch",
    "build": "nest build",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy"
  }
}
```

---

## 🧪 Salud del servicio

- Asegura que **Nest** escucha en `process.env.PORT` si existe:

  ```ts
  // main.ts
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  await app.listen(port);
  ```

- (Opcional) expón un endpoint de **healthcheck**, por ejemplo `GET /health`:

  ```ts
  // app.controller.ts
  @Get('health')
  health() { return { ok: true }; }
  ```

---

## 🍪 Auth por cookies HttpOnly

La API usa el prefijo global `/api` y la sesión puede viajar en cookies HttpOnly:

- `access_token`
- `refresh_token`

En local (`http`) las cookies se emiten con `secure=false` y `sameSite=lax`.
En producción (`https`) se emiten con `secure=true` y `sameSite=none` para permitir frontend en Vercel y backend en Railway con `withCredentials: true`.

Ejemplo de login guardando cookies en un cookie jar:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"ana@example.com","password":"secreta123"}'
```

Ejemplo de llamada autenticada a `/api/auth/me` reutilizando esas cookies:

```bash
curl -i -b cookies.txt \
  http://localhost:3000/api/auth/me
```

---

## 🚀 Despliegue en Render (GUI)

1. **Crear Base de Datos** en Render: _New → PostgreSQL_.

   - Guarda el **Internal Database URL** (mejor para redes internas) o el **External** si lo necesitas.

2. **Crear Web Service**: _New → Web Service → Connect a repository_ y elige este repo.
3. **Runtime**: Node 18+.
4. **Build Command**:

   ```bash
   npm ci && npm run build && npx prisma generate && npx prisma migrate deploy
   ```

5. **Start Command**:

   ```bash
   node dist/src/main.js
   ```

6. **Environment variables** en Render → _Environment_:

   - `DATABASE_URL` = (copiar de la DB de Render)
   - `JWT_SECRET` = un secreto largo
   - `NODE_ENV` = `production`
   - (Render establece `PORT` automáticamente; no lo definas)

7. **Health Check**: Path `/health` (o `/` si no tienes uno dedicado).
8. **Auto-Deploy**: activa _Auto-Deploy_ desde `main`.

> **Migraciones**: `prisma migrate deploy` aplicará **las migraciones ya commiteadas**. Si no tienes migraciones en el repo, créalas localmente (`prisma migrate dev --name init`) y súbelas.

---

## 📦 Despliegue con `render.yaml` (IaC opcional)

Incluye un archivo `render.yaml` en la raíz y haz push. Render te permitirá crear todo desde ese manifiesto.

```yaml
services:
  - type: web
    name: nenufar-backend
    runtime: node
    repo: https://github.com/USUARIO/nenufar-backend
    branch: main
    buildCommand: |
      npm ci
      npm run build
      npx prisma generate
      npx prisma migrate deploy
    startCommand: node dist/src/main.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase: nenufar-db
        property: connectionString
      - key: JWT_SECRET
        generateValue: true
    healthCheckPath: /health

databases:
  - name: nenufar-db
    databaseName: nenufar
    plan: free
```

> Cambia `USUARIO` por tu usuario de GitHub. Puedes usar `fromDatabase` para inyectar la cadena de conexión automáticamente.

---

## 🧹 .gitignore recomendado

Crea un `.gitignore` (o añade estas líneas):

```gitignore
node_modules/
dist/
.env
coverage/
.tmp/
.prisma/
```

---

## 🐳 (Opcional) Docker local

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npx prisma generate

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
ENV NODE_ENV=production
CMD ["node", "dist/src/main.js"]
```

---

## 🐞 Troubleshooting rápido

- **`Repository not found` al hacer push**: revisa la URL de `origin` y permisos.
- **`non-fast-forward`**: `git pull --rebase origin main` o `git push --force-with-lease` si quieres forzar.
- **Render no levanta**:

  - Revisa _Logs_ (Build & Runtime) en Render.
  - Verifica que `DATABASE_URL` está bien y accesible.
  - Asegura que el servicio escucha en `process.env.PORT`.
  - Asegura migraciones commiteadas; usa `npx prisma migrate deploy` en el build.

---
