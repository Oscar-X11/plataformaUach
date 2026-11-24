# Plataforma UACH — Análisis de ventanas y evaluación de la propuesta

> **Documento histórico.** Describe el proyecto como estaba el 2026-11-18. Muchas propuestas ya se implementaron y otras se descartaron (rol `SECURITY`, correo, registro abierto, foros, mensajería, asistencia, videollamadas). El estado actual está en [`AVANCE.md`](AVANCE.md) y el README.

> Fecha del análisis: 2026-11-18
> Alcance: revisión de `frontend/src/app`, `backend/src`, `backend/prisma/schema.prisma`, `docker-compose.yml`, `nginx/nginx.conf`, `noREADME.md` y `reporte.txt` (este último movido a `docs/REPORTE_CONFIGURACION_INICIAL.txt`; `noREADME.md` fue eliminado).
> Objetivo del sistema: plataforma académica tipo Moodle / Google Classroom donde docentes y alumnos interactúan, imparten clases, publican material, asignan y entregan tareas y consultan calificaciones.

---

## 1. Resumen ejecutivo

| Aspecto | Estado |
| --- | --- |
| Arquitectura (Next.js 14 + NestJS 12 + Prisma + MySQL + Redis + Nginx) | ✅ Adecuada para el tipo de sistema |
| Rutas/ventanas del frontend | ⚠️ 19 rutas declaradas, **todas vacías** (`return null` / `<div />`) |
| Backend | ⚠️ Solo existe el módulo `auth` (registro, login, `me`) |
| Modelo de datos | ⚠️ Buena base, pero le faltan entidades clave de un LMS (notificaciones, temas/unidades, comentarios, adjuntos, miembros de grupos, etc.) |
| Seguridad | ❌ El registro público permite elegir rol `ADMIN` |
| Documentación | ⚠️ `noREADME.md` contradice el estado real (dice que no hay Prisma y que el dashboard está implementado) |

**Conclusión:** la propuesta va por buen camino en estructura y tecnología, pero la definición de ventanas es **incompleta para un sistema tipo Classroom/Moodle**. Faltan sobre todo las vistas del **docente** (crear curso, crear tarea, revisar y calificar entregas), la **gestión del curso** (personas, temas, configuración), el **flujo para unirse a un curso**, el **calendario** y las vistas administrativas de **catálogos académicos** (facultades, carreras, materias, periodos).

---

## 2. Roles contemplados

Definidos en `schema.prisma` (`enum UserRole`):

| Rol | Descripción | ¿Tiene ventanas propias hoy? |
| --- | --- | --- |
| `STUDENT` | Alumno: se inscribe a cursos, entrega tareas, consulta calificaciones | Comparte grupo `(dashboard)` |
| `TEACHER` | Docente: crea cursos, publica material y tareas, califica | Comparte grupo `(dashboard)` — **sin vistas específicas de docente** |
| `ADMIN` | Administración académica y de usuarios | Grupo `(admin)` |
| `SECURITY` | Control de accesos físicos (modelo `AccessLog`) | ❌ **Ninguna ventana** |

---

## 3. Inventario de ventanas actuales

Todas las rutas existen como archivo `page.tsx`, pero ninguna tiene contenido ni endpoint de backend que la alimente (salvo login/registro).

### 3.1 Grupo `(auth)` — Acceso

| Ruta | Archivo | Rol | Propósito esperado | Backend | Estado |
| --- | --- | --- | --- | --- | --- |
| `/login` | `(auth)/login/page.tsx` | Público | Inicio de sesión con correo/matrícula y contraseña | `POST /auth/login` ✅ | UI vacía |
| `/registro` | `(auth)/registro/page.tsx` | Público | Alta de cuenta | `POST /auth/register` ✅ (con fallo de seguridad, ver §6) | UI vacía |
| `/recuperar-contrasena` | `(auth)/recuperar-contrasena/page.tsx` | Público | Solicitar enlace para restablecer contraseña | ❌ No existe endpoint ni modelo de token | UI vacía |

**Contenido esperado por ventana**

- **Login:** correo o matrícula, contraseña, “recordarme”, enlace a recuperación, mensajes de error, redirección según rol.
- **Registro:** nombre completo, correo institucional, matrícula, facultad y carrera (selects), contraseña + confirmación, aceptación de aviso de privacidad. **No debe permitir elegir rol.**
- **Recuperar contraseña:** formulario de correo → pantalla de confirmación. Falta la ventana complementaria `/restablecer-contrasena?token=...`.

### 3.2 Grupo `(dashboard)` — Alumno y docente

| Ruta | Rol | Propósito esperado | Estado |
| --- | --- | --- | --- |
| `/` y `/dashboard` | Alumno/Docente | Inicio: cursos recientes, tareas próximas, avisos, accesos rápidos | `<div />` vacío |
| `/cursos` | Alumno/Docente | Listado de cursos (tarjetas estilo Classroom) | Vacío |
| `/cursos/[cursoId]` | Alumno/Docente | Detalle del curso / tablón (stream) de publicaciones | Vacío |
| `/cursos/[cursoId]/tareas` | Alumno/Docente | Trabajo de clase: lista de tareas del curso | Vacío |
| `/cursos/[cursoId]/tareas/[tareaId]` | Alumno/Docente | Detalle de tarea: instrucciones, adjuntos, entrega (alumno) | Vacío |
| `/cursos/[cursoId]/recursos` | Alumno/Docente | Material del curso | Vacío |
| `/cursos/[cursoId]/calificaciones` | Alumno/Docente | Calificaciones del curso | Vacío |
| `/entregas` | Alumno | Mis entregas (pendientes, entregadas, calificadas, atrasadas) | Vacío |
| `/grupos-estudio` | Alumno | Grupos de estudio por materia | Vacío |
| `/repositorio` | Alumno/Docente | Repositorio institucional (apuntes, guías, exámenes, libros) | Vacío |
| `/notificaciones` | Todos | Centro de notificaciones | Vacío (y **no existe modelo** `Notification`) |
| `/perfil` | Todos | Datos personales, avatar, contraseña | Vacío |

**Contenido esperado por ventana**

- **Dashboard:** saludo; tarjetas de cursos; “Próximas entregas” (7 días); últimas publicaciones; para el docente: “Por calificar” con contador.
- **Cursos:** grid de tarjetas (nombre, materia, periodo, docente, color/portada); botón **“Unirse con código”** (alumno) y **“Crear curso”** (docente); filtro activos/archivados.
- **Detalle de curso (tablón):** cabecera con nombre, periodo y código de invitación (solo docente); caja para publicar aviso; feed de publicaciones con comentarios; panel lateral “Próximas entregas”; pestañas: *Tablón · Trabajo de clase · Recursos · Personas · Calificaciones*.
- **Tareas del curso:** agrupación por tema/unidad, fecha de entrega, estado por alumno; docente: botón “Crear”.
- **Detalle de tarea:**
  - Alumno: instrucciones, archivos del docente, zona de carga, botón *Entregar / Anular entrega*, calificación y retroalimentación, comentarios privados.
  - Docente: resumen (entregadas / asignadas / atrasadas), lista de alumnos con estado, acceso a revisar cada entrega.
- **Recursos del curso:** lista de archivos/enlaces por tema, vista previa, descarga.
- **Calificaciones:**
  - Alumno: sus calificaciones por tarea y promedio.
  - Docente: libro de calificaciones (matriz alumno × tarea), edición en línea, exportar CSV/Excel.
- **Entregas:** tabla filtrable por estado y curso.
- **Grupos de estudio:** listado, crear grupo (título, materia, cupo), unirse/salir, ver miembros.
- **Repositorio:** buscador, filtros por facultad/carrera/materia/tipo, subir recurso, descarga.
- **Notificaciones:** lista con leído/no leído, marcar todas como leídas, enlace al origen.
- **Perfil:** avatar, nombre, matrícula, facultad/carrera (solo lectura), cambio de contraseña, preferencias de notificación.

### 3.3 Grupo `(admin)` — Administración

| Ruta | Rol | Propósito esperado | Estado |
| --- | --- | --- | --- |
| `/administracion` | Admin | Panel con métricas (usuarios, cursos activos, entregas, almacenamiento) | Vacío |
| `/administracion/usuarios` | Admin | CRUD de usuarios, cambio de rol/estado, importación CSV | Vacío |
| `/administracion/cursos` | Admin | Supervisión de cursos, reasignar docente, archivar | Vacío |
| `/administracion/reportes` | Admin | Reportes académicos y de uso, exportables | Vacío |

---

## 4. Ventanas que faltan

### 4.1 Críticas (sin ellas no funciona como Classroom/Moodle)

| Ventana propuesta | Ruta sugerida | Rol | Motivo |
| --- | --- | --- | --- |
| Unirse a curso por código | Modal en `/cursos` o `/cursos/unirse` | Alumno | El modelo `Course.invitation` existe, pero no hay flujo |
| Crear / editar curso | `/cursos/nuevo`, `/cursos/[cursoId]/configuracion` | Docente | No hay forma de crear cursos |
| Personas del curso | `/cursos/[cursoId]/personas` | Docente/Alumno | Ver docente(s) y alumnos, invitar, dar de baja |
| Crear / editar tarea | `/cursos/[cursoId]/tareas/nueva`, `.../[tareaId]/editar` | Docente | Puntaje, fecha, adjuntos, tema, permitir entregas tardías |
| Revisar y calificar entrega | `/cursos/[cursoId]/tareas/[tareaId]/entregas/[alumnoId]` | Docente | Visor de archivo, calificación, retroalimentación, devolver |
| Restablecer contraseña | `/restablecer-contrasena` | Público | Complemento de `/recuperar-contrasena` |
| Layouts con navegación | `(dashboard)/layout.tsx`, `(admin)/layout.tsx`, `(auth)/layout.tsx` | Todos | No existe sidebar, topbar ni protección de rutas |
| Protección de rutas por rol | `frontend/src/middleware.ts` | — | Hoy cualquiera puede abrir `/administracion` |
| Páginas de error | `not-found.tsx`, `error.tsx`, `/403` | Todos | Manejo de rutas inexistentes y accesos denegados |

### 4.2 Importantes

| Ventana propuesta | Ruta sugerida | Rol | Motivo |
| --- | --- | --- | --- |
| Calendario | `/calendario` | Alumno/Docente | Vista mensual/semanal de entregas y eventos de todos los cursos |
| Temas / unidades del curso | dentro de “Trabajo de clase” | Docente | Organizar tareas y material por unidad |
| Pendientes por calificar | `/por-calificar` (o vista docente de `/entregas`) | Docente | Equivalente a “To review” de Classroom |
| Catálogos académicos | `/administracion/facultades`, `/carreras`, `/materias`, `/periodos` | Admin | `Faculty`, `Career`, `Subject` existen en BD pero no tienen gestión |
| Detalle de grupo de estudio | `/grupos-estudio/[grupoId]` | Alumno | Miembros, chat/avisos, recursos compartidos |
| Detalle de recurso | `/repositorio/[recursoId]` | Todos | Vista previa, metadatos, descargas, reportar |
| Control de accesos | `/seguridad`, `/seguridad/bitacora` | Security/Admin | El rol `SECURITY` y `AccessLog` existen pero no tienen ninguna ventana |
| Configuración de cuenta | `/perfil/configuracion` | Todos | Preferencias de notificación, idioma, sesiones activas |

### 4.3 Deseables (fase posterior)

- **Cuestionarios / exámenes en línea** (`/cursos/[cursoId]/cuestionarios`) — característica central de Moodle.
- **Asistencia** (`/cursos/[cursoId]/asistencia`).
- **Mensajería directa** docente ↔ alumno (`/mensajes`).
- **Foros por curso** (más estructurados que el tablón).
- **Rúbricas** de evaluación.
- **Videoclases**: integración con Meet/Zoom/Jitsi (enlace en el curso).
- **Búsqueda global** (cursos, recursos, personas).
- **Ayuda / preguntas frecuentes** y **aviso de privacidad**.
- **Bitácora de auditoría** para administradores.

---

## 5. Mapa de navegación propuesto

```text
Público
├── /login
├── /registro
├── /recuperar-contrasena
└── /restablecer-contrasena            (nuevo)

Alumno / Docente  — layout con sidebar
├── /dashboard
├── /calendario                         (nuevo)
├── /cursos
│   ├── /nuevo                          (nuevo, docente)
│   ├── [unirse con código]             (nuevo, alumno, modal)
│   └── /[cursoId]
│       ├── (tablón)
│       ├── /tareas
│       │   ├── /nueva                  (nuevo, docente)
│       │   └── /[tareaId]
│       │       ├── /editar             (nuevo, docente)
│       │       └── /entregas/[alumnoId](nuevo, docente)
│       ├── /recursos
│       ├── /personas                   (nuevo)
│       ├── /calificaciones
│       └── /configuracion              (nuevo, docente)
├── /entregas            (alumno: mis entregas)
├── /por-calificar       (nuevo, docente)
├── /grupos-estudio
│   └── /[grupoId]                      (nuevo)
├── /repositorio
│   └── /[recursoId]                    (nuevo)
├── /notificaciones
└── /perfil
    └── /configuracion                  (nuevo)

Administración
├── /administracion
├── /administracion/usuarios
├── /administracion/cursos
├── /administracion/facultades          (nuevo)
├── /administracion/carreras            (nuevo)
├── /administracion/materias            (nuevo)
├── /administracion/periodos            (nuevo)
└── /administracion/reportes

Seguridad
├── /seguridad                          (nuevo)
└── /seguridad/bitacora                 (nuevo)
```

---

## 6. Análisis del backend y modelo de datos

### 6.1 Endpoints existentes

| Método | Ruta | Público | Observación |
| --- | --- | --- | --- |
| GET | `/` | Sí* | Hello World. *No tiene `@Public()`, por lo que en realidad exige token |
| POST | `/auth/register` | Sí | Permite enviar `role: "ADMIN"` |
| POST | `/auth/login` | Sí | OK |
| GET | `/auth/me` | No | OK |

Faltan módulos: `users`, `courses`, `enrollments`, `posts`, `assignments`, `submissions`, `resources`, `study-groups`, `notifications`, `files/uploads`, `academic` (catálogos), `access-control`, `reports`.

### 6.2 Entidades presentes en `schema.prisma`

`Faculty`, `Career`, `Subject`, `User`, `Course`, `Enrollment`, `Post`, `Assignment`, `Submission`, `Resource`, `StudyGroup`, `AccessLog`.

### 6.3 Faltantes y ajustes en el modelo de datos

| Necesidad | Problema actual | Propuesta |
| --- | --- | --- |
| Notificaciones | Existe la ventana pero no el modelo | `Notification { id, userId, type, title, body, link, readAt, createdAt }` |
| Miembros de grupos de estudio | `StudyGroup` tiene `capacity` pero no hay tabla de miembros | `StudyGroupMember { groupId, userId, joinedAt }` |
| Recursos del curso | `Resource` está ligado a `Subject` (repositorio), no a `Course`; la ventana `/cursos/[id]/recursos` no tiene respaldo | `CourseMaterial` con `courseId`, `topicId`, o agregar `courseId?` a `Resource` |
| Temas/unidades | No existen | `Topic { id, courseId, title, order }` y `topicId?` en `Assignment` y material |
| Comentarios | `Post` no admite comentarios; las tareas no tienen comentarios privados | `Comment { id, postId?, submissionId?, authorId, content, isPrivate }` |
| Adjuntos múltiples | `Submission.fileUrl` admite un solo archivo; `Assignment` y `Post` no admiten archivos | `Attachment { id, ownerType, ownerId, fileName, mimeType, size, path, sha256 }` |
| Puntaje de tarea | `Assignment` no tiene puntaje máximo | `maxPoints`, `allowLate`, `status (DRAFT/PUBLISHED/SCHEDULED)`, `publishAt` |
| Estado de entrega | `Submission.status` empieza en `ASSIGNED`, lo que obliga a crear filas por cada alumno | Calcular “asignada” por ausencia de entrega o crear filas al publicar; agregar `RETURNED` |
| Co-docentes | `Course.teacherId` permite solo un docente | `CourseMember { courseId, userId, role: TEACHER/STUDENT }` (puede reemplazar a `Enrollment`) |
| Periodos | `Course.term` es texto libre | `AcademicTerm { id, name, startDate, endDate, active }` |
| Archivado de curso | No existe | `Course.archivedAt`, `description`, `coverColor` |
| Recuperación de contraseña | No hay tokens | `PasswordResetToken { userId, tokenHash, expiresAt, usedAt }` |
| Avatar | Existe `storage/avatars` pero no campo | `User.avatarUrl` |
| Classroom drive | Existe `storage/classroom-drive` sin modelo | Cubrir con `Attachment` |
| Ponderación de calificaciones | No hay categorías | `GradeCategory { courseId, name, weight }` y `categoryId?` en `Assignment` |
| Calendario | No hay eventos | `Event { courseId?, title, startsAt, endsAt, type }` o derivar de `Assignment.dueAt` |
| Auditoría | Solo `AccessLog` (acceso físico) | `AuditLog { actorId, action, entity, entityId, metadata, createdAt }` |
| Fechas de actualización | Varios modelos sin `updatedAt` | Agregar `updatedAt` a `Course`, `Assignment`, `Post`, `Submission` |
| `Assignment` sin índices | Consultas por curso y fecha serán lentas | `@@index([courseId, dueAt])` |

---

## 7. Problemas técnicos y de seguridad detectados

| # | Severidad | Hallazgo | Ubicación | Recomendación |
| --- | --- | --- | --- | --- |
| 1 | 🔴 Crítica | Cualquier persona puede registrarse como `ADMIN`, `TEACHER` o `SECURITY` | `backend/src/auth/dto/register.dto.ts` | Quitar `role` del DTO; registrar siempre como `STUDENT`; roles asignados solo por admin |
| 2 | 🔴 Alta | `JWT_SECRET` con valor por defecto en código | `auth.service.ts`, `jwt-auth.guard.ts` | Fallar al arrancar si no existe; usar `@nestjs/config` con validación |
| 3 | 🟠 Media | `JWT_EXPIRES_IN` de `.env` se ignora (fijo `'8h'`) | `auth.service.ts` | Leer de configuración; agregar refresh token |
| 4 | 🟠 Media | `@prisma/client` está en `devDependencies` | `backend/package.json` | Moverlo a `dependencies` o la imagen de producción fallará |
| 5 | 🟠 Media | `/storage/` se sirve públicamente por Nginx sin autenticación: entregas de alumnos accesibles con solo conocer la ruta | `nginx/nginx.conf` | Servir archivos a través del backend con verificación de permisos o URLs firmadas (`X-Accel-Redirect`) |
| 6 | 🟠 Media | CORS con `origin: true` y `credentials: true` (acepta cualquier origen) | `backend/src/main.ts` | Restringir al dominio del frontend |
| 7 | 🟠 Media | Sin limitación de intentos en login | — | `@nestjs/throttler` |
| 8 | 🟡 Baja | Sin `middleware.ts` ni layouts: no hay protección de rutas en frontend | `frontend/src` | Crear middleware que valide sesión y rol |
| 9 | 🟡 Baja | Contraseñas en `docker-compose.yml` y `.env` versionables; `.env` y `.env.example` son idénticos | raíz | Usar variables y `.gitignore` |
| 10 | 🟡 Baja | Repositorio Git anidado en `frontend/.git` y la raíz no es repositorio | raíz | Un solo repositorio en la raíz |
| 11 | 🟡 Baja | Script `prisma:seed` apunta a `prisma/seed.ts`, que no existe | `backend/package.json` | Crear seed con facultades, carreras, materias y un admin |
| 12 | 🟡 Baja | `noREADME.md` desactualizado (dice que no existe Prisma y que el dashboard está implementado; menciona `prisma.config.ts` que no existe) | `noREADME.md` | Actualizar |
| 13 | 🟡 Baja | Sin carpetas `components/`, `lib/` (cliente HTTP), `types/`, ni gestión de sesión en frontend | `frontend/src` | Crear estructura recomendada en el propio README |
| 14 | 🟡 Baja | Sin validación de tipo/tamaño de archivos ni antivirus para cargas | — | Validar MIME, tamaño, guardar `sha256` |

---

## 8. Matriz de permisos sugerida

| Acción | Alumno | Docente | Admin | Seguridad |
| --- | :-: | :-: | :-: | :-: |
| Ver cursos inscritos | ✅ | ✅ | ✅ (todos) | ❌ |
| Crear curso | ❌ | ✅ | ✅ | ❌ |
| Unirse con código | ✅ | ❌ | ❌ | ❌ |
| Publicar en tablón | Configurable | ✅ | ✅ | ❌ |
| Crear/editar tarea | ❌ | ✅ (sus cursos) | ✅ | ❌ |
| Entregar tarea | ✅ | ❌ | ❌ | ❌ |
| Calificar | ❌ | ✅ (sus cursos) | ✅ | ❌ |
| Ver calificaciones | Solo propias | Su curso | Todas | ❌ |
| Subir al repositorio | ✅ (moderado) | ✅ | ✅ | ❌ |
| Gestionar usuarios y catálogos | ❌ | ❌ | ✅ | ❌ |
| Bitácora de accesos | ❌ | ❌ | ✅ | ✅ |

> Importante: además del rol global, el backend debe validar **pertenencia al curso** (un docente solo califica en sus cursos, un alumno solo ve cursos donde está inscrito). Hoy `RolesGuard` solo valida el rol global.

---

## 9. Evaluación de la propuesta

### Lo que está bien

- Separación por grupos de rutas `(auth)`, `(dashboard)`, `(admin)` en App Router.
- Rutas anidadas por curso (`/cursos/[cursoId]/...`) siguiendo el patrón de Classroom.
- Modelo académico jerárquico (Facultad → Carrera → Materia → Curso) apropiado para una universidad.
- Diferenciación entre **material del curso** y **repositorio institucional**, y la idea de **grupos de estudio**: valor agregado sobre Classroom.
- Infraestructura con Docker, Nginx, MySQL y Redis lista para crecer (Redis servirá para colas de notificaciones y caché).
- Guards globales de JWT y roles bien planteados.
- Paleta visual institucional ya definida en Tailwind.

### Lo que hace falta o debe corregirse

1. **Vistas del docente**: hoy las ventanas solo describen la experiencia del alumno. Faltan crear curso, crear tarea, revisar/calificar entregas, libro de calificaciones y personas.
2. **Flujo de inscripción**: unirse con código de invitación.
3. **Organización del contenido**: temas/unidades, adjuntos múltiples y comentarios.
4. **Notificaciones**: hay ventana pero no modelo ni mecanismo (Redis + WebSockets o correo).
5. **Calendario**: imprescindible en una plataforma con fechas de entrega.
6. **Administración académica**: catálogos de facultades, carreras, materias y periodos.
7. **Rol `SECURITY`**: definir si el control de accesos físicos forma parte del alcance; si sí, crear sus ventanas; si no, retirarlo para no ampliar alcance sin necesidad.
8. **Seguridad**: corregir el registro con rol libre y la exposición pública de `/storage/` antes de cualquier despliegue.
9. **Características propias de Moodle** (cuestionarios, asistencia, foros, rúbricas) no están contempladas; conviene decidir si entran en una fase 2.

---

## 10. Hoja de ruta sugerida

### Fase 0 — Bases (1 semana)
- Corregir hallazgos 1, 2, 4, 5, 6 de §7.
- `.gitignore` y repositorio único; actualizar `noREADME.md`.
- Layouts con sidebar/topbar, `middleware.ts`, cliente HTTP y manejo de sesión.
- Seed de catálogos y usuario administrador.

### Fase 1 — MVP tipo Classroom (3–4 semanas)
- Login, registro, recuperación de contraseña.
- Cursos: crear, listar, unirse por código, personas.
- Tablón con publicaciones y comentarios.
- Tareas: crear, entregar con adjuntos, calificar, devolver.
- Calificaciones (alumno y docente) y exportación.
- Notificaciones dentro de la plataforma.
- Perfil.

### Fase 2 — Valor institucional (3 semanas)
- Calendario.
- Temas/unidades y material de curso.
- Repositorio institucional con búsqueda y moderación.
- Grupos de estudio con miembros.
- Administración: usuarios, catálogos, periodos, cursos, reportes.

### Fase 3 — Evaluación y seguimiento tipo Moodle (según prioridad)
- Cuestionarios/exámenes, asistencia, rúbricas, libro de calificaciones avanzado, foros, mensajería, grupos dentro del curso, finalización y progreso, acceso condicional, videoclases (enlace externo), bitácora de actividad.
- Detalle y orden en [`AVANCE.md`](AVANCE.md) › Fase 3.

### Fase 4 — Actividades y herramientas complementarias de Moodle
- Taller, wiki, glosario, lección, libro, consulta, encuesta, H5P/SCORM, insignias, competencias, reutilizar y archivar cursos, informes de participación, búsqueda global, PWA, ayuda.
- Ya no aplican (decisión del 2026-11-19): notificaciones por correo y rol `SECURITY`.

---

## 11. Resumen de conteo

| Categoría | Cantidad |
| --- | --- |
| Ventanas declaradas hoy | 19 (3 auth + 12 dashboard + 4 admin) |
| Ventanas con contenido implementado | 0 |
| Ventanas faltantes críticas | 9 |
| Ventanas faltantes importantes | 8 grupos (≈ 13 rutas) |
| Ventanas deseables (fase 3) | ≈ 9 |
| Endpoints backend existentes | 4 |
| Entidades nuevas sugeridas en BD | ≈ 12 |
