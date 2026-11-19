# Avance del proyecto — Plataforma UACH

> Última actualización: 2026-11-19
>
> Leyenda: ✅ Hecho · 🔄 En proceso · ⬜ Pendiente · ❓ Por decidir
>
> Hoja de ruta completa y justificación: [`ANALISIS_VENTANAS_Y_PROPUESTA.md`](ANALISIS_VENTANAS_Y_PROPUESTA.md) (anterior a las decisiones del 2026-11-19: aún menciona el rol `SECURITY` y el correo).
>
> Historial día por día (qué se hizo, decisiones y pendientes): [`BITACORA.md`](BITACORA.md)

## Resumen

| Fase | Descripción | Estado |
| --- | --- | --- |
| Fase 0 | Bases: seguridad, sesión, layouts, infraestructura | ✅ Completada |
| Fase 1 | MVP tipo Classroom (cursos, tareas, calificaciones) | 🔄 En desarrollo — 2 de 11 entregables listos, 2 en proceso |
| Fase 2 | Valor institucional (calendario, repositorio, administración) | ⬜ Pendiente |
| Fase 3 | Funciones tipo Moodle (cuestionarios, asistencia, foros…) | ⬜ Pendiente |

**Siguiente paso:** entregables 4 y 5 (tareas y entregas con archivos adjuntos).

### Estado del entorno

| Elemento | Estado |
| --- | --- |
| Base de datos MySQL | ⬜ No existe todavía. La migración ya está lista para aplicarse. |
| Backend simulado (`npm run dev:demo`) | ✅ Permite recorrer toda la plataforma sin base de datos. |
| Pruebas del backend | ✅ 31 tests (autenticación, contraseña temporal, archivos y cursos). |
| Despliegue (Docker / servidor) | ⬜ Sin probar con datos reales. |

---

## Decisiones de alcance

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | ✅ Se retira el rol `SECURITY` (control de accesos). Se eliminaron su modelo `AccessLog`, las rutas y la navegación. |
| 2026-11-19 | ✅ No se usa correo electrónico: los alumnos no tienen correo institucional. Todos los avisos viven dentro de la plataforma. |
| 2026-11-19 | ✅ Se inicia sesión con **matrícula** (alumnos) o **número de empleado** (docentes y administradores), guardados en el campo `User.username`. |
| 2026-11-19 | ✅ La contraseña olvidada la restablece un **administrador** con una contraseña temporal que el usuario debe cambiar al entrar. |
| 2026-11-19 | ✅ Privacidad en cursos: los alumnos no ven las matrículas de sus compañeros ni el código de invitación. |
| — | ❓ Cómo impedir que alguien se registre con la matrícula de otro alumno: cargar la lista oficial de matrículas o que un administrador apruebe cada cuenta nueva. |

---

## Fase 0 — Bases ✅

### Infraestructura y repositorio
- ✅ Monorepo con npm workspaces (`backend/`, `frontend/`).
- ✅ Docker Compose con MySQL, Redis, backend, frontend y Nginx.
- ✅ Dockerfiles multi-stage para backend y frontend.
- ✅ Nginx como proxy (`/api/` → NestJS, resto → Next.js).
- ✅ `.env.example` documentado; `.env` fuera de Git.
- ✅ Repositorio Git único en la raíz, publicado en GitHub.
- ✅ Limpieza de la estructura (archivos de plantilla y scripts obsoletos eliminados, `.gitattributes` global).
- ✅ Backend simulado (`scripts/mock-api.mjs`) y `npm run dev:demo` para desarrollar sin base de datos.

### Backend (NestJS + Prisma)
- ✅ Modelo de datos base en `schema.prisma`: Faculty, Career, Subject, User, Course, Enrollment, Post, Assignment, Submission, Resource, StudyGroup.
- ✅ Migración inicial versionada (`prisma/migrations/20261119000000_init`).
- ✅ Seed con catálogos académicos de ejemplo y el administrador inicial (`SEED_ADMIN_USERNAME`).
- ✅ Registro (solo alumnos, con matrícula), login, logout y `GET /auth/me`.
- ✅ Cambio de contraseña (`POST /auth/change-password`) y restablecimiento por un administrador (`POST /users/:id/reset-password`).
- ✅ Contraseña temporal: el backend bloquea con 403 todo excepto las rutas de cuenta hasta que se cambie.
- ✅ Catálogo público de facultades y carreras.
- ✅ Descarga protegida de archivos de `storage/` con permisos (`X-Accel-Redirect`).
- ✅ Seguridad: validación de variables de entorno al arrancar, cookie `httpOnly`, guards globales (throttler → JWT → roles), CORS restringido.

### Frontend (Next.js)
- ✅ Layouts por grupo: `(auth)`, `(cuenta)`, `(dashboard)`, `(admin)`.
- ✅ Protección de rutas por rol (`middleware.ts`) y navegación según el rol.
- ✅ Cliente HTTP y validación de sesión del lado del servidor (`serverApi`).
- ✅ Ventanas funcionales: inicio de sesión, registro, recuperar contraseña (instrucciones) y cambiar contraseña.
- ✅ Sistema visual documentado (`frontend/DESIGN.md`) y contexto de producto (`frontend/PRODUCT.md`).
- ✅ Páginas de error: 404, error inesperado y acceso denegado.
- ✅ Páginas restantes creadas con aviso "módulo pendiente".

---

## Fase 1 — MVP tipo Classroom 🔄

### Preparación ✅
- ✅ Migración inicial de Prisma versionada. Se aplicará con `npm run prisma:deploy` cuando exista la base de datos.
- ✅ Alcance definido: sin rol `SECURITY` y sin correo (ver *Decisiones de alcance*).

### Entregables
| # | Entregable | Backend | Frontend | Estado |
| --- | --- | --- | --- | --- |
| 1 | **Cursos**: crear (docente), listar, código de invitación, unirse por código, personas | ✅ módulo `courses` | ✅ `/cursos`, `/cursos/[cursoId]`, `/cursos/[cursoId]/personas` | ✅ (falta probar con BD real) |
| 2 | **Validación de pertenencia al curso** en el backend (no solo rol global) | ✅ `CourseAccessService` | — | ✅ |
| 3 | **Tablón** con publicaciones y comentarios | ⬜ (falta modelo `Comment`) | ⬜ `/cursos/[cursoId]` | ⬜ |
| 4 | **Tareas**: crear, editar, fecha de entrega | ⬜ | ⬜ `/cursos/[cursoId]/tareas` | ⬜ **Siguiente** |
| 5 | **Entregas** con adjuntos (validar tipo y tamaño de archivo, `sha256`) | ⬜ | ⬜ `/tareas/[tareaId]`, `/entregas` | ⬜ **Siguiente** |
| 6 | **Calificar y devolver** entregas | ⬜ | ⬜ | ⬜ |
| 7 | **Calificaciones**: vista alumno, libro del docente, exportación | ⬜ | ⬜ `/cursos/[cursoId]/calificaciones` | ⬜ |
| 8 | **Notificaciones** dentro de la plataforma | ⬜ (falta modelo) | ⬜ `/notificaciones` | ⬜ |
| 9 | **Dashboard** con resumen de cursos y pendientes | ⬜ endpoint de resumen | ✅ `/dashboard` con datos de ejemplo | 🔄 |
| 10 | **Perfil** (datos y avatar) | ⬜ | ⬜ `/perfil` | ⬜ |
| 11 | **Recuperar contraseña** (restablece un administrador) | ✅ | ✅ `/recuperar-contrasena`, `/cambiar-contrasena`; ⬜ botón en `/administracion/usuarios` | 🔄 |

---

## Fase 2 — Valor institucional ⬜

- ⬜ Calendario de entregas.
- ⬜ Temas/unidades y material del curso (`/cursos/[cursoId]/recursos`).
- ⬜ Repositorio institucional con búsqueda y moderación (`/repositorio`).
- ⬜ Grupos de estudio con miembros (`/grupos-estudio`).
- ⬜ Administración: usuarios (alta de docentes y administradores, restablecer contraseñas), catálogos, periodos, cursos y reportes (`/administracion/*`).

## Fase 3 — Funciones tipo Moodle ⬜

- ⬜ Cuestionarios / exámenes.
- ⬜ Asistencia.
- ⬜ Foros y mensajería.
- ⬜ Rúbricas.
- ⬜ Videoclases.

---

## Mejoras técnicas pendientes

- ⬜ Crear la base de datos MySQL, aplicar la migración (`npm run prisma:deploy`), cargar el seed y probar el backend real.
- ⬜ Reemplazar el catálogo de ejemplo del seed por las facultades, carreras y materias oficiales.
- ⬜ Reemplazar `GET /` ("Hello World!") por un endpoint `/health` real.
- ⬜ Refresh token para sesiones largas.
- ⬜ Invalidar las sesiones abiertas cuando un administrador restablece una contraseña.
- 🔄 Pruebas automatizadas de la fase 1: hechas para autenticación y cursos; faltan los módulos siguientes y las pruebas e2e con base de datos.
