import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { ensure, schemaMapping, target } from "./safety.ts";
const auditSchema = z
  .object({
    project: z.literal(target.project),
    observed_at: z.string(),
    database_date: z.iso.date(),
    timezone: z.literal("UTC"),
    migrations: z.array(z.object({ version: z.string(), name: z.string() })),
    functions: z.record(z.string(), z.string().regex(/^[a-f0-9]{32}$/)),
    rls_tables: z.literal(9),
    caller_scoped_view: z.literal(true),
    anonymous_grants: z.literal(0),
    catalog_md5: z.string().regex(/^[a-f0-9]{32}$/),
  })
  .strict();
export function functionDigests() {
  const functions: Record<string, string> = {};
  for (const [file] of schemaMapping) {
    const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
    for (const match of sql.matchAll(
      /create (?:or replace )?function private\.(\w+)\([^]*?as \$\$([^]*?)\$\$/gi,
    ))
      functions[match[1]] = createHash("md5")
        .update(match[2].replace(/\s/g, ""))
        .digest("hex");
  }
  ensure(
    Object.keys(functions).length === 9,
    "Unexpected canonical function set",
  );
  return functions;
}
export function validateAudit(value: unknown, now = Date.now()) {
  const audit = auditSchema.parse(value);
  const age = now - Date.parse(audit.observed_at);
  ensure(
    Number.isFinite(age) && age >= -60000 && age < 86400000,
    "Refresh read-only schema audit within 24 hours",
  );
  ensure(
    audit.migrations.length === schemaMapping.length &&
      schemaMapping.every(
        ([file, version], index) =>
          audit.migrations[index].version === version &&
          audit.migrations[index].name === file.slice(15, -4),
      ),
    "Migration mapping differs; stop without replay/repair",
  );
  const local = functionDigests();
  ensure(
    Object.keys(audit.functions).length === Object.keys(local).length &&
      Object.entries(local).every(
        ([name, digest]) => audit.functions[name] === digest,
      ),
    "Live private function differs from canonical migrations",
  );
  return audit;
}
