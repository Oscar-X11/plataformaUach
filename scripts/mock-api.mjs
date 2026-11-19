/**
 * Backend SIMULADO para recorrer el frontend sin base de datos.
 *
 *   npm run dev:mock        (en otra terminal: npm run dev:frontend)
 *
 * - Escucha en el mismo puerto que el backend real (PORT o 4000), así que
 *   el proxy /api de Next.js no necesita cambios.
 * - Implementa: POST /auth/login, POST /auth/register, POST /auth/logout,
 *   GET /auth/me, POST /auth/change-password, POST /users/:id/reset-password
 *   y GET /academic/faculties.
 * - Se inicia sesión con matrícula (alumnos) o número de empleado (personal).
 * - Todo vive en memoria: al reiniciar se pierden las cuentas registradas.
 * - Los tokens NO están firmados; el backend real los rechaza. Solo para desarrollo.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 4000);
const COOKIE = "uach_session";
const SESSION_HOURS = 8;

const FACULTIES = [
  {
    id: "fac-fca",
    name: "Facultad de Ciencias Administrativas",
    code: "FCA",
    careers: [{ id: "car-lae", name: "Licenciatura en Administración de Empresas", code: "LAE" }],
  },
  {
    id: "fac-fing",
    name: "Facultad de Ingeniería",
    code: "FING",
    careers: [{ id: "car-isc", name: "Ingeniería en Sistemas Computacionales", code: "ISC" }],
  },
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
        facultyId: role === "STUDENT" ? "fac-fing" : null,
        careerId: role === "STUDENT" ? "car-isc" : null,
      },
    },
  ]),
);

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
    if (!entry) return unauthorized(res);
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

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
  const reset = req.method === "POST" && path.match(/^\/users\/([^/]+)\/reset-password$/);
  const handler = reset
    ? (request, response) => resetPassword(request, response, reset[1])
    : routes[`${req.method} ${path}`];
  console.log(`${req.method} ${path}${handler ? "" : "  (no simulado)"}`);
  if (!handler) return send(res, 404, { statusCode: 404, message: "Ruta no disponible en el backend simulado" });
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
