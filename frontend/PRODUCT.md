# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Alumnos** de licenciatura de la Universidad de los Altos de Chiapas (UACH). Revisan pendientes desde el celular y entregan trabajos desde PC/laptop; ambos dispositivos pesan por igual.
- **Docentes**: crean cursos, publican avisos y tareas, califican.
- **Administradores** académicos: dan de alta al personal y restablecen contraseñas.

## Product Purpose
Plataforma académica institucional tipo Moodle / Google Classroom: cursos, tablón de avisos, tareas, entregas, calificaciones, recursos y grupos de estudio, en un solo lugar para la comunidad UACH. Éxito para el alumno: saber en segundos qué debe entregar y cuándo, y llegar a su curso sin buscar.

## Positioning
Plataforma propia de la UACH, con identidad institucional y catálogos académicos reales (facultades, carreras, materias, periodos), no una instancia genérica de un LMS externo.

## Operating Context
- Periodos académicos (`Course.term`), cursos ligados a materias y carreras, código de invitación para unirse.
- Estados de entrega: asignada, entregada, atrasada, calificada (`AssignmentStatus`).
- Roles: STUDENT, TEACHER, ADMIN.
- Acceso con matrícula (alumnos) o número de empleado (personal). No hay correo electrónico: los alumnos no tienen correo institucional.

## Capabilities and Constraints
- Stack existente: Next.js 14 (App Router) + Tailwind 3 + lucide-react; backend NestJS + Prisma + MySQL; Nginx como proxy.
- A 2026-11-19 el backend solo tiene autenticación; cursos, tareas, entregas y avisos aún no tienen endpoints. Las vistas usan datos de ejemplo tipados hasta que existan.
- Interfaz en español (es-MX).
- Sin correo: nada en la interfaz debe depender de enviar correos; los avisos viven dentro de la plataforma.

## Brand Commitments
- Nombre: "Plataforma UACH" / Universidad de los Altos de Chiapas.
- Paleta institucional definida en `tailwind.config.ts` (`uach.*`) y `src/app/globals.css`: teal, petróleo, esmeralda, tintas pizarra sobre blanco perla. Es obligatoria.

## Evidence on Hand
- No hay datos reales de cursos, alumnos ni calificaciones todavía. Cualquier dato mostrado es de ejemplo y no debe presentarse como real.

## Product Principles
1. Lo urgente primero: fechas de entrega y atrasos antes que cualquier otra cosa.
2. Familiaridad sobre sorpresa: patrones que un alumno ya conoce de Classroom/Moodle.
3. Funciona igual de bien en el celular que en la PC.
4. Institucional y sobrio: la marca vive en los detalles, no en la decoración.
