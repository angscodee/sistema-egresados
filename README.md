# Sistema de Gestión de Egresados y Oferta Laboral

Monorepo con NestJS (API + Worker) y Next.js 15 (Web), usando PostgreSQL, Redis y BullMQ.

## Estructura

```
apps/
  api/        NestJS — REST + tRPC + WebSocket
  web/        Next.js 15 — App Router
packages/
  shared/     Tipos y constantes compartidas
docker/
  docker-compose.yml
  init.sql    Índices, vistas materializadas y triggers
```

## Requisitos

- Node.js ≥ 20
- Docker y Docker Compose

## Inicio rápido (Docker)

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores (JWT_SECRET, SMTP, etc.)

# 2. Levantar todos los servicios
docker compose -f docker/docker-compose.yml up -d

# 3. Ejecutar migraciones de Prisma
docker compose -f docker/docker-compose.yml exec api \
  npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# 4. Cargar datos de prueba (opcional)
docker compose -f docker/docker-compose.yml exec api \
  npm run prisma:seed -w @egresados/api
```

La app estará disponible en:
- Web: http://localhost:3000
- API: http://localhost:3001
- Health: http://localhost:3001/health

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npm run db:generate

# Levantar postgres y redis
docker compose -f docker/docker-compose.yml up postgres redis -d

# Ejecutar migraciones
npm run db:migrate

# Iniciar API y Web en paralelo
npm run dev

# Iniciar worker de reportes (terminal separada)
npm run worker
```

## Variables de entorno

Copia `.env.example` a `.env` y completa:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `REDIS_URL` | URL de Redis (ej. `redis://localhost:6379`) |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mínimo 32 chars) |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `7d`) |
| `SMTP_HOST` | Servidor SMTP para emails |
| `SMTP_PORT` | Puerto SMTP (ej. `587`) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `NEXT_PUBLIC_API_URL` | URL pública de la API (para el frontend) |

## Comandos útiles

```bash
npm run build          # Build de todos los paquetes
npm run test           # Tests unitarios
npm run lint           # Lint
npm run db:seed        # Seed de datos de prueba
npm run db:migrate     # Migraciones de desarrollo
```

## Checklist de deploy a producción

Antes de deployar, verifica cada punto:

- [ ] `JWT_SECRET` cambiado por un secreto aleatorio de 64+ chars
- [ ] `POSTGRES_PASSWORD` cambiada por una contraseña segura
- [ ] `CORS_ORIGIN` apunta al dominio real del frontend
- [ ] `NEXT_PUBLIC_API_URL` apunta al dominio real del API
- [ ] `NEXT_PUBLIC_APP_URL` apunta al dominio real del frontend
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` configurados para emails reales
- [ ] `NODE_ENV=production` en todos los servicios
- [ ] Migraciones ejecutadas: `prisma migrate deploy`
- [ ] Seed ejecutado (solo primera vez): `npm run db:seed`
- [ ] Secrets de GitHub Actions configurados: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] Volúmenes Docker persistentes en un disco con suficiente espacio
- [ ] Chromium disponible en el worker para generación de PDFs

## Credenciales de demo (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@example.com | password123 |
| Empresa | empresa@example.com | password123 |
| Egresado | egresado@example.com | password123 |

> Cambiar estas contraseñas en producción.

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Panel completo, moderación, reportes |
| `EGRESADO` | Perfil, postulaciones, dashboard personal |
| `EMPRESA` | Publicar ofertas, gestionar postulantes |

## Arquitectura

- **Auth**: JWT Bearer token con guards por rol
- **Reportes**: Cola BullMQ → Worker → Puppeteer → PDF local
- **Notificaciones**: In-app (WebSocket Socket.IO) + Email (Nodemailer)
- **Cache**: Redis con TTL de 5 min para dashboard Admin
- **ORM**: Prisma con PostgreSQL
