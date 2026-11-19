# Plataforma UACH

Plataforma académica de la Universidad de los Altos de Chiapas, tipo Classroom/Moodle, donde docentes y alumnos comparten cursos, publicaciones, tareas, entregas y calificaciones.

Monorepo con npm workspaces:

| Workspace | Tecnología |
| --- | --- |
| `backend/` | NestJS 12, Prisma 6, MySQL 8.4 |
| `frontend/` | Next.js 14 (App Router), Tailwind CSS |
| Infraestructura | Docker Compose, Nginx, Redis |

El análisis funcional, las ventanas previstas y la hoja de ruta están en [`docs/ANALISIS_VENTANAS_Y_PROPUESTA.md`](docs/ANALISIS_VENTANAS_Y_PROPUESTA.md). El estado detallado por fases está en [`docs/AVANCE.md`](docs/AVANCE.md) y el historial día por día en [`docs/BITACORA.md`](docs/BITACORA.md).

## Estado actual

| Fase | Descripción | Estado |
| --- | --- | --- |
| Fase 0 | Bases: seguridad, sesión, layouts, infraestructura | ✅ Completada |
| Fase 1 | MVP tipo Classroom (cursos, tareas, entregas, calificaciones, tablón, notificaciones, perfil) | ✅ Completa con backend simulado |
| Fase 2 | Valor institucional (calendario, material del curso, repositorio, grupos de estudio, reportes) | 🔄 Casi completa — faltan catálogos y periodos en administración |
| Fase 3 | Funciones tipo Moodle (cuestionarios, asistencia, foros…) | ⬜ Pendiente |

> Todavía no hay base de datos MySQL: todo se ha probado con el backend simulado (`npm run dev:demo`). Las tres migraciones están listas para aplicarse con `npm run prisma:deploy`.

### Backend

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/` | Público | Comprobación de disponibilidad |
| POST | `/auth/register` | Público (5/min) | Registro de **alumnos** (el rol no se puede elegir) |
| POST | `/auth/login` | Público (5/min) | Inicio de sesión; crea la cookie `uach_session` |
| POST | `/auth/logout` | Público | Borra la cookie de sesión |
| GET | `/auth/me` | Autenticado | Usuario actual |
| POST | `/auth/change-password` | Autenticado | Cambia la contraseña propia (también la temporal) |
| POST | `/users/:id/reset-password` | Administrador | Asigna una contraseña temporal al usuario |
| GET | `/academic/faculties` | Público | Facultades y carreras (para el registro) |
| GET | `/academic/subjects` | Docente, admin | Materias con su carrera (para crear cursos) |
| GET | `/courses` | Autenticado | Cursos propios: los que imparte, en los que está inscrito o todos (admin) |
| POST | `/courses` | Docente | Crea un curso con código de invitación |
| POST | `/courses/join` | Alumno | Se une con el código de invitación |
| GET | `/courses/:id` | Miembro del curso | Detalle (el código solo lo ve el docente o un admin) |
| GET | `/courses/:id/people` | Miembro del curso | Docente y alumnos (los alumnos no ven matrículas ajenas) |
| POST | `/courses/:id/invitation` | Docente del curso, admin | Genera un código nuevo (el anterior deja de servir) |
| DELETE | `/courses/:id/students/:studentId` | Docente del curso, admin | Quita a un alumno |
| GET/POST | `/courses/:id/assignments` | Miembro / docente | Tareas del curso; crear tarea |
| GET/PATCH/DELETE | `/assignments/:id` | Miembro / docente | Detalle (con la entrega propia del alumno); editar; borrar |
| POST/DELETE | `/assignments/:id/submission/files[/:fileId]` | Alumno inscrito | Adjuntar (multipart `files`) o quitar archivos |
| POST | `/assignments/:id/submission/turn-in` · `/unsubmit` | Alumno inscrito | Entregar o anular la entrega |
| GET | `/assignments/:id/submissions` | Docente del curso, admin | Entregas de todos los inscritos |
| PATCH | `/assignments/:id/submissions/:studentId` | Docente del curso, admin | Calificar (`grade`, `feedback`) y devolver (`return: true`) |
| GET | `/classwork/overview` | Alumno, docente | Mis tareas (alumno) o entregas por calificar (docente) |
| GET | `/courses/:id/grades` · `/grades/export` | Miembro / docente | Calificaciones; CSV para Excel |
| GET/POST | `/courses/:id/posts` | Miembro / docente | Tablón; publicar aviso |
| DELETE | `/posts/:id` · `/comments/:id` | Autor o docente | Borrar aviso o comentario |
| POST | `/posts/:id/comments` | Miembro del curso | Comentar |
| GET | `/notifications` | Autenticado | Últimas 50 y número sin leer |
| POST | `/notifications/read-all` · `/notifications/:id/read` | Autenticado | Marcar como leídas |
| GET | `/profile` · POST/DELETE `/profile/avatar` | Autenticado | Perfil y foto (multipart `file`) |
| GET/POST | `/users` | Administrador | Buscar usuarios; alta de personal con contraseña temporal |
| PATCH | `/users/:id/status` | Administrador | Activar, desactivar o marcar como egresado |
| GET | `/dashboard/student` · `/teacher` · `/admin` | Según el rol | Resumen de la pantalla de inicio |
| GET | `/calendar?from=ISO&to=ISO` | Autenticado | Entregas de mis cursos en el rango (máx. 62 días) |
| GET/POST | `/courses/:id/materials` | Miembro / docente | Material del curso; publicar archivo (multipart `file`) o enlace (`url`) |
| DELETE | `/materials/:id` | Docente del curso | Borrar material |
| POST · PATCH · DELETE | `/courses/:id/topics` · `/topics/:id` | Docente del curso | Temas o unidades del curso |
| GET | `/repository` · `/repository/mine` | Autenticado | Buscar recursos aprobados; mis aportes |
| GET | `/repository/pending` | Administrador | Recursos por revisar |
| POST | `/repository` | Autenticado | Subir recurso (alumnos: queda en revisión) |
| PATCH | `/repository/:id/review` | Administrador | Aprobar o rechazar con motivo |
| DELETE | `/repository/:id` | Autor o admin | Borrar recurso |
| GET/POST | `/study-groups` | Autenticado | Buscar o crear grupos de estudio |
| GET · DELETE | `/study-groups/:id` | Autenticado / creador o admin | Detalle (integrantes solo para miembros); borrar |
| POST | `/study-groups/:id/join` · `/leave` | Autenticado | Unirse (respeta el cupo) o salir |
| GET | `/reports/courses[?term=]` · `/export` | Administrador | Desempeño por curso; CSV |
| GET | `/files/<área>/<ruta>` | Autenticado | Descarga de archivos de `storage/` con permisos |

Cuentas y acceso:

- Se inicia sesión con **matrícula** (alumnos) o **número de empleado** (docentes y administradores). La plataforma no usa correo: la universidad no da correo a los alumnos.
- Contraseña olvidada: un administrador la restablece y entrega una contraseña temporal; con ella el usuario solo puede entrar a `/cambiar-contrasena` hasta elegir una nueva (el backend responde 403 al resto de la API).

Seguridad:

- Sesión por cookie `httpOnly` + `SameSite=Lax` (navegador) o `Authorization: Bearer` (clientes HTTP).
- Configuración validada al arrancar (`src/config/env.validation.ts`): el backend no inicia sin `JWT_SECRET` de 32+ caracteres.
- Guards globales en orden: límite de peticiones → JWT → roles.
- Pertenencia al curso: `CourseAccessService` (exportado por `CoursesModule`) valida que el usuario sea el docente, un alumno inscrito o un admin; si no, responde 404 para no revelar qué cursos existen. Todo endpoint con `courseId` debe usarlo.
- CORS restringido a `CORS_ORIGINS`.
- Archivos privados: Nginx ya no expone `storage/`; el backend valida la sesión y los permisos y responde con `X-Accel-Redirect`.
  - `submissions/`: solo el alumno dueño, el docente del curso o un administrador (se busca en `SubmissionFile`).
  - Las subidas se validan por extensión **y** por contenido (firma del archivo), con límite de tamaño, y se guardan con nombre aleatorio y su `sha256`.
  - `avatars/`: cualquier usuario autenticado.
  - `classroom-drive/`: material del curso, solo para su docente y los alumnos inscritos.
  - `repository/`: lo aprobado lo ve cualquiera; lo pendiente o rechazado, solo su autor.
- Las columnas `fileUrl` guardan la ruta relativa dentro de `storage/`, por ejemplo `submissions/<cursoId>/<archivo>.pdf`.

### Frontend

- Protección de rutas por rol en `src/middleware.ts` (experiencia de usuario; la autorización real está en el backend).
- Layouts con barra lateral y barra superior por grupo: `(auth)`, `(cuenta)`, `(dashboard)`, `(admin)`.
- Navegación según el rol (`src/lib/navigation.ts`).
- Cliente HTTP (`src/lib/api.ts`) y validación de sesión del lado del servidor (`src/lib/server-session.ts`).
- Páginas de error: `404`, error inesperado y `/acceso-denegado`.

Ventanas funcionales:

| Grupo | Rutas |
| --- | --- |
| `(auth)` | `/login`, `/registro`, `/recuperar-contrasena` |
| `(cuenta)` | `/cambiar-contrasena` |
| `(dashboard)` | `/dashboard` (alumno y docente), `/cursos`, `/cursos/[cursoId]` (tablón), `/cursos/[cursoId]/tareas`, `/cursos/[cursoId]/tareas/[tareaId]`, `/cursos/[cursoId]/recursos`, `/cursos/[cursoId]/personas`, `/cursos/[cursoId]/calificaciones`, `/entregas`, `/calendario`, `/repositorio`, `/grupos-estudio`, `/grupos-estudio/[grupoId]`, `/notificaciones`, `/perfil` |
| `(admin)` | `/administracion` (panel), `/administracion/usuarios`, `/administracion/cursos`, `/administracion/reportes` |

| Rol | Página de inicio |
| --- | --- |
| Alumno / Docente | `/dashboard` |
| Administrador | `/administracion` |

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
npm run prisma:deploy       # aplica las migraciones (crea las tablas)
npm run prisma:seed         # catálogo de ejemplo + administrador inicial

# 4. En terminales separadas
npm run dev:backend         # http://localhost:4000
npm run dev:frontend        # http://localhost:3000
```

En desarrollo, Next.js reenvía `/api/*` al backend (`API_INTERNAL_URL`), así que la aplicación se usa desde `http://localhost:3000`.

### Sin base de datos (backend simulado)

```bash
npm install
npm run dev:demo            # backend simulado + frontend en http://localhost:3000
```

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Alumna | `A2023-0148` | `alumno123` |
| Docente | `D1001` | `docente123` |
| Administrador | `ADMIN` | `admin123` |
| Alumno con contraseña temporal | `A2023-0200` | `temp-1234` |

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
| `STORAGE_PATH` | Carpeta de archivos (por defecto `../storage` desde `backend/`) |
| `FILES_ACCEL_REDIRECT` | `true` cuando Nginx entrega los archivos |
| `API_INTERNAL_URL` | URL del backend vista por el servidor de Next.js |
| `SEED_ADMIN_*` | Administrador inicial creado por el seed (`SEED_ADMIN_USERNAME` es su número de empleado) |

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev:backend` / `dev:frontend` | Desarrollo con recarga automática |
| `npm run dev:demo` | Backend simulado + frontend, sin base de datos |
| `npm run dev:mock` | Solo el backend simulado |
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
│   ├── prisma/              # schema.prisma, migrations/ y seed.ts
│   └── src/
│       ├── academic/        # Catálogo de facultades, carreras y materias
│       ├── auth/            # Registro, login, logout, sesión, cambio de contraseña
│       ├── classwork/       # Tareas, entregas, calificaciones y calendario
│       ├── common/          # Decoradores, guards y tipos compartidos
│       ├── config/          # Validación de variables de entorno
│       ├── courses/         # Cursos, inscripción y CourseAccessService
│       ├── dashboard/       # Resúmenes de inicio por rol
│       ├── database/        # PrismaService
│       ├── files/           # Descarga protegida de archivos
│       ├── groups/          # Grupos de estudio
│       ├── materials/       # Temas y material del curso
│       ├── notifications/   # Notificaciones dentro de la plataforma
│       ├── profile/         # Perfil y avatar
│       ├── reports/         # Reportes por curso y CSV
│       ├── repository/      # Repositorio institucional con moderación
│       ├── stream/          # Tablón: publicaciones y comentarios
│       └── users/           # Administración de usuarios
├── frontend/src/
│   ├── app/                 # Rutas: (auth), (cuenta), (dashboard), (admin)
│   ├── components/          # Por módulo: courses/, classwork/, stream/, materials/,
│   │                        # repository/, groups/, dashboard/, admin/, layout/, ui/…
│   ├── lib/                 # api, session, server-session, navigation, clientes por módulo
│   └── middleware.ts        # Protección de rutas por rol
├── scripts/                 # Backend simulado (mock-*.mjs) y dev-demo.mjs
├── docs/                    # Análisis, avance, bitácora y reporte de configuración
├── nginx/nginx.conf
├── storage/                 # Archivos de usuarios (fuera de Git)
└── docker-compose.yml
```

## Siguientes pasos

- **Cerrar la Fase 2:** catálogos (facultades, carreras y materias), periodos y reasignar docentes en administración.
- **Base de datos real:** crear MySQL, aplicar las migraciones, cargar el seed y repetir las pruebas con el backend real.
- **Pendientes técnicos:** invalidar sesiones al desactivar cuentas o restablecer contraseñas, endpoint `/health`, refresh token y pruebas e2e.
- **Por decidir:** cómo evitar registros con la matrícula de otro alumno.
- **Fase 3:** cuestionarios, asistencia, foros, rúbricas y videoclases.
