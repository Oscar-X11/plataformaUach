# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Alumnos** de licenciatura, ingeniería y preparatoria de la Universidad de los Altos de Chiapas (UACH). Revisan pendientes desde el celular y entregan trabajos desde PC/laptop; ambos dispositivos pesan por igual.
- **Docentes**: crean clases, publican avisos, material, tareas (con rúbrica y condiciones) y cuestionarios, califican y dan seguimiento a quien va en riesgo.
- **Administradores** académicos: importan alumnos desde Excel, dan de alta al personal, restablecen contraseñas, gestionan carreras y periodos, y consultan reportes y la bitácora.

## Product Purpose
Plataforma académica institucional tipo Moodle / Google Classroom: clases, tablón de avisos, material, tareas, cuestionarios, entregas, calificaciones con final, progreso, repositorio y grupos de estudio, en un solo lugar para la comunidad UACH. Éxito para el alumno: saber en segundos qué debe entregar y cuándo, y llegar a su curso sin buscar.

## Positioning
Plataforma propia de la UACH, con identidad institucional y catálogos académicos reales (niveles, carreras, materias, periodos), no una instancia genérica de un LMS externo.

## Operating Context
- Periodos académicos (`Course.term`): licenciaturas e ingenierías son cuatrimestrales; la preparatoria, semestral. Una clase se define por carrera y número de cuatrimestre o semestre; la materia es opcional. Código de invitación para unirse.
- Estados de entrega: pendiente, sin entregar, entregada, entregada tarde, calificada.
- Aprueba con 7 (licenciatura e ingeniería) o 6 (preparatoria). En la web se dice «nivel», nunca «facultad».
- Roles: STUDENT, TEACHER, ADMIN.
- Acceso con matrícula (alumnos) o número de empleado (personal). No hay correo electrónico: los alumnos no tienen correo institucional.

## Capabilities and Constraints
- Stack existente: Next.js 14 (App Router) + Tailwind 3 + lucide-react; backend NestJS + Prisma + MySQL; Nginx como proxy.
- El backend real cubre todas las pantallas (fases 0 a 3 y lo principal de la 4). El backend simulado (`npm run dev:demo`) solo cubre las fases 1 y 2.
- Servidor de 4 GB de RAM: nada que consuma memoria o disco de más (la app instalable no guarda nada sin conexión).
- Interfaz en español (es-MX).
- Sin correo: nada en la interfaz debe depender de enviar correos; los avisos viven dentro de la plataforma.

## Brand Commitments
- Nombre: "Plataforma UACH" / Universidad de los Altos de Chiapas.
- Paleta institucional definida en `tailwind.config.ts` (`uach.*`) y `src/app/globals.css`: teal, petróleo, esmeralda, tintas pizarra sobre blanco perla. Es obligatoria.

## Evidence on Hand
- El catálogo de niveles y carreras es el real de la UACH; todavía no hay alumnos, clases ni calificaciones reales (la plataforma no está en producción). Los datos de prueba se borran después de cada revisión.

## Product Principles
1. Lo urgente primero: fechas de entrega y atrasos antes que cualquier otra cosa.
2. Familiaridad sobre sorpresa: patrones que un alumno ya conoce de Classroom/Moodle.
3. Funciona igual de bien en el celular que en la PC.
4. Institucional y sobrio: la marca vive en los detalles, no en la decoración.
