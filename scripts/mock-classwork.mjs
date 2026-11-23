/**
 * Backend SIMULADO — trabajo de clase, tablón, notificaciones, perfil,
 * usuarios (admin) y dashboard. Imita los endpoints reales de backend/src
 * con datos en memoria. Solo para desarrollo sin base de datos.
 */
import { randomInt, randomUUID } from "node:crypto";

const DAY = 86_400_000;
const MB = 1024 * 1024;
const SUBMISSION_EXT = ["pdf", "png", "jpg", "jpeg", "webp", "docx", "xlsx", "pptx", "doc", "xls", "ppt", "zip", "txt", "csv"];
const IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];
const MIME = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8", zip: "application/zip",
};

// ───────────── Utilidades ─────────────

export function submissionState(dueAt, submission, now = new Date()) {
  const status = submission?.status ?? "ASSIGNED";
  if (status === "RETURNED") return "returned";
  if (status === "SUBMITTED") {
    return dueAt && submission.submittedAt && new Date(submission.submittedAt) > new Date(dueAt) ? "late" : "submitted";
  }
  return dueAt && new Date(dueAt) < now ? "missing" : "pending";
}

export function average(items) {
  const graded = items.filter((item) => item.grade !== null);
  const possible = graded.reduce((sum, item) => sum + item.points, 0);
  if (!possible) return null;
  return Math.round((graded.reduce((sum, item) => sum + item.grade, 0) / possible) * 100) / 10;
}

const tempPassword = () => {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
};

export async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Parser multipart mínimo (suficiente para el navegador). */
export function parseMultipart(buffer, contentType) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType ?? "");
  if (!boundary) return [];
  const delimiter = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
  const parts = [];
  let start = buffer.indexOf(delimiter) + delimiter.length;
  while (start > delimiter.length - 1) {
    const end = buffer.indexOf(delimiter, start);
    if (end === -1) break;
    const part = buffer.subarray(start + 2, end - 2); // quita \r\n inicial y final
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString("utf8");
      const name = /name="([^"]*)"/.exec(headers)?.[1];
      const filename = /filename="([^"]*)"/.exec(headers)?.[1];
      parts.push({ name, filename, data: part.subarray(headerEnd + 4) });
    }
    start = end + delimiter.length;
  }
  return parts;
}

export const extOf = (name) => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
const preview = (text) => (text.length > 60 ? `${text.slice(0, 59)}…` : text);

// ───────────── Registro de rutas ─────────────

export function createClasswork(ctx) {
  const { users, courses, findUser, courseRole, send, readJson, forbidden } = ctx;

  const assignments = [];
  const submissions = [];
  const files = new Map(); // fileUrl → { buffer, mime }
  const posts = [];
  const notifications = [];

  const notFound = (res, message) => send(res, 404, { statusCode: 404, message });
  const bad = (res, message) => send(res, 400, { statusCode: 400, message });
  const courseOf = (id) => courses.find((course) => course.id === id);
  const subOf = (assignmentId, studentId) =>
    submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);

  function notify(userIds, type, title, link) {
    for (const userId of new Set(userIds)) {
      notifications.push({ id: randomUUID(), userId, type, title, link, readAt: null, createdAt: new Date().toISOString() });
    }
  }

  function submissionView(assignment, row, forStudent) {
    const returned = row?.status === "RETURNED";
    return {
      id: row?.id ?? null,
      status: row?.status ?? "ASSIGNED",
      state: submissionState(assignment.dueAt, row),
      grade: !forStudent || returned ? (row?.grade ?? null) : null,
      feedback: !forStudent || returned ? (row?.feedback ?? null) : null,
      submittedAt: row?.submittedAt ?? null,
      returnedAt: row?.returnedAt ?? null,
      files: row?.files ?? [],
    };
  }

  function assignmentView(assignment, role, user) {
    const { teacherId: _t, ...base } = assignment;
    if (role === "student") {
      return { ...base, myRole: role, mySubmission: submissionView(assignment, subOf(assignment.id, user.id), true), stats: null };
    }
    const course = courseOf(assignment.courseId);
    const rows = submissions.filter((s) => s.assignmentId === assignment.id);
    return {
      ...base,
      myRole: role,
      mySubmission: null,
      stats: {
        students: course.enrollments.length,
        submitted: rows.filter((s) => s.status === "SUBMITTED").length,
        returned: rows.filter((s) => s.status === "RETURNED").length,
      },
    };
  }

  /** Tarea + rol del usuario en su curso; responde 404 si no pertenece. */
  function resolve(res, assignmentId, user) {
    const assignment = assignments.find((a) => a.id === assignmentId);
    const course = assignment && courseOf(assignment.courseId);
    const role = course && courseRole(course, user);
    if (!assignment || !role) {
      notFound(res, "Tarea no encontrada");
      return null;
    }
    return { assignment, course, role };
  }

  function ensureDraft(res, assignmentId, studentId) {
    let row = subOf(assignmentId, studentId);
    if (!row) {
      row = { id: randomUUID(), assignmentId, studentId, status: "ASSIGNED", grade: null, feedback: null, submittedAt: null, returnedAt: null, files: [], updatedAt: new Date().toISOString() };
      submissions.push(row);
    }
    if (row.status === "SUBMITTED") return bad(res, "Anula la entrega para modificarla"), null;
    if (row.status === "RETURNED") return bad(res, "La tarea ya fue calificada y devuelta"), null;
    return row;
  }

  const sortByDue = (a, b) =>
    (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);

  // ───────── Datos de ejemplo ─────────
  const ana = users.get("A2023-0148").user;
  const luis = users.get("A2023-0200").user;
  const now = Date.now();
  const iso = (offset) => new Date(now + offset).toISOString();
  const seed = (course, title, instructions, dueOffset, points = 10) => {
    const assignment = {
      id: randomUUID(), courseId: course.id, teacherId: course.teacherId, title, instructions,
      dueAt: dueOffset === null ? null : iso(dueOffset), points, createdAt: iso(-10 * DAY), updatedAt: iso(-10 * DAY),
    };
    assignments.push(assignment);
    return assignment;
  };
  const [bd, ed] = courses;
  const a1 = seed(bd, "Práctica 1: modelo entidad-relación", "Entrega el diagrama E-R del caso de la biblioteca en PDF.", -5 * DAY);
  const a2 = seed(bd, "Práctica 2: consultas SQL", "Resuelve los 10 ejercicios del documento y entrega tu archivo .sql como .txt.", 2 * DAY);
  seed(bd, "Proyecto final: base de datos de tu elección", "Equipo de 3. Entrega propuesta, modelo y script.", 20 * DAY, 20);
  const a4 = seed(ed, "Tarea 1: listas enlazadas", "Implementa una lista doblemente enlazada.", -2 * DAY);
  seed(ed, "Lectura: árboles AVL", "Lee el capítulo 6 y anota tus dudas.", null, 5);
  submissions.push(
    { id: randomUUID(), assignmentId: a1.id, studentId: ana.id, status: "RETURNED", grade: 9, feedback: "Muy buen diagrama; revisa la cardinalidad de préstamo.", submittedAt: iso(-6 * DAY), returnedAt: iso(-1 * DAY), files: [], updatedAt: iso(-1 * DAY) },
    { id: randomUUID(), assignmentId: a4.id, studentId: luis.id, status: "SUBMITTED", grade: null, feedback: null, submittedAt: iso(-3 * DAY), returnedAt: null, files: [], updatedAt: iso(-3 * DAY) },
  );
  void a2;
  posts.push({
    id: randomUUID(), courseId: bd.id, authorId: bd.teacherId, content: "Bienvenidos al curso. La práctica 2 ya está publicada; cualquier duda, coméntenla aquí.",
    createdAt: iso(-2 * DAY), comments: [{ id: randomUUID(), authorId: ana.id, content: "¿Se puede entregar en .sql?", createdAt: iso(-1 * DAY) }],
  });
  notify([ana.id], "SUBMISSION_RETURNED", `Calificaron «${a1.title}»: 9/10`, `/cursos/${bd.id}/tareas/${a1.id}`);
  notify([ana.id, luis.id], "POST_CREATED", `Nuevo aviso en ${bd.name}: Bienvenidos al curso…`, `/cursos/${bd.id}`);

  // ───────── Vistas ─────────

  const author = (id) => {
    const user = findUser(id);
    return { id: user.id, fullName: user.fullName, role: user.role };
  };
  const postView = (post) => ({
    id: post.id, content: post.content, createdAt: post.createdAt, author: author(post.authorId),
    comments: post.comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, author: author(c.authorId) })),
  });

  function gradesFor(course, role, user) {
    const list = assignments.filter((a) => a.courseId === course.id).sort(sortByDue);
    if (role === "student") {
      const items = list.map((a) => {
        const row = subOf(a.id, user.id);
        const returned = row?.status === "RETURNED";
        return { id: a.id, title: a.title, dueAt: a.dueAt, points: a.points, state: submissionState(a.dueAt, row), grade: returned ? row.grade : null, feedback: returned ? row.feedback : null };
      });
      return { role, assignments: items, average: average(items) };
    }
    const students = course.enrollments
      .map((e) => findUser(e.studentId))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
      .map((student) => {
        const cells = list.map((a) => {
          const row = subOf(a.id, student.id);
          return { assignmentId: a.id, state: submissionState(a.dueAt, row), grade: row?.grade ?? null, returned: row?.status === "RETURNED", points: a.points };
        });
        return { id: student.id, fullName: student.fullName, username: student.username, cells, average: average(cells.map((c) => ({ grade: c.returned ? c.grade : null, points: c.points }))) };
      });
    return { role, assignments: list.map(({ id, title, dueAt, points }) => ({ id, title, dueAt, points })), students };
  }

  // ───────── Rutas: [método, patrón, manejador(req, res, params, user)] ─────────

  const routes = [
    ["GET", /^\/courses\/([^/]+)\/assignments$/, (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      send(res, 200, assignments.filter((a) => a.courseId === courseId).sort(sortByDue).map((a) => assignmentView(a, role, user)));
    }],

    ["POST", /^\/courses\/([^/]+)\/assignments$/, async (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      if (role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      const body = await readJson(req);
      const title = String(body.title ?? "").trim();
      const points = Number(body.points ?? 10);
      const errors = [];
      if (title.length < 3) errors.push("El título debe tener al menos 3 caracteres");
      if (!Number.isInteger(points) || points < 1 || points > 100) errors.push("Los puntos deben ser un entero de 1 a 100");
      if (errors.length) return bad(res, errors);
      const assignment = {
        id: randomUUID(), courseId, teacherId: course.teacherId, title, instructions: String(body.instructions ?? "").trim(),
        dueAt: body.dueAt ? new Date(body.dueAt).toISOString() : null, points, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      assignments.push(assignment);
      notify(course.enrollments.map((e) => e.studentId), "ASSIGNMENT_CREATED", `Nueva tarea en ${course.name}: ${title}`, `/cursos/${courseId}/tareas/${assignment.id}`);
      send(res, 201, assignmentView(assignment, role, user));
    }],

    ["GET", /^\/assignments\/([^/]+)$/, (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (found) send(res, 200, assignmentView(found.assignment, found.role, user));
    }],

    ["PATCH", /^\/assignments\/([^/]+)$/, async (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      if (found.role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      const body = await readJson(req);
      const { assignment } = found;
      if (body.title !== undefined) assignment.title = String(body.title).trim();
      if (body.instructions !== undefined) assignment.instructions = String(body.instructions).trim();
      if (body.dueAt !== undefined) assignment.dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;
      if (body.points !== undefined) assignment.points = Number(body.points);
      assignment.updatedAt = new Date().toISOString();
      send(res, 200, assignmentView(assignment, found.role, user));
    }],

    ["DELETE", /^\/assignments\/([^/]+)$/, (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      if (found.role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      assignments.splice(assignments.indexOf(found.assignment), 1);
      for (let i = submissions.length - 1; i >= 0; i--) if (submissions[i].assignmentId === id) submissions.splice(i, 1);
      send(res, 204);
    }],

    ["POST", /^\/assignments\/([^/]+)\/submission\/files$/, async (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      if (found.role !== "student") return forbidden(res, "Solo los alumnos inscritos entregan tareas");
      const parts = parseMultipart(await readRaw(req), req.headers["content-type"]).filter((p) => p.filename);
      if (!parts.length) return bad(res, "Selecciona al menos un archivo");
      for (const part of parts) {
        const ext = extOf(part.filename);
        if (!SUBMISSION_EXT.includes(ext)) return bad(res, `«${part.filename}»: tipo de archivo no permitido.`);
        if (part.data.length > 10 * MB) return bad(res, `«${part.filename}» pesa más de 10 MB.`);
        if (!part.data.length) return bad(res, `«${part.filename}» está vacío.`);
      }
      const row = ensureDraft(res, id, user.id);
      if (!row) return;
      if (row.files.length + parts.length > 10) return bad(res, `Una entrega admite hasta 10 archivos (ya tienes ${row.files.length}).`);
      for (const part of parts) {
        const ext = extOf(part.filename);
        const fileUrl = `submissions/${found.course.id}/${id}/${randomUUID()}.${ext}`;
        files.set(fileUrl, { buffer: part.data, mime: MIME[ext] ?? "application/octet-stream" });
        row.files.push({ id: randomUUID(), fileUrl, originalName: part.filename, mimeType: MIME[ext] ?? "application/octet-stream", size: part.data.length, createdAt: new Date().toISOString() });
      }
      row.updatedAt = new Date().toISOString();
      send(res, 201, submissionView(found.assignment, row, true));
    }],

    ["DELETE", /^\/assignments\/([^/]+)\/submission\/files\/([^/]+)$/, (req, res, [id, fileId], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      const row = subOf(id, user.id);
      const file = row?.files.find((f) => f.id === fileId);
      if (!file) return notFound(res, "Archivo no encontrado");
      if (row.status !== "ASSIGNED") return bad(res, "Anula la entrega para modificarla");
      row.files = row.files.filter((f) => f.id !== fileId);
      files.delete(file.fileUrl);
      send(res, 200, submissionView(found.assignment, row, true));
    }],

    ["POST", /^\/assignments\/([^/]+)\/submission\/turn-in$/, (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      if (found.role !== "student") return forbidden(res, "Solo los alumnos inscritos entregan tareas");
      const row = ensureDraft(res, id, user.id);
      if (!row) return;
      Object.assign(row, { status: "SUBMITTED", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      send(res, 200, submissionView(found.assignment, row, true));
    }],

    ["POST", /^\/assignments\/([^/]+)\/submission\/unsubmit$/, (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      const row = subOf(id, user.id);
      if (row?.status !== "SUBMITTED") {
        return bad(res, row?.status === "RETURNED" ? "La tarea ya fue calificada; no se puede anular la entrega" : "La tarea no está entregada");
      }
      Object.assign(row, { status: "ASSIGNED", submittedAt: null, updatedAt: new Date().toISOString() });
      send(res, 200, submissionView(found.assignment, row, true));
    }],

    ["GET", /^\/assignments\/([^/]+)\/submissions$/, (req, res, [id], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      if (found.role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      const rows = found.course.enrollments
        .map((e) => findUser(e.studentId))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
        .map((student) => ({
          student: { id: student.id, fullName: student.fullName, username: student.username },
          submission: submissionView(found.assignment, subOf(id, student.id), false),
        }));
      send(res, 200, rows);
    }],

    ["PATCH", /^\/assignments\/([^/]+)\/submissions\/([^/]+)$/, async (req, res, [id, studentId], user) => {
      const found = resolve(res, id, user);
      if (!found) return;
      if (found.role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      if (!found.course.enrollments.some((e) => e.studentId === studentId)) return notFound(res, "El alumno no está inscrito en el curso");
      const body = await readJson(req);
      if (body.grade !== undefined && body.grade !== null) {
        const grade = Number(body.grade);
        if (!Number.isFinite(grade) || grade < 0) return bad(res, ["La calificación no puede ser negativa"]);
        if (grade > found.assignment.points) return bad(res, `La calificación máxima es ${found.assignment.points}`);
      }
      let row = subOf(id, studentId);
      if (!row) {
        row = { id: randomUUID(), assignmentId: id, studentId, status: "ASSIGNED", grade: null, feedback: null, submittedAt: null, returnedAt: null, files: [] };
        submissions.push(row);
      }
      if (body.grade !== undefined) row.grade = body.grade === null ? null : Number(body.grade);
      if (body.feedback !== undefined) row.feedback = String(body.feedback).trim() || null;
      if (body.return) {
        Object.assign(row, { status: "RETURNED", returnedAt: new Date().toISOString() });
        notify([studentId], "SUBMISSION_RETURNED",
          row.grade === null ? `Te devolvieron «${found.assignment.title}» (${found.course.name})` : `Calificaron «${found.assignment.title}»: ${row.grade}/${found.assignment.points}`,
          `/cursos/${found.course.id}/tareas/${id}`);
      }
      row.updatedAt = new Date().toISOString();
      send(res, 200, submissionView(found.assignment, row, false));
    }],

    ["GET", /^\/classwork\/overview$/, (req, res, _p, user) => {
      if (user.role === "STUDENT") {
        const mine = courses.filter((c) => c.enrollments.some((e) => e.studentId === user.id));
        const items = assignments
          .filter((a) => mine.some((c) => c.id === a.courseId))
          .sort(sortByDue)
          .map((a) => ({ id: a.id, title: a.title, dueAt: a.dueAt, points: a.points, course: { id: a.courseId, name: courseOf(a.courseId).name }, submission: submissionView(a, subOf(a.id, user.id), true) }));
        return send(res, 200, { role: "student", items });
      }
      const items = submissions
        .filter((s) => s.status === "SUBMITTED")
        .map((s) => ({ s, a: assignments.find((a) => a.id === s.assignmentId) }))
        .filter(({ a }) => a && (user.role === "ADMIN" || courseOf(a.courseId).teacherId === user.id))
        .map(({ s, a }) => ({
          id: a.id, title: a.title, dueAt: a.dueAt, points: a.points, course: { id: a.courseId, name: courseOf(a.courseId).name },
          student: { id: s.studentId, fullName: findUser(s.studentId).fullName }, submittedAt: s.submittedAt, state: submissionState(a.dueAt, s),
        }));
      send(res, 200, { role: "teacher", items });
    }],

    ["GET", /^\/courses\/([^/]+)\/grades$/, (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      send(res, 200, gradesFor(course, role, user));
    }],

    ["GET", /^\/courses\/([^/]+)\/grades\/export$/, (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      if (role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      const data = gradesFor(course, role, user);
      const cell = (v) => {
        if (v === null || v === undefined) return "";
        let t = String(v);
        if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
        return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
      };
      const rows = [
        ["Matrícula", "Nombre", ...data.assignments.map((a) => `${a.title} (/${a.points})`), "Promedio (0-10)"],
        ...data.students.map((s) => [s.username, s.fullName, ...s.cells.map((c) => c.grade), s.average]),
      ];
      res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="calificaciones.csv"' });
      res.end("﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n");
    }],

    // Tablón
    ["GET", /^\/courses\/([^/]+)\/posts$/, (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      const list = posts.filter((p) => p.courseId === courseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      send(res, 200, { canPost: role !== "student", posts: list.map(postView) });
    }],

    ["POST", /^\/courses\/([^/]+)\/posts$/, async (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      if (role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto");
      const content = String((await readJson(req)).content ?? "").trim();
      if (!content) return bad(res, ["Escribe el aviso"]);
      const post = { id: randomUUID(), courseId, authorId: user.id, content, createdAt: new Date().toISOString(), comments: [] };
      posts.push(post);
      notify(course.enrollments.map((e) => e.studentId), "POST_CREATED", `Nuevo aviso en ${course.name}: ${preview(content)}`, `/cursos/${courseId}`);
      send(res, 201, postView(post));
    }],

    ["DELETE", /^\/posts\/([^/]+)$/, (req, res, [id], user) => {
      const post = posts.find((p) => p.id === id);
      const role = post && courseRole(courseOf(post.courseId), user);
      if (!role) return notFound(res, "Aviso no encontrado");
      if (post.authorId !== user.id && role === "student") return forbidden(res, "Solo puedes borrar lo que escribiste");
      posts.splice(posts.indexOf(post), 1);
      send(res, 204);
    }],

    ["POST", /^\/posts\/([^/]+)\/comments$/, async (req, res, [id], user) => {
      const post = posts.find((p) => p.id === id);
      const role = post && courseRole(courseOf(post.courseId), user);
      if (!role) return notFound(res, "Aviso no encontrado");
      const content = String((await readJson(req)).content ?? "").trim();
      if (!content) return bad(res, ["Escribe el comentario"]);
      const comment = { id: randomUUID(), authorId: user.id, content, createdAt: new Date().toISOString() };
      post.comments.push(comment);
      if (post.authorId !== user.id) {
        notify([post.authorId], "COMMENT_CREATED", `${user.fullName} comentó tu aviso: ${preview(content)}`, `/cursos/${post.courseId}`);
      }
      send(res, 201, { ...comment, authorId: undefined, author: author(user.id) });
    }],

    ["DELETE", /^\/comments\/([^/]+)$/, (req, res, [id], user) => {
      const post = posts.find((p) => p.comments.some((c) => c.id === id));
      const role = post && courseRole(courseOf(post.courseId), user);
      if (!role) return notFound(res, "Comentario no encontrado");
      const comment = post.comments.find((c) => c.id === id);
      if (comment.authorId !== user.id && role === "student") return forbidden(res, "Solo puedes borrar lo que escribiste");
      post.comments = post.comments.filter((c) => c.id !== id);
      send(res, 204);
    }],

    // Notificaciones
    ["GET", /^\/notifications$/, (req, res, _p, user) => {
      const mine = notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      send(res, 200, { items: mine.slice(0, 50).map(({ userId: _u, ...n }) => n), unreadCount: mine.filter((n) => !n.readAt).length });
    }],
    ["POST", /^\/notifications\/read-all$/, (req, res, _p, user) => {
      const type = new URL(req.url, "http://x").searchParams.get("type");
      for (const n of notifications) if (n.userId === user.id && !n.readAt && (!type || n.type === type)) n.readAt = new Date().toISOString();
      send(res, 204);
    }],
    ["POST", /^\/notifications\/([^/]+)\/read$/, (req, res, [id], user) => {
      const n = notifications.find((item) => item.id === id && item.userId === user.id);
      if (n && !n.readAt) n.readAt = new Date().toISOString();
      send(res, 204);
    }],

    // Perfil
    ["GET", /^\/profile$/, (req, res, _p, user) => send(res, 200, profileView(user))],
    ["POST", /^\/profile\/avatar$/, async (req, res, _p, user) => {
      const part = parseMultipart(await readRaw(req), req.headers["content-type"]).find((p) => p.filename);
      if (!part) return bad(res, "Selecciona una imagen");
      const ext = extOf(part.filename);
      if (!IMAGE_EXT.includes(ext)) return bad(res, `«${part.filename}»: tipo de archivo no permitido. Usa png, jpg, jpeg, webp.`);
      if (part.data.length > 2 * MB) return bad(res, `«${part.filename}» pesa más de 2 MB.`);
      if (user.avatarUrl) files.delete(user.avatarUrl);
      user.avatarUrl = `avatars/${user.id}/${randomUUID()}.${ext}`;
      files.set(user.avatarUrl, { buffer: part.data, mime: MIME[ext] });
      send(res, 201, profileView(user));
    }],
    ["DELETE", /^\/profile\/avatar$/, (req, res, _p, user) => {
      if (user.avatarUrl) files.delete(user.avatarUrl);
      user.avatarUrl = null;
      send(res, 200, profileView(user));
    }],

    // Archivos (en el backend real se validan permisos por área)
    ["GET", /^\/files\/(.+)$/, (req, res, [path]) => {
      const file = files.get(decodeURIComponent(path));
      if (!file) return notFound(res, "Archivo no encontrado");
      res.writeHead(200, { "Content-Type": file.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
      res.end(file.buffer);
    }],

    // Administración de usuarios
    ["GET", /^\/users$/, (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const params = new URL(req.url, "http://x").searchParams;
      const search = (params.get("search") ?? "").trim().toLowerCase();
      const role = params.get("role");
      const page = Math.max(1, Number(params.get("page") ?? 1));
      const all = [...users.values()]
        .map((e) => e.user)
        .filter((u) => (!role || u.role === role) && (!search || u.fullName.toLowerCase().includes(search) || u.username.toLowerCase().includes(search)))
        .sort((a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName, "es"));
      const items = all.slice((page - 1) * 25, page * 25).map(adminRow);
      send(res, 200, { items, total: all.length, page, pageSize: 25 });
    }],
    ["POST", /^\/users$/, async (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const body = await readJson(req);
      const username = String(body.username ?? "").trim().toUpperCase();
      const fullName = String(body.fullName ?? "").trim();
      const errors = [];
      if (!/^[A-Z0-9-]{3,30}$/.test(username)) errors.push("La matrícula o número de empleado solo admite letras, números y guiones (3 a 30)");
      if (fullName.length < 3) errors.push("Escribe el nombre completo");
      if (!["TEACHER", "ADMIN"].includes(body.role)) errors.push("El rol debe ser docente o administrador");
      if (errors.length) return bad(res, errors);
      if (users.has(username)) return send(res, 409, { statusCode: 409, message: "Ya existe una cuenta con ese número de empleado" });
      const temporaryPassword = tempPassword();
      const created = { id: randomUUID(), username, fullName, role: body.role, status: "ACTIVE", mustChangePassword: true, avatarUrl: null, facultyId: null, careerId: null, createdAt: new Date().toISOString() };
      users.set(username, { password: temporaryPassword, user: created });
      send(res, 201, { user: adminRow(created), temporaryPassword });
    }],
    // Mismas reglas que backend/src/users/student-import.ts
    ["POST", /^\/users\/import-students$/, async (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const body = await readJson(req);
      if (!Array.isArray(body.rows) || body.rows.length === 0) return bad(res, ["El archivo no tiene alumnos"]);
      const collapse = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
      const plain = (v) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
      const seen = new Map();
      const rows = body.rows.map((row) => {
        const username = collapse(row.matricula);
        const nombre = collapse(row.nombre);
        const fullName = [nombre, collapse(row.apPat), collapse(row.apMat)].filter(Boolean).join(" ");
        const base = { line: row.line, username, fullName };
        const fail = (error) => ({ ...base, status: "error", error });
        if (!username) return fail("Falta la matrícula");
        if (!/^\d{3,30}$/.test(username)) return fail("La matrícula solo debe tener números");
        if (!nombre) return fail("Falta el nombre");
        if (!plain(nombre.split(" ")[0])) return fail("El nombre no tiene letras válidas");
        if (!collapse(row.apPat)) return fail("Falta el apellido paterno");
        if (seen.has(username)) return fail(`Matrícula repetida (ya aparece en la fila ${seen.get(username)})`);
        seen.set(username, row.line);
        if (users.has(username)) return { ...base, status: "exists" };
        return { ...base, status: "new", nombre };
      });
      const toCreate = rows.filter((row) => row.status === "new");
      if (!body.dryRun && toCreate.length > 100) return bad(res, "Importa como máximo 100 alumnos por petición");
      for (const row of rows) {
        if (row.status === "new" && !body.dryRun) {
          row.initialPassword = `${row.username.slice(-3)}${plain(row.nombre.split(" ")[0])}`;
          const created = { id: randomUUID(), username: row.username, fullName: row.fullName, role: "STUDENT", status: "ACTIVE", mustChangePassword: true, avatarUrl: null, facultyId: null, careerId: null, createdAt: new Date().toISOString() };
          users.set(row.username, { password: row.initialPassword, user: created });
          row.status = "created";
        }
        delete row.nombre;
      }
      const count = (status) => rows.filter((row) => row.status === status).length;
      send(res, 200, { rows, summary: { new: count("new"), created: count("created"), exists: count("exists"), errors: count("error") } });
    }],
    ["PATCH", /^\/users\/([^/]+)\/status$/, async (req, res, [id], user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const { status } = await readJson(req);
      if (!["ACTIVE", "INACTIVE", "GRADUATED"].includes(status)) return bad(res, ["Estado inválido"]);
      if (id === user.id && status !== "ACTIVE") return bad(res, "No puedes desactivar tu propia cuenta");
      const target = findUser(id);
      if (!target) return notFound(res, "El usuario no existe");
      target.status = status;
      send(res, 200, adminRow(target));
    }],

    // Dashboards
    ["GET", /^\/dashboard\/student$/, (req, res, _p, user) => {
      if (user.role !== "STUDENT") return forbidden(res);
      send(res, 200, studentDashboard(user));
    }],
    ["GET", /^\/dashboard\/teacher$/, (req, res, _p, user) => {
      if (user.role !== "TEACHER") return forbidden(res);
      send(res, 200, teacherDashboard(user));
    }],
    ["GET", /^\/dashboard\/admin$/, (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const all = [...users.values()].map((e) => e.user);
      const count = (role) => all.filter((u) => u.role === role).length;
      send(res, 200, {
        users: { students: count("STUDENT"), teachers: count("TEACHER"), admins: count("ADMIN"), inactive: all.filter((u) => u.status !== "ACTIVE").length },
        courses: courses.length,
        assignments: assignments.length,
        submissions: submissions.filter((s) => s.status !== "ASSIGNED").length,
        recentUsers: all.slice(-6).reverse().map((u) => ({ id: u.id, fullName: u.fullName, username: u.username, role: u.role, createdAt: u.createdAt ?? new Date(now - 30 * DAY).toISOString() })),
      });
    }],
  ];

  function adminRow(u) {
    const career = u.careerId === "car-isc" ? { name: "Ingeniería en Sistemas Computacionales", code: "ISC" } : null;
    return { id: u.id, username: u.username, fullName: u.fullName, role: u.role, status: u.status, mustChangePassword: u.mustChangePassword, createdAt: u.createdAt ?? new Date(now - 30 * DAY).toISOString(), career };
  }

  function profileView(user) {
    const faculty = user.facultyId ? { id: user.facultyId, name: "Facultad de Ingeniería" } : null;
    const career = user.careerId ? { id: user.careerId, name: "Ingeniería en Sistemas Computacionales" } : null;
    const courseCount = user.role === "STUDENT"
      ? courses.filter((c) => c.enrollments.some((e) => e.studentId === user.id)).length
      : courses.filter((c) => c.teacherId === user.id).length;
    return { id: user.id, username: user.username, fullName: user.fullName, role: user.role, status: user.status, avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt ?? new Date(now - 90 * DAY).toISOString(), faculty, career, courseCount };
  }

  function studentDashboard(user) {
    const current = new Date();
    const mine = courses.filter((c) => c.enrollments.some((e) => e.studentId === user.id));
    const pending = [];
    const recentlySubmitted = [];
    const recentGrades = [];
    const allGrades = [];
    let submittedCount = 0;
    let onTimeCount = 0;
    const cards = mine.map((course) => {
      const teacher = findUser(course.teacherId);
      const list = assignments.filter((a) => a.courseId === course.id);
      const base = { courseId: course.id, courseName: course.name };
      let done = 0;
      let lastActivity = null;
      const inCourse = [];
      for (const a of list) {
        const row = subOf(a.id, user.id);
        const state = submissionState(a.dueAt, row, current);
        const item = { id: a.id, title: a.title, points: a.points, ...base };
        if (state === "pending" || state === "missing") {
          if (a.dueAt) pending.push({ ...item, dueAt: a.dueAt, status: state === "missing" ? "LATE" : "ASSIGNED" });
        } else {
          done++;
          submittedCount++;
          if (state !== "late") onTimeCount++;
          const due = a.dueAt ?? row.submittedAt;
          if (due && Math.abs(new Date(due) - current) <= 7 * DAY) recentlySubmitted.push({ ...item, dueAt: due, status: state === "returned" ? "GRADED" : "SUBMITTED" });
        }
        if (row?.status === "RETURNED") {
          inCourse.push({ grade: row.grade, points: a.points });
          allGrades.push({ grade: row.grade, points: a.points });
          if (row.grade !== null) recentGrades.push({ id: a.id, assignmentTitle: a.title, ...base, grade: row.grade, points: a.points, gradedAt: row.returnedAt });
        }
        if (row && (!lastActivity || row.updatedAt > lastActivity.at)) {
          lastActivity = { label: row.status === "ASSIGNED" ? `Trabajaste en «${a.title}»` : `Entregaste «${a.title}»`, at: row.updatedAt };
        }
      }
      const next = pending.filter((p) => p.courseId === course.id && p.status === "ASSIGNED").sort((x, y) => x.dueAt.localeCompare(y.dueAt))[0];
      const subject = ctx.SUBJECTS.find((s) => s.id === course.subjectId);
      return {
        id: course.id, name: course.name, subjectCode: subject.code, term: course.term, teacherName: teacher.fullName,
        submittedCount: done, assignmentCount: list.length, average: average(inCourse),
        nextDue: next ? { title: next.title, dueAt: next.dueAt } : null, lastActivity,
      };
    });
    const unreadPosts = notifications.filter((n) => n.userId === user.id && n.type === "POST_CREATED" && !n.readAt);
    const announcements = posts
      .filter((p) => mine.some((c) => c.id === p.courseId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((p) => ({
        id: p.id, courseId: p.courseId, courseName: courseOf(p.courseId).name, authorName: findUser(p.authorId).fullName,
        content: p.content, createdAt: p.createdAt, unread: unreadPosts.some((n) => n.link === `/cursos/${p.courseId}`),
      }));
    return {
      term: [...new Set(mine.map((c) => c.term))].join(" · "),
      isSample: false,
      courses: cards,
      pending: pending.sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      recentlySubmitted,
      announcements,
      recentGrades: recentGrades.sort((a, b) => b.gradedAt.localeCompare(a.gradedAt)).slice(0, 5),
      stats: { overallAverage: average(allGrades), onTimeCount, submittedCount },
    };
  }

  function teacherDashboard(user) {
    const current = new Date();
    const mine = courses.filter((c) => c.teacherId === user.id);
    const upcoming = mine
      .flatMap((course) => assignments
        .filter((a) => a.courseId === course.id && a.dueAt && new Date(a.dueAt) >= current && new Date(a.dueAt) - current <= 14 * DAY)
        .map((a) => ({
          id: a.id, title: a.title, dueAt: a.dueAt, courseId: course.id, courseName: course.name,
          submitted: submissions.filter((s) => s.assignmentId === a.id && s.status !== "ASSIGNED").length, students: course.enrollments.length,
        })))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const toReview = submissions
      .filter((s) => s.status === "SUBMITTED")
      .map((s) => ({ s, a: assignments.find((a) => a.id === s.assignmentId) }))
      .filter(({ a }) => a && mine.some((c) => c.id === a.courseId))
      .map(({ s, a }) => ({
        assignmentId: a.id, title: a.title, courseId: a.courseId, courseName: courseOf(a.courseId).name,
        student: { id: s.studentId, fullName: findUser(s.studentId).fullName }, submittedAt: s.submittedAt, late: submissionState(a.dueAt, s) === "late",
      }));
    return {
      courses: mine.map((course) => {
        const list = assignments.filter((a) => a.courseId === course.id);
        const subject = ctx.SUBJECTS.find((s) => s.id === course.subjectId);
        return {
          id: course.id, name: course.name, term: course.term, subjectCode: subject.code, studentCount: course.enrollments.length,
          assignmentCount: list.length, toReview: submissions.filter((s) => s.status === "SUBMITTED" && list.some((a) => a.id === s.assignmentId)).length,
        };
      }),
      upcoming,
      toReview,
    };
  }

  /** Atiende la petición si alguna ruta coincide. Devuelve true si la atendió. */
  async function handle(req, res, path, user) {
    for (const [method, pattern, handler] of routes) {
      if (req.method !== method) continue;
      const match = pattern.exec(path);
      if (match) {
        await handler(req, res, match.slice(1), user);
        return true;
      }
    }
    return false;
  }

  // El estado se comparte con mock-institutional.mjs (calendario, reportes, archivos).
  return { handle, state: { assignments, submissions, files, notify } };
}
