// Standalone opt-in runner. Never imported by Vitest or ordinary Playwright CI.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  authorize,
  ensure,
  makeScope,
  password,
  privateDirectory,
  readPrivate,
  roles,
  savePrivate,
  schemaMapping,
  scopeHash,
  validateScope,
  type State,
} from "./safety.ts";
import { Hosted } from "./client.ts";
import { workflow, expiry, signoutAll, type Step } from "./workflow.ts";

import { validateAudit } from "./schema.ts";

const [mode, directory, run, ...rest] = process.argv.slice(2);
const args = [run, ...rest].filter((x): x is string => !!x);
let phase = "configuration";
try {
  ensure(
    ["plan", "provision", "workflow", "expiry", "cleanup"].includes(mode),
    "Unknown mode",
  );
  ensure(directory, "Private directory required");
  const dir = privateDirectory(directory);
  if (mode === "plan") {
    const scope = makeScope(run);
    savePrivate(dir, "scope.json", scope, true);
    savePrivate(dir, "state.json", { accounts: {} }, true);
    process.stdout.write(`Scope prepared. SHA256 ${scopeHash(scope)}\n`);
  } else {
    ensure(
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim() === "",
      "Commit the reviewed harness before hosted writes",
    );
    const scope = validateScope(readPrivate(dir, "scope.json"));
    authorize(scope, args, process.env);
    const state = readPrivate(dir, "state.json") as State;
    ensure(
      state && typeof state.accounts === "object" && !state.cleaned,
      "Invalid or retired state",
    );
    ensure(
      process.env.B2B_HOSTED_ADMIN_KEY,
      "Server-only provisioning/revocation key required",
    );
    const schemaAudit = validateAudit(readPrivate(dir, "schema-audit.json"));
    const h = new Hosted(scope, state, process.env);
    const save = () => savePrivate(dir, "state.json", state);
    const report: {
      mode: string;
      scopeHash: string;
      harnessCommit: string;
      target: object;
      schemaFiles: object[];
      schemaAudit: object;
      requests: typeof h.evidence;
      started: string;
      steps: { name: string; status: string }[];
      status: string;
    } = {
      mode,
      scopeHash: scopeHash(scope),
      harnessCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      target: {
        project: scope.project,
        deployment: scope.deployment,
        origin: scope.origin,
        commit: scope.commit,
      },
      schemaAudit,
      requests: h.evidence,
      schemaFiles: schemaMapping.map(([file, hostedVersion]) => ({
        file,
        hostedVersion,
        sha256: createHash("sha256")
          .update(readFileSync(`supabase/migrations/${file}`))
          .digest("hex"),
      })),
      started: new Date().toISOString(),
      steps: [],
      status: "running",
    };
    const reportName = `report-${mode}-${Date.now()}.json`;
    savePrivate(dir, reportName, report, true);
    const step: Step = async (name, fn) => {
      phase = name;
      try {
        await fn();
        report.steps.push({ name, status: "pass" });
      } catch {
        report.steps.push({ name, status: "fail" });
        throw new Error("Acceptance step failed");
      } finally {
        savePrivate(dir, reportName, report);
      }
      process.stdout.write(`PASS ${name}\n`);
    };
    try {
      if (mode === "provision") {
        ensure(
          !state.provisioned && Object.keys(state.accounts).length === 0,
          "Provisioning already attempted; do not retry blindly",
        );
        await step("provision-two-synthetic-organizations", async () => {
          const r = await h.request(
            "/rest/v1/organizations",
            process.env.B2B_HOSTED_ADMIN_KEY,
            "POST",
            [
              { id: scope.organizations.a, name: `TEST ONLY ${scope.run} A` },
              { id: scope.organizations.b, name: `TEST ONLY ${scope.run} B` },
            ],
            true,
          );
          ensure(
            r.status === 201 && Array.isArray(r.data) && r.data.length === 2,
            "Organization provisioning failed",
          );
        });
        for (const role of roles)
          await step(`provision-synthetic-${role}`, async () => {
            const secret = password();
            const r = await h.request(
              "/auth/v1/admin/users",
              process.env.B2B_HOSTED_ADMIN_KEY,
              "POST",
              {
                email: scope.accounts[role],
                password: secret,
                email_confirm: true,
                app_metadata: { synthetic_acceptance: scope.run },
              },
              true,
            );
            const user = r.data as { id?: string; email?: string };
            ensure(
              [200, 201].includes(r.status) &&
                user.id &&
                user.email === scope.accounts[role],
              "Auth provisioning failed",
            );
            state.accounts[role] = { id: user.id, password: secret };
            save();
            if (role !== "nonstaff") {
              const member = await h.request(
                "/rest/v1/staff_memberships",
                process.env.B2B_HOSTED_ADMIN_KEY,
                "POST",
                {
                  organization_id:
                    role === "other"
                      ? scope.organizations.b
                      : scope.organizations.a,
                  user_id: user.id,
                  role: role === "other" ? "engineer" : role,
                  active: true,
                },
                true,
              );
              ensure(member.status === 201, "Membership provisioning failed");
            }
          });
        state.provisioned = true;
        save();
      } else {
        ensure(
          state.provisioned && roles.every((role) => state.accounts[role]?.id),
          "Provisioning incomplete",
        );
        if (mode === "cleanup") {
          for (const role of roles) await h.login(role);
          await step("retire-only-synthetic-memberships", async () => {
            for (const role of ["operator", "engineer", "other"] as const)
              await h.membership(role, false);
          });
        } else {
          await step(
            "real-auth-identities-and-membership-positive-controls",
            async () => {
              for (const role of roles) await h.login(role);
              for (const role of roles) {
                const rows = await h.rows<{
                  user_id: string;
                  role: string;
                  organization_id: string;
                  active: boolean;
                }>(
                  role,
                  "staff_memberships",
                  `user_id=eq.${state.accounts[role]!.id}`,
                );
                if (role === "nonstaff")
                  ensure(rows.length === 0, "Nonstaff has membership");
                else
                  ensure(
                    rows.length === 1 &&
                      rows[0].active &&
                      rows[0].organization_id ===
                        (role === "other"
                          ? scope.organizations.b
                          : scope.organizations.a) &&
                      rows[0].role === (role === "other" ? "engineer" : role),
                    "Wrong test membership",
                  );
              }
            },
          );
          if (mode === "workflow") await workflow(h, step, save);
          else await expiry(h, step, save);
        }
      }
      report.status = mode === "workflow" ? "pass-expiry-pending" : "pass";
    } catch {
      report.status = "fail";
      throw new Error("Hosted run failed");
    } finally {
      try {
        await signoutAll(h);
      } catch {
        report.status = "fail-session-cleanup";
      }
      savePrivate(dir, reportName, report);
    }
    ensure(!report.status.startsWith("fail"), "Session cleanup failed");
    if (mode === "cleanup") {
      state.cleaned = true;
      save();
    }
    process.stdout.write(
      mode === "workflow"
        ? "Workflow passed; natural expiry remains PENDING.\n"
        : "Requested phase passed.\n",
    );
  }
} catch {
  // Never serialize SDK/HTTP/Playwright errors: they may contain credentials or page content.
  process.stderr.write(
    `Hosted acceptance stopped in ${phase}. Inspect only the private sanitized report. No raw error was logged.\n`,
  );
  process.exitCode = 1;
}
