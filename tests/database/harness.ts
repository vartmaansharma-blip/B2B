import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
export const ids = {
  orgA: "10000000-0000-4000-8000-000000000001",
  orgB: "10000000-0000-4000-8000-000000000002",
  operator: "20000000-0000-4000-8000-000000000001",
  engineer: "20000000-0000-4000-8000-000000000002",
  other: "20000000-0000-4000-8000-000000000003",
  outsider: "20000000-0000-4000-8000-000000000004",
  anonymous: "20000000-0000-4000-8000-000000000005",
};
export async function database() {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
 create schema auth; create table auth.users(id uuid primary key, is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query(
    "insert into auth.users(id,is_anonymous) select x::uuid, x=$1 from unnest($2::text[]) x",
    [
      ids.anonymous,
      [ids.operator, ids.engineer, ids.other, ids.outsider, ids.anonymous],
    ],
  );
  await db.query(
    "insert into public.organizations(id,name) values ($1,'TEST ONLY Workspace A'),($2,'TEST ONLY Workspace B')",
    [ids.orgA, ids.orgB],
  );
  await db.query(
    "insert into public.staff_memberships(organization_id,user_id,role) values ($1,$2,'operator'),($1,$3,'engineer'),($4,$5,'admin'),($1,$6,'operator')",
    [ids.orgA, ids.operator, ids.engineer, ids.orgB, ids.other, ids.anonymous],
  );
  return db;
}
export async function asUser<T>(
  db: PGlite,
  user: string,
  sql: string,
  params: unknown[] = [],
) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ]);
    return tx.query<T>(sql, params);
  });
}
export const supplierInsert = `insert into public.suppliers(organization_id,name,city,region,processes,materials,source_reference,observed_on) values ($1,$2,'TEST ONLY City','TEST ONLY Region','Unverified test process','Unverified test material','SYNTHETIC TEST FIXTURE - no real assessment',current_date) returning *`;
