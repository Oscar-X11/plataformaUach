# Avance del proyecto — Plataforma UACH

> Última actualización: 2026-11-22
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
| Fase 1 | MVP tipo Classroom (cursos, tareas, calificaciones) | ✅ Completa y probada con la base de datos real |
| Fase 2 | Valor institucional (calendario, repositorio, administración) | ✅ Completa y probada con la base de datos real |
| Fase 3 | Evaluación y seguimiento tipo Moodle (cuestionarios, asistencia, rúbricas, foros…) | ⬜ Pendiente |
| Fase 4 | Actividades y herramientas complementarias de Moodle (taller, wiki, insignias, reutilizar cursos…) | ⬜ Pendiente |

**Siguiente paso:** instalar en el servidor Debian y empezar la Fase 3 por cuestionarios y asistencia.

### Estado del entorno

| Elemento | Estado |
| --- | --- |
| Base de datos MySQL | ✅ Local en Docker (puerto 3307), migraciones aplicadas. Probada de punta a punta el 2026-11-20. |
| Backend simulado (`npm run dev:demo`) | ✅ Permite recorrer toda la plataforma sin base de datos. |
| Pruebas del backend | ✅ 77 tests (autenticación, cursos, tareas, entregas, archivos, calificaciones, tablón, usuarios, material, repositorio, grupos y reportes). |
| Despliegue (Docker / servidor) | 🔄 Compose ajustado a un servidor de 4 GB (límites de memoria, MySQL afinado). Falta instalarlo en el servidor Debian. |

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
- ✅ Modelo de datos en `schema.prisma`: Faculty, Career, Subject, User, Course, Enrollment, Post, Comment, Assignment, Submission, SubmissionFile, Notification, Resource, CourseTopic, CourseMaterial, StudyGroup, StudyGroupMember.
- ✅ Migración inicial única `20261120120000_init` (sustituye a las tres anteriores), con tablas y columnas en español.
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

## Fase 1 — MVP tipo Classroom ✅

### Preparación ✅
- ✅ Migración inicial de Prisma versionada. Se aplicará con `npm run prisma:deploy` cuando exista la base de datos.
- ✅ Alcance definido: sin rol `SECURITY` y sin correo (ver *Decisiones de alcance*).

### Entregables
| # | Entregable | Backend | Frontend | Estado |
| --- | --- | --- | --- | --- |
| 1 | **Cursos**: crear (docente), listar, código de invitación, unirse por código, personas | ✅ módulo `courses` | ✅ `/cursos`, `/cursos/[cursoId]`, `/cursos/[cursoId]/personas` | ✅ (falta probar con BD real) |
| 2 | **Validación de pertenencia al curso** en el backend (no solo rol global) | ✅ `CourseAccessService` | — | ✅ |
| 3 | **Tablón** con publicaciones y comentarios | ✅ módulo `stream` | ✅ `/cursos/[cursoId]` | ✅ |
| 4 | **Tareas**: crear, editar, fecha de entrega | ✅ módulo `classwork` | ✅ `/cursos/[cursoId]/tareas` | ✅ |
| 5 | **Entregas** con adjuntos (validar tipo y tamaño de archivo, `sha256`) | ✅ (contenido real verificado, hasta 10 archivos de 10 MB; se suben a disco, no a RAM) | ✅ `/tareas/[tareaId]`, `/entregas` | ✅ |
| 6 | **Calificar y devolver** entregas | ✅ | ✅ panel de revisión en la tarea | ✅ |
| 7 | **Calificaciones**: vista alumno, libro del docente, exportación | ✅ (CSV para Excel) | ✅ `/cursos/[cursoId]/calificaciones` | ✅ |
| 8 | **Notificaciones** dentro de la plataforma | ✅ módulo `notifications` | ✅ `/notificaciones` y campana | ✅ |
| 9 | **Dashboard** con resumen de cursos y pendientes | ✅ `/dashboard/student`, `/teacher`, `/admin` | ✅ alumno, docente y admin | ✅ |
| 10 | **Perfil** (datos y avatar) | ✅ módulo `profile` | ✅ `/perfil` | ✅ |
| 11 | **Recuperar contraseña** (restablece un administrador) | ✅ | ✅ `/recuperar-contrasena`, `/cambiar-contrasena`, `/administracion/usuarios` | ✅ |

Todos los entregables se probaron con el backend simulado; falta repetir las pruebas con la base de datos real.

---

## Fase 2 — Valor institucional ✅

- ✅ Calendario de entregas (`/calendario`): mes en cuadrícula y agenda en móvil.
- ✅ Temas/unidades y material del curso (`/cursos/[cursoId]/recursos`): archivos y enlaces, solo para miembros.
- ✅ Repositorio institucional con búsqueda y moderación (`/repositorio`); archivo subido o enlace de Google Drive.
- ✅ Vista previa de PDF, imágenes y enlaces de Drive en material y repositorio.
- ✅ Grupos de estudio con miembros y cupo (`/grupos-estudio`).
- ✅ Reportes por curso con exportación CSV (`/administracion/reportes`).
- ✅ Administración: usuarios, panel con métricas y reportes.
- ✅ Catálogos (`/administracion/catalogos`): facultades → carreras → materias, con alta, edición y borrado (solo de lo que no se usa).
- ✅ Periodos (`/administracion/periodos`): alta con fechas, periodo actual, cerrar y reabrir. Los cursos solo se crean en periodos abiertos.
- ✅ Cursos (`/administracion/cursos`): búsqueda, filtro por periodo y cambiar el docente (con aviso al nuevo docente).
- ✅ Carrera de los alumnos: al importar el Excel o en bloque desde la lista de usuarios (filtro «sin carrera»).

## Fase 3 — Evaluación y seguimiento tipo Moodle ⬜

Lo que más usan docentes y alumnos en Moodle. Orden sugerido por valor:

| # | Funcionalidad | Qué incluye | Notas para el servidor de 4 GB |
| --- | --- | --- | --- |
| 1 | **Cuestionarios / exámenes** | Banco de preguntas por curso (opción múltiple, verdadero/falso, respuesta corta, numérica, relacionar, ensayo); intentos, tiempo límite, ventana de fechas, orden aleatorio, calificación automática y revisión manual del ensayo. | Calificar en el backend; sin cálculos pesados. |
| 2 | **Asistencia** | Sesiones por curso, pase de lista (presente, retardo, falta, justificada), código o QR que el alumno captura en clase, porcentaje por alumno y exportación CSV. | Ligero. |
| 3 | **Rúbricas y guías de evaluación** | Criterios con niveles y puntos; el docente califica una tarea marcando niveles; el alumno ve la rúbrica antes y después. | Ligero. |
| 4 | **Libro de calificaciones avanzado** | Categorías con ponderación (tareas 40 %, exámenes 60 %…), escalas y letras, calificación final del periodo, ocultar/bloquear notas. | Amplía lo que ya existe. |
| 5 | **Foros por curso** | Foros con temas e hilos, suscripción, foro de preguntas y respuestas, calificar participación. | Más estructurado que el tablón. |
| 6 | **Mensajería directa** | Conversaciones docente ↔ alumno y entre compañeros del curso, avisos de mensaje nuevo. | Consultas periódicas (como la campana), sin WebSockets al principio. |
| 7 | **Grupos dentro del curso** | Equipos/secciones, tareas por equipo (una entrega por equipo), material visible por grupo. | Ligero. |
| 8 | **Finalización y progreso** | Marcar actividades como completadas, barra de progreso del curso, condiciones (ver material, entregar, aprobar con X). | Ligero. |
| 9 | **Acceso condicional** | Mostrar una actividad solo después de una fecha, de completar otra o de alcanzar una calificación. | Depende de #8. |
| 10 | **Videoclases** | Enlace a Meet, Zoom o Jitsi público en la sesión del curso y en el calendario. | **No** hospedar Jitsi en este servidor. |
| 11 | **Bitácora de actividad** | Quién vio o hizo qué (accesos, entregas, cambios de calificación) para docentes y administradores. | Purgar registros viejos para no llenar el disco. |

## Fase 4 — Actividades y herramientas complementarias de Moodle ⬜

| Grupo | Funcionalidades |
| --- | --- |
| **Actividades** | Taller (evaluación entre pares), wiki colaborativa, glosario del curso, lección con ramificaciones, libro (páginas de contenido), consulta (votación rápida), encuesta / retroalimentación anónima, base de datos de registros. |
| **Contenido interactivo** | H5P (contenido interactivo) y paquetes SCORM / IMS. Valorar el costo en disco y RAM antes de incluirlos. |
| **Reconocimiento** | Insignias por logros y competencias / resultados de aprendizaje ligados a actividades. |
| **Gestión de cursos** | Reutilizar un curso en un periodo nuevo (copiar temas, material y tareas sin alumnos), plantillas de curso, archivar cursos de periodos cerrados, respaldo y restauración de un curso. |
| **Seguimiento** | Informes de participación por curso, alumnos en riesgo (faltas y entregas atrasadas), detección de entregas duplicadas (mismo `sha256`). |
| **Experiencia** | Búsqueda global (cursos, recursos y personas), calendario con eventos propios, instalación como app (PWA), centro de ayuda / preguntas frecuentes y aviso de privacidad. |

Fuera del alcance por las decisiones actuales: avisos por correo (no hay correo institucional) y el rol `SECURITY`.

---

## Mejoras técnicas pendientes

- ⬜ Crear la base de datos MySQL, aplicar la migración (`npm run prisma:deploy`), cargar el seed y probar el backend real.
- ⬜ Reemplazar el catálogo de ejemplo del seed por las facultades, carreras y materias oficiales.
- ⬜ Reemplazar `GET /` ("Hello World!") por un endpoint `/health` real.
- ⬜ Refresh token para sesiones largas.
- ⬜ Invalidar las sesiones abiertas cuando un administrador desactiva una cuenta o restablece su contraseña.
- ✅ Subidas escritas a disco (no a RAM) y pantallas de carga al cambiar de pestaña.
- ⬜ Swap y respaldos automáticos en el servidor Debian.
- 🔄 Pruebas automatizadas: unitarias de todos los módulos (77); faltan pruebas e2e con base de datos.
