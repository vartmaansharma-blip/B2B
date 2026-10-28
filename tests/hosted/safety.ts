import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { z } from "zod";

export const target = {
  project: "ywciamahpwefiuihlynw",
  origin:
    "https://b2b-manufacturing-qkte75fgr-vartmaansharma-blips-projects.vercel.app",
  deployment: "dpl_F5iygahkd48rWVsCdaxLrgcacpfA",
  commit: "1a5cdbd89b56ca74c89aaea55f0451fa00df044f",
} as const;
export const schemaMapping = [
  ["20261027182029_manufacturing_os_v0.sql", "20261027182029"],
  ["20261028023900_rfq_drawing_revisions.sql", "20261028120807"],
  ["20261028115224_procurement_shortlists.sql", "20261028120816"],
] as const;
export const roles = ["operator", "engineer", "other", "nonstaff"] as const;
export type Actor = (typeof roles)[number];
const scopeSchema = z
  .object({
    version: z.literal(1),
    run: z.string().regex(/^synthetic-shortlist-[a-z0-9-]{8,48}$/),
    project: z.literal(target.project),
    origin: z.literal(target.origin),
    deployment: z.literal(target.deployment),
    commit: z.literal(target.commit),
    organizations: z.object({ a: z.uuid(), b: z.uuid() }).strict(),
    accounts: z
      .object({
        operator: z.string(),
        engineer: z.string(),
        other: z.string(),
        nonstaff: z.string(),
      })
      .strict(),
    limits: z
      .object({
        suppliers: z.literal(2),
        capabilities: z.literal(2),
        customers: z.literal(2),
        rfqs: z.literal(1),
        shortlists: z.literal(2),
      })
      .strict(),
  })
  .strict();
export type Scope = z.infer<typeof scopeSchema>;
export type State = {
  accounts: Partial<Record<Actor, { id: string; password: string }>>;
  provisioned?: boolean;
  workflowStarted?: boolean;
  expiry?: {
    supplier: string;
    entry: string;
    rfq: string;
    date: string;
    snapshotHash: string;
  };
  expiryComplete?: boolean;
  cleaned?: boolean;
};
export function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function scopeHash(scope: Scope) {
  return createHash("sha256").update(JSON.stringify(scope)).digest("hex");
}
export function validateScope(value: unknown): Scope {
  const scope = scopeSchema.parse(value);
  ensure(
    scope.organizations.a !== scope.organizations.b,
    "Distinct organizations required",
  );
  for (const role of roles)
    ensure(
      scope.accounts[role] === `${role}@${scope.run}.example.invalid`,
      "Synthetic account required",
    );
  return scope;
}
export function makeScope(run: string): Scope {
  return validateScope({
    version: 1,
    run,
    ...target,
    organizations: { a: randomUUID(), b: randomUUID() },
    accounts: Object.fromEntries(
      roles.map((role) => [role, `${role}@${run}.example.invalid`]),
    ),
    limits: {
      suppliers: 2,
      capabilities: 2,
      customers: 2,
      rfqs: 1,
      shortlists: 2,
    },
  });
}
export function privateDirectory(path: string) {
  ensure(isAbsolute(path), "Use an absolute private directory");
  const actual = realpathSync(path);
  const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const rel = relative(repo, actual);
  ensure(
    rel.startsWith(`..${sep}`) || isAbsolute(rel),
    "Private files must be outside repository",
  );
  const stat = lstatSync(actual);
  ensure(
    stat.isDirectory() && (stat.mode & 0o077) === 0,
    "Private directory must have mode 0700",
  );
  return actual;
}
export function savePrivate(
  dir: string,
  name: string,
  value: unknown,
  fresh = false,
) {
  const path = resolve(dir, name);
  if (!fresh) {
    const stat = lstatSync(path, { throwIfNoEntry: false });
    ensure(
      !stat ||
        (stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0),
      "Unsafe private file",
    );
  }
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
    flag: fresh ? "wx" : "w",
  });
}
export function readPrivate(dir: string, name: string): unknown {
  const path = resolve(dir, name),
    stat = lstatSync(path);
  ensure(
    stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0,
    "Unsafe private file",
  );
  return JSON.parse(readFileSync(path, "utf8"));
}
export function authorize(
  scope: Scope,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  ensure(args.includes("--write"), "Hosted writes require --write");
  ensure(
    env.B2B_HOSTED_APPROVED_SCOPE_SHA256 === scopeHash(scope),
    "Exact scope approval required",
  );
  ensure(
    args.includes(`--allow-project=${scope.project}`),
    "Explicit project allowlist required",
  );
  ensure(
    args.includes(`--allow-origin=${scope.origin}`),
    "Explicit origin allowlist required",
  );
  ensure(env.B2B_HOSTED_PUBLIC_KEY, "Public key required");
  ensure(
    !env.B2B_HOSTED_PUBLIC_KEY.startsWith("sb_secret_"),
    "Privileged public key rejected",
  );
  if (!env.B2B_HOSTED_PUBLIC_KEY.startsWith("sb_publishable_")) {
    const claims = JSON.parse(
      Buffer.from(
        env.B2B_HOSTED_PUBLIC_KEY.split(".")[1] ?? "",
        "base64url",
      ).toString(),
    ) as { role?: string; ref?: string };
    ensure(
      claims.role === "anon" && claims.ref === scope.project,
      "Only target anon key allowed",
    );
  }
}
export function password() {
  return `Synthetic-${randomBytes(30).toString("base64url")}!7a`;
}
