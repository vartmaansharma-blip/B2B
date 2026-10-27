/** Isolated Auth/PostgREST protocol fixture. Never used by application code.
 * RLS and triggers execute in PGlite; this is not a hosted Supabase integration test. */
import { createServer } from "node:http";
import { database, asUser, ids } from "../database/harness.ts";
const db = await database();
const users: Record<string, string> = {
  "operator@fixture.test": ids.operator,
  "engineer@fixture.test": ids.engineer,
  "outsider@fixture.test": ids.outsider,
};
const user = (id: string) => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email: Object.keys(users).find((e) => users[e] === id),
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  is_anonymous: false,
});
function token(id: string) {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.fixture_signature_not_a_real_credential`;
}
const tables = new Set([
  "organizations",
  "staff_memberships",
  "suppliers",
  "customers",
  "rfqs",
  "review_events",
]);
const identifier = (s: string) => {
  if (!/^[a-z_]+$/.test(s)) throw new Error("Invalid fixture identifier");
  return `"${s}"`;
};
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const send = (status: number, value: unknown) => {
    res.statusCode = status;
    res.end(
      JSON.stringify(value, (key, item) =>
        ["observed_on", "target_date", "qualification_expires_on"].includes(
          key,
        ) && typeof item === "string"
          ? item.slice(0, 10)
          : item,
      ),
    );
  };
  try {
    const url = new URL(req.url!, "http://127.0.0.1:54329");
    if (url.pathname === "/health") return send(200, { fixture: true });
    let bodyText = "";
    for await (const chunk of req) bodyText += chunk;
    const body = bodyText ? JSON.parse(bodyText) : {};
    const access = req.headers.authorization?.replace("Bearer ", "");
    let id = "";
    try {
      id = JSON.parse(
        Buffer.from(access!.split(".")[1], "base64url").toString(),
      ).sub;
    } catch {}
    if (url.pathname === "/auth/v1/token") {
      const uid = users[body.email];
      if (!uid || body.password !== "Fixture-password-only-2026")
        return send(400, {
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        });
      return send(200, {
        access_token: token(uid),
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "fixture-refresh-only",
        user: user(uid),
      });
    }
    if (url.pathname === "/auth/v1/user")
      return id && Object.values(users).includes(id)
        ? send(200, user(id))
        : send(401, { msg: "Invalid token" });
    if (url.pathname === "/auth/v1/logout") return send(200, {});
    const table = url.pathname.replace("/rest/v1/", "");
    if (!tables.has(table) || !Object.values(users).includes(id))
      return send(401, { message: "Fixture authorization required" });
    const values: unknown[] = [];
    const bind = (v: unknown) => {
      values.push(v);
      return `$${values.length}`;
    };
    const filters: string[] = [];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "offset", "limit", "columns"].includes(key))
        continue;
      const sep = value.indexOf(".");
      const op = value.slice(0, sep),
        v = value.slice(sep + 1);
      const operators: Record<string, string> = {
        eq: "=",
        neq: "<>",
        gt: ">",
        ilike: "ilike",
      };
      if (!operators[op]) throw new Error(`Unsupported fixture filter ${op}`);
      filters.push(`${identifier(key)} ${operators[op]} ${bind(v)}`);
    }
    const where = filters.length ? ` where ${filters.join(" and ")}` : "";
    const select = url.searchParams.get("select") ?? "*";
    const columns =
      select === "*" ? "*" : select.split(",").map(identifier).join(",");
    let sql: string;
    let count = 0;
    if (req.method === "POST") {
      const item = Array.isArray(body) ? body[0] : body;
      const keys = Object.keys(item);
      sql = `insert into public.${identifier(table)} (${keys.map(identifier)}) values (${keys.map((k) => bind(item[k]))}) returning ${columns}`;
    } else if (req.method === "PATCH") {
      const assignments = Object.keys(body).map(
        (k) => `${identifier(k)}=${bind(body[k])}`,
      );
      sql = `update public.${identifier(table)} set ${assignments.join(",")}${where} returning ${columns}`;
    } else if (req.method === "GET" || req.method === "HEAD") {
      count = Number(
        (
          await asUser<{ count: string }>(
            db,
            id,
            `select count(*) from public.${identifier(table)}${where}`,
            values,
          )
        ).rows[0].count,
      );
      let order = "";
      const sort = url.searchParams.get("order");
      if (sort)
        order =
          " order by " +
          sort
            .split(",")
            .map((item) => {
              const [col, dir] = item.split(".");
              return `${identifier(col)} ${dir === "desc" ? "desc" : "asc"}`;
            })
            .join(",");
      const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
      const limit = Math.min(
        1000,
        Math.max(1, Number(url.searchParams.get("limit") ?? 1000)),
      );
      sql = `select ${columns} from public.${identifier(table)}${where}${order} limit ${limit} offset ${offset}`;
    } else return send(405, {});
    const result = await asUser(db, id, sql, values);
    res.setHeader(
      "Content-Range",
      `0-${Math.max(0, result.rows.length - 1)}/${count || result.rows.length}`,
    );
    if (req.method === "HEAD") {
      res.statusCode = 200;
      return res.end();
    }
    if (req.headers.accept?.includes("application/vnd.pgrst.object+json")) {
      if (result.rows.length !== 1)
        return send(406, { code: "PGRST116", message: "Expected one row" });
      return send(req.method === "POST" ? 201 : 200, result.rows[0]);
    }
    return send(req.method === "POST" ? 201 : 200, result.rows);
  } catch (error) {
    const e = error as { code?: string; message: string };
    send(400, { code: e.code ?? "FIXTURE", message: e.message });
  }
});
server.listen(54329, "127.0.0.1", () =>
  console.log("Isolated synthetic fixture ready on 54329"),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close();
    void db.close().then(() => process.exit(0));
  });
