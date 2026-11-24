# Plataforma UACH

Plataforma académica de la Universidad de los Altos de Chiapas, tipo Classroom/Moodle. Docentes y alumnos comparten clases, avisos, material, tareas, cuestionarios, entregas y calificaciones; la administración gestiona cuentas, carreras, periodos y reportes.

Monorepo con npm workspaces:

| Workspace | Tecnología |
| --- | --- |
| `backend/` | NestJS 12, Prisma 6, MySQL 8.4 |
| `frontend/` | Next.js 14 (App Router), Tailwind CSS |
| Infraestructura | Docker Compose, Nginx, Redis |

Documentación:

- [`docs/AVANCE.md`](docs/AVANCE.md): estado por fases, decisiones de alcance y **lo que falta**.
- [`docs/BITACORA.md`](docs/BITACORA.md): historial día por día.
- [`docs/ANALISIS_VENTANAS_Y_PROPUESTA.md`](docs/ANALISIS_VENTANAS_Y_PROPUESTA.md): análisis inicial (2026-11-18), conservado como referencia histórica.
- [`frontend/DESIGN.md`](frontend/DESIGN.md) y [`frontend/PRODUCT.md`](frontend/PRODUCT.md): sistema visual y contexto de producto.

## Estado actual

| Fase | Descripción | Estado |
| --- | --- | --- |
| Fase 0 | Bases: seguridad, sesión, layouts, infraestructura | ✅ Completada |
| Fase 1 | MVP tipo Classroom (clases, tareas, entregas, calificaciones, tablón, notificaciones, perfil) | ✅ Completa y probada con la base de datos real |
| Fase 2 | Valor institucional (calendario, material, repositorio, grupos de estudio, reportes, carreras y periodos) | ✅ Completa y probada con la base de datos real |
| Fase 3 | Evaluación y seguimiento (cuestionarios, rúbricas, libro con pesos y final, progreso, acceso condicional, bitácora) | ✅ Completa y probada |
| Fase 4 | Herramientas complementarias | 🔄 Hecho: reutilizar clase, seguimiento, búsqueda global, app instalable, ayuda y aviso de privacidad. Falta lo listado en `AVANCE.md` |

**Siguiente paso:** instalar en el servidor Debian (4 GB) y cargar los datos oficiales. La lista completa está en [`docs/AVANCE.md` › Lo que falta](docs/AVANCE.md#lo-que-falta).

> Base de datos local: MySQL 8.4 en Docker (`docker compose up -d mysql redis`, puerto del host en `MYSQL_HOST_PORT`, 3307 en desarrollo). Se crea con `npm run prisma:deploy` y `npm run prisma:seed`. Las tablas y columnas están en español (`@@map`/`@map` en `schema.prisma`); el código usa los nombres de los modelos en inglés.

## Funciones principales

| Para | Qué puede hacer |
| --- | --- |
| Alumnos | Unirse a clases con código, ver avisos y material, entregar tareas con archivos, responder cuestionarios y encuestas, ver su progreso, calificaciones y calificación final, calendario, repositorio y grupos de estudio. |
| Docentes | Crear clases por carrera y cuatrimestre/semestre, publicar avisos y material, crear tareas con rúbrica y condiciones de acceso, cuestionarios con calificación automática, calificar, ajustar pesos, seguir el avance (alumnos en riesgo, entregas duplicadas) y reutilizar una clase en otro periodo. |
| Administración | Importar alumnos desde Excel, dar de alta al personal, restablecer contraseñas, gestionar niveles, carreras, materias (con su calificación aprobatoria), periodos y clases; reportes y bitácora de actividad. |
| Todos | Búsqueda global (Ctrl+K), notificaciones, perfil con foto, centro de ayuda, aviso de privacidad e instalación como app en el celular. |

Reglas académicas: licenciaturas e ingenierías son **cuatrimestrales** y aprueban con **7**; la preparatoria es **semestral** y aprueba con **6** (editable en Carreras). La final es el promedio ponderado de tareas y cuestionarios (60/40 por omisión, cambiable por clase). Con el periodo cerrado, las calificaciones quedan bloqueadas.

## Backend

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | Público | Estado de MySQL y `storage/` (200 o 503) |
| POST | `/auth/login` | Público (5/min) | Inicio de sesión; crea la cookie `uach_session` |
| POST | `/auth/logout` | Público | Borra la cookie de sesión |
| GET | `/auth/me` | Autenticado | Usuario actual |
| POST | `/auth/change-password` | Autenticado (5/min) | Cambia la contraseña propia (también la temporal) |
| GET | `/academic/faculties` · `/academic/subjects` | Autenticado / docente, admin | Niveles con sus carreras; materias (para crear clases) |
| GET · POST · PATCH · DELETE | `/academic/terms[/:id]` | Lectura: autenticado; resto: admin | Periodos: alta, actual, cerrar y reabrir |
| GET · POST · PUT · DELETE | `/academic/catalog` · `/faculties` · `/careers` · `/subjects` | Administrador | Niveles (con `passingGrade`), carreras y materias |
| GET · POST | `/courses` | Autenticado / docente | Clases propias (o todas, admin); crear clase con código de invitación |
| POST | `/courses/join` | Alumno (10/min) | Se une con el código de invitación |
| GET | `/courses/:id` · `/courses/:id/people` | Miembro de la clase | Detalle; docente y alumnos (los alumnos no ven matrículas ajenas) |
| PATCH | `/courses/:id/description` · `/meeting` | Docente de la clase, admin | Descripción y aula |
| POST | `/courses/:id/invitation` | Docente de la clase, admin | Código nuevo (el anterior deja de servir) |
| POST | `/courses/:id/copy` | Docente de la clase, admin | **Reutilizar clase** en otro periodo (sin alumnos) |
| DELETE | `/courses/:id/students/:studentId` | Docente de la clase, admin | Quita a un alumno |
| GET · POST | `/courses/:id/assignments` | Miembro / docente | Tareas (el alumno recibe `availability`); crear con `availableFrom`, `requiresKind` y `requiresId` |
| GET · PATCH · DELETE | `/assignments/:id` | Miembro / docente | Detalle con rúbrica y entrega propia; editar; borrar |
| PUT | `/assignments/:id/rubric` | Docente | Reemplaza la rúbrica (lista vacía la quita; no cambia si ya se calificó con ella) |
| POST · DELETE | `/assignments/:id/submission/files[/:fileId]` | Alumno inscrito | Adjuntar (multipart `files`) o quitar archivos |
| POST | `/assignments/:id/submission/turn-in` · `/unsubmit` | Alumno inscrito | Entregar o anular la entrega |
| GET | `/assignments/:id/submissions` | Docente, admin | Entregas de todos los inscritos, con `duplicateWith` (mismo archivo) |
| PATCH | `/assignments/:id/submissions/:studentId` | Docente, admin | Calificar (`grade` o `rubric`), comentar y devolver (`return: true`) |
| GET | `/classwork/overview` | Alumno, docente | Mis tareas (alumno) o entregas por calificar (docente) |
| GET | `/courses/:id/grades` · `/grades/export` | Miembro / docente | Libro con tareas, cuestionarios, pesos, final y situación; CSV |
| PATCH | `/courses/:id/weights` | Docente, admin | Pesos de tareas y cuestionarios (suman 100) |
| GET | `/courses/:id/progress` | Alumno | Su progreso y calificación final |
| GET | `/courses/:id/tracking` | Docente, admin | Progreso por alumno y alumnos en riesgo |
| POST | `/materials/:id/view` | Alumno | Registra que abrió un material (cuenta para el progreso) |
| GET · POST | `/courses/:id/quizzes` | Miembro / docente | Cuestionarios y encuestas; crear (borrador, con requisito opcional) |
| GET · PATCH · DELETE | `/quizzes/:id` | Miembro / docente | Ver (el alumno sin respuestas correctas), editar, borrar |
| POST | `/quizzes/:id/publish` | Docente | Publicar u ocultar (avisa a los alumnos la primera vez) |
| POST · PUT · POST | `/quizzes/:id/start` · `/answers` · `/submit` | Alumno | Empezar, guardado automático y envío (un intento) |
| GET | `/quizzes/:id/results` · `/results/export` · `/attempts/:attemptId` | Docente | Resumen, CSV y respuestas de un alumno |
| PATCH | `/quiz-answers/:id` | Docente | Calificar a mano una respuesta |
| GET · POST | `/courses/:id/posts` | Miembro / docente | Tablón; publicar aviso |
| DELETE | `/posts/:id` · `/comments/:id` | Autor o docente | Borrar aviso o comentario |
| POST | `/posts/:id/comments` | Miembro de la clase | Comentar |
| GET · POST | `/courses/:id/materials` | Miembro / docente | Material; publicar archivo (multipart `file`) o enlace (`url`) |
| DELETE | `/materials/:id` | Docente | Borrar material |
| POST · PATCH · DELETE | `/courses/:id/topics` · `/topics/:id` | Docente | Temas o unidades |
| GET | `/notifications` | Autenticado | Últimas 50 y número sin leer |
| POST | `/notifications/read-all` · `/notifications/:id/read` | Autenticado | Marcar como leídas |
| GET · POST · DELETE | `/profile` · `/profile/avatar` | Autenticado | Perfil y foto (multipart `file`) |
| GET · POST | `/users` | Administrador | Buscar usuarios; alta de personal con contraseña temporal |
| POST | `/users/import-students` | Administrador | Importar alumnos desde Excel (`dryRun: true` = vista previa; hasta 100 por petición) |
| PATCH | `/users/career` · `/users/:id/status` | Administrador | Carrera en bloque; activar, desactivar o egresar |
| POST | `/users/:id/reset-password` | Administrador | Contraseña temporal |
| GET | `/dashboard/student` · `/teacher` · `/admin` | Según el rol | Pantalla de inicio (sin actividades bloqueadas para el alumno) |
| GET | `/calendar?from=ISO&to=ISO` | Autenticado | Tareas y cuestionarios con fecha en el rango (máx. 62 días) |
| GET | `/search?q=` | Autenticado (60/min) | Búsqueda global: clases, tareas, cuestionarios, material; usuarios para admin |
| GET | `/activity` | Administrador | Bitácora completa (`page`, `action`, `search`) |
| GET | `/courses/:id/activity` | Docente, admin | Bitácora de la clase |
| GET | `/repository` · `/repository/mine` · `/repository/pending` | Autenticado / admin | Recursos aprobados, mis aportes, por revisar |
| POST · PATCH · DELETE | `/repository` · `/repository/:id/review` · `/repository/:id` | Autenticado / admin / autor | Subir, moderar y borrar recursos |
| GET · POST · DELETE | `/study-groups[/:id]` | Autenticado / creador o admin | Buscar, crear, ver y borrar grupos de estudio |
| POST | `/study-groups/:id/join` · `/leave` | Autenticado | Unirse (respeta el cupo) o salir |
| GET | `/reports/courses[?term=]` · `/export` | Administrador | Desempeño por clase; CSV |
| GET | `/files/<área>/<ruta>` | Autenticado | Descarga de archivos de `storage/` con permisos |

Cuentas y acceso:

- Se inicia sesión con **matrícula** (alumnos) o **número de empleado** (docentes y administradores). No hay correo: la universidad no da correo a los alumnos.
- **No hay registro abierto:** las cuentas de alumnos se crean al importar el Excel oficial; las del personal, desde la administración.
- Contraseña olvidada: un administrador la restablece; con la temporal, el usuario solo puede entrar a `/cambiar-contrasena` (el backend responde 403 al resto).

Seguridad:

- Sesión por cookie `httpOnly` + `SameSite=Lax` (o `Authorization: Bearer`). Sesión deslizante: cada token dura 8 h y se renueva mientras hay actividad, con límite absoluto `SESSION_MAX_DAYS`.
- Cada token lleva la versión de sesión del usuario: desactivar la cuenta o cambiar o restablecer la contraseña cierra las demás sesiones al instante.
- Configuración validada al arrancar (`src/config/env.validation.ts`): no inicia sin `JWT_SECRET` de 32+ caracteres.
- Guards globales en orden: límite de peticiones → JWT → roles.
- Pertenencia a la clase: `CourseAccessService` valida docente, alumno inscrito o admin; si no, 404 para no revelar qué clases existen.
- Acceso condicional: `AvailabilityService` decide qué puede abrir el alumno (fecha y actividad requerida) y rechaza ciclos de requisitos.
- CORS restringido a `CORS_ORIGINS`.
- Archivos privados: Nginx no expone `storage/`; el backend valida sesión y permisos y responde con `X-Accel-Redirect`.
  - `submissions/`: el alumno dueño, el docente de la clase o un admin.
  - `classroom-drive/`: material, solo para el docente y los alumnos inscritos.
  - `repository/`: lo aprobado lo ve cualquiera; lo pendiente o rechazado, solo su autor.
  - `avatars/`: cualquier usuario autenticado.
  - Las subidas se validan por extensión **y** por contenido, con límite de tamaño, y se guardan con nombre aleatorio y su `sha256`.
- Bitácora de actividad (`ActivityService`): quién hizo qué y cuándo; se purga sola a los 180 días.

## Frontend

- Protección de rutas por rol en `src/middleware.ts` (experiencia de usuario; la autorización real está en el backend).
- Layouts por grupo: `(auth)`, `(cuenta)`, `(dashboard)`, `(admin)` e `(info)` (páginas públicas).
- Navegación según el rol (`src/lib/navigation.ts`), búsqueda global en la barra superior (`GlobalSearch`, Ctrl+K o `/`).
- Cliente HTTP (`src/lib/api.ts`) y sesión del lado del servidor (`src/lib/server-session.ts`).
- App instalable: `src/app/manifest.ts` e íconos en `public/icons/` (se generan con `node frontend/scripts/generate-icons.mjs`). No funciona sin conexión.

| Grupo | Rutas |
| --- | --- |
| `(auth)` | `/login`, `/registro` (primer acceso; no hay registro abierto), `/recuperar-contrasena` |
| `(cuenta)` | `/cambiar-contrasena` |
| `(dashboard)` | `/dashboard`, `/cursos`, `/cursos/[cursoId]` (tablón), `…/tareas`, `…/tareas/[tareaId]`, `…/cuestionarios` (y `nuevo`, `[cuestionarioId]`, `respuestas`), `…/personas`, `…/calificaciones`, `…/recursos`, `…/seguimiento` (docente), `/entregas`, `/calendario`, `/repositorio`, `/grupos-estudio`, `/grupos-estudio/[grupoId]`, `/notificaciones`, `/perfil` |
| `(admin)` | `/administracion`, `/administracion/usuarios`, `/cursos`, `/carreras`, `/periodos`, `/reportes`, `/bitacora` |
| `(info)` | `/ayuda`, `/privacidad` (con o sin sesión) |

| Rol | Página de inicio |
| --- | --- |
| Alumno / Docente | `/dashboard` |
| Administrador | `/administracion` |

## Requisitos

- Node.js **22.12 o superior**.
- MySQL 8 (local o mediante Docker).
- Docker Desktop (recomendado en desarrollo para MySQL y Redis).

## Puesta en marcha (desarrollo local)

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env        # y reemplaza todos los valores <...>

# 3. Base de datos (con Docker Desktop abierto)
docker compose up -d mysql redis
npm run prisma:generate
npm run prisma:deploy       # aplica las migraciones
npm run prisma:seed         # catálogo de la UACH, periodos actuales y administrador inicial

# 4. En terminales separadas (las dos se quedan corriendo)
npm run dev:backend         # http://localhost:4000
npm run dev:frontend        # http://localhost:3000
```

En desarrollo, Next.js reenvía `/api/*` al backend (`API_INTERNAL_URL`), así que la plataforma se usa desde `http://localhost:3000`.

Los días siguientes basta con abrir Docker Desktop (los contenedores arrancan solos) y correr `npm run dev:backend` y `npm run dev:frontend`. Antes de lanzar el frontend, revisa que no haya otro `next dev` en el puerto 3000: dos instancias corrompen `.next`.

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

El backend simulado cubre las fases 1 y 2; las funciones de las fases 3 y 4 necesitan el backend real.

> El seed carga el catálogo real de la UACH (licenciaturas, ingenierías y la preparatoria con sus áreas). Las **materias** de cada carrera aún no se han capturado.

## Con Docker

```bash
cp .env.example .env        # completa los valores
npm run docker:up
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

La plataforma queda en `http://localhost` (puerto `NGINX_PORT`). MySQL y Redis solo escuchan en `127.0.0.1`. Compose está ajustado a un servidor de 4 GB (límites de memoria, MySQL afinado).

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión de Prisma a MySQL |
| `MYSQL_*` | Credenciales con las que Docker crea la base de datos (`MYSQL_HOST_PORT`: puerto en el host) |
| `REDIS_URL` | Conexión a Redis |
| `JWT_SECRET` | Secreto de firma de sesiones (mínimo 32 caracteres aleatorios) |
| `JWT_EXPIRES_IN` | Duración de cada token (por ejemplo `8h`); se renueva con la actividad |
| `SESSION_MAX_DAYS` | Límite absoluto de una sesión desde que se inició (por omisión 14) |
| `COOKIE_SECURE` | `true` en producción con HTTPS |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma |
| `STORAGE_PATH` | Carpeta de archivos (por defecto `../storage` desde `backend/`) |
| `FILES_ACCEL_REDIRECT` | `true` cuando Nginx entrega los archivos |
| `API_INTERNAL_URL` | URL del backend vista por el servidor de Next.js |
| `PORT`, `FRONTEND_PORT`, `BACKEND_PORT`, `NGINX_PORT` | Puertos de cada servicio |
| `SEED_ADMIN_*` | Administrador inicial del seed (`SEED_ADMIN_USERNAME` es su número de empleado; contraseña de 12+ caracteres) |
| `OBSERVE_APP_*` | Telemetría opcional de NestJS Observe (sin configurar no envía nada) |

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
| `npm run prisma:seed` | Carga catálogo, periodos y administrador inicial |
| `npm run prisma:studio` | Explorador visual de la base de datos |
| `npm --workspace=backend run test` | Pruebas unitarias del backend (110) |
| `npm --workspace=backend run test:e2e` | Pruebas de punta a punta contra la base de pruebas (23, ver abajo) |
| `npm --workspace=backend run lint` / `npm --workspace=frontend run lint` | Análisis estático |
| `node frontend/scripts/generate-icons.mjs` | Regenera los íconos de la app instalable |

### Pruebas e2e

Recorren contra MySQL real: cuentas y sesiones, clases, tareas, cuestionarios, avisos (`flows.e2e-spec.ts`) y rúbricas, condiciones, entregas duplicadas, pesos y final, progreso y riesgo, calificación aprobatoria, reutilizar clase, periodo cerrado, bitácora y búsqueda (`progress.e2e-spec.ts`). **Nunca usan la base de desarrollo:** usan `DATABASE_URL_TEST` o la misma URL con `_test` al final (`uach_platform_test`), y se niegan a correr en una base que no termine en `_test`. Cada ejecución vacía esa base y aplica las migraciones.

Crear la base de pruebas una sola vez (con Docker):

```bash
docker exec uach_mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS uach_platform_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON uach_platform_test.* TO \"$MYSQL_USER\"@\"%\";"'
npm --workspace=backend run test:e2e
```

> Al probar a mano contra la base de desarrollo, recuerda el límite de 5 inicios de sesión o cambios de contraseña por minuto por IP (responde 429).

## Estructura

```text
Plataforma_UACH/
├── backend/
│   ├── prisma/              # schema.prisma, migrations/ y seed.ts
│   ├── src/
│   │   ├── academic/        # Niveles, carreras, materias y periodos
│   │   ├── activity/        # Bitácora de actividad (registro, consulta y purga)
│   │   ├── auth/            # Login, logout, sesión, cambio de contraseña
│   │   ├── classwork/       # Tareas, rúbricas, entregas, calificaciones, progreso y calendario
│   │   ├── common/          # Decoradores, guards y tipos compartidos
│   │   ├── config/          # Validación de variables de entorno
│   │   ├── courses/         # Clases, inscripción, reutilizar, CourseAccessService y AvailabilityService
│   │   ├── dashboard/       # Resúmenes de inicio por rol
│   │   ├── database/        # PrismaService
│   │   ├── files/           # Subidas y descarga protegida de archivos
│   │   ├── groups/          # Grupos de estudio
│   │   ├── materials/       # Temas y material de la clase
│   │   ├── notifications/   # Notificaciones dentro de la plataforma
│   │   ├── profile/         # Perfil y foto
│   │   ├── quizzes/         # Cuestionarios y encuestas
│   │   ├── reports/         # Reportes por clase y CSV
│   │   ├── repository/      # Repositorio institucional con moderación
│   │   ├── search/          # Búsqueda global
│   │   ├── stream/          # Tablón: publicaciones y comentarios
│   │   └── users/           # Administración de usuarios e importación de alumnos
│   └── test/                # Pruebas e2e
├── frontend/
│   ├── public/icons/        # Íconos de la app instalable
│   ├── scripts/             # generate-icons.mjs
│   └── src/
│       ├── app/             # Rutas: (auth), (cuenta), (dashboard), (admin), (info), manifest.ts
│       ├── components/      # Por módulo: courses/, classwork/, quizzes/, activity/, stream/,
│       │                    # materials/, repository/, groups/, dashboard/, admin/, layout/, ui/…
│       ├── lib/             # api, session, server-session, navigation, tipos por módulo
│       └── middleware.ts    # Protección de rutas por rol
├── scripts/                 # Backend simulado (mock-*.mjs) y dev-demo.mjs
├── docs/                    # Avance, bitácora, reportes y análisis inicial
├── nginx/nginx.conf
├── storage/                 # Archivos de usuarios (fuera de Git)
└── docker-compose.yml
```

## Siguientes pasos

- **Instalar en el servidor Debian** (4 GB): swap, respaldos automáticos de la BD y de `storage/`, HTTPS con `COOKIE_SECURE=true`.
- **Cargar los datos oficiales:** materias de cada carrera, periodos y la importación de alumnos.
- **Revisión jurídica** del aviso de privacidad (hoy es un borrador).
- El resto de pendientes, con prioridad, está en [`docs/AVANCE.md` › Lo que falta](docs/AVANCE.md#lo-que-falta).
