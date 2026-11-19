# Avance del proyecto — Plataforma UACH

> Última actualización: 2026-11-18
>
> Leyenda: ✅ Hecho · 🔄 En proceso · ⬜ Pendiente · ❓ Por decidir
>
> Hoja de ruta completa y justificación: [`ANALISIS_VENTANAS_Y_PROPUESTA.md`](ANALISIS_VENTANAS_Y_PROPUESTA.md)

## Resumen

| Fase | Descripción | Estado |
| --- | --- | --- |
| Fase 0 | Bases: seguridad, sesión, layouts, infraestructura | ✅ Completada |
| Fase 1 | MVP tipo Classroom (cursos, tareas, calificaciones) | 🔄 Siguiente (preparación) |
| Fase 2 | Valor institucional (calendario, repositorio, administración) | ⬜ Pendiente |
| Fase 3 | Funciones tipo Moodle (cuestionarios, asistencia, foros…) | ⬜ Pendiente |

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

### Backend (NestJS + Prisma)
- ✅ Modelo de datos base en `schema.prisma`: Faculty, Career, Subject, User, Course, Enrollment, Post, Assignment, Submission, Resource, StudyGroup, AccessLog.
- ✅ Seed con catálogos académicos y usuario administrador inicial.
- ✅ Registro (solo alumnos), login, logout y `GET /auth/me`.
- ✅ Catálogo público de facultades y carreras.
- ✅ Descarga protegida de archivos de `storage/` con permisos (`X-Accel-Redirect`).
- ✅ Seguridad: validación de variables de entorno al arrancar, cookie `httpOnly`, guards globales (throttler → JWT → roles), CORS restringido.

### Frontend (Next.js)
- ✅ Layouts por grupo: `(auth)`, `(dashboard)`, `(admin)`, `(seguridad)`.
- ✅ Protección de rutas por rol (`middleware.ts`) y navegación según rol.
- ✅ Cliente HTTP y validación de sesión del lado del servidor.
- ✅ Ventanas funcionales: inicio de sesión y registro.
- ✅ Páginas de error: 404, error inesperado y acceso denegado.
- ✅ Páginas restantes creadas con aviso "módulo pendiente".

---

## Fase 1 — MVP tipo Classroom 🔄

### Preparación (antes de empezar)
- ⬜ Crear y versionar la migración inicial de Prisma (`backend/prisma/migrations` no existe aún).
- ❓ Decidir si el rol `SECURITY` (control de accesos) entra en el alcance o se retira.
- ❓ Elegir servicio de correo (necesario para recuperar contraseña y notificaciones por correo).

### Entregables
| # | Entregable | Backend | Frontend | Estado |
| --- | --- | --- | --- | --- |
| 1 | **Cursos**: crear (docente), listar, código de invitación, unirse por código, personas | ⬜ | ⬜ `/cursos`, `/cursos/[cursoId]` | ⬜ |
| 2 | **Validación de pertenencia al curso** en el backend (no solo rol global) | ⬜ | — | ⬜ |
| 3 | **Tablón** con publicaciones y comentarios | ⬜ (falta modelo `Comment`) | ⬜ `/cursos/[cursoId]` | ⬜ |
| 4 | **Tareas**: crear, editar, fecha de entrega | ⬜ | ⬜ `/cursos/[cursoId]/tareas` | ⬜ |
| 5 | **Entregas** con adjuntos (validar tipo y tamaño de archivo, `sha256`) | ⬜ | ⬜ `/tareas/[tareaId]`, `/entregas` | ⬜ |
| 6 | **Calificar y devolver** entregas | ⬜ | ⬜ | ⬜ |
| 7 | **Calificaciones**: vista alumno, libro del docente, exportación | ⬜ | ⬜ `/cursos/[cursoId]/calificaciones` | ⬜ |
| 8 | **Notificaciones** dentro de la plataforma | ⬜ (falta modelo) | ⬜ `/notificaciones` | ⬜ |
| 9 | **Dashboard** con resumen de cursos y pendientes | — | ⬜ `/dashboard` | ⬜ |
| 10 | **Perfil** (datos y avatar) | ⬜ | ⬜ `/perfil` | ⬜ |
| 11 | **Recuperar contraseña** por correo | ⬜ | 🔄 página con aviso temporal | ⬜ |

---

## Fase 2 — Valor institucional ⬜

- ⬜ Calendario de entregas.
- ⬜ Temas/unidades y material del curso (`/cursos/[cursoId]/recursos`).
- ⬜ Repositorio institucional con búsqueda y moderación (`/repositorio`).
- ⬜ Grupos de estudio con miembros (`/grupos-estudio`).
- ⬜ Administración: usuarios, catálogos, periodos, cursos y reportes (`/administracion/*`).

## Fase 3 — Funciones tipo Moodle ⬜

- ⬜ Cuestionarios / exámenes.
- ⬜ Asistencia.
- ⬜ Foros y mensajería.
- ⬜ Rúbricas.
- ⬜ Videoclases.
- ⬜ Notificaciones por correo.
- ⬜ Control de accesos (rol `SECURITY`) y auditoría — sujeto a la decisión de alcance.

---

## Mejoras técnicas pendientes

- ⬜ Reemplazar `GET /` ("Hello World!") por un endpoint `/health` real.
- ⬜ Refresh token para sesiones largas.
- ⬜ Pruebas automatizadas de los módulos de la fase 1.
