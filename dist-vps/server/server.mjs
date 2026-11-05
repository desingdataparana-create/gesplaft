import {
  MODULES,
  access,
  route_exports
} from "./chunk-F2N2B65O.mjs";
import {
  __export,
  appUsers,
  closeDb,
  getDb,
  sqlQuery,
  withWriteTransaction
} from "./chunk-GOGXSPHE.mjs";

// portable/server.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes as randomBytes2 } from "node:crypto";

// app/api/users/route.ts
var route_exports2 = {};
__export(route_exports2, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic
});
import { eq } from "drizzle-orm";
import { z } from "zod";
var dynamic = "force-dynamic";
function error(e) {
  return Response.json({ error: e instanceof z.ZodError ? e.issues[0].message : "Acceso no autorizado." }, { status: e instanceof z.ZodError ? 400 : e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 403 });
}
async function GET(req) {
  try {
    const u = await access(req);
    if (u.role !== "SUPERADMIN") throw Error("FORBIDDEN");
    return Response.json({ users: await getDb().select().from(appUsers).where(eq(appUsers.ownerId, u.ownerId)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return error(e);
  }
}
async function POST(req) {
  try {
    const u = await access(req);
    if (u.role !== "SUPERADMIN") throw Error("FORBIDDEN");
    if (req.headers.get("Origin") && req.headers.get("Origin") !== new URL(req.url).origin) throw Error("FORBIDDEN");
    const input = z.object({ id: z.string().optional(), email: z.string().trim().email().transform((v) => v.toLowerCase()), name: z.string().trim().min(2).max(100), role: z.enum(["ADMIN", "ANALISTA", "OPERADOR"]), active: z.boolean(), grants: z.partialRecord(z.enum(MODULES), z.enum(["read", "write"])) }).parse(await req.json());
    if (input.grants.analisis && !input.grants.expedientes) return Response.json({ error: "El an\xE1lisis requiere acceso a Expedientes." }, { status: 400 });
    const db = getDb();
    const [existing] = await db.select().from(appUsers).where(eq(appUsers.email, input.email));
    if (existing && (existing.ownerId !== u.ownerId || existing.role === "SUPERADMIN" || existing.id !== input.id)) throw Error("FORBIDDEN");
    if (input.id && (!existing || existing.id !== input.id)) throw Error("FORBIDDEN");
    const row = { ...input, id: existing?.id || crypto.randomUUID(), ownerId: u.ownerId, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await db.insert(appUsers).values(row).onConflictDoUpdate({ target: appUsers.id, set: row });
    return Response.json({ user: row });
  } catch (e) {
    return error(e);
  }
}

// portable/auth.mjs
import { scrypt as callback, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(callback);
var tokenHash = (v) => createHash("sha256").update(v).digest("hex");
async function hashPassword(v) {
  if (typeof v !== "string" || v.length < 12 || v.length > 256) throw Error("Us\xE1 una contrase\xF1a de 12 a 256 caracteres.");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${Buffer.from(await scrypt(v, salt, 64)).toString("hex")}`;
}
var dummy = await hashPassword("Fictional-not-usable-password");
async function verifyPassword(v, encoded) {
  if (typeof v !== "string" || v.length > 256) return false;
  const [salt, h] = (encoded || dummy).split(":"), actual = Buffer.from(await scrypt(v, salt, 64)), expected = Buffer.from(h, "hex");
  return !!encoded && actual.length === expected.length && timingSafeEqual(actual, expected);
}

// portable/server.mjs
var port = Number(process.env.PORT || 8094);
var base = "/gesplaft";
var origin = process.env.PUBLIC_ORIGIN;
if (!origin || new URL(origin).origin !== origin || process.env.NODE_ENV === "production" && !origin.startsWith("https://")) throw Error("PUBLIC_ORIGIN debe ser un origen HTTPS sin barra final.");
var secure = origin.startsWith("https://");
var cookieName = secure ? "__Secure-gesplaft_session" : "gesplaft_session";
var root = resolve(dirname(fileURLToPath(import.meta.url)), "../client");
var cookie = (v, clear = false) => `${cookieName}=${v}; Path=${base}; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${secure ? "; Secure" : ""}`;
var escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var reply = (b, s = 200, h = {}) => new Response(b, { status: s, headers: h });
var redirect = (path, h = {}) => reply(null, 303, { Location: base + path, ...h });
async function readBody(req) {
  let n = 0;
  const chunks = [];
  for await (const c of req) {
    n += c.length;
    if (n > 1048576) throw reply("Solicitud demasiado grande.", 413);
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function login(message = "") {
  return reply(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GesPLAFT \xB7 Ingresar</title><style>body{background:#143b46;color:#193d47;font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh}main{margin:20px;max-width:380px;padding:32px;background:white;border-radius:14px}label{display:block;margin:20px 0}input{display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:7px;border:1px solid #b9c9ce;border-radius:6px}button{padding:12px 20px;width:100%;background:#176d70;color:white;border:0;border-radius:6px;font-size:16px}small{color:#6b7980}</style><main><small>SIGXIA \xB7 DEMO PRIVADA</small><h1>GesPLAFT</h1><p>Ingres\xE1 con una cuenta habilitada.</p>${message ? `<p role="alert">${escape(message)}</p>` : ""}<form method="post" action="${base}/auth/login"><label>Correo electr\xF3nico<input required name="email" type="email" autocomplete="username" maxlength="254"></label><label>Contrase\xF1a<input required name="password" type="password" autocomplete="current-password" maxlength="256"></label><button>Ingresar</button></form><p><small>Para acceder o restablecer tu clave, contact\xE1 al administrador.</small></p></main></html>`, 200, { "Content-Type": "text/html; charset=utf-8" });
}
async function currentUser(req) {
  const value = String(req.headers.cookie || "").split(";").map((x) => x.trim()).find((x) => x.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const [u] = await sqlQuery("select u.* from sessions s join app_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.active=true", [tokenHash(value)]);
  return u || null;
}
async function route(req) {
  const url = new URL(req.url, origin), path = url.pathname;
  if (path === base) return redirect("/");
  if (!path.startsWith(base + "/")) return reply("", 404);
  if (path === base + "/api/health") {
    try {
      await sqlQuery("select 1");
      return Response.json({ ok: true, app: "gesplaft", database: "postgresql" });
    } catch {
      return Response.json({ ok: false }, { status: 503 });
    }
  }
  if (req.method === "POST" && req.headers.origin !== origin) return reply("Origen no autorizado.", 403);
  if (path === base + "/auth/login" && req.method === "POST") {
    const body = new URLSearchParams(await readBody(req)), email = (body.get("email") || "").trim().toLowerCase(), password = body.get("password") || "";
    const local = req.socket.remoteAddress || "unknown", ip = process.env.TRUST_PROXY === "1" && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(local) ? String(req.headers["x-forwarded-for"] || local).split(",").at(-1).trim() : local;
    const keys = [tokenHash("ip:" + ip), tokenHash("account:" + email)];
    for (const key of keys) {
      const [a] = await sqlQuery("insert into login_attempts(attempt_key,failures,reset_at) values($1,1,now()+interval '15 minutes') on conflict(attempt_key) do update set failures=case when login_attempts.reset_at<now() then 1 else login_attempts.failures+1 end,reset_at=case when login_attempts.reset_at<now() then now()+interval '15 minutes' else login_attempts.reset_at end returning failures", [key]);
      if (a.failures > 10) return reply("Demasiados intentos. Reintent\xE1 en 15 minutos.", 429, { "Retry-After": "900" });
    }
    const [u] = await sqlQuery("select u.id,u.active,c.password_hash from app_users u left join credentials c on c.user_id=u.id where u.email=$1", [email]);
    if (!await verifyPassword(password, u?.password_hash) || !u?.active) return login("Correo o contrase\xF1a incorrectos.");
    await sqlQuery("delete from login_attempts where attempt_key=$1 or attempt_key=$2", keys);
    await sqlQuery("delete from sessions where expires_at<=now()");
    const token = randomBytes2(32).toString("hex");
    await sqlQuery("insert into sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '8 hours')", [tokenHash(token), u.id]);
    return redirect("/", { "Set-Cookie": cookie(token) });
  }
  if ([base + "/login", base + "/signin-with-chatgpt"].includes(path) && req.method === "GET") return login();
  const user = await currentUser(req);
  if (path === base + "/signout-with-chatgpt") {
    if (req.method === "GET") return reply(`<html lang="es"><meta charset="utf-8"><form method="post" action="${base}/signout-with-chatgpt"><button>Cerrar sesi\xF3n</button></form></html>`, 200, { "Content-Type": "text/html; charset=utf-8" });
    if (req.method !== "POST") return reply("", 405);
    if (user) await sqlQuery("delete from sessions where user_id=$1", [user.id]);
    return redirect("/login", { "Set-Cookie": cookie("", true) });
  }
  if (path.startsWith(base + "/api/")) {
    if (!user) return Response.json({ error: "Inici\xE1 sesi\xF3n para acceder a los datos." }, { status: 401 });
    if (path === base + "/api/users/password" && req.method === "POST") {
      if (user.role !== "SUPERADMIN") return Response.json({ error: "Acceso no autorizado." }, { status: 403 });
      let input;
      try {
        input = JSON.parse(await readBody(req));
      } catch {
        return Response.json({ error: "Contenido inv\xE1lido." }, { status: 400 });
      }
      if (!input || typeof input !== "object" || typeof input.id !== "string" || typeof input.password !== "string") return Response.json({ error: "Indic\xE1 el usuario y la contrase\xF1a nueva." }, { status: 400 });
      const [target] = await sqlQuery("select id from app_users where id=$1 and owner_id=$2", [input.id, user.owner_id]);
      if (!target) return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
      let hash;
      try {
        hash = await hashPassword(input.password);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 400 });
      }
      return withWriteTransaction(async () => {
        await sqlQuery("insert into credentials(user_id,password_hash) values($1,$2) on conflict(user_id) do update set password_hash=excluded.password_hash,updated_at=now()", [target.id, hash]);
        await sqlQuery("delete from sessions where user_id=$1", [target.id]);
        return Response.json({ ok: true });
      });
    }
    const routes = path === base + "/api/data" ? route_exports : path === base + "/api/users" ? route_exports2 : null;
    if (!routes || !["GET", "POST"].includes(req.method)) return reply("", 404);
    const headers = new Headers({ "oai-authenticated-user-id": user.id, "oai-authenticated-user-email": user.email });
    if (req.method === "POST") {
      headers.set("Content-Type", "application/json");
      headers.set("Origin", origin);
    }
    const request = new Request(origin + req.url, { method: req.method, headers, ...req.method === "POST" ? { body: await readBody(req) } : {} });
    return req.method === "POST" ? withWriteTransaction(() => routes.POST(request)) : routes.GET(request);
  }
  if (!["GET", "HEAD"].includes(req.method)) return reply("", 405);
  if (path === base + "/" && !user) return redirect("/login");
  const file = resolve(root, decodeURIComponent(path.slice(base.length + 1)) || "index.html");
  if (file !== root && !file.startsWith(root + "/")) return reply("", 404);
  try {
    if (!(await stat(file)).isFile()) return reply("", 404);
    const bytes = await readFile(file), mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[extname(file)] || "application/octet-stream";
    return reply(req.method === "HEAD" ? null : bytes, 200, { "Content-Type": mime, ...path.includes("/assets/") ? { "Cache-Control": "public, max-age=31536000, immutable" } : {} });
  } catch {
    return reply("", 404);
  }
}
var server = createServer(async (req, res) => {
  let output;
  try {
    output = await route(req);
  } catch (e) {
    if (e instanceof Response) output = e;
    else {
      console.error("Error de solicitud GesPLAFT:", e?.code || e?.name || "Error");
      output = Response.json({ error: "No se pudo completar la solicitud." }, { status: 500 });
    }
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  output.headers.forEach((v, k) => res.setHeader(k, v));
  res.writeHead(output.status);
  res.end(Buffer.from(await output.arrayBuffer()));
});
server.listen(port, process.env.HOST || "127.0.0.1", () => console.log(`GesPLAFT disponible en 127.0.0.1:${port}${base}/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => {
  await closeDb();
  process.exit(0);
}));
