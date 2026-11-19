import type {
  CourseTone,
  DashboardAssignment,
  StudentDashboardData,
} from "@/lib/dashboard/types";

/**
 * DATOS DE EJEMPLO. El backend aún no expone cursos, tareas ni avisos.
 * Cuando exista `GET /dashboard/alumno`, sustituir `getStudentDashboard`
 * por la llamada real y borrar este archivo.
 *
 * Las fechas se calculan relativas a "ahora" para que la vista siempre
 * muestre casos de atraso, vencimiento cercano y semana próxima.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Chiapas usa UTC−6 todo el año (sin horario de verano desde 2022). */
const MX_OFFSET = 6 * HOUR;

/** Fecha a `offsetMs` de ahora; con `hour`, fija la hora local de Chiapas (hh:59). */
function at(now: number, offsetMs: number, hour?: number) {
  if (hour === undefined) return new Date(now + offsetMs).toISOString();
  const local = new Date(now + offsetMs - MX_OFFSET);
  local.setUTCHours(hour, 59, 0, 0);
  return new Date(local.getTime() + MX_OFFSET).toISOString();
}

const COURSES = [
  { id: "c-web", name: "Programación Web", code: "ISC-402", teacher: "Mtra. Laura Gómez Pérez", tone: "teal" },
  { id: "c-bd", name: "Bases de Datos II", code: "ISC-405", teacher: "Mtro. Rodrigo Hernández Ruiz", tone: "petrol" },
  { id: "c-est", name: "Probabilidad y Estadística", code: "CBA-210", teacher: "Dra. Mariana López Santiago", tone: "emerald" },
  { id: "c-red", name: "Redes de Computadoras", code: "ISC-411", teacher: "Mtro. Javier Díaz Moreno", tone: "tealDark" },
  { id: "c-eti", name: "Ética y Responsabilidad Social", code: "TRV-104", teacher: "Mtra. Sofía Martínez Cruz", tone: "ink" },
] as const satisfies readonly { id: string; name: string; code: string; teacher: string; tone: CourseTone }[];

type CourseId = (typeof COURSES)[number]["id"];
const course = (id: CourseId) => COURSES.find((c) => c.id === id)!;

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  const now = Date.now();
  const term = "Agosto – Diciembre 2026";

  const task = (
    id: string,
    courseId: CourseId,
    title: string,
    dueAt: string,
    status: DashboardAssignment["status"],
    points = 10,
  ): DashboardAssignment => {
    const c = course(courseId);
    return { id, title, courseId, courseName: c.name, tone: c.tone, dueAt, status, points };
  };

  const pending: DashboardAssignment[] = [
    task("t1", "c-bd", "Práctica 6: procedimientos almacenados", at(now, -2 * DAY, 23), "LATE"),
    task("t2", "c-web", "Proyecto parcial: API REST con autenticación", at(now, 3 * HOUR + 20 * 60_000), "ASSIGNED", 20),
    task("t3", "c-est", "Ejercicios 4.1–4.12: distribución normal", at(now, DAY, 18), "ASSIGNED"),
    task("t4", "c-red", "Reporte de laboratorio: subnetting VLSM", at(now, 3 * DAY, 23), "ASSIGNED"),
    task("t5", "c-eti", "Ensayo: el software y la privacidad de los datos", at(now, 5 * DAY, 23), "ASSIGNED"),
    task("t6", "c-web", "Cuestionario: hooks de React", at(now, 6 * DAY, 12), "ASSIGNED", 5),
    task("t7", "c-bd", "Diagrama entidad-relación del proyecto final", at(now, 12 * DAY, 23), "ASSIGNED", 15),
  ].sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const recentlySubmitted: DashboardAssignment[] = [
    task("s1", "c-red", "Cuestionario: modelo OSI", at(now, -DAY, 12), "GRADED"),
    task("s2", "c-est", "Tarea 3: probabilidad condicional", at(now, -DAY, 23), "SUBMITTED"),
    task("s3", "c-web", "Maqueta responsiva con CSS Grid", at(now, -2 * DAY, 23), "GRADED", 20),
    task("s4", "c-eti", "Lectura comentada: código de ética ACM", at(now, -3 * DAY, 18), "SUBMITTED"),
  ];

  const lastActivity: Partial<Record<CourseId, { label: string; at: string }>> = {
    "c-web": { label: "Abriste la rúbrica del proyecto parcial", at: at(now, -2 * HOUR) },
    "c-bd": { label: "Viste la práctica 6", at: at(now, -DAY) },
  };

  const nextDue = (id: CourseId) => {
    const next = pending.find((p) => p.courseId === id);
    return next ? { title: next.title, dueAt: next.dueAt } : null;
  };

  const progress: Record<CourseId, [number, number, number | null]> = {
    "c-web": [7, 9, 9.2],
    "c-bd": [5, 7, 8.1],
    "c-est": [6, 7, 7.6],
    "c-red": [4, 5, 8.8],
    "c-eti": [2, 3, null],
  };

  return {
    term,
    isSample: true,
    courses: COURSES.map((c) => ({
      id: c.id,
      name: c.name,
      subjectCode: c.code,
      term,
      teacherName: c.teacher,
      tone: c.tone,
      submittedCount: progress[c.id][0],
      assignmentCount: progress[c.id][1],
      average: progress[c.id][2],
      nextDue: nextDue(c.id),
      lastActivity: lastActivity[c.id] ?? null,
    })),
    pending,
    recentlySubmitted,
    announcements: [
      {
        id: "a1",
        courseId: "c-red",
        courseName: course("c-red").name,
        tone: course("c-red").tone,
        authorName: course("c-red").teacher,
        content:
          "La práctica del jueves será en el laboratorio de cómputo 3. Traigan su cable de consola y el reporte anterior impreso.",
        createdAt: at(now, -3 * HOUR),
        unread: true,
      },
      {
        id: "a2",
        courseId: "c-web",
        courseName: course("c-web").name,
        tone: course("c-web").tone,
        authorName: course("c-web").teacher,
        content:
          "Subí la rúbrica del proyecto parcial a Recursos. Revisen el apartado de pruebas: vale 4 de los 20 puntos.",
        createdAt: at(now, -DAY),
        unread: true,
      },
      {
        id: "a3",
        courseId: "c-est",
        courseName: course("c-est").name,
        tone: course("c-est").tone,
        authorName: course("c-est").teacher,
        content: "Asesoría opcional el viernes a las 12:00 en el aula B-12 para dudas del segundo parcial.",
        createdAt: at(now, -2 * DAY),
        unread: false,
      },
    ],
    recentGrades: [
      {
        id: "g1",
        assignmentTitle: "Práctica 5: vistas y disparadores",
        courseId: "c-bd",
        courseName: course("c-bd").name,
        tone: course("c-bd").tone,
        grade: 9,
        points: 10,
        gradedAt: at(now, -5 * HOUR),
      },
      {
        id: "g2",
        assignmentTitle: "Maqueta responsiva con CSS Grid",
        courseId: "c-web",
        courseName: course("c-web").name,
        tone: course("c-web").tone,
        grade: 18.5,
        points: 20,
        gradedAt: at(now, -2 * DAY),
      },
      {
        id: "g3",
        assignmentTitle: "Examen parcial 1",
        courseId: "c-est",
        courseName: course("c-est").name,
        tone: course("c-est").tone,
        grade: 7,
        points: 10,
        gradedAt: at(now, -4 * DAY),
      },
    ],
    stats: { overallAverage: 8.4, onTimeCount: 22, submittedCount: 24 },
  };
}
