# Bitácora de cambios — Plataforma UACH

Registro diario de lo que se hizo en el proyecto, las decisiones tomadas y lo que quedó pendiente.

- Las entradas más recientes van **arriba**.
- Cada día lleva: **qué se hizo**, **decisiones** (si las hubo), **importante** (avisos, riesgos, cosas que no hay que olvidar) y **pendiente**.
- El estado general por fases está en [`AVANCE.md`](AVANCE.md). Esta bitácora cuenta la historia día por día.

---

## 2026-11-20

### Qué se hizo
- **Fase 2** (valor institucional), probada con el backend simulado (commit al final del día):
  - **Calendario** (`/calendario`):
    - Vista de mes con las entregas de todos los cursos.
    - En escritorio se ve como cuadrícula y en móvil como agenda.
    - El alumno ve el estado de cada tarea y el docente cuántos entregaron.
  - **Recursos del curso** (`/cursos/[id]/recursos`):
    - El docente organiza el material por temas o unidades.
    - Puede subir archivos de hasta 50 MB o compartir enlaces; solo se aceptan enlaces http(s).
    - Los alumnos reciben un aviso y solo los miembros del curso pueden descargar.
  - **Repositorio institucional** (`/repositorio`):
    - Apuntes, guías, exámenes resueltos y libros por materia, con búsqueda y filtros.
    - Lo que suben los alumnos queda **en revisión** hasta que un administrador lo aprueba; para rechazarlo hay que escribir el motivo.
    - Lo que suben docentes y administradores se publica directo.
    - Lo pendiente solo lo pueden descargar su autor y el admin.
  - **Grupos de estudio** (`/grupos-estudio`):
    - Crear un grupo con cupo, materia y lugar o hora de reunión; unirse y salir.
    - El cupo se respeta aunque dos personas se unan al mismo tiempo.
    - Solo los integrantes ven quiénes participan.
  - **Reportes** (`/administracion/reportes`):
    - Por curso: alumnos, tareas, % de entrega sobre las tareas vencidas y promedio.
    - Filtro por periodo y exportación a CSV.
- **Esquema:** modelos `CourseTopic`, `CourseMaterial` y `StudyGroupMember`. El modelo `Resource` ahora tiene estado de moderación y datos del archivo. Hay dos notificaciones nuevas: material nuevo y recurso revisado. Migración nueva: `20261120090000_fase2_institucional`.
- **Backend simulado** ampliado: `scripts/mock-institutional.mjs`.
- Tests del backend: 58 en total (12 nuevos).
- **README actualizado** con el estado por fases, todas las ventanas del frontend, la estructura de módulos, el backend simulado y sus cuentas, y los siguientes pasos. Commit de toda la fase 2.
- **Base de datos local de pruebas en Docker:** se levantaron MySQL 8.4 y Redis con `docker compose up -d mysql redis`, se aplicaron las tres migraciones (`prisma:deploy`) y se ejecutó el seed (2 facultades + administrador `ADMIN`). Se comprobó que el backend real arranca y que el login del administrador responde 200.
- **Tablas y columnas en español:** con `@@map`/`@map` en `schema.prisma` (p. ej. `User` → `usuarios`, `fullName` → `nombre_completo`). El código TypeScript no cambia: sigue usando los nombres de Prisma en inglés. Las tres migraciones se reemplazaron por una sola, `20261120120000_init`, y la BD local se recreó desde cero. Backend probado (login 200) y 58 tests en verde.
- **Importar alumnos desde Excel** (Administración › Usuarios › «Importar alumnos»): se sube el `.xlsx` de la universidad (columnas `matricula`, `nombre`, `ap_pat`, `ap_mat`), se ve una vista previa con las nuevas, las que ya tienen cuenta y las filas con error, y se confirma. Al terminar se descarga un CSV con las contraseñas iniciales. Endpoint `POST /users/import-students` (también en el mock); el Excel se lee en el navegador con `read-excel-file` 9.3.14. 7 tests nuevos (65 en total). Probado con el backend real.
- Commit `70ead6a`: base de datos en Docker, nombres en español e importación de alumnos.

### Decisiones
- **Contraseña inicial de los alumnos importados** (pedida por el usuario): últimos 3 dígitos de la matrícula + primer nombre en minúsculas, sin acentos ni signos (500525123, Óscar → `123oscar`). Se marca `mustChangePassword` para obligar a cambiarla al primer inicio de sesión. Es una contraseña adivinable, así que conviene que los alumnos entren y la cambien pronto.
- **Importación:** la carrera no viene en el Excel y se queda vacía (se asignará después). Las matrículas que ya tienen cuenta se omiten y nunca se sobrescriben. La matrícula debe tener solo dígitos.
- **Nombres en la BD en español**, en `snake_case` y tablas en plural; sin «ñ» ni acentos (`contrasena_hash`, `tamano_bytes`). Los valores de los enums (`ADMIN`, `SUBMITTED`…) se quedan en inglés porque el código y el frontend los comparan.
- **Se juntaron las migraciones en una sola** porque no había ninguna BD en producción. A partir de ahora las migraciones nuevas se agregan encima y ya no se reescriben.
- **Moderación del repositorio:** lo de alumnos se revisa; lo de docentes y admins se publica directo. Rechazar exige explicar el motivo al autor.
- **Grupos de estudio abiertos** a toda la comunidad (no ligados a un curso). Quien lo crea no puede salirse: si ya no se reunirán, lo borra.

### Importante
- Ya hay base de datos local (Docker). En este equipo existe además un MySQL nativo de Windows en el puerto 3306, así que el contenedor se publica en el **3307** (`MYSQL_HOST_PORT` en `.env`; `DATABASE_URL` apunta a `localhost:3307`).
- El seed usa `SEED_ADMIN_USERNAME` (número de empleado), no `SEED_ADMIN_EMAIL`; se corrigió el `.env`.
- Los archivos nuevos se guardan en `storage/classroom-drive/<curso>/` (material) y `storage/repository/<materia>/` (repositorio).

### Pendiente
- Probar todos los módulos con la base de datos real (el backend ya conecta).
- Administración: catálogos (facultades, carreras, materias), periodos y reasignar docentes.
- Invalidar sesiones al desactivar cuentas o restablecer contraseñas.
- Decidir cómo evitar registros con matrículas ajenas.

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
