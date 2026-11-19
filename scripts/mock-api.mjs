/**
 * Backend SIMULADO para recorrer el frontend sin base de datos.
 *
 *   npm run dev:mock        (en otra terminal: npm run dev:frontend)
 *
 * - Escucha en el mismo puerto que el backend real (PORT o 4000), así que
 *   el proxy /api de Next.js no necesita cambios.
 * - Implementa: POST /auth/login, POST /auth/register, POST /auth/logout,
 *   GET /auth/me y GET /academic/faculties.
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

/** Cuentas de demostración, una por rol. */
const users = new Map(
  [
    ["alumno@uach.mx", "alumno123", "Ana Sofía Ruiz Gómez", "STUDENT", "A2023-0148"],
    ["docente@uach.mx", "docente123", "Laura Gómez Pérez", "TEACHER", null],
    ["admin@uach.mx", "admin123", "Administrador UACH", "ADMIN", null],
    ["seguridad@uach.mx", "seguridad123", "Caseta Principal", "SECURITY", null],
  ].map(([email, password, fullName, role, enrollment]) => [
    email,
    {
      password,
      user: {
        id: randomUUID(),
        email,
        fullName,
        role,
        status: "ACTIVE",
        enrollment,
        facultyId: role === "STUDENT" ? "fac-fing" : null,
        careerId: role === "STUDENT" ? "car-isc" : null,
      },
    },
  ]),
);

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function createSession(user) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  const accessToken = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: user.id, role: user.role, exp })}.mock`;
  return { user, accessToken, expiresAt: new Date(exp * 1000).toISOString() };
}

function readToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const match = (req.headers.cookie ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1];
}

function userFromToken(token) {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (claims.exp * 1000 <= Date.now()) return null;
    return [...users.values()].find((entry) => entry.user.id === claims.sub)?.user ?? null;
  } catch {
    return null;
  }
}

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
    const { email = "", password = "" } = await readJson(req);
    const entry = users.get(String(email).trim().toLowerCase());
    if (!entry || entry.password !== password) {
      return send(res, 401, { statusCode: 401, message: "Correo o contraseña incorrectos" });
    }
    const session = createSession(entry.user);
    send(res, 200, session, { "Set-Cookie": sessionCookie(session) });
  },

  "POST /auth/register": async (req, res) => {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const errors = [];
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("Correo electrónico inválido");
    if (fullName.length < 3) errors.push("Escribe tu nombre completo");
    if (password.length < 8) errors.push("La contraseña debe tener al menos 8 caracteres");
    else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) errors.push("La contraseña debe incluir letras y números");
    if (errors.length) return send(res, 400, { statusCode: 400, message: errors });
    if (users.has(email)) return send(res, 409, { statusCode: 409, message: "El correo ya está registrado" });

    const user = {
      id: randomUUID(),
      email,
      fullName,
      role: "STUDENT",
      status: "ACTIVE",
      enrollment: body.enrollment || null,
      facultyId: body.facultyId || null,
      careerId: body.careerId || null,
    };
    users.set(email, { password, user });
    const session = createSession(user);
    send(res, 201, session, { "Set-Cookie": sessionCookie(session) });
  },

  "POST /auth/logout": (_req, res) =>
    send(res, 204, undefined, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` }),

  "GET /auth/me": (req, res) => {
    const user = userFromToken(readToken(req) ?? "");
    if (!user) return send(res, 401, { statusCode: 401, message: "Sesión inválida o expirada" });
    send(res, 200, user);
  },

  "GET /academic/faculties": (_req, res) => send(res, 200, FACULTIES),
};

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
  const handler = routes[`${req.method} ${path}`];
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
    for (const [email, { password, user }] of users) {
      console.log(`  ${user.role.padEnd(9)} ${email.padEnd(20)} ${password}`);
    }
    console.log("\nTambién puedes registrar alumnos en /registro (se pierden al reiniciar).");
  });
