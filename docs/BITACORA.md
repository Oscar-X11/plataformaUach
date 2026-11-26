# Bitácora de cambios — Plataforma UACH

Registro diario de lo que se hizo en el proyecto, las decisiones tomadas y lo que quedó pendiente.

- Las entradas más recientes van **arriba**.
- Cada día lleva: **qué se hizo**, **decisiones** (si las hubo), **importante** (avisos, riesgos, cosas que no hay que olvidar) y **pendiente**.
- El estado general por fases está en [`AVANCE.md`](AVANCE.md). Esta bitácora cuenta la historia día por día.

---

## 2026-11-25

### Qué se hizo
- **Reportes del administrador rehechos** (`/administracion/reportes`):
  - Se quitó la columna **Promedio**: solo sumaba tareas devueltas, ignoraba cuestionarios y pesos del libro, y no coincidía con la calificación real.
  - Nuevas columnas **Sin calificar** (entregas que el docente no ha calificado ni devuelto) y **En riesgo** (mismo criterio que la pestaña Seguimiento del docente).
  - El nombre del curso lleva a su **Seguimiento**; el número de «En riesgo» lleva al seguimiento filtrado.
  - **Filtro por carrera** además del periodo (formulario GET con «Aplicar»; no necesita JavaScript).
  - Nueva vista **Alumnos en riesgo**: alumnos en riesgo en al menos una clase, ordenados por cuántas clases, con el motivo en cada una. Endpoint `GET /reports/students` y su CSV `GET /reports/students/export`.
  - Aviso en la página: los números solo reflejan lo registrado en la plataforma.
  - El CSV de cursos cambia: sin promedio, con «Sin calificar» y «Alumnos en riesgo»; «Entregas a tiempo» ahora cuenta solo tareas vencidas, igual que «% entrega».
- `ProgressService.studentRows` reemplaza a `atRiskByCourse`, que no se usaba.
- Se restableció la contraseña del usuario `ADMIN` en la base de desarrollo (valor de `SEED_ADMIN_PASSWORD`).
- **Permisos del ADMIN restringidos:** consulta y modera, pero no crea contenido académico ni participa.
  - Backend, con `@Roles` en la ruta (el guard actúa antes de guardar archivos): avisos y comentarios, tareas (crear, editar, rúbrica, calificar), pesos, cuestionarios (crear, editar, publicar, calificar respuestas), material y temas (subir, crear, renombrar), crear o unirse a grupos de estudio y subir al repositorio. Unirse a una clase ya era solo de alumnos.
  - Conserva: ver todo el contenido de los cursos, Seguimiento, libro de calificaciones y exportaciones, resultados de cuestionarios, Personas; borrar avisos, comentarios, tareas, cuestionarios, material, temas, grupos y recursos; revisar el repositorio; administrar cursos (docente, alumnos, código, descripción, lugar y horario, copia).
  - Frontend: se ocultan los botones y formularios. Cuestionarios y calificación de entregas se ven en modo consulta. Nuevos indicadores del backend: `canComment` y `canModerate` (tablón), `canCreate` (material) y `canJoin` (grupos). Helper `canTeach` en `lib/courses.ts`.
  - Prueba e2e nueva en `flows.e2e-spec.ts`. 110 pruebas unitarias y 24 e2e.

### Importante
- El reporte calcula el riesgo curso por curso (secuencial) para no cargar todo en memoria en el servidor de 4 GB. Con muchos cursos la página tardará más; si se vuelve lenta, filtrar por periodo o carrera, o agregar los datos en SQL.

---

## 2026-11-24

### Qué se hizo
- **Menú lateral colapsado:** la barra de desplazamiento de la lista de navegación ya no queda flotando sobre el contenido al contraer el menú (se notaba con el administrador, que tiene más entradas). Colapsado, la barra se oculta y la lista se sigue desplazando con la rueda o el teclado (`AppShell.tsx`).

---

## 2026-11-23

### Qué se hizo
- Se extrajeron datos del sitio oficial (`uach.edu.mx`: index, Courses, Identidad y niveles).
- El seed carga el catálogo real: 11 licenciaturas, 4 ingenierías y la Preparatoria Rosario Castellanos con sus 4 áreas de bachillerato.
- La pantalla de acceso muestra el lema («Educación es progreso»), la dirección, el teléfono y el correo de la universidad.
- **Tipo de periodo** (migración `20261123120000_tipos_de_periodo`): cada facultad y cada periodo son cuatrimestrales o semestrales.
  - Hay un periodo actual por tipo; un curso solo se abre en un periodo del tipo de su facultad (el backend lo valida).
  - Al crear un curso, el docente elige primero la materia y solo ve los periodos de su tipo.
  - El seed crea el periodo en curso de cada tipo si no hay uno actual (`2026-C3` y `2026-S2`).
- «Catálogos» pasó a llamarse **Materias** (`/administracion/materias`).
- Commit `4e845d2`: catálogo real de la UACH, periodos cuatrimestrales y semestrales, apartado Materias y datos institucionales en el acceso.
- **Sesiones invalidables** (migración `20261123180000_version_de_sesion`): cada token lleva `sv` (`User.sessionVersion`). El guard comprueba en la BD, con caché de 30 s por usuario (`SessionStateService`), que la cuenta siga activa y que la versión coincida.
  - Desactivar una cuenta, restablecer su contraseña o cambiarla uno mismo sube la versión: las demás sesiones reciben 401 al instante.
  - El rol y la contraseña temporal pendiente se leen de la BD, no del token.
- **`GET /health`** (público, sin límite de peticiones): 200 si MySQL y `storage/` responden, 503 si no. Reemplaza el «Hello World!». Healthcheck del backend en `docker-compose.yml`.
- «Materias» pasó a llamarse **Carreras** (`/administracion/carreras`). En la web ya no aparece la palabra «facultad»: se dice **nivel** (registro, perfil, administración y mensajes del backend).
- Probado de punta a punta con la BD real: cambio de contraseña, restablecimiento y desactivación cierran las otras sesiones. 84 pruebas unitarias.
- **Lugar y horario del curso** (migración `20261123200000_lugar_horario_cursos`): texto libre de hasta 200 caracteres que el docente escribe al crear el curso o edita desde el encabezado (`PATCH /courses/:id/meeting`). Los enlaces (Meet, Zoom…) se abren con un clic, también en los grupos de estudio (componente `MeetingInfo`).
- Probado con un curso real (guardar, enlace clicable, límite de 200, vaciar). 86 pruebas unitarias.
- Reporte del día en `docs/REPORTE_2026-11-23.md`.
- Commit `fb3654e`: sesiones invalidables, `/health`, «Carreras» y «nivel», lugar y horario en cursos y reporte del día.

- **Registro abierto retirado:** se quitó `POST /auth/register` y el catálogo público de niveles. `/registro` ahora es «Primer acceso»: explica que la cuenta la crea la escuela al importar el Excel. El login dice «¿Es tu primera vez? Cómo entrar».
- **Cuestionarios y encuestas estilo Google Forms** (migración `20261124100000_cuestionarios`, módulo `backend/src/quizzes`, pestaña «Cuestionarios» del curso):
  - Tipos: opción múltiple, casillas (todo o nada), verdadero/falso, respuesta corta (sin mayúsculas ni acentos; sin clave la califica el docente) y párrafo (manual).
  - Ajustes: apertura y cierre, tiempo límite (envío automático al terminar), cuándo ve el alumno su resultado (al enviar, después del cierre o nunca). Un solo intento.
  - El alumno responde con guardado automático; el docente ve resumen por pregunta, lista de alumnos, respuestas individuales con calificación manual y CSV.
  - Encuestas: sin puntos ni respuestas correctas; conteo por opción. Borrador hasta publicar; al publicar se avisa a los alumnos (`QUIZ_PUBLISHED`).
  - Con respuestas, las preguntas quedan fijas. Calificaciones aparte del libro de tareas.
- Probado de punta a punta con la BD real: 21/21 comprobaciones de la API y 11/11 de pantallas (docente y alumno). Datos de prueba borrados. 96 pruebas unitarias.
- Commit `862df71`: cuestionarios y encuestas estilo Google Forms y registro abierto retirado.

- **«Crear clase» como en Classroom** (migración `20261124120000_descripcion_cursos`): nombre de la clase, descripción, nivel, materia (solo las del nivel, agrupadas por carrera) y aula. El periodo se propone solo (el actual del tipo del nivel) y se puede cambiar. La descripción se ve en el encabezado de la clase y «Lugar y horario» pasó a llamarse **Aula**.
  - Causa de «el periodo no sirve»: el campo estaba antes que la materia pero bloqueado hasta elegirla. Ahora depende del nivel y aparece al final, ya seleccionado.
- Docente de prueba en la BD real: `DOCENTE-PRUEBA` (contraseña fija, sin cambio obligatorio).
- Commit `8f5d3e2`: «Crear clase» como en Classroom (nivel, materia, descripción y aula).

- **La clase se define por carrera y cuatrimestre/semestre** (migración `20261124140000_carrera_y_grado_cursos`): «Crear clase» pide nivel, **carrera** (las que ofrece el nivel) y debajo el **cuatrimestre o semestre** (1–12 cuatrimestres, 1–6 semestres). La materia del catálogo pasa a ser opcional, así que ya se pueden crear clases de cualquier carrera aunque no tenga materias.
  - Los cursos existentes tomaron la carrera y el grado de su materia (la migración rellena antes de volver obligatorias las columnas).
  - Encabezado, lista de clases, panel, administración de cursos, reportes y su CSV muestran «ISC · 4.º cuat».
  - Probado de punta a punta con una clase de bachillerato (BFM, 2.º semestre). 98 pruebas unitarias.
- Detener el backend dejaba vivos los procesos `nest start --watch` (había 16 acumulados y bloqueaban el motor de Prisma). Se cerraron todos.
- Commit `3e7cb3e`: clase por carrera y cuatrimestre/semestre, materia opcional.

- «Cambiar contraseña» se quitó del menú desplegable del usuario; queda solo en Mi perfil.

- **Panel «Avisos recientes» del alumno:** ahora muestra las notificaciones de avisos del tablón **y de cuestionarios/encuestas**, máximo 3, con «Ver todas las notificaciones». Al abrir una se marca como leída. El backend las toma de `notificaciones` (ya no de las publicaciones).
- **Notificaciones que no se marcaban como leídas:** la API sí las marcaba, pero Next.js mostraba al regresar una copia en caché de hasta 30 s. Se desactivó esa caché para páginas dinámicas (`experimental.staleTimes.dynamic = 0`), las peticiones usan `keepalive` para llegar aunque el clic navegue, y la campana se actualiza al instante con un evento del navegador (`lib/notifications.ts`).
- **Sin emojis en la web:** 19 emojis reemplazados por íconos de lucide (palomita en «Estás al día», «Todo leído», etc.) o por texto sobrio. `DESIGN.md` actualizado.
- Probado con un alumno de prueba (10/10). Datos de prueba borrados.
- Commit `081f1f3`: avisos y cuestionarios en el inicio, notificaciones leídas, sin emojis y «Cambiar contraseña» solo en Mi perfil.

- **Cuestionarios en «Lo que sigue», la semana y el calendario:** los publicados con fecha de cierre aparecen como actividad pendiente (y como respondidos en la semana). Cada elemento lleva a su página: «Lo que sigue» muestra «Responder cuestionario» o «Responder encuesta» en lugar de «Abrir y entregar», y los días de la semana ahora son enlaces.
- **Descripción editable:** el docente la cambia desde el encabezado de la clase (`PATCH /courses/:id/description`).
- **Periodo `2026-2` cerrado:** su curso se conserva; ya no acepta cursos nuevos.
- **Sesión deslizante:** cada token dura 8 h y, mientras el usuario usa la plataforma, el backend renueva la cookie (como mucho cada 15 min). Límite absoluto `SESSION_MAX_DAYS` (14 días) desde el inicio de sesión. Probado a través del proxy del frontend.
- **Pruebas e2e** (`npm --workspace=backend run test:e2e`): 9 pruebas contra `uach_platform_test` (cuentas, clases, tareas, cuestionarios, avisos y cierre de sesiones). Se niegan a correr en una base que no termine en `_test`. Pruebas unitarias: 102.

- **Revisión completa del sistema:** compilación y lint sin errores ni advertencias (se corrigieron 4 advertencias del backend), 102 pruebas unitarias, 9 e2e y un recorrido de 82 comprobaciones con los tres roles: cuentas y contraseña temporal, clase, aviso y comentario, tarea con archivo entregada y calificada, tema y material, cuestionario y encuesta, repositorio con aprobación, grupo de estudio, todas las pantallas de alumno, docente y administración, páginas públicas, bloqueos de acceso y exportaciones CSV. Datos y archivos de prueba borrados.
  - Ojo al revisar HTML de Next.js: la página «no encontrado» viaja en los scripts de todas las páginas; hay que buscar solo en el contenido visible.
- Commit `e300bb2`: cuestionarios en «Lo que sigue» y calendario, descripción editable, sesión deslizante, pruebas e2e y revisión completa.

- **Rúbricas, progreso y bitácora** (migración `20261124160000_rubricas_progreso_bitacora`, ya aplicada). La preparatoria aprueba con 6; licenciaturas e ingenierías, con 7.
  - **Rúbricas:** el docente las crea en la tarea («Crear rúbrica»): criterios con niveles y puntos. Califica eligiendo un nivel por criterio y la nota se calcula sola. El alumno ve la rúbrica antes y su nivel al devolverla. Una rúbrica con la que ya se calificó no se cambia.
  - **Calificaciones:** incluye cuestionarios, pesos por clase («Cambiar pesos», 60/40 por omisión), promedio de tareas, de cuestionarios, final y situación (aprobado o no según el nivel). El CSV trae todo. Con el periodo cerrado, las notas quedan bloqueadas y se avisa en pantalla.
  - **Acceso condicional:** en tareas («Condiciones de acceso») y cuestionarios: visible desde una fecha o después de completar otra actividad. Se rechazan ciclos. El alumno ve la actividad con candado y la razón; no aparece en «Lo que sigue», el calendario, «Próximas entregas» ni la búsqueda.
  - **Progreso y seguimiento:** barra «Tu progreso» en el tablón del alumno. Pestaña **Seguimiento** (solo docente): avance, vencidas, final, última actividad, filtro «En riesgo» y bitácora de la clase. Al calificar se marcan las entregas con el mismo archivo que otro alumno.
  - **Reutilizar clase** (botón en el encabezado): copia temas, material con archivos, tareas con rúbrica (sin fecha) y cuestionarios (borrador), sin alumnos.
  - **Bitácora:** página `/administracion/bitacora` con filtro por acción y búsqueda. Se registran inicios de sesión, cambios de contraseña, altas y estados de usuarios, restablecimientos, importaciones, altas de clase, inscripciones, tareas, entregas, calificaciones, cuestionarios, material, pesos y periodos. Se purga a los 180 días.
  - **Carreras:** cada nivel muestra y edita su calificación aprobatoria («Aprueba con»).
- **Búsqueda global** (`GET /search`, botón «Buscar…» o Ctrl+K): clases, tareas, cuestionarios y material del usuario; la administración también encuentra usuarios (abre Usuarios con la búsqueda prellenada).
- **App instalable:** `manifest.webmanifest`, íconos en `frontend/public/icons/` (generados con `frontend/scripts/generate-icons.mjs`) y color de tema. Sin modo sin conexión (decisión del usuario). El `Dockerfile` del frontend ahora copia `public/`.
- **Centro de ayuda** (`/ayuda`) y **aviso de privacidad** (`/privacidad`, borrador con los datos reales de la UACH, pendiente de revisión jurídica). Se ven con o sin sesión; enlaces en el menú del usuario y en el acceso.
- Pruebas: 110 unitarias (4 nuevas de acceso condicional) y 23 e2e (14 nuevas en `test/progress.e2e-spec.ts`: rúbricas, condiciones, duplicados, pesos y final, progreso y riesgo, aprobatoria, reutilizar, periodo cerrado, bitácora y búsqueda). Recorrido de pantallas con docente, alumno y administración contra la base de desarrollo; datos de prueba borrados.
- Commit `d221613`: rúbricas, libro con pesos y final, acceso condicional, seguimiento, bitácora, búsqueda global, app instalable, ayuda y aviso de privacidad.
- **Documentación al día:** README reescrito (funciones, todas las rutas del backend, pantallas, variables, pruebas y estructura); `AVANCE.md` con la nueva sección **«Lo que falta»** (antes de producción, datos, mejoras técnicas y funciones opcionales); `PRODUCT.md` y `DESIGN.md` actualizados (componentes de actividad bloqueada, rúbrica, situación, diálogos y búsqueda); el análisis inicial quedó marcado como documento histórico.
- La barra de progreso nueva se cambió por la que ya existía en `dashboard/primitives.tsx` (había quedado duplicada).

### Decisiones
- **Fuera del alcance (fases 3 y 4):** foros por curso, mensajería directa, grupos dentro del curso, actividades extra de Moodle (taller, wiki, glosario, lección, libro, consulta, retroalimentación anónima, base de datos), H5P/SCORM e insignias/competencias. Quedan tachados en `docs/AVANCE.md`.
- **No se implementa asistencia** (decisión del usuario).
- Sin emojis en toda la interfaz; íconos de lucide solo donde aporten (decisión del usuario).
- El panel del inicio muestra solo avisos y cuestionarios; las tareas ya aparecen en «Lo que sigue» y en la semana.
- La clase la define la **carrera** y el número de cuatrimestre o semestre; la materia es opcional (lo pidió el usuario).
- **Solo alumnos importados:** no hay registro abierto; evita que alguien use la matrícula de otro.
- La app instalable no funciona sin conexión (decisión del usuario): no hay service worker ni caché que ocupe RAM o disco.
- El aviso de privacidad es un borrador con los datos reales; la versión oficial la da la universidad.
- Una tarea devuelta con calificación cuenta como completada para el acceso condicional, aunque el alumno no la haya entregado.
- Cuestionarios: exámenes y encuestas; fechas, tiempo límite y visibilidad del resultado; un intento; calificaciones aparte (decisiones del usuario).
- **No se implementan videollamadas.** Las reuniones en línea se resuelven pegando el enlace en «Lugar y horario».
- Licenciaturas e ingenierías: cuatrimestrales. Bachillerato: semestral (lo confirmó el usuario).
- El sitio no publica facultades. Se agrupa como él: «Licenciaturas» (`LIC`), «Ingenierías» (`ING`) y «Preparatoria Rosario Castellanos» (`PREP`).
- Las facultades de ejemplo `FING` y `FCA` se integraron en `ING` y `LIC` con sus usuarios y carreras.
- Siglas de Arquitectura, Gastronomía y Turismo: `LA`, `LG` y `LT` (las indicó el usuario; el seed renombra las claves anteriores).
- Áreas de bachillerato con claves propias: `BEA`, `BFM`, `BQB`, `BSH`. El significado de «BPProfesional» no aparece en el sitio.
- Las materias se capturan desde Administración → Carreras; no se cargaron posgrados.
- La migración se generó con `prisma migrate diff`: el usuario de MySQL no puede crear la base temporal de `migrate dev`.

### Importante
- Detener la tarea del backend no siempre cierra el proceso de Node: revisar el puerto 4000 antes de relanzarlo.

### Pendiente
- Capturar las materias reales de cada carrera (pendiente por decisión del usuario).
- Que el área jurídica revise el aviso de privacidad.
- Fase 4 restante: plantillas, archivar cursos de periodos cerrados, respaldo y restauración de un curso, calendario con eventos propios y buscar en el repositorio desde la búsqueda global.
- Las tareas con «Visible desde» futura no envían aviso al abrirse (no hay tareas programadas en el servidor).

---

## 2026-11-22

### Qué se hizo
- **Lentitud al cambiar de pestaña:** se midió con la BD real. Con `next dev` cada página tarda **1–19 s la primera vez** (la está compilando) y 90–340 ms después; con el build de producción, **17–63 ms**. La lentitud es del modo desarrollo, no del código.
  - Pantallas de carga (`loading.tsx`) en `(dashboard)`, `(admin)` y dentro del curso: al cambiar de pestaña aparece al instante un esqueleto (el encabezado y las pestañas del curso se quedan), en lugar de que la página parezca congelada.
  - Script nuevo `npm run preview:frontend` para probar el frontend compilado como en producción.
- **Subidas a disco, no a RAM** (el servidor tiene 4 GB):
  - Multer escribe cada archivo en `storage/.tmp/` mientras se valida y luego se mueve a su lugar (rename, sin copiar). La validación (firma del archivo, UTF-8 y `sha256`) lee el disco por trozos.
  - Un interceptor global borra los temporales que no se guardaron.
  - Prueba real: 6 subidas simultáneas de 20 MB (120 MB) → el backend pasó de 111 a 115 MB de RAM. No quedaron temporales.
- **Límites nuevos:** entregas 10 MB por archivo (antes 20) y 5 por envío; material del curso 25 MB (antes 50); repositorio 25 MB. Nginx acepta 55 MB por petición.
- **Docker Compose para 4 GB:** `mem_limit` por servicio (MySQL 1 GB, backend y frontend 512 MB, Redis 160 MB, Nginx 96 MB) y `NODE_OPTIONS=--max-old-space-size=384`. MySQL con `innodb_buffer_pool_size=256M`, sin `performance_schema` y 60 conexiones: en la BD local bajó a ~205 MB.
- **Vista previa** (botón «Vista previa» con diálogo) para PDF e imágenes subidos y para enlaces de Google Drive/Docs, en el material del curso y en el repositorio.
- **Repositorio con enlaces:** además de subir archivo, se puede compartir un enlace de Drive. Migración `20261122120000_repositorio_enlaces` (columna `url`; los datos del archivo pasan a ser opcionales), aplicada en la BD local. Backend simulado actualizado.
- Tests del backend: 67 (2 nuevos: validación desde disco y enlaces en el repositorio).
- Commit `105536e`: subidas a disco, ajustes para 4 GB, enlaces de Drive y pantallas de carga.
- **Plan:** las funciones de Moodle quedaron en dos fases en `AVANCE.md`. La **Fase 3** (evaluación y seguimiento) tiene 11 funciones ordenadas por prioridad: cuestionarios, asistencia, rúbricas, libro de calificaciones avanzado, foros, mensajería, grupos dentro del curso, finalización y progreso, acceso condicional, videoclases (enlace externo) y bitácora de actividad. La **Fase 4** agrupa las actividades complementarias: taller, wiki, glosario, lección, libro, consulta, encuesta, H5P/SCORM, insignias, competencias, reutilizar y archivar cursos, informes, búsqueda global, PWA y ayuda.
- **Fase 2 completa:**
  - **Periodos** (`/administracion/periodos`): modelo `AcademicTerm` (tabla `periodos`) ligado a `Course.term` por su clave, con llave foránea. Tiene alta con fechas, «hacer actual» (solo uno a la vez), cerrar y reabrir; solo se borra un periodo sin cursos. Los docentes eligen el periodo de una lista (antes era texto libre) y solo se crean cursos en periodos abiertos.
  - **Catálogos** (`/administracion/catalogos`): árbol facultades → carreras → materias con alta, edición y borrado. No se borra lo que está en uso y el mensaje dice por qué. Las claves se guardan en mayúsculas. Si una carrera cambia de facultad, sus alumnos también.
  - **Cambiar docente** (`/administracion/cursos`): buscador de docentes activos; el nuevo docente recibe el aviso `COURSE_ASSIGNED`. La página ahora tiene búsqueda y filtro por periodo.
  - **Carrera de los alumnos:** se puede elegir al importar el Excel (para todos los nuevos) o asignar en bloque desde Usuarios (casillas, filtro por carrera y «Alumnos sin carrera»). Endpoint `PATCH /users/career`; solo afecta a alumnos.
  - Migración `20261122180000_periodos`: da de alta como periodo cada valor de `cursos.periodo` que ya existía, para no romper la llave foránea. El seed crea el semestre en curso si no hay ninguno.
  - Backend simulado: periodos y catálogo en modo lectura.
  - Tests del backend: 77 (10 nuevos). Prueba de punta a punta con la BD real: 31 comprobaciones correctas. Los datos de prueba se borraron.
- **Regresión completa con los tres roles** (sistema real, servidores en modo producción): 46 comprobaciones correctas. Incluye cuentas y cambio obligatorio de contraseña, cursos, tablón, material con PDF y Drive, tareas, entrega con archivo, calificación, CSV, avisos, calendario, repositorio, grupos, reportes, catálogo, asignar carrera, permisos y 44 páginas (HTML y navegación). Se revisó el log del frontend petición por petición. Errores encontrados y corregidos:
  - **La página de avisos fallaba** con «Element type is invalid» cuando había avisos de material nuevo, de recurso revisado o de curso asignado: el mapa de íconos solo tenía 4 de los 7 tipos. El error venía de la Fase 2 y no se veía con el backend simulado. Afectaba también a la campana del menú. Ahora están los 7 tipos y hay un ícono de respaldo (`notificationIcon`) para tipos futuros. Se comprobó que los demás enums del backend sí están completos en el frontend.
  - **Un id mal formado en la URL** (por ejemplo `/cursos/abc`) mostraba «Algo salió mal». Ahora `serverApi` trata el 400 de una consulta como «Página no encontrada».
- Commit `ffe0734`: Fase 2 completa (periodos, catálogos, cambio de docente y carrera de alumnos), corrección de avisos, plan de Moodle y reporte del día (`docs/REPORTE_2026-11-22.md`).

### Decisiones
- **Periodos:** la clave (`2026-2`) no se puede cambiar después de crearla. Cerrar un periodo solo impide crear cursos nuevos; los cursos existentes siguen igual. Dejarlos en solo lectura queda para la Fase 4 («archivar cursos»).
- **Catálogos:** nada se borra en cascada. Para borrar una facultad o una carrera, primero hay que vaciarla.
- **Archivos:** las entregas de tareas se siguen subiendo al servidor (quedan fijas y con `sha256`). En material y repositorio se puede subir archivo o compartir un enlace de Drive. Un enlace de Drive lo puede cambiar o borrar su dueño en cualquier momento, y para verse debe estar compartido como «Cualquier persona con el enlace».
- Servidor de producción: PC con Debian, 4 GB de RAM DDR4 y disco de 256 GB.

### Importante
- Con las pantallas de carga, una página inexistente responde HTTP 200 (muestra «Página no encontrada» y lleva `noindex`). Es el comportamiento de Next.js al enviar la página por partes.
- El inicio de sesión admite 5 intentos por minuto por IP: las pruebas automáticas deben reutilizar sesiones.
- Para probar la velocidad real usar `npm run preview:frontend`, no `npm run dev:frontend`.
- No compilar las imágenes en el servidor (`next build` puede usar más de 1.5 GB): construirlas en otra máquina y llevarlas.
- 256 GB de disco: vigilar el crecimiento de `storage/` y respaldarlo junto con la BD.
- Al recrear el contenedor de MySQL con `docker compose up -d mysql` se conservan los datos (volumen `mysql_data`).

### Pendiente
- El periodo `2026-2` se creó automáticamente desde los cursos existentes: falta ponerle nombre y fechas y marcarlo como actual en `/administracion/periodos`.
- La cuenta de prueba `PRUEBA-DOC` sigue desactivada (por eso no se le pueden asignar cursos).
- Activar swap (2–4 GB) en el servidor Debian.
- Respaldos automáticos de la BD y de `storage/` a otro disco.
- Mandar `Content-Disposition` con el nombre original al descargar (hoy se baja con el nombre UUID).
- Borrar o archivar los archivos de periodos cerrados.

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
- **Prueba de punta a punta con el sistema real** (frontend + backend + MySQL en Docker): 63 comprobaciones correctas para los tres roles: páginas, importación de alumnos, cambio obligatorio de contraseña, cursos, material, tareas, entregas con archivo, calificación y CSV, tablón, calendario, repositorio con moderación, grupos de estudio, reportes y desactivación de cuentas. Quedaron datos de prueba en la BD local: docente `PRUEBA-DOC`, alumnos `999900001` y `999900002` (este desactivado) y el «Curso de Prueba E2E».

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
- Si `npm run dev:backend` falla con `EADDRINUSE :::4000`, es que quedó otro backend encendido (por ejemplo `node dist/main`). Hay que cerrarlo antes de arrancar de nuevo.
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
