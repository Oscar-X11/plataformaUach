# Bitácora de cambios — Plataforma UACH

Registro diario de lo que se hizo en el proyecto, las decisiones tomadas y lo que quedó pendiente.

- Las entradas más recientes van **arriba**.
- Cada día lleva: **qué se hizo**, **decisiones** (si las hubo), **importante** (avisos, riesgos, cosas que no hay que olvidar) y **pendiente**.
- El estado general por fases está en [`AVANCE.md`](AVANCE.md). Esta bitácora cuenta la historia día por día.

---

## 2026-11-19

### Qué se hizo
- **Bitácora** (`docs/BITACORA.md`) creada y `AVANCE.md` actualizado con el estado del entorno y las decisiones de alcance (commit `f952f4e`).
- **Revisión general** (sin cambios de código): el frontend y el backend compilan, el lint pasa y los tests también. Se probaron todas las rutas con cada rol usando el backend simulado y no hubo errores.
- **Dashboard del alumno rediseñado** (commit `3846aca`): próxima entrega, semana, cursos y avisos, por ahora con **datos de ejemplo**. Barra lateral colapsable, menú de notificaciones y animaciones que respetan «movimiento reducido».
- **Backend simulado** (`npm run dev:demo`): levanta un backend falso y el frontend juntos para recorrer la plataforma **sin base de datos**.
- **Rol `SECURITY` eliminado** (commit `d9dc32a`): también se quitaron el modelo `AccessLog`, las rutas `/seguridad` y su navegación.
- **Acceso con matrícula o número de empleado** (commit `d9dc32a`): se eliminó el correo del modelo `User`; ahora existe un solo campo, `username`, que se guarda en mayúsculas.
- **Recuperar contraseña sin correo** (commit `d9dc32a`):
  1. Un admin llama a `POST /users/:id/reset-password` y obtiene una contraseña temporal.
  2. El usuario entra con ella y solo puede usar `/cambiar-contrasena`; el resto de la API responde 403 hasta que la cambie.
  3. Se cambia con `POST /auth/change-password`. Cualquier usuario puede usar esa página desde su menú.
- **Migración inicial de Prisma** (commit `8de7a74`): `backend/prisma/migrations/20261119000000_init`, generada desde el esquema.
- **Módulo de cursos** (entregables 1 y 2 de la fase 1, commit `f952f4e`):
  - **Backend:** listar, crear (docente), unirse con código (alumno), detalle, personas, generar un código nuevo y quitar alumnos. Además, `GET /academic/subjects` para el formulario de creación.
  - **Validación de pertenencia:** `CourseAccessService` comprueba que el usuario sea el docente, un alumno inscrito o un admin. Si no, responde 404 para no revelar qué cursos existen.
  - **Frontend:** `/cursos`, `/cursos/[id]` (encabezado, código de invitación y pestañas) y `/cursos/[id]/personas`.
  - Tests del backend: 31 en total (13 nuevos de cursos).
- **Resto de la fase 1** (entregables 3 a 11, commit `fc6ca45`):
  - **Esquema:** modelos `Comment`, `SubmissionFile` y `Notification`; `Assignment.points` (10 por defecto) y fecha de entrega opcional; `User.avatarUrl`. El estado de la entrega queda en `ASSIGNED` → `SUBMITTED` → `RETURNED`; «tarde» y «sin entregar» se calculan con la fecha. Segunda migración: `20261119120000_fase1_classroom`.
  - **Tareas:** crear, editar y borrar (el docente); los alumnos inscritos reciben un aviso.
  - **Entregas:**
    - El alumno adjunta hasta 10 archivos de máximo 20 MB cada uno.
    - Se valida la extensión **y el contenido real** del archivo, y se guarda su `sha256`.
    - Puede entregar, o «marcar como hecha» si la tarea no lleva archivo, y anular la entrega mientras no esté calificada.
  - **Calificar y devolver:**
    - El docente puede guardar la calificación como borrador o devolverla al alumno; en ambos casos con comentario.
    - El alumno solo ve la nota cuando se la devuelven y recibe un aviso.
  - **Calificaciones:**
    - Vista del alumno con su promedio (escala 0–10, ponderado por puntos).
    - Libro del docente.
    - Exportación a CSV para Excel, con protección contra fórmulas inyectadas.
  - **Tablón:** el docente publica avisos y todos los miembros comentan; cada quien borra lo suyo y el docente modera.
  - **Notificaciones** dentro de la plataforma:
    - Página `/notificaciones`.
    - Campana con datos reales que se actualiza cada 2 minutos.
  - **Perfil:** datos de la cuenta, foto (PNG/JPG/WebP de hasta 2 MB) y acceso a cambiar la contraseña.
  - **Administración:**
    - Panel con métricas.
    - `/administracion/usuarios`: búsqueda, alta de docentes y administradores con contraseña temporal, restablecer contraseña y activar o desactivar cuentas.
    - `/administracion/cursos`: todos los cursos.
  - **Dashboard con datos reales:** el del alumno ya no usa datos de ejemplo (se borró `sample-data.ts`) y el docente tiene uno propio («por calificar», próximas entregas, sus clases). El admin va a `/administracion`.
  - **Backend simulado** ampliado (`scripts/mock-classwork.mjs`) con todos los endpoints nuevos y datos de ejemplo.
  - Tests del backend: 46 en total (15 nuevos). Se probaron todos los flujos de punta a punta con la demo.

### Decisiones
- **Sin rol de Seguridad** (control de accesos): queda fuera del alcance.
- **Sin servicio de correo**: los alumnos no tienen correo institucional. Todo aviso vive dentro de la plataforma.
- **Identificador de acceso:** la matrícula para los alumnos y el número de empleado para docentes y administradores.
- **Contraseña olvidada:** la restablece un administrador en persona, con una contraseña temporal que el usuario debe cambiar al entrar.
- **Privacidad en cursos:** los alumnos no ven las matrículas de sus compañeros ni el código de invitación.

### Importante
- **Todavía no hay base de datos ni servidor MySQL.** Todo se probó con el backend simulado. Cuando exista la BD:
  1. Configurar `DATABASE_URL` en `.env`.
  2. Ejecutar `npm run prisma:deploy` para crear las tablas.
  3. Ejecutar `npm run prisma:seed` para cargar el catálogo y el administrador.
- En `.env`, la variable `SEED_ADMIN_EMAIL` ahora se llama **`SEED_ADMIN_USERNAME`** (es el número de empleado del admin). `REGISTRATION_EMAIL_DOMAINS` ya no se usa.
- **Riesgo abierto:** como el registro es libre, alguien podría registrarse con la matrícula de otro alumno. Hay dos opciones:
  - que la administración cargue la lista oficial de matrículas y solo esas puedan registrarse;
  - que un admin apruebe cada cuenta nueva.
- **Desactivar una cuenta** impide iniciar sesión, pero una sesión ya abierta sigue funcionando hasta que expira (8 h). Lo mismo pasa al restablecer una contraseña. Pendiente: invalidar sesiones.
- Los archivos subidos se guardan en `storage/submissions/<curso>/<tarea>/` y `storage/avatars/<usuario>/` con nombres aleatorios; el nombre original solo se muestra.
- **Cuentas del backend simulado:**

  | Rol | Usuario | Contraseña |
  | --- | --- | --- |
  | Alumna | `A2023-0148` | `alumno123` |
  | Docente | `D1001` | `docente123` |
  | Administrador | `ADMIN` | `admin123` |
  | Alumno con contraseña temporal | `A2023-0200` | `temp-1234` |

- El catálogo del seed (facultades, carreras y materias) es **de ejemplo**. Hay que reemplazarlo por el oficial.

### Pendiente
- Probar todo con una base de datos real cuando exista.
- Invalidar sesiones abiertas al desactivar una cuenta o restablecer su contraseña.
- Fase 2: repositorio, grupos de estudio, recursos del curso, reportes y calendario.
- Decidir cómo evitar registros con matrículas ajenas.

---

## 2026-11-18

### Qué se hizo
- El repositorio se reorganizó como **monorepo**: `frontend/`, `backend/`, `nginx/` y `docs/` (commit `aac41fe`).
- Limpieza de la estructura: se quitaron archivos de plantilla y scripts obsoletos (commit `5185102`).
- **Fase 0 terminada:**
  - Docker Compose con MySQL, Redis, backend, frontend y Nginx.
  - Autenticación con cookie `httpOnly`, guards globales (límite de peticiones → JWT → roles) y descarga protegida de archivos.
  - Layouts por rol, protección de rutas y páginas de error.
  - Inicio de sesión y registro funcionando; el resto de las páginas muestran «módulo pendiente».

---

## 2026-11-17

### Qué se hizo
- Se creó el proyecto inicial con Create Next App.

---

<!--
Plantilla para nuevas entradas (copiar arriba de la más reciente):

## AAAA-MM-DD

### Qué se hizo
-

### Decisiones
-

### Importante
-

### Pendiente
-
-->
