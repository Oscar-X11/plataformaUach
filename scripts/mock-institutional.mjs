/**
 * Backend SIMULADO — Fase 2: calendario, material del curso (temas, archivos
 * y enlaces), repositorio con moderación, grupos de estudio y reportes.
 * Imita backend/src con datos en memoria. Solo para desarrollo sin base de datos.
 */
import { randomUUID } from "node:crypto";
import { average, extOf, parseMultipart, readRaw, submissionState } from "./mock-classwork.mjs";

const DAY = 86_400_000;
const MB = 1024 * 1024;
const ALLOWED = ["pdf", "png", "jpg", "jpeg", "webp", "docx", "xlsx", "pptx", "doc", "xls", "ppt", "zip", "txt", "csv"];
const RESOURCE_TYPES = ["NOTE", "STUDY_GUIDE", "EXAM", "BOOK", "OTHER"];

const fields = (parts) =>
  Object.fromEntries(parts.filter((p) => !p.filename).map((p) => [p.name, p.data.toString("utf8").trim()]));

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // inválida
  }
  return null;
}

export function createInstitutional(ctx, classwork) {
  const { users, courses, findUser, courseRole, send, readJson, forbidden, SUBJECTS } = ctx;
  const { assignments, submissions, files, notify } = classwork;

  const topics = [];
  const materials = [];
  const resources = [];
  const groups = [];

  const notFound = (res, message) => send(res, 404, { statusCode: 404, message });
  const bad = (res, message) => send(res, 400, { statusCode: 400, message });
  const courseOf = (id) => courses.find((course) => course.id === id);
  const subjectView = (id) => {
    const subject = SUBJECTS.find((s) => s.id === id);
    return subject ? { id: subject.id, name: subject.name, code: subject.code } : null;
  };
  const authorView = (id) => {
    const user = findUser(id);
    return { id: user.id, fullName: user.fullName, role: user.role };
  };

  function storeFile(part, directory) {
    const ext = extOf(part.filename);
    const fileUrl = `${directory}/${randomUUID()}.${ext}`;
    const mime = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", txt: "text/plain; charset=utf-8" }[ext] ?? "application/octet-stream";
    files.set(fileUrl, { buffer: part.data, mime });
    return { fileUrl, mime, size: part.data.length };
  }

  function checkFile(res, part, maxMb) {
    if (!part) return bad(res, "Adjunta el archivo"), false;
    if (!ALLOWED.includes(extOf(part.filename))) return bad(res, `«${part.filename}»: tipo de archivo no permitido.`), false;
    if (!part.data.length) return bad(res, `«${part.filename}» está vacío.`), false;
    if (part.data.length > maxMb * MB) return bad(res, `«${part.filename}» pesa más de ${maxMb} MB.`), false;
    return true;
  }

  // ───────── Datos de ejemplo ─────────
  const now = Date.now();
  const iso = (offset) => new Date(now + offset).toISOString();
  const [bd] = courses;
  const ana = users.get("A2023-0148").user;
  const luis = users.get("A2023-0200").user;
  const laura = users.get("D1001").user;
  const t1 = { id: randomUUID(), courseId: bd.id, title: "Unidad 1: Modelo relacional", position: 0, createdAt: iso(-20 * DAY) };
  const t2 = { id: randomUUID(), courseId: bd.id, title: "Unidad 2: SQL", position: 1, createdAt: iso(-10 * DAY) };
  topics.push(t1, t2);
  const sampleFile = (name, text, directory) => {
    const stored = storeFile({ filename: name, data: Buffer.from(text) }, directory);
    return { originalName: name, ...stored };
  };
  const slides = sampleFile("presentacion-unidad1.txt", "Presentación de ejemplo: modelo relacional.", `classroom-drive/${bd.id}`);
  materials.push(
    { id: randomUUID(), courseId: bd.id, topicId: t1.id, title: "Presentación: modelo relacional", description: "Diapositivas de la clase 1.", kind: "FILE", fileUrl: slides.fileUrl, url: null, originalName: slides.originalName, mimeType: slides.mime, size: slides.size, authorId: laura.id, createdAt: iso(-19 * DAY) },
    { id: randomUUID(), courseId: bd.id, topicId: t2.id, title: "Tutorial interactivo de SQL", description: "Practiquen las consultas básicas.", kind: "LINK", fileUrl: null, url: "https://sqlbolt.com/", originalName: null, mimeType: null, size: null, authorId: laura.id, createdAt: iso(-9 * DAY) },
  );
  const guide = sampleFile("guia-normalizacion.txt", "Guía de normalización (1FN, 2FN, 3FN).", `repository/${SUBJECTS[2].id}`);
  const notes = sampleFile("apuntes-listas.txt", "Apuntes de listas enlazadas.", `repository/${SUBJECTS[1].id}`);
  resources.push(
    { id: randomUUID(), title: "Guía de normalización", description: "Resumen con ejemplos de 1FN a 3FN.", type: "STUDY_GUIDE", status: "APPROVED", ...guide, mimeType: guide.mime, subjectId: SUBJECTS[2].id, authorId: laura.id, reviewNote: null, createdAt: iso(-15 * DAY) },
    { id: randomUUID(), title: "Apuntes: listas enlazadas", description: "Mis apuntes de clase.", type: "NOTE", status: "PENDING", ...notes, mimeType: notes.mime, subjectId: SUBJECTS[1].id, authorId: ana.id, reviewNote: null, createdAt: iso(-1 * DAY) },
  );
  groups.push(
    { id: randomUUID(), title: "Repaso de SQL para el parcial", description: "Resolvemos ejercicios de consultas y joins antes del examen.", capacity: 6, meetingInfo: "Martes 16:00, biblioteca central", subjectId: SUBJECTS[2].id, creatorId: ana.id, createdAt: iso(-3 * DAY), members: [{ userId: ana.id, joinedAt: iso(-3 * DAY) }, { userId: luis.id, joinedAt: iso(-2 * DAY) }] },
    { id: randomUUID(), title: "Círculo de programación", description: "Practicamos problemas de algoritmos cada semana.", capacity: 10, meetingInfo: "Jueves 12:00, laboratorio 2", subjectId: SUBJECTS[0].id, creatorId: luis.id, createdAt: iso(-8 * DAY), members: [{ userId: luis.id, joinedAt: iso(-8 * DAY) }] },
  );

  // ───────── Vistas ─────────
  const materialView = ({ courseId: _c, authorId, sha256: _s, ...m }) => ({ ...m, author: { id: authorId, fullName: findUser(authorId).fullName } });
  const resourceView = ({ subjectId, authorId, ...r }) => ({ ...r, subject: subjectView(subjectId), author: authorView(authorId) });
  function groupView(group, user) {
    const isMember = group.members.some((m) => m.userId === user.id);
    return {
      id: group.id, title: group.title, description: group.description, capacity: group.capacity, meetingInfo: group.meetingInfo,
      createdAt: group.createdAt, subject: group.subjectId ? subjectView(group.subjectId) : null,
      creator: { id: group.creatorId, fullName: findUser(group.creatorId).fullName },
      memberCount: group.members.length, isMember, isCreator: group.creatorId === user.id,
      canDelete: group.creatorId === user.id || user.role === "ADMIN",
    };
  }
  const groupDetail = (group, user) => {
    const view = groupView(group, user);
    return {
      ...view,
      members: view.isMember || user.role === "ADMIN"
        ? group.members.map((m) => ({ ...authorView(m.userId), joinedAt: m.joinedAt }))
        : [],
    };
  };
  const manage = (res, courseId, user) => {
    const course = courseOf(courseId);
    const role = course && courseRole(course, user);
    if (!role) return notFound(res, "Curso no encontrado"), null;
    if (role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto"), null;
    return course;
  };

  // ───────── Rutas ─────────
  const routes = [
    ["GET", /^\/calendar$/, (req, res, _p, user) => {
      const params = new URL(req.url, "http://x").searchParams;
      const from = new Date(params.get("from"));
      const to = new Date(params.get("to"));
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return bad(res, "Rango de fechas inválido");
      const mine = courses.filter((c) => courseRole(c, user));
      const items = assignments
        .filter((a) => a.dueAt && new Date(a.dueAt) >= from && new Date(a.dueAt) < to && mine.some((c) => c.id === a.courseId))
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .map((a) => {
          const course = courseOf(a.courseId);
          const student = user.role === "STUDENT";
          const row = submissions.find((s) => s.assignmentId === a.id && s.studentId === user.id);
          return {
            id: a.id, title: a.title, dueAt: a.dueAt, points: a.points, course: { id: course.id, name: course.name },
            state: student ? submissionState(a.dueAt, row) : null,
            submitted: student ? null : submissions.filter((s) => s.assignmentId === a.id && s.status !== "ASSIGNED").length,
            students: student ? null : course.enrollments.length,
          };
        });
      send(res, 200, items);
    }],

    // Material del curso
    ["GET", /^\/courses\/([^/]+)\/materials$/, (req, res, [courseId], user) => {
      const course = courseOf(courseId);
      const role = course && courseRole(course, user);
      if (!role) return notFound(res, "Curso no encontrado");
      send(res, 200, {
        canManage: role !== "student",
        topics: topics.filter((t) => t.courseId === courseId).sort((a, b) => a.position - b.position).map(({ id, title, position }) => ({ id, title, position })),
        materials: materials.filter((m) => m.courseId === courseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(materialView),
      });
    }],
    ["POST", /^\/courses\/([^/]+)\/materials$/, async (req, res, [courseId], user) => {
      const course = manage(res, courseId, user);
      if (!course) return;
      const parts = parseMultipart(await readRaw(req), req.headers["content-type"]);
      const body = fields(parts);
      const file = parts.find((p) => p.filename);
      if ((body.title ?? "").length < 2) return bad(res, ["Escribe un título"]);
      if (body.topicId && !topics.some((t) => t.id === body.topicId && t.courseId === courseId)) return bad(res, "El tema no pertenece a este curso");
      if (!file && !body.url) return bad(res, "Adjunta un archivo o escribe un enlace");
      if (file && body.url) return bad(res, "Elige un archivo o un enlace, no ambos");
      const base = { id: randomUUID(), courseId, topicId: body.topicId || null, title: body.title, description: body.description || null, authorId: user.id, createdAt: new Date().toISOString() };
      let material;
      if (file) {
        if (!checkFile(res, file, 50)) return;
        const stored = storeFile(file, `classroom-drive/${courseId}`);
        material = { ...base, kind: "FILE", fileUrl: stored.fileUrl, url: null, originalName: file.filename, mimeType: stored.mime, size: stored.size };
      } else {
        const url = safeUrl(body.url);
        if (!url) return bad(res, "El enlace debe empezar con http:// o https://");
        material = { ...base, kind: "LINK", fileUrl: null, url, originalName: null, mimeType: null, size: null };
      }
      materials.push(material);
      notify(course.enrollments.map((e) => e.studentId), "MATERIAL_CREATED", `Nuevo material en ${course.name}: ${material.title}`, `/cursos/${courseId}/recursos`);
      send(res, 201, materialView(material));
    }],
    ["DELETE", /^\/materials\/([^/]+)$/, (req, res, [id], user) => {
      const material = materials.find((m) => m.id === id);
      if (!material) return notFound(res, "Material no encontrado");
      if (!manage(res, material.courseId, user)) return;
      materials.splice(materials.indexOf(material), 1);
      if (material.fileUrl) files.delete(material.fileUrl);
      send(res, 204);
    }],
    ["POST", /^\/courses\/([^/]+)\/topics$/, async (req, res, [courseId], user) => {
      if (!manage(res, courseId, user)) return;
      const title = String((await readJson(req)).title ?? "").trim();
      if (title.length < 2) return bad(res, ["El tema debe tener al menos 2 caracteres"]);
      const position = Math.max(-1, ...topics.filter((t) => t.courseId === courseId).map((t) => t.position)) + 1;
      const topic = { id: randomUUID(), courseId, title, position, createdAt: new Date().toISOString() };
      topics.push(topic);
      send(res, 201, { id: topic.id, title, position });
    }],
    ["PATCH", /^\/topics\/([^/]+)$/, async (req, res, [id], user) => {
      const topic = topics.find((t) => t.id === id);
      if (!topic) return notFound(res, "Tema no encontrado");
      if (!manage(res, topic.courseId, user)) return;
      const title = String((await readJson(req)).title ?? "").trim();
      if (title.length < 2) return bad(res, ["El tema debe tener al menos 2 caracteres"]);
      topic.title = title;
      send(res, 200, { id: topic.id, title, position: topic.position });
    }],
    ["DELETE", /^\/topics\/([^/]+)$/, (req, res, [id], user) => {
      const topic = topics.find((t) => t.id === id);
      if (!topic) return notFound(res, "Tema no encontrado");
      if (!manage(res, topic.courseId, user)) return;
      topics.splice(topics.indexOf(topic), 1);
      for (const material of materials) if (material.topicId === id) material.topicId = null;
      send(res, 204);
    }],

    // Repositorio
    ["GET", /^\/repository$/, (req, res) => {
      const params = new URL(req.url, "http://x").searchParams;
      const search = (params.get("search") ?? "").trim().toLowerCase();
      const type = params.get("type");
      const subjectId = params.get("subjectId");
      const page = Math.max(1, Number(params.get("page") ?? 1));
      const list = resources
        .filter((r) => r.status === "APPROVED" && (!type || r.type === type) && (!subjectId || r.subjectId === subjectId))
        .filter((r) => !search || `${r.title} ${r.description ?? ""} ${subjectView(r.subjectId)?.name ?? ""}`.toLowerCase().includes(search))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      send(res, 200, { items: list.slice((page - 1) * 24, page * 24).map(resourceView), total: list.length, page, pageSize: 24 });
    }],
    ["GET", /^\/repository\/mine$/, (req, res, _p, user) =>
      send(res, 200, resources.filter((r) => r.authorId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(resourceView))],
    ["GET", /^\/repository\/pending$/, (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      send(res, 200, resources.filter((r) => r.status === "PENDING").map(resourceView));
    }],
    ["POST", /^\/repository$/, async (req, res, _p, user) => {
      const parts = parseMultipart(await readRaw(req), req.headers["content-type"]);
      const body = fields(parts);
      const file = parts.find((p) => p.filename);
      const errors = [];
      if ((body.title ?? "").length < 3) errors.push("El título debe tener al menos 3 caracteres");
      if (!RESOURCE_TYPES.includes(body.type)) errors.push("Elige el tipo de recurso");
      if (!SUBJECTS.some((s) => s.id === body.subjectId)) errors.push("Selecciona una materia");
      if (errors.length) return bad(res, errors);
      if (!checkFile(res, file, 25)) return;
      const stored = storeFile(file, `repository/${body.subjectId}`);
      const auto = user.role !== "STUDENT";
      const resource = {
        id: randomUUID(), title: body.title, description: body.description || null, type: body.type, status: auto ? "APPROVED" : "PENDING",
        fileUrl: stored.fileUrl, originalName: file.filename, mimeType: stored.mime, size: stored.size,
        subjectId: body.subjectId, authorId: user.id, reviewNote: null, createdAt: new Date().toISOString(),
      };
      resources.push(resource);
      send(res, 201, resourceView(resource));
    }],
    ["PATCH", /^\/repository\/([^/]+)\/review$/, async (req, res, [id], user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const resource = resources.find((r) => r.id === id);
      if (!resource) return notFound(res, "Recurso no encontrado");
      const { approve, note } = await readJson(req);
      if (!approve && !String(note ?? "").trim()) return bad(res, "Explica al autor por qué se rechaza");
      resource.status = approve ? "APPROVED" : "REJECTED";
      resource.reviewNote = approve ? null : String(note).trim();
      notify([resource.authorId], "RESOURCE_REVIEWED",
        approve ? `Publicamos «${resource.title}» en el repositorio` : `No se publicó «${resource.title}»: ${resource.reviewNote}`,
        "/repositorio?vista=mios");
      send(res, 200, resourceView(resource));
    }],
    ["DELETE", /^\/repository\/([^/]+)$/, (req, res, [id], user) => {
      const resource = resources.find((r) => r.id === id);
      if (!resource) return notFound(res, "Recurso no encontrado");
      if (resource.authorId !== user.id && user.role !== "ADMIN") return forbidden(res, "Solo el autor o un administrador pueden borrarlo");
      resources.splice(resources.indexOf(resource), 1);
      files.delete(resource.fileUrl);
      send(res, 204);
    }],

    // Grupos de estudio
    ["GET", /^\/study-groups$/, (req, res, _p, user) => {
      const params = new URL(req.url, "http://x").searchParams;
      const search = (params.get("search") ?? "").trim().toLowerCase();
      const subjectId = params.get("subjectId");
      const mine = params.get("mine") === "true";
      send(res, 200, groups
        .filter((g) => (!subjectId || g.subjectId === subjectId) && (!mine || g.members.some((m) => m.userId === user.id)))
        .filter((g) => !search || `${g.title} ${g.description}`.toLowerCase().includes(search))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((g) => groupView(g, user)));
    }],
    ["POST", /^\/study-groups$/, async (req, res, _p, user) => {
      const body = await readJson(req);
      const capacity = Number(body.capacity);
      const errors = [];
      if (String(body.title ?? "").trim().length < 3) errors.push("El nombre debe tener al menos 3 caracteres");
      if (String(body.description ?? "").trim().length < 10) errors.push("Describe el grupo en al menos 10 caracteres");
      if (!Number.isInteger(capacity) || capacity < 2 || capacity > 50) errors.push("El cupo debe ser de 2 a 50");
      if (body.subjectId && !SUBJECTS.some((s) => s.id === body.subjectId)) errors.push("Materia inválida");
      if (errors.length) return bad(res, errors);
      const group = {
        id: randomUUID(), title: String(body.title).trim(), description: String(body.description).trim(), capacity,
        meetingInfo: String(body.meetingInfo ?? "").trim() || null, subjectId: body.subjectId || null, creatorId: user.id,
        createdAt: new Date().toISOString(), members: [{ userId: user.id, joinedAt: new Date().toISOString() }],
      };
      groups.push(group);
      send(res, 201, groupDetail(group, user));
    }],
    ["GET", /^\/study-groups\/([^/]+)$/, (req, res, [id], user) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return notFound(res, "Grupo no encontrado");
      send(res, 200, groupDetail(group, user));
    }],
    ["POST", /^\/study-groups\/([^/]+)\/join$/, (req, res, [id], user) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return notFound(res, "Grupo no encontrado");
      if (!group.members.some((m) => m.userId === user.id)) {
        if (group.members.length >= group.capacity) return send(res, 409, { statusCode: 409, message: "El grupo ya está lleno" });
        group.members.push({ userId: user.id, joinedAt: new Date().toISOString() });
      }
      send(res, 200, groupDetail(group, user));
    }],
    ["POST", /^\/study-groups\/([^/]+)\/leave$/, (req, res, [id], user) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return notFound(res, "Grupo no encontrado");
      if (group.creatorId === user.id) return bad(res, "Eres quien creó el grupo: bórralo si ya no se reunirán");
      group.members = group.members.filter((m) => m.userId !== user.id);
      send(res, 200, groupDetail(group, user));
    }],
    ["DELETE", /^\/study-groups\/([^/]+)$/, (req, res, [id], user) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return notFound(res, "Grupo no encontrado");
      if (group.creatorId !== user.id && user.role !== "ADMIN") return forbidden(res, "Solo quien creó el grupo o un administrador pueden borrarlo");
      groups.splice(groups.indexOf(group), 1);
      send(res, 204);
    }],

    // Reportes
    ["GET", /^\/reports\/courses$/, (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      send(res, 200, courseReport(new URL(req.url, "http://x").searchParams.get("term")));
    }],
    ["GET", /^\/reports\/courses\/export$/, (req, res, _p, user) => {
      if (user.role !== "ADMIN") return forbidden(res);
      const { rows } = courseReport(new URL(req.url, "http://x").searchParams.get("term"));
      const cell = (v) => (v === null || v === undefined ? "" : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
      const lines = [
        ["Periodo", "Curso", "Materia", "Docente", "Alumnos", "Tareas", "Entregas a tiempo", "% entrega", "Promedio (0-10)"],
        ...rows.map((r) => [r.term, r.name, `${r.subject.code} ${r.subject.name}`, r.teacherName, r.students, r.assignments, r.onTime, r.deliveryRate, r.average]),
      ];
      res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="reporte-cursos.csv"' });
      res.end("﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n") + "\r\n");
    }],
  ];

  function courseReport(term) {
    const current = new Date();
    const rows = courses
      .filter((c) => !term || c.term === term)
      .map((course) => {
        const list = assignments.filter((a) => a.courseId === course.id);
        const students = course.enrollments.length;
        let expected = 0;
        let delivered = 0;
        let onTime = 0;
        const grades = [];
        for (const a of list) {
          const due = a.dueAt && new Date(a.dueAt) < current;
          if (due) expected += students;
          for (const s of submissions.filter((row) => row.assignmentId === a.id)) {
            const state = submissionState(a.dueAt, s, current);
            if (["submitted", "late", "returned"].includes(state)) {
              if (due) delivered++;
              if (state !== "late") onTime++;
            }
            if (s.status === "RETURNED") grades.push({ grade: s.grade, points: a.points });
          }
        }
        const subject = SUBJECTS.find((s) => s.id === course.subjectId);
        return {
          id: course.id, name: course.name, term: course.term, subject: { code: subject.code, name: subject.name },
          teacherName: findUser(course.teacherId).fullName, students, assignments: list.length,
          deliveryRate: expected ? Math.round((Math.min(delivered, expected) / expected) * 100) : null, onTime, average: average(grades),
        };
      });
    return { terms: [...new Set(courses.map((c) => c.term))].sort().reverse(), rows };
  }

  return async function handle(req, res, path, user) {
    for (const [method, pattern, handler] of routes) {
      if (req.method !== method) continue;
      const match = pattern.exec(path);
      if (match) {
        await handler(req, res, match.slice(1), user);
        return true;
      }
    }
    return false;
  };
}
