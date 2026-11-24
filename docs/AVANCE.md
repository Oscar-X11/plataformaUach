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
| Fase 3 | Evaluación y seguimiento tipo Moodle (cuestionarios, rúbricas, libro de calificaciones, progreso…) | ✅ Completa y probada (2026-11-23) |
| Fase 4 | Herramientas complementarias (reutilizar cursos, seguimiento, búsqueda, PWA…) | 🔄 Lo principal listo: reutilizar clase, seguimiento, búsqueda, app instalable, ayuda y privacidad |

**Siguiente paso:** revisar con el área jurídica el borrador del aviso de privacidad e instalar en el servidor Debian cuando se quiera usar con personas reales.

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
| 2026-11-23 | ✅ No se implementa asistencia (pase de lista). |
| 2026-11-23 | ✅ No se implementan foros, mensajería directa, grupos dentro del curso, las actividades extra de Moodle (taller, wiki, glosario, lección, libro, consulta, retroalimentación anónima, base de datos), H5P/SCORM ni insignias/competencias. |
| 2026-11-23 | ✅ No se implementan videollamadas ni videoclases. Para reuniones en línea, el docente o el grupo de estudio pega el enlace en «Lugar y horario». |
| 2026-11-23 | ✅ Licenciaturas e ingenierías son **cuatrimestrales**; el bachillerato, **semestral**. |
| 2026-11-23 | ✅ En la web no se usa la palabra «facultad»: los grupos de carreras se llaman **nivel** (Licenciaturas, Ingenierías, Preparatoria). |
| 2026-11-23 | ✅ **No hay registro abierto.** Las cuentas de alumnos solo se crean al importar el Excel oficial; así nadie puede usar la matrícula de otro. |
| 2026-11-23 | ✅ Cuestionarios estilo Google Forms: exámenes calificados y encuestas, un solo intento, y sus calificaciones van **aparte** de las de las tareas. |

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
- ✅ Login, logout y `GET /auth/me`. (El registro abierto se retiró el 2026-11-23: las cuentas se crean al importar el Excel.)
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
- ✅ Lugar y horario del curso: texto libre del docente (salón, horario o enlace de reunión) en el encabezado del curso; los enlaces se abren con un clic. También en los grupos de estudio.
- ✅ Reportes por curso con exportación CSV (`/administracion/reportes`).
- ✅ Administración: usuarios, panel con métricas y reportes.
- ✅ Carreras (`/administracion/carreras`, antes «Catálogos»): niveles → carreras → materias, con alta, edición y borrado (solo de lo que no se usa). En la web no se usa la palabra «facultad».
- ✅ Periodos (`/administracion/periodos`): alta con fechas, periodo actual, cerrar y reabrir. Los cursos solo se crean en periodos abiertos.
- ✅ Cursos (`/administracion/cursos`): búsqueda, filtro por periodo y cambiar el docente (con aviso al nuevo docente).
- ✅ Carrera de los alumnos: al importar el Excel o en bloque desde la lista de usuarios (filtro «sin carrera»).

## Fase 3 — Evaluación y seguimiento tipo Moodle ⬜

Lo que más usan docentes y alumnos en Moodle. Orden sugerido por valor:

| # | Funcionalidad | Qué incluye | Notas para el servidor de 4 GB |
| --- | --- | --- | --- |
| 1 | ✅ **Cuestionarios y encuestas** | Hecho (estilo Google Forms): opción múltiple, casillas, verdadero/falso, respuesta corta y párrafo; fechas de apertura y cierre, tiempo límite con envío automático, un intento, guardado automático, calificación automática, revisión manual, cuándo ve el alumno su resultado, resumen por pregunta y CSV. Las calificaciones van aparte. **No incluye** (decisión del usuario): varios intentos ni orden aleatorio. | Califica el backend; sin cálculos pesados. |
| 2 | ~~**Asistencia**~~ | **No se implementa** (decisión del 2026-11-23). | — |
| 3 | ✅ **Rúbricas** | Hecho: criterios con niveles y puntos (hasta 20 criterios y 6 niveles); la tarea vale la suma del mejor nivel de cada criterio; al calificar se eligen niveles y la nota se calcula sola; el alumno ve la rúbrica antes y su nivel después. Una rúbrica ya usada no se cambia. | Ligero. |
| 4 | ✅ **Libro de calificaciones avanzado** | Hecho: tareas y cuestionarios con pesos por clase (60/40 por omisión), calificación final, aprueba según el nivel (preparatoria 6, licenciatura e ingeniería 7, editable en Carreras), CSV completo y notas bloqueadas con el periodo cerrado. **No incluye:** escalas con letras. | Amplía lo que ya existe. |
| 5 | ~~**Foros por curso**~~ | **No se implementa** (decisión del 2026-11-23). ~~Foros con temas e hilos, suscripción, foro de preguntas y respuestas, calificar participación.~~ | — |
| 6 | ~~**Mensajería directa**~~ | **No se implementa** (decisión del 2026-11-23). ~~Conversaciones docente ↔ alumno y entre compañeros del curso, avisos de mensaje nuevo.~~ | — |
| 7 | ~~**Grupos dentro del curso**~~ | **No se implementa** (decisión del 2026-11-23). ~~Equipos/secciones, tareas por equipo (una entrega por equipo), material visible por grupo.~~ | — |
| 8 | ✅ **Finalización y progreso** | Hecho: completada = tarea entregada, cuestionario enviado o material abierto; barra de progreso del alumno y pestaña «Seguimiento» del docente. | Ligero. |
| 9 | ✅ **Acceso condicional** | Hecho: visible desde una fecha o después de completar otra tarea o cuestionario; se rechazan ciclos; lo bloqueado no aparece en «Lo que sigue», el calendario ni la búsqueda del alumno. **No incluye:** condición por calificación mínima. | Depende de #8. |
| 10 | ~~**Videoclases**~~ | **No se implementa** (decisión del 2026-11-23). Los cursos y grupos de estudio tienen un campo libre de lugar y horario donde se puede pegar un enlace de Meet o Zoom. | — |
| 11 | ✅ **Bitácora de actividad** | Hecho: inicios de sesión, cuentas, importaciones, clases, entregas, calificaciones, publicaciones, material, pesos y periodos. Página en administración (filtros y búsqueda) y por clase en «Seguimiento». | Se purgan solos los registros de más de 180 días. |

## Fase 4 — Actividades y herramientas complementarias de Moodle ⬜

| Grupo | Funcionalidades |
| --- | --- |
| ~~**Actividades**~~ | **No se implementa** (decisión del 2026-11-23). ~~Taller (evaluación entre pares), wiki colaborativa, glosario del curso, lección con ramificaciones, libro (páginas de contenido), consulta (votación rápida), encuesta / retroalimentación anónima, base de datos de registros.~~ |
| ~~**Contenido interactivo**~~ | **No se implementa** (decisión del 2026-11-23). ~~H5P (contenido interactivo) y paquetes SCORM / IMS.~~ |
| ~~**Reconocimiento**~~ | **No se implementa** (decisión del 2026-11-23). ~~Insignias por logros y competencias / resultados de aprendizaje ligados a actividades.~~ |
| **Gestión de cursos** | ✅ Reutilizar una clase en un periodo nuevo (temas, material con archivos, tareas con rúbrica sin fecha y cuestionarios como borrador; sin alumnos). Pendiente: plantillas, archivar cursos de periodos cerrados, respaldo y restauración. |
| **Seguimiento** | ✅ Pestaña «Seguimiento» por clase: avance, vencidas, final, última actividad y alumnos en riesgo (2 o más vencidas o promedio bajo el aprobatorio); entregas con el mismo archivo (`sha256`) marcadas al calificar. |
| **Experiencia** | ✅ Búsqueda global (Ctrl+K: clases, tareas, cuestionarios, material; usuarios para la administración), app instalable (manifiesto e íconos, sin modo sin conexión), centro de ayuda (`/ayuda`) y aviso de privacidad (`/privacidad`, borrador). Pendiente: calendario con eventos propios y buscar en el repositorio desde la búsqueda global. |

Fuera del alcance por las decisiones actuales: avisos por correo (no hay correo institucional), el rol `SECURITY`, videollamadas, asistencia, foros, mensajería directa, grupos dentro del curso, las actividades extra de Moodle (taller, wiki, glosario, lección, libro, consulta, retroalimentación, base de datos), H5P/SCORM e insignias/competencias.

---

## Mejoras técnicas pendientes

- ⬜ Crear la base de datos MySQL, aplicar la migración (`npm run prisma:deploy`), cargar el seed y probar el backend real.
- ⬜ Reemplazar el catálogo de ejemplo del seed por las facultades, carreras y materias oficiales.
- ✅ Endpoint `GET /health` (BD y storage) y healthcheck del backend en Docker.
- ✅ Sesión deslizante: la cookie se renueva sola mientras el usuario está activo (cada token dura 8 h; límite absoluto `SESSION_MAX_DAYS`, 14 días). Respeta la revocación por `sessionVersion`.
- ✅ Invalidar las sesiones abiertas al desactivar una cuenta o restablecer o cambiar su contraseña (`sessionVersion`).
- ✅ Subidas escritas a disco (no a RAM) y pantallas de carga al cambiar de pestaña.
- ⬜ Swap y respaldos automáticos en el servidor Debian.
- ✅ Pruebas automatizadas: 102 unitarias y 9 e2e contra una base de pruebas aparte (`npm --workspace=backend run test:e2e`).
