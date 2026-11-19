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
- **Cuentas del backend simulado:**

  | Rol | Usuario | Contraseña |
  | --- | --- | --- |
  | Alumna | `A2023-0148` | `alumno123` |
  | Docente | `D1001` | `docente123` |
  | Administrador | `ADMIN` | `admin123` |
  | Alumno con contraseña temporal | `A2023-0200` | `temp-1234` |

- El catálogo del seed (facultades, carreras y materias) es **de ejemplo**. Hay que reemplazarlo por el oficial.

### Pendiente
- **Tareas y entregas** (entregables 4 y 5): el docente crea tareas con fecha de entrega y el alumno entrega con archivos adjuntos.
- Pantalla `/administracion/usuarios` con el botón para restablecer contraseñas (el endpoint ya existe).
- Conectar el dashboard a datos reales (hoy usa `sample-data.ts`).
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
