# Opt-in hosted shortlist acceptance

This suite uses real Supabase Auth/PostgREST and Chromium against one pinned, protected review deployment. It is separate from credential-free `npm run check`, `npm run test` and the simulated `npm run test:e2e`. Local checks of the harness do not establish hosted acceptance. Hosted provisioning and test writes require the owner's approval of the exact private scope first. No migration, email, merge or deployment command is included.

## Pinned target and evidence

- Supabase B2B staging: `ywciamahpwefiuihlynw` only.
- Review deployment: `dpl_F5iygahkd48rWVsCdaxLrgcacpfA`, protected Preview, app commit `1a5cdbd89b56ca74c89aaea55f0451fa00df044f`.
- Immutable origin: `https://b2b-manufacturing-qkte75fgr-vartmaansharma-blips-projects.vercel.app`. The mutable branch alias resolved here during the 28 October audit; runs use the immutable origin.
- Recheck deployment metadata, Git SHA and project protection with the Vercel connector before running. A replacement target requires a reviewed harness change and a new approved scope. Do not silently follow a branch alias to a different build.
- [Schema audit SQL](../tests/hosted/schema-audit.sql) is read-only. Execute it with the Supabase connector on the exact project. Save only its `audit` object privately as `schema-audit.json`. The runner requires a less-than-24-hour audit with all nine canonical private function bodies matching the repository, nine RLS tables, the caller-scoped view, no anonymous grants and the exact provider migration mapping. Refresh this audit before each phase, including expiry. The catalog digest binds results to the observed constraints, policies, grants, triggers and view. This is an operator attestation, not a privileged database endpoint exposed to the app.

| Repository migration                        | Hosted version   |
| ------------------------------------------- | ---------------- |
| `20261027182029_manufacturing_os_v0.sql`    | `20261027182029` |
| `20261028023900_rfq_drawing_revisions.sql`  | `20261028120807` |
| `20261028115224_procurement_shortlists.sql` | `20261028120816` |

Preserve these applied versions. Do not run migration push/reset/repair, reapply files or rewrite history to satisfy this suite. Its application requests never use SQL impersonation or bypass RLS.

The Vercel project is Git-connected. This branch's `vercel.json` disables automatic Git deployment specifically for `feat/hosted-shortlist-acceptance`. Keep that exclusion in every pushed acceptance commit. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled). Do not push another branch or change the publishing branch to obtain a deployment.

## Exact approval scope

`plan` creates a fresh immutable `scope.json` in a mode-0700 directory **outside the repository** and prints its SHA256. Review that file privately. All identities, UUIDs and limits are included in the digest; any change requires fresh approval.

| Object                   | Intended scope per approved run                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Organizations            | Two new UUIDs: `TEST ONLY <run> A` and `TEST ONLY <run> B`; no existing organization                                                                                                                                     |
| Auth accounts            | Four new, auto-confirmed password accounts: operator and engineer in A; engineer in B (`other`); nonstaff with no membership                                                                                             |
| Account identity         | Role alias at `<run>.example.invalid`, generated privately; unique random passwords; server-managed synthetic-run marker; no emails                                                                                      |
| Suppliers/capabilities   | Two synthetic suppliers and one append-only capability each in A; one supplier qualified for 30 days, one until tomorrow UTC                                                                                             |
| Customers                | One synthetic customer in each organization                                                                                                                                                                              |
| RFQs/shortlists          | One drawing-controlled synthetic RFQ in A; two supplier entries; revisions A and B; reasoned reviews and immutable events                                                                                                |
| Administrative mutations | Create the two organizations, four Auth users and three memberships; revoke and restore only A's operator membership; final cleanup deactivates all three synthetic memberships and globally signs out the four accounts |
| Retention                | Preserve all synthetic rows, Auth identities and immutable audit history; retire memberships after expiry or after a failed run. No deletes, trigger disabling or history alteration                                     |

Denial probes also attempt forbidden writes: qualification/approval/acceptance, self-promotion, three extra synthetic customer inserts, three extra capability inserts, two duplicate shortlist inserts, event forgery, event/observation edits/deletes and cross-tenant edits/references. They must fail. If an authorization defect permits a probe, the suite stops immediately and retains that synthetic evidence for review; the extra customer/capability ceilings are three each. Denied existing-row edits can affect only this run's synthetic records if a guard fails. No real contacts, drawings, rates, quotations or manufacturing assessments are used.

Qualification and fit evidence explicitly say `SYNTHETIC TEST ONLY; no real engineering or supplier claim`. These are software authorization tests, not supplier qualifications.

## Prepare locally, then request approval

Use Node 22 or 24 (`>=22 <25`) and install Chromium once. Complete all local checks before requesting hosted writes:

```sh
npm ci
npm run check
npm run test
npm run test:e2e
npx playwright install chromium
mkdir -m 700 /private/tmp/b2b-hosted-acceptance-unique
npm run test:hosted -- plan /private/tmp/b2b-hosted-acceptance-unique synthetic-shortlist-YYYYMMDD-unique
```

Do not rerun `plan` into an existing directory. The private scope and state are never repository files. Planning makes no network requests or hosted changes. A failed/partial workflow is never silently replayed; retire its memberships and prepare a new approved run. Partial provisioning needs an operator audit against the private state and scope before any reconciliation; do not retry blindly.

## Run only after exact-scope approval

Load secrets from a private environment or local secret manager, never shell command arguments, chat, PR bodies or CI:

- `B2B_HOSTED_PUBLIC_KEY`: this project's publishable key or target-bound legacy anon key.
- `B2B_HOSTED_ADMIN_KEY`: server-only administrative API key, used solely for synthetic account/org/membership provisioning, synthetic identity verification and membership revocation/restoration/cleanup. Business tests always use the four real user JWTs or the anonymous public key. Never add this key to the app's environment.
- `VERCEL_OIDC_TOKEN`: short-lived existing development identity for this same Vercel project. Browser requests attach it only to the exact review origin. Do not disable protection or create a long-lived share/bypass URL.
- `B2B_HOSTED_APPROVED_SCOPE_SHA256`: approved digest from `plan`. Set this only after human approval; the flag is an execution guard, not proof that approval occurred.

Run `vercel env run --help` before using that CLI to inject an existing development identity. If existing identity access fails, stop and diagnose the exact target; obtain separate approval for any access-control configuration change. Never print/persist a Vercel token or send it to another origin.

All modifying phases require the same three explicit command gates in addition to the digest and credentials:

```sh
npm run test:hosted -- provision /absolute/private/directory --write \
  --allow-project=ywciamahpwefiuihlynw \
  --allow-origin=https://b2b-manufacturing-qkte75fgr-vartmaansharma-blips-projects.vercel.app
```

Use the same command with `workflow`, then `expiry`, then `cleanup` instead of `provision`. Refresh the schema attestation and OIDC identity as needed. The runner creates no deployment and follows no HTTP redirects when sending API credentials.

Engineering fit rejection uses the existing `removed` shortlist decision, with an engineer-authored reason and immutable event. The suite verifies removal through the review UI, denied direct reacceptance, reproposal clearing prior review attribution/evidence, and required fresh evidence before accepting again. It adds no records or new workflow state to the approved scope.

`workflow` tests browser capability/proposal/acceptance/rejection, direct API role and evidence gates, drawing amendments, supplier suspension/requalification, engineering reapproval, stale parent/entry edits and forms, immutable historical evidence, anonymous/nonstaff/cross-tenant denials, private-schema exclusion, self-promotion denial, real Auth refresh and server-proxy cookie refresh, active-token membership revocation, browser denial and sign-out. All ten exposed relations have direct anonymous/other-organization/nonstaff read probes with valid identity/membership positive controls. Anonymous means unauthenticated Data API access; hosted anonymous sign-in remains disabled and is not enabled to create an anonymous Auth account.

The browser refresh check expires only the stored session's client metadata while retaining its signed JWT and real refresh token, then requires replacement cookies/tokens from the real proxy/Auth flow. It does not test waiting for the signed access JWT's natural expiry. Response and cookie checks exercise HTTPS pages and refresh: private/no-store, DENY/nosniff, Secure/HttpOnly/SameSite=Lax, no Supabase browser-storage session. Browser recording, tracing, screenshots, HAR and state exports are disabled. The runner suppresses raw exceptions and outputs fixed step names/status only; it never serializes Auth responses or browser errors into logs.

### Real expiry is two-phase

PostgreSQL staging's timezone is UTC. `workflow` creates and accepts a second supplier whose valid qualification expires tomorrow. It saves a private checkpoint and returns **pass-expiry-pending**, never a complete hosted PASS. At or after the recorded date's 00:00 UTC (05:30 IST), run `expiry`: the stored decision must still be accepted, the live status must be needs-review, history must be unchanged, and reproposal followed by acceptance must fail because qualification expired. No privileged expiry edit or clock/trigger manipulation is used. No scheduler is created automatically. If run early it stops with no expiry writes.

After expiry, run `cleanup` to deactivate only these three synthetic memberships and globally sign out their four accounts. On failure, cleanup is still available for a fully provisioned scope. It checks each synthetic account's actual Auth identity and marker before changing memberships. Cleanup preserves audit history and the private evidence; deleting Auth identities would break attribution and is outside this scope.

## Evidence and reporting

Private mode-0600 reports include phase results, sanitized HTTP method/resource/status/error codes (no bodies, queries or user IDs), harness commit, pinned app SHA/deployment/origin, canonical migration file SHA256 values, approved scope digest and the read-only live schema audit/catalog digest. `state.json` also contains synthetic account passwords and expiry record IDs: never publish or export it. Do not upload this directory as a GitHub artifact. A report with any failed step, failed signout or pending expiry is not full hosted acceptance.

After a complete run, publish only aggregate statuses and exact source/deployment/schema identities in [verification](verification.md) and the draft PR. Never attach test exports, tokens, cookies, passwords, contact details, raw errors, private UUIDs or response bodies. A hosted failure justifies a focused fix on the acceptance feature branch; test against the existing deployment still describes its pinned app SHA. Testing a fix on a new deployment needs separate deployment authorization, outside this task's no-deploy boundary.
