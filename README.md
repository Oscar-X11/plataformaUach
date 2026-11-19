# Plataforma UACH

Plataforma académica de la Universidad de los Altos de Chiapas, tipo Classroom/Moodle, donde docentes y alumnos comparten cursos, publicaciones, tareas, entregas y calificaciones.

Monorepo con npm workspaces:

| Workspace | Tecnología |
| --- | --- |
| `backend/` | NestJS 12, Prisma 6, MySQL 8.4 |
| `frontend/` | Next.js 14 (App Router), Tailwind CSS |
| Infraestructura | Docker Compose, Nginx, Redis |

El análisis funcional, las ventanas previstas y la hoja de ruta están en [`docs/ANALISIS_VENTANAS_Y_PROPUESTA.md`](docs/ANALISIS_VENTANAS_Y_PROPUESTA.md).


## Estado actual — Fase 0 completada

### Backend

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/` | Público | Comprobación de disponibilidad |
| POST | `/auth/register` | Público (5/min) | Registro de **alumnos** (el rol no se puede elegir) |
| POST | `/auth/login` | Público (5/min) | Inicio de sesión; crea la cookie `uach_session` |
| POST | `/auth/logout` | Público | Borra la cookie de sesión |
| GET | `/auth/me` | Autenticado | Usuario actual |
| GET | `/academic/faculties` | Público | Facultades y carreras (para el registro) |
| GET | `/files/<área>/<ruta>` | Autenticado | Descarga de archivos de `storage/` con permisos |

Seguridad:

- Sesión por cookie `httpOnly` + `SameSite=Lax` (navegador) o `Authorization: Bearer` (clientes HTTP).
- Configuración validada al arrancar (`src/config/env.validation.ts`): el backend no inicia sin `JWT_SECRET` de 32+ caracteres.
- Guards globales en orden: límite de peticiones → JWT → roles.
- CORS restringido a `CORS_ORIGINS`.
- Archivos privados: Nginx ya no expone `storage/`; el backend valida la sesión y los permisos y responde con `X-Accel-Redirect`.
  - `submissions/`: solo el alumno dueño, el docente del curso o un administrador.
  - `avatars/`, `repository/`: cualquier usuario autenticado.
  - `classroom-drive/`: alumnos y docentes (la validación por curso llega con el modelo `Attachment` en la fase 1).
- Las columnas `fileUrl` guardan la ruta relativa dentro de `storage/`, por ejemplo `submissions/<cursoId>/<archivo>.pdf`.

### Frontend

- Protección de rutas por rol en `src/middleware.ts` (experiencia de usuario; la autorización real está en el backend).
- Layouts con barra lateral y barra superior por grupo: `(auth)`, `(dashboard)`, `(admin)`, `(seguridad)`.
- Navegación según el rol (`src/lib/navigation.ts`).
- Cliente HTTP (`src/lib/api.ts`) y validación de sesión del lado del servidor (`src/lib/server-session.ts`).
- Ventanas funcionales: **inicio de sesión** y **registro**. El resto muestran un aviso con la fase en la que se implementan.
- Páginas de error: `404`, error inesperado y `/acceso-denegado`.

| Rol | Página de inicio |
| --- | --- |
| Alumno / Docente | `/dashboard` |
| Administrador | `/administracion` |
| Seguridad | `/seguridad` |

## Requisitos

- Node.js **22.12 o superior**.
- MySQL 8 (local o mediante Docker).
- Docker (opcional, para levantar todo el entorno).

## Puesta en marcha (desarrollo local)

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env        # y reemplaza todos los valores <...>

# 3. Base de datos: crea la base y el usuario definidos en .env (MYSQL_*), luego:
npm run prisma:generate
npm run prisma:migrate      # crea las tablas
npm run prisma:seed         # catálogo de ejemplo + administrador inicial

# 4. En terminales separadas
npm run dev:backend         # http://localhost:4000
npm run dev:frontend        # http://localhost:3000
```

En desarrollo, Next.js reenvía `/api/*` al backend (`API_INTERNAL_URL`), así que la aplicación se usa desde `http://localhost:3000`.

> El catálogo de `backend/prisma/seed.ts` es **de ejemplo**: reemplázalo por las facultades, carreras y materias oficiales.

## Con Docker

```bash
cp .env.example .env        # completa los valores
npm run docker:up
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

La plataforma queda en `http://localhost` (puerto `NGINX_PORT`). MySQL y Redis solo escuchan en `127.0.0.1`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión de Prisma a MySQL |
| `MYSQL_*` | Credenciales con las que Docker crea la base de datos |
| `JWT_SECRET` | Secreto de firma de sesiones (mínimo 32 caracteres aleatorios) |
| `JWT_EXPIRES_IN` | Duración de la sesión (por ejemplo `8h`) |
| `COOKIE_SECURE` | `true` en producción con HTTPS |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma |
| `REGISTRATION_EMAIL_DOMAINS` | Dominios de correo permitidos en el registro (vacío = cualquiera) |
| `STORAGE_PATH` | Carpeta de archivos (por defecto `../storage` desde `backend/`) |
| `FILES_ACCEL_REDIRECT` | `true` cuando Nginx entrega los archivos |
| `API_INTERNAL_URL` | URL del backend vista por el servidor de Next.js |
| `SEED_ADMIN_*` | Administrador inicial creado por el seed |

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev:backend` / `dev:frontend` | Desarrollo con recarga automática |
| `npm run build:all` | Compila backend y frontend |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run prisma:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run prisma:deploy` | Aplica migraciones existentes (producción) |
| `npm run prisma:seed` | Carga catálogo y administrador inicial |
| `npm run prisma:studio` | Explorador visual de la base de datos |
| `npm --workspace=backend run test` | Pruebas unitarias del backend |
| `npm --workspace=backend run lint` / `npm --workspace=frontend run lint` | Análisis estático |

## Estructura

```text
Plataforma_UACH/
├── backend/
│   ├── prisma/              # schema.prisma y seed.ts
│   └── src/
│       ├── academic/        # Catálogo público de facultades y carreras
│       ├── auth/            # Registro, login, logout, sesión y tokens
│       ├── common/          # Decoradores, guards y tipos compartidos
│       ├── config/          # Validación de variables de entorno
│       ├── database/        # PrismaService
│       └── files/           # Descarga protegida de archivos
├── frontend/src/
│   ├── app/                 # Rutas: (auth), (dashboard), (admin), (seguridad)
│   ├── components/          # layout/, providers/, ui/
│   ├── lib/                 # api, session, server-session, navigation
│   └── middleware.ts        # Protección de rutas por rol
├── docs/                    # Análisis, propuesta funcional y reporte de configuración
├── nginx/nginx.conf
├── storage/                 # Archivos de usuarios (fuera de Git)
└── docker-compose.yml
```

## Siguientes pasos

- **Fase 1:** cursos, inscripción por código, tablón, tareas, entregas, calificaciones, notificaciones y perfil.
