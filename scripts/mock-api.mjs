/**
 * Backend SIMULADO para recorrer el frontend sin base de datos.
 *
 *   npm run dev:mock        (en otra terminal: npm run dev:frontend)
 *
 * - Escucha en el mismo puerto que el backend real (PORT o 4000), así que
 *   el proxy /api de Next.js no necesita cambios.
 * - Implementa: POST /auth/login, POST /auth/register, POST /auth/logout,
 *   GET /auth/me, POST /auth/change-password, POST /users/:id/reset-password,
 *   GET /academic/faculties, GET /academic/subjects y los endpoints de /courses.
 * - Tareas, entregas, tablón, notificaciones, perfil, usuarios y dashboard
 *   viven en ./mock-classwork.mjs; calendario, material, repositorio, grupos
 *   y reportes en ./mock-institutional.mjs.
 * - Se inicia sesión con matrícula (alumnos) o número de empleado (personal).
 * - Todo vive en memoria: al reiniciar se pierden las cuentas registradas.
 * - Los tokens NO están firmados; el backend real los rechaza. Solo para desarrollo.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createClasswork } from "./mock-classwork.mjs";
import { createInstitutional } from "./mock-institutional.mjs";

const PORT = Number(process.env.PORT ?? 4000);
const COOKIE = "uach_session";
const SESSION_HOURS = 8;

const SUBJECTS = [
  { id: randomUUID(), name: "Fundamentos de Programación", code: "ISC-101", semester: 1, career: "car-isc" },
  { id: randomUUID(), name: "Estructuras de Datos", code: "ISC-201", semester: 2, career: "car-isc" },
  { id: randomUUID(), name: "Bases de Datos", code: "ISC-301", semester: 3, career: "car-isc" },
  { id: randomUUID(), name: "Contabilidad Básica", code: "LAE-102", semester: 1, career: "car-lae" },
];

const FACULTIES = [
  {
    id: "fac-lic",
    name: "Licenciaturas",
    code: "LIC",
    scheme: "CUATRIMESTRAL",
    careers: [{ id: "car-lae", name: "Licenciatura en Administración de Empresas", code: "LAE" }],
  },
  {
    id: "fac-ing",
    name: "Ingenierías",
    code: "ING",
    scheme: "CUATRIMESTRAL",
    careers: [{ id: "car-isc", name: "Ingeniería en Sistemas Computacionales", code: "ISC" }],
  },
  {
    id: "fac-prep",
    name: "Preparatoria Rosario Castellanos",
    code: "PREP",
    scheme: "SEMESTRAL",
    careers: [{ id: "car-bfm", name: "Bachillerato Físico-Matemáticas", code: "BFM" }],
  },
];

/** Periodos de demostración (solo lectura en el mock). */
const TERMS = [
  { id: "term-2026-2", code: "2026-2", name: "Agosto – Diciembre 2026", scheme: "CUATRIMESTRAL", startsAt: "2026-08-01", endsAt: "2026-12-20", isCurrent: true, closed: false },
  { id: "term-2026-1", code: "2026-1", name: "Enero – Junio 2026", scheme: "CUATRIMESTRAL", startsAt: "2026-01-15", endsAt: "2026-06-30", isCurrent: false, closed: true },
  { id: "term-2026-s2", code: "2026-S2", name: "Agosto – Diciembre 2026", scheme: "SEMESTRAL", startsAt: "2026-08-01", endsAt: "2026-12-31", isCurrent: true, closed: false },
];

/** Cuentas de demostración: una por rol y un alumno con contraseña temporal. */
const users = new Map(
  [
    ["A2023-0148", "alumno123", "Ana Sofía Ruiz Gómez", "STUDENT", false],
    ["D1001", "docente123", "Laura Gómez Pérez", "TEACHER", false],
    ["ADMIN", "admin123", "Administrador UACH", "ADMIN", false],
    ["A2023-0200", "temp-1234", "Luis Pérez Díaz", "STUDENT", true],
  ].map(([username, password, fullName, role, mustChangePassword]) => [
    username,
    {
      password,
      user: {
        id: randomUUID(),
        username,
        fullName,
        role,
        status: "ACTIVE",
        mustChangePassword,
        avatarUrl: null,
        facultyId: role === "STUDENT" ? "fac-fing" : null,
        careerId: role === "STUDENT" ? "car-isc" : null,
      },
    },
  ]),
);

const userByName = (username) => users.get(username).user;

/** Cursos de ejemplo: la docente D1001 imparte dos; la alumna A2023-0148 está en ambos. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () =>
  Array.from({ length: 7 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");

const courses = [
  ["Bases de Datos — Grupo A", "2026-2", SUBJECTS[2], "D1001", ["A2023-0148"]],
  ["Estructuras de Datos", "2026-2", SUBJECTS[1], "D1001", ["A2023-0148", "A2023-0200"]],
].map(([name, term, subject, teacher, students]) => ({
  id: randomUUID(),
  name,
  term,
  invitation: newCode(),
  subjectId: subject.id,
  teacherId: userByName(teacher).id,
  createdAt: new Date().toISOString(),
  enrollments: students.map((username) => ({
    studentId: userByName(username).id,
    joinedAt: new Date().toISOString(),
  })),
}));

const findUser = (id) => [...users.values()].find(({ user }) => user.id === id)?.user;

function courseRole(course, user) {
  if (user.role === "ADMIN") return "admin";
  if (user.role === "TEACHER" && course.teacherId === user.id) return "teacher";
  if (user.role === "STUDENT" && course.enrollments.some((e) => e.studentId === user.id)) return "student";
  return null;
}

function courseSummary(course, role) {
  const subject = SUBJECTS.find((item) => item.id === course.subjectId);
  const teacher = findUser(course.teacherId);
  return {
    id: course.id,
    name: course.name,
    term: course.term,
    subject: { id: subject.id, name: subject.name, code: subject.code, semester: subject.semester },
    teacher: { id: teacher.id, fullName: teacher.fullName },
    meetingInfo: course.meetingInfo ?? null,
    studentCount: course.enrollments.length,
    createdAt: course.createdAt,
    myRole: role,
    invitation: role === "student" ? null : course.invitation,
  };
}

const notFoundCourse = (res) => send(res, 404, { statusCode: 404, message: "Curso no encontrado" });
const forbidden = (res, message = "No tienes permisos para realizar esta acción") =>
  send(res, 403, { statusCode: 403, message });

/** Rutas con parámetros de /courses. Devuelve true si atendió la petición. */
async function courseRoutes(req, res, path) {
  const match = path.match(/^\/courses(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (!match) return false;
  const [, id, sub, extra] = match;

  const entry = entryFromToken(readToken(req) ?? "");
  if (!entry) return unauthorized(res), true;
  const user = entry.user;
  if (user.mustChangePassword) return forbidden(res, "Debes cambiar tu contraseña temporal antes de continuar"), true;

  if (!id && req.method === "GET") {
    const mine = courses
      .map((course) => [course, courseRole(course, user)])
      .filter(([, role]) => role)
      .map(([course, role]) => courseSummary(course, role));
    return send(res, 200, mine.reverse()), true;
  }

  if (!id && req.method === "POST") {
    if (user.role !== "TEACHER") return forbidden(res), true;
    const body = await readJson(req);
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    const term = String(body.term ?? "").trim();
    const errors = [];
    if (name.length < 3) errors.push("El nombre del curso debe tener al menos 3 caracteres");
    if (!TERMS.some((item) => item.code === term && !item.closed)) {
      errors.push("Elige un periodo abierto (los da de alta la administración)");
    }
    if (!SUBJECTS.some((item) => item.id === body.subjectId)) errors.push("Selecciona una materia");
    if (errors.length) return send(res, 400, { statusCode: 400, message: errors }), true;
    const course = {
      id: randomUUID(),
      name,
      term,
      invitation: newCode(),
      meetingInfo: String(body.meetingInfo ?? "").trim().slice(0, 200) || null,
      subjectId: body.subjectId,
      teacherId: user.id,
      createdAt: new Date().toISOString(),
      enrollments: [],
    };
    courses.push(course);
    return send(res, 201, courseSummary(course, "teacher")), true;
  }

  if (id === "join" && !sub && req.method === "POST") {
    if (user.role !== "STUDENT") return forbidden(res), true;
    const code = String((await readJson(req)).code ?? "").replace(/\s+/g, "").toUpperCase();
    const course = courses.find((item) => item.invitation === code);
    if (!course) return send(res, 404, { statusCode: 404, message: "El código de invitación no es válido" }), true;
    if (!course.enrollments.some((e) => e.studentId === user.id)) {
      course.enrollments.push({ studentId: user.id, joinedAt: new Date().toISOString() });
    }
    return send(res, 200, courseSummary(course, "student")), true;
  }

  const course = courses.find((item) => item.id === id);
  const role = course && courseRole(course, user);
  if (!course || !role) return notFoundCourse(res), true;

  if (!sub && req.method === "GET") return send(res, 200, courseSummary(course, role)), true;

  if (sub === "meeting" && req.method === "PATCH") {
    if (role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto"), true;
    course.meetingInfo = String((await readJson(req)).meetingInfo ?? "").trim().slice(0, 200) || null;
    return send(res, 200, courseSummary(course, role)), true;
  }

  if (sub === "people" && req.method === "GET") {
    const teacher = findUser(course.teacherId);
    const students = course.enrollments
      .map(({ studentId, joinedAt }) => {
        const student = findUser(studentId);
        return {
          id: student.id,
          fullName: student.fullName,
          username: role === "student" ? null : student.username,
          joinedAt,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
    return send(res, 200, { teacher: { id: teacher.id, fullName: teacher.fullName }, students }), true;
  }

  if (role === "student") return forbidden(res, "Solo el docente del curso puede hacer esto"), true;

  if (sub === "invitation" && req.method === "POST") {
    course.invitation = newCode();
    return send(res, 200, { invitation: course.invitation }), true;
  }

  if (sub === "students" && extra && req.method === "DELETE") {
    const before = course.enrollments.length;
    course.enrollments = course.enrollments.filter((e) => e.studentId !== extra);
    if (course.enrollments.length === before) {
      return send(res, 404, { statusCode: 404, message: "El alumno no está inscrito en el curso" }), true;
    }
    return send(res, 204), true;
  }

  return false;
}

const normalizeUsername = (value) => String(value ?? "").trim().toUpperCase();

/** Primer error de la contraseña nueva (mismas reglas que el backend real). */
function passwordErrors(value) {
  if (value.length < 8) return ["La contraseña debe tener al menos 8 caracteres"];
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) return ["La contraseña debe incluir letras y números"];
  return [];
}

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function createSession(user) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  const accessToken = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: user.id, role: user.role, mustChangePassword: user.mustChangePassword, exp })}.mock`;
  return { user, accessToken, expiresAt: new Date(exp * 1000).toISOString() };
}

function readToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const match = (req.headers.cookie ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1];
}

function entryFromToken(token) {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (claims.exp * 1000 <= Date.now()) return null;
    return [...users.values()].find((entry) => entry.user.id === claims.sub) ?? null;
  } catch {
    return null;
  }
}

const unauthorized = (res) =>
  send(res, 401, { statusCode: 401, message: "Sesión inválida o expirada" });

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

const sessionCookie = (session) =>
  `${COOKIE}=${session.accessToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(session.expiresAt).toUTCString()}`;

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

const routes = {
  "POST /auth/login": async (req, res) => {
    const { username, password = "" } = await readJson(req);
    const entry = users.get(normalizeUsername(username));
    if (!entry || entry.password !== password) {
      return send(res, 401, { statusCode: 401, message: "Credenciales incorrectas" });
    }
    if (entry.user.status !== "ACTIVE") {
      return send(res, 401, { statusCode: 401, message: "La cuenta no está activa" });
    }
    const session = createSession(entry.user);
    send(res, 200, session, { "Set-Cookie": sessionCookie(session) });
  },

  "POST /auth/register": async (req, res) => {
    const body = await readJson(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const errors = [];
    if (!/^[A-Z0-9-]{3,30}$/.test(username)) {
      errors.push("La matrícula o número de empleado solo admite letras, números y guiones (3 a 30)");
    }
    errors.push(...passwordErrors(password));
    if (fullName.length < 3) errors.push("Escribe tu nombre completo");
    if (errors.length) return send(res, 400, { statusCode: 400, message: errors });
    if (users.has(username)) {
      return send(res, 409, { statusCode: 409, message: "Ya existe una cuenta con esa matrícula" });
    }

    const user = {
      id: randomUUID(),
      username,
      fullName,
      role: "STUDENT",
      status: "ACTIVE",
      mustChangePassword: false,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      facultyId: body.facultyId || null,
      careerId: body.careerId || null,
    };
    users.set(username, { password, user });
    const session = createSession(user);
    send(res, 201, session, { "Set-Cookie": sessionCookie(session) });
  },

  "POST /auth/logout": (_req, res) =>
    send(res, 204, undefined, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` }),

  "GET /auth/me": (req, res) => {
    const entry = entryFromToken(readToken(req) ?? "");
    if (!entry || entry.user.status !== "ACTIVE") return unauthorized(res);
    send(res, 200, entry.user);
  },

  "POST /auth/change-password": async (req, res) => {
    const entry = entryFromToken(readToken(req) ?? "");
    if (!entry) return unauthorized(res);
    const { currentPassword = "", newPassword = "" } = await readJson(req);
    const errors = passwordErrors(String(newPassword));
    if (errors.length) return send(res, 400, { statusCode: 400, message: errors });
    if (entry.password !== currentPassword) {
      return send(res, 400, { statusCode: 400, message: "La contraseña actual no es correcta" });
    }
    if (currentPassword === newPassword) {
      return send(res, 400, { statusCode: 400, message: "La nueva contraseña debe ser distinta de la actual" });
    }
    entry.password = newPassword;
    entry.user.mustChangePassword = false;
    const session = createSession(entry.user);
    send(res, 200, session, { "Set-Cookie": sessionCookie(session) });
  },

  "GET /academic/faculties": (_req, res) => send(res, 200, FACULTIES),

  "GET /academic/terms": (req, res) => {
    if (!entryFromToken(readToken(req) ?? "")) return unauthorized(res);
    send(res, 200, TERMS.map((term) => ({ ...term, _count: { courses: courses.filter((c) => c.term === term.code).length } })));
  },

  // Catálogo completo (vista de administración). En el mock es de solo lectura.
  "GET /academic/catalog": (req, res) => {
    const entry = entryFromToken(readToken(req) ?? "");
    if (!entry) return unauthorized(res);
    if (entry.user.role !== "ADMIN") return send(res, 403, { message: "Acceso denegado", statusCode: 403 });
    send(
      res,
      200,
      FACULTIES.map((faculty) => ({
        ...faculty,
        _count: { users: 0 },
        careers: faculty.careers.map((career) => ({
          ...career,
          _count: { users: 0 },
          subjects: SUBJECTS.filter((subject) => subject.career === career.id).map(({ career: _c, ...subject }) => ({
            ...subject,
            _count: { courses: courses.filter((c) => c.subjectId === subject.id).length, resources: 0 },
          })),
        })),
      })),
    );
  },

  "GET /academic/subjects": (req, res) => {
    const entry = entryFromToken(readToken(req) ?? "");
    if (!entry) return unauthorized(res);
    const careers = FACULTIES.flatMap((faculty) =>
      faculty.careers.map((career) => ({ ...career, faculty: { scheme: faculty.scheme } })),
    );
    send(
      res,
      200,
      SUBJECTS.map(({ career, ...subject }) => ({
        ...subject,
        career: careers.find((item) => item.id === career),
      })),
    );
  },
};

/** POST /users/:id/reset-password (solo ADMIN): asigna una contraseña temporal. */
async function resetPassword(req, res, userId) {
  const admin = entryFromToken(readToken(req) ?? "");
  if (!admin) return unauthorized(res);
  if (admin.user.role !== "ADMIN") {
    return send(res, 403, { statusCode: 403, message: "No tienes permisos para realizar esta acción" });
  }
  const entry = [...users.values()].find(({ user }) => user.id === userId);
  if (!entry) return send(res, 404, { statusCode: 404, message: "El usuario no existe" });
  const temporaryPassword = `temp-${randomUUID().slice(0, 8)}`;
  entry.password = temporaryPassword;
  entry.user.mustChangePassword = true;
  const { id, username, fullName } = entry.user;
  send(res, 200, { user: { id, username, fullName }, temporaryPassword });
}

const mockContext = { users, courses, findUser, courseRole, send, readJson, forbidden, SUBJECTS, FACULTIES };
const classwork = createClasswork(mockContext);
const institutional = createInstitutional(mockContext, classwork.state);

/** Rutas con sesión: primero trabajo de clase y compañía, luego /courses. */
async function authenticatedRoutes(req, res, path) {
  const entry = entryFromToken(readToken(req) ?? "");
  if (!entry) return unauthorized(res);
  if (entry.user.status !== "ACTIVE") return unauthorized(res);
  if (entry.user.mustChangePassword) {
    return forbidden(res, "Debes cambiar tu contraseña temporal antes de continuar");
  }
  if (await classwork.handle(req, res, path, entry.user)) return;
  if (await institutional(req, res, path, entry.user)) return;
  if (path.startsWith("/courses") && (await courseRoutes(req, res, path))) return;
  send(res, 404, { statusCode: 404, message: "Ruta no disponible en el backend simulado" });
}

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
  const reset = req.method === "POST" && path.match(/^\/users\/([^/]+)\/reset-password$/);
  const handler = reset
    ? (request, response) => resetPassword(request, response, reset[1])
    : (routes[`${req.method} ${path}`] ?? ((request, response) => authenticatedRoutes(request, response, path)));
  console.log(`${req.method} ${path}`);
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    send(res, 500, { statusCode: 500, message: "Error en el backend simulado" });
  }
})
  .on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`El puerto ${PORT} está ocupado. ¿Está corriendo el backend real?`);
      process.exit(1);
    }
    throw error;
  })
  .listen(PORT, () => {
    console.log(`Backend SIMULADO en http://localhost:${PORT} (sin base de datos)\n`);
    console.log("Cuentas de prueba:");
    for (const [username, { password, user }] of users) {
      const note = user.mustChangePassword ? "  (temporal: pedirá cambiarla)" : "";
      console.log(`  ${user.role.padEnd(9)} ${username.padEnd(12)} ${password}${note}`);
    }
    console.log("\nTambién puedes registrar alumnos en /registro (se pierden al reiniciar).");
  });
