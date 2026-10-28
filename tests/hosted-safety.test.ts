import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  symlinkSync,
  chmodSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  authorize,
  makeScope,
  privateDirectory,
  readPrivate,
  savePrivate,
  scopeHash,
  target,
  validateScope,
} from "./hosted/safety";
const scope = makeScope("synthetic-shortlist-local-guard-test");
const args = [
  "--write",
  `--allow-project=${target.project}`,
  `--allow-origin=${target.origin}`,
];
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  B2B_HOSTED_APPROVED_SCOPE_SHA256: scopeHash(scope),
  B2B_HOSTED_PUBLIC_KEY: "sb_publishable_synthetic_only",
};
describe("hosted acceptance fails closed without network calls", () => {
  it("accepts only the pinned B2B staging deployment and synthetic identities", () => {
    expect(validateScope(scope)).toEqual(scope);
    for (const patch of [
      { project: "unrelated" },
      { origin: "http://127.0.0.1" },
      { origin: `${target.origin}/redirect` },
      { deployment: "dpl_other" },
      { commit: "main" },
      { accounts: { ...scope.accounts, operator: "real@example.com" } },
      { organizations: { a: scope.organizations.a, b: scope.organizations.a } },
      { limits: { ...scope.limits, suppliers: 3 } },
    ])
      expect(() => validateScope({ ...scope, ...patch })).toThrow();
  });
  it("requires independent approval, write and both allowlist gates", () => {
    expect(() => authorize(scope, args, env)).not.toThrow();
    for (const i of [0, 1, 2])
      expect(() =>
        authorize(
          scope,
          args.filter((_, n) => n !== i),
          env,
        ),
      ).toThrow();
    expect(() =>
      authorize(scope, args, {
        ...env,
        B2B_HOSTED_APPROVED_SCOPE_SHA256: "wrong",
      }),
    ).toThrow();
    expect(() =>
      authorize(scope, args, {
        ...env,
        B2B_HOSTED_PUBLIC_KEY: "sb_secret_bad",
      }),
    ).toThrow();
    const jwt = `x.${Buffer.from(JSON.stringify({ role: "service_role", ref: scope.project })).toString("base64url")}.x`;
    expect(() =>
      authorize(scope, args, { ...env, B2B_HOSTED_PUBLIC_KEY: jwt }),
    ).toThrow();
    expect(() =>
      authorize(scope, args, { ...env, B2B_HOSTED_PUBLIC_KEY: undefined }),
    ).toThrow();
  });
  it("binds approval to the complete immutable scope", () => {
    const changed = makeScope("synthetic-shortlist-another-test");
    expect(scopeHash(changed)).not.toBe(scopeHash(scope));
    expect(() => authorize(changed, args, env)).toThrow();
  });
  it("keeps private files outside the repo and refuses links or broad permissions", () => {
    expect(() => privateDirectory(process.cwd())).toThrow();
    const dir = mkdtempSync(join(tmpdir(), "b2b-hosted-safety-"));
    try {
      chmodSync(dir, 0o700);
      expect(privateDirectory(dir)).toBeTruthy();
      savePrivate(dir, "scope.json", scope, true);
      expect(readPrivate(dir, "scope.json")).toEqual(scope);
      expect(() => savePrivate(dir, "scope.json", scope, true)).toThrow();
      symlinkSync(join(dir, "scope.json"), join(dir, "link.json"));
      expect(() => readPrivate(dir, "link.json")).toThrow();
      expect(() => savePrivate(dir, "link.json", {})).toThrow();
      const open = join(dir, "open");
      mkdirSync(open, { mode: 0o755 });
      expect(() => privateDirectory(open)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("read-only hosted schema attestation", () => {
  it("rejects stale audits, rewritten migration metadata and changed live functions", async () => {
    const { functionDigests, validateAudit } = await import("./hosted/schema");
    const now = Date.now();
    const audit = {
      project: target.project,
      observed_at: new Date(now).toISOString(),
      database_date: new Date(now).toISOString().slice(0, 10),
      timezone: "UTC",
      migrations: [
        { name: "manufacturing_os_v0", version: "20261027182029" },
        { name: "rfq_drawing_revisions", version: "20261028120807" },
        { name: "procurement_shortlists", version: "20261028120816" },
      ],
      functions: functionDigests(),
      rls_tables: 9,
      caller_scoped_view: true,
      anonymous_grants: 0,
      catalog_md5: "0".repeat(32),
    };
    expect(() => validateAudit(audit, now)).not.toThrow();
    expect(() => validateAudit(audit, now + 86400001)).toThrow();
    expect(() =>
      validateAudit(
        {
          ...audit,
          migrations: [
            ...audit.migrations.slice(0, 2),
            { name: "procurement_shortlists", version: "20261028115224" },
          ],
        },
        now,
      ),
    ).toThrow();
    expect(() =>
      validateAudit(
        {
          ...audit,
          functions: { ...audit.functions, guard_shortlist: "0".repeat(32) },
        },
        now,
      ),
    ).toThrow();
    expect(() =>
      validateAudit({ ...audit, caller_scoped_view: false }, now),
    ).toThrow();
    expect(() =>
      validateAudit({ ...audit, anonymous_grants: 1 }, now),
    ).toThrow();
  });
});

it("standalone Node runner plans offline and rejects unapproved provisioning", () => {
  const dir = mkdtempSync(join(tmpdir(), "b2b-hosted-runner-"));
  try {
    chmodSync(dir, 0o700);
    const command = ["--experimental-strip-types", "tests/hosted/run.ts"];
    const options = {
      encoding: "utf8" as const,
      env: { PATH: process.env.PATH, NODE_ENV: "test" as const },
      timeout: 20000,
    };
    const plan = spawnSync(
      process.execPath,
      [...command, "plan", dir, "synthetic-shortlist-offline-smoke"],
      options,
    );
    expect(plan.status, plan.stderr).toBe(0);
    expect(plan.stdout).toContain("Scope prepared. SHA256");
    const blocked = spawnSync(
      process.execPath,
      [...command, "provision", dir, ...args],
      options,
    );
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain("stopped in configuration");
    expect(readPrivate(dir, "state.json")).toEqual({ accounts: {} });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
