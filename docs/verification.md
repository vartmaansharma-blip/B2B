# V0 verification

Local evidence, 28 October 2026 (IST). This is implementation verification, not supplier validation or release authorization.

## Current branch audit and procurement foundations — 28 October 2026 (IST)

This section supersedes the repository/release status in the historical sections below. The referenced conversation's assistant answers were unavailable as plain text, so the implementation audit uses current source, GitHub and service inspection instead of inferred promises.

### Authorized hosted follow-up

Published functional code: `b44d66f53f02a5bc7422004c4c953edcf07b7038` from `feat/procurement-shortlists`, protected Vercel **Preview**, deployment `dpl_BZSAkTZkzempfM6E3jnrnDTsegYp`, region `bom1`, READY. Both local and [exact-commit GitHub CI run 40686071928](https://github.com/vartmaansharma-blip/B2B/actions/runs/40686071928) passed: **128 tests**, production build and **24 desktop/mobile browser checks**. The existing [protected review URL](https://b2b-manufacturing-os-git-f-3907c7-vartmaansharma-blips-projects.vercel.app/) was reassigned to that branch deployment; the older unique staging deployment remains available. PR #3 stays draft/unmerged and `main` remains `dd26b88aa7f5d9dea3d1d3407d045bd8fbdbc981`. Later documentation-only publishing is recorded in the PR's current release evidence.

Actual browser smoke: the owner's existing admin session loaded the published overview and empty RFQ register through hosted Auth/PostgREST. No password entry, recovery message or business record was needed. A Vercel-authenticated request without an application session returned **307 /login**, `private, no-cache, no-store`, `X-Frame-Options: DENY` and `nosniff`. An unauthenticated review-URL request returned the access redirect (**302**); deployment protection remains enabled. This is a hosted admin/read smoke check, not the full operator/engineer workflow or security certification.

The user explicitly approved applying both pending migrations to B2B staging and publishing this branch to its protected review site. Both exact files applied successfully on `ywciamahpwefiuihlynw`; subsequent catalog inspection confirmed nine public tables with RLS, eleven new-table foreign keys, `security_invoker=true` on the live-status view, zero anonymous/PUBLIC table grants, and zero authenticated execution grants on private trigger helpers. A hosted authenticated-role query without staff identity saw zero capability, live-shortlist and event rows. Business registers were empty before application; no business records or credentials were added.

Supabase assigned hosted versions `20261028120807` and `20261028120816` for the drawing and shortlist files respectively. Automatic approval review rejected rewriting these history timestamps as outside the migration approval. History is preserved; [environment](environment.md#applied-staging-history-and-future-migration-tooling) records the exact file mapping and prohibits blind replay/repair. Application publishing does not require rewriting history.

Generated TypeScript types were fetched from the migrated hosted schema and replace the manual contract. The live-status view's nullable generated columns are checked at the query boundary before rendering. This verifies actual schema compatibility; a full Docker-based local Supabase stack remains unavailable.

The follow-up `npm run check` passed with those generated types: formatting, zero-warning lint, strict TypeScript, **128 tests** and production build. The upload dry run excludes all local environment files, browser recordings, compiled caches and Supabase temporary files through `.vercelignore`. The feature commit `74357fb24e9c0f51a715fe1a626f824d33a87190` also passed [GitHub CI run 40685137468](https://github.com/vartmaansharma-blip/B2B/actions/runs/40685137468); schema-type follow-up verification is separate. The branch remains unmerged.

Post-migration security advisor returned only the existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), with no new RLS/function/view warnings. The performance advisor returned the six existing [unindexed author/reviewer foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) and nine informational unused indexes in the empty/new database. All new-table foreign keys have covering indexes. No Auth configuration, plan upgrade or business-data mutation was performed. Real signed-in operator/engineer/nonstaff Auth/PostgREST acceptance remains outstanding.

### Verified baseline

- Fetched GitHub `main` is `dd26b88aa7f5d9dea3d1d3407d045bd8fbdbc981`; PR #1 and PR #2 are merged. Existing remote branches are `main`, `feat/manufacturing-os-v0` and `feat/rfq-drawing-revisions`. The prior drawing-control [CI run 40623552615](https://github.com/vartmaansharma-blip/B2B/actions/runs/40623552615) is completed/success on its exact head; that is historical baseline evidence, not verification of this new branch.
- Implemented already: modular Next.js staff app, server-verified Auth/membership, one organization per account, organization RLS and explicit grants, supplier discovery/qualification/evidence/expiry, customers and RFQs, engineering approval, drawing-controlled amendments, immutable review history, optimistic versions, browser fixtures and pinned CI. These foundations were inspected and extended rather than rebuilt.
- Actual gaps at inspection: supplier capabilities were free text only; no RFQ-to-supplier relation, fit review, shortlist audit or live acceptance validity existed. Also missing: controlled file storage, commercial quotations, production release, public onboarding, MFA enforcement, full hosted role/workflow acceptance and complete generated types from the pending schema. Those are not claimed by this change.
- Read-only hosted migration history for `b2b-staging` (`ywciamahpwefiuihlynw`) returned **only `20261027182029_manufacturing_os_v0`**. Neither the merged drawing-control migration nor this branch's new migration was installed at that inspection.
- Vercel project `b2b-manufacturing-os` (`prj_nxsbrEbwvm4vLKJyHBkYaQX8rEjS`, team `team_O7yqJx3Vax88HglyAbyQMuZZ`) reported the earlier staging deployment `dpl_H7oKBAyzB7d3TVhTcNThcGzkppvs` READY, with sign-in protection enabled for deployment URLs and all previews. The existing review deployment is independent of current GitHub `main`.

### Implemented on the working branch

`feat/procurement-shortlists` is the user-designated working and publishing branch; do not merge or change GitHub's default branch. Additive migration `20261028115224_procurement_shortlists.sql` follows drawing control. It adds append-only source-backed process/material/tolerance/inspection observations, RFQ/supplier/capability relations, a requirements-only revision counter, proposal/acceptance/removal decisions, immutable exact snapshots, and a caller-RLS live-status view. Nine exposed tables have RLS; the view explicitly uses `security_invoker=true`. No confidential business data, credentials or real supplier qualifications were added.

Engineers/admins must accept fit separately against current qualification, requirement revision and RFQ approval with evidence. Stale parent decisions fail in the database; accepting locks parent rows while validating/snapshotting. The application reads the live-status view, so supplier changes/suspension/expiry, amended requirements, changed engineering approval and RFQ closure do not display historical acceptance as current. Reproposals clear review attribution and require a fresh acceptance. Scope matching is accountable human review, not an automatic engineering claim. Closure blocks use while closed; reopening an unchanged still-current decision can restore its validity. No new production/PO/communication workflow is added.

Supplier detail links to its paginated capability register. RFQ detail links to paginated shortlist entries and unranked process/material observation search. Review forms bind organization, RFQ and loaded entry version. History renders validated requirement/capability/qualification/fit evidence snapshots, with 50 latest events visible. Existing feature boundaries and shared form controls are preserved.

### Validation and remaining release steps

Local `npm run check` passed on supported Node **24.22.1**: formatting, zero-warning lint, strict TypeScript, **127 unit/action/PostgreSQL tests**, and optimized production build. New SQL tests cover role/tenant boundaries, anonymous-auth denial, append-only observations, server-stamped actors/snapshots, missing qualification/evidence/approval, stale parent/entry updates, scope changes, closure, change-and-revert requirement counters, historical-event immutability and a forward upgrade preserving existing RFQs. Database tests execute migration SQL with real PostgreSQL roles in PGlite and an Auth stub. Browser validation is recorded below after completion; it uses the isolated protocol fixture, not hosted Supabase.

All **24 desktop/mobile Chromium checks** passed against that production build. New browser coverage follows reported observation -> unqualified proposal -> denied acceptance -> supplier qualification -> reproposal -> engineering acceptance -> drawing amendment -> stale page denial -> reproposal -> renewed acceptance denial until RFQ approval, and verifies retained revision-A fit evidence. Screenshots were inspected on desktop/mobile; no page errors or horizontal overflow occurred. All records are visibly synthetic and local. A final cache-invalidation adjustment explicitly revalidates the capability register; its browser check also verifies the observation appears immediately after saving.

Initial local verification used a manually maintained contract and the staging database was still V0. The authorized follow-up above supersedes that schema/type status: both migrations are applied, advisors inspected and actual hosted types generated. Branch publishing and actual Auth/PostgREST staff acceptance remain separate evidence gates. The app does not migrate on startup. See [migration rollout](environment.md#capability-and-shortlist-migration-rollout) for exact ordering, verification and recovery. Keep business data out until real role/session and end-to-end acceptance passes.

## Historical audit and RFQ drawing-control follow-up — 28 October 2026 (IST)

This section supersedes earlier pending-setup/sign-in statements below; those sections remain as historical evidence. No hosted database writes, merge, or deployment were performed during this follow-up.

### Repository, reviews and deployment

- GitHub `main`: `eda907bb47f49c7a34e1df748bb26cff25a0b2db` (repository setup only; no application).
- [V0 PR #1](https://github.com/vartmaansharma-blip/B2B/pull/1): open draft, unmerged, head `4e1b9f7435eb854184b47f11e12c7dac21bb6678`, no submitted reviews/comments at inspection. Its [exact-head CI run](https://github.com/vartmaansharma-blip/B2B/actions/runs/40619550025) passed.
- Vercel's latest deployment is `dpl_H7oKBAyzB7d3TVhTcNThcGzkppvs`, READY, target `staging`, with metadata pointing to the same V0 head. Vercel project sign-in protection is enabled for production deployment URLs and all previews. A previous bootstrap deployment carries the production label; it does not establish production business readiness.
- The related Work chat, **Build Manufacturing OS V0**, records owner password setup and successful admin sign-in. During this audit, the current browser redirected staff navigation to sign-in, so no active staff session was available for repeating authenticated acceptance. The sign-in page rendered successfully; no credential reset was initiated.
- The drawing-control change is on `feat/rfq-drawing-revisions`, based on the V0 head. Its PR must target `feat/manufacturing-os-v0` until PR #1 merges, then be retargeted to `main`. This preserves the original V0 review and isolates the new work.

### Hosted database and authentication, read-only evidence

The dedicated B2B staging project is healthy on PostgreSQL 17.11. Its only applied migration is `20261027182029_manufacturing_os_v0`.

Catalog inspection confirmed six public tables with RLS, twelve policies, staff-only grants, both tenant predicates on business UPDATE policies, the organization/customer composite foreign key, seven application triggers, and five private functions with empty search paths. Only membership lookup and trigger-only audit writing use definer privileges. There are no public RPC functions and no storage buckets. A generated hosted schema contract was inspected as a baseline; it does not include the new migration. All five live private function bodies match the committed V0 SQL after whitespace normalization; anonymous execution is revoked, with authenticated execution granted only for membership lookup.

Actual HTTPS checks returned: Auth settings `disable_signup=true` and anonymous sign-in disabled; anonymous supplier GET **401 / 42501**; private-schema profile **406 / PGRST106**. This confirms private is excluded from the Data API. There is one active staff account and zero supplier/customer/RFQ records. Counts establish an empty workflow database, not successful business use.

Security advisor: one warning, [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The earlier setup recorded the setting as unavailable on the selected Free plan; current plan entitlement was not reverified. Performance advisor: six informational missing author/reviewer foreign-key indexes and two unused indexes in the empty database. No security-policy findings were returned; this is not a security certification.

### New implementation and local verification

RFQ drafts accept an explicit customer-issued drawing revision. Engineering approval now requires a nonblank drawing reference and revision in a database constraint. Staff can amend requirements with a reason and optimistic version check. Every real amendment returns the RFQ to reviewing/pending, clears approval attribution, and appends before/after requirements to the immutable, tenant-private review ledger, including changes made while already pending. Every subsequent review event snapshots the requirements at that decision. Customer identity remains fixed; another customer needs a new RFQ. The app rejects no-op edits and ignores injected approval/customer/organization fields.

The forward-only migration is `20261028023900_rfq_drawing_revisions.sql`. It preserves the existing grants/RLS and private trigger-only audit writer. It does not rewrite the applied V0 migration, invent historical evidence, or backfill drawing revisions. It deliberately fails and rolls back if legacy RFQs are already approved without revisions; an accountable engineer must first return those RFQs to reviewing/pending using the old workflow. Staging currently has zero RFQs, but recheck immediately before any authorized application.

Local checks passed on supported Node **24.22.1**: formatting, zero-warning ESLint, strict TypeScript, **100 unit/action/PostgreSQL tests**, and optimized Next.js build. **22 desktop/mobile Chromium browser checks** passed against the production build and isolated PGlite/Auth/PostgREST fixture. RFQ checks cover the missing-drawing approval gate, adding drawing identity through an amendment, engineer approval, sourcing, revision/quantity amendment, visible before/after history, blocked stale edits from a second page, and renewed sourcing denial. Desktop/mobile screenshots were inspected. A subsequent verification run exposed an intermittent quick-find close/reopen race (21/22 passed): a queued native close event could close a freshly reopened dialog. The handler now resets state only if the dialog is still closed; the existing browser flow explicitly delivers a late close event after reopening as a regression check. The final full run after this correction passed 22/22. All business data used in these checks is visibly synthetic and stays local.

The database suite also tests upgrade of existing pending RFQs without fabricated snapshots, rollback for incompatible legacy approvals, direct SQL bypass attempts, operator role enforcement, cross-organization isolation, private and immutable snapshots, and concurrent edit rejection. These tests do not establish real supplier capabilities or qualified engineering credentials.

### Remaining acceptance and release boundaries

The new migration is **not applied to hosted staging**, the new application is **not deployed**, and neither PR is merged. An additional in-memory TypeScript check passed against generated hosted V0 types augmented with the exact new SQL column types (zero diagnostics); JSON requirement snapshots are validated before display. This is a compatibility check, not type generation from the unapplied database. The manually maintained type contract includes the new fields; regeneration from a full local Supabase stack remains pending because this workstation has no Docker-compatible runtime. Hosted V0 type generation does not prove the unapplied new schema.

Before accepting real confidential manufacturing data: review both PRs; authorize the exact staging migration; verify its live schema/advisors; regenerate and compare database types; deploy the exact reviewed branch to protected staging; and exercise real Auth/PostgREST using controlled operator/engineer/nonstaff accounts. Repeat password setup/recovery, token refresh, revocation, concurrency, HTTPS-cookie and cache checks. Confirm backup/recovery, retention and accountable engineering procedures. Merge and production deployment remain separate authorization steps under `AGENTS.md`.

Still deferred: general supplier/customer corrections and private contacts; controlled file storage/retention and drawing-file revision management; RFQ-specific supplier shortlists; stored quotations/comparison; inspection acceptance and human production release; purchase orders, payments and delivery operations; permitted directory ingestion and real buyer/supplier validation. The new revision field records identity only and cannot prove the referenced file or engineering assessment exists.

## Passed locally

`npm run check` passed on Node 22.23.4: formatting, ESLint with zero warnings, strict TypeScript, **68 tests**, and an optimized Next.js production build.

The tests include input boundaries, environment-key validation, server-action authorization, organization/version scoping, search authorization/bounds and PostgreSQL policy/trigger execution in PGlite. Database checks exercise all six public tables, anonymous/nonstaff denial, anonymous-auth accounts, tenant isolation, self-promotion prevention, membership revocation, audit immutability, composite customer references, qualification transitions/evidence/role requirements, stale updates, engineering approval and invalidation on RFQ requirement changes.

`npm run test:e2e` passed **16 browser tests**: eight flows each in desktop Chromium and mobile Chromium emulation. The suite runs the production build against an isolated Auth/PostgREST protocol fixture backed by the real migration SQL in PGlite. It covers private-route redirects, nonstaff denial, invalid credentials, supplier creation/provenance/review/history/sign-out, customer/RFQ intake and engineering gates, invalid invite links, quick find with keyboard navigation, persistent minimal motion and system reduced-motion settings. Page JavaScript errors and horizontal document overflow fail the tests.

Desktop/mobile screenshots for sign-in, overview, supplier intake/detail, RFQ review and quick find were rendered and inspected. A browser recording exercises the nine-second cinematic entrance and the motion controls. All business data in tests is visibly synthetic; there is no application seed and no real qualification claim.

## Reproduce

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

Browser tests bind local ports 3100 and 54329. They never use a hosted Supabase project. Browser traces, screenshots and recordings are local artifacts under ignored `test-results/`; they are not committed. The workflow uses pinned GitHub Actions, Node 22, the lockfile, full checks and Chromium browser tests. Its remote result must be read separately from these local results.

## Integration still required

No Docker-compatible runtime was available for a full local Supabase stack. PGlite runs PostgreSQL policies and triggers under actual anon/authenticated roles, with a minimal `auth.users`/`auth.uid` harness. The browser fixture simulates GoTrue/PostgREST. Neither proves hosted Supabase configuration, Auth email delivery, token refresh, happy-path invite/recovery exchange, provider rate limiting or real PostgREST behaviour.

Before accepting real data in an approved staging environment:

1. Apply the exact reviewed migration to the explicitly approved project; verify migration history, grants, RLS, private-schema exposure, functions, triggers and Supabase advisors.
2. Regenerate the type contract from a full local Supabase stack and verify it in the same change.
3. Configure hosted Auth sign-up restrictions, URL allowlists, email templates, password rules and rate limits. Invite test accounts with operator/engineer roles; also test a nonstaff account.
4. Verify invite/password setup, recovery, sign-in, token refresh, sign-out and staff deactivation using actual Supabase Auth.
5. Complete supplier discovery/review and customer/RFQ flows against actual PostgREST, including unauthorized direct API attempts and concurrent edits. Use controlled test records, never fabricated supplier assessments presented as real.
6. Inspect HTTPS cookies, response cache headers and browser behaviour on the exact staging deployment. Review backup, retention, observability and account-offboarding procedures.

## Authorized staging follow-up — 28 October 2026 (IST)

The user explicitly approved deleting the existing GridMind Supabase project and replacing it with B2B. Deletion was verified through the project inventory. MmaFarms was not modified. A new `b2b-staging` project was created in the Vartmaan organization, Mumbai region, and the committed V0 migration was applied to that empty database. The management tool initially assigned its own migration timestamp; migration metadata was then reconciled to the canonical repository version `20261027182029`, without reapplying the schema.

Hosted inspection confirms all six public tables have RLS enabled, 12 policies exist, and `anon` has no table grants. Supabase's security advisor returned no findings. The performance advisor reports six informational missing author/reviewer foreign-key indexes and unused queue indexes in the empty database; these are not claims of load/performance validation. See [Supabase's index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys). Real anonymous REST access to suppliers returns HTTP 401 / PostgreSQL `42501`. Auth's public settings report signup disabled and anonymous authentication disabled.

GitHub [run 40565605402](https://github.com/vartmaansharma-blip/B2B/actions/runs/40565605402) passed all checks, including browser tests, for application commit `eb4df368abbd1d73fd250b6101c405f5c81d4866`.

Vercel project `b2b-manufacturing-os` uses Node 22 and Mumbai functions. The first attempted preview was unexpectedly classified as Production and was canceled before serving. After the user separately approved a protected initial deployment, a bootstrap deployment completed without database configuration. The REST API rejects literal `target=preview`; an explicit non-production `staging` deployment then completed with Preview environment variables and the exact application commit above. Its build took approximately 51 seconds; the build-output step reported 42 seconds.

The [protected staging deployment](https://b2b-manufacturing-4rmodgv6o-vartmaansharma-blips-projects.vercel.app/login) is READY. Its sign-in page was checked through authenticated HTTP and the real browser, including the illustration and credential form. Unauthenticated staff navigation redirects to login (307). The unique deployment URL requires Vercel login; the unintended public project alias was removed. No custom domain was connected, no merge occurred, and no customer records or qualified suppliers were inserted. The Git repository is not connected for automatic Vercel deployments; deployment remains explicit.

Public signup is disabled; password minimum is 12 characters, secure password change is enabled, and the exact staging origin/callback is configured without wildcards. The current Supabase Free dashboard requires custom SMTP or a plan upgrade to customize invite/recovery templates. No paid upgrade was selected and no incompatible invitation was sent. The owner subsequently created and confirmed the first Auth account directly in the dashboard; its active B2B admin membership has been provisioned and read back. The first sign-in is still pending: Auth logs report invalid credentials, so successful Auth/PostgREST signed-in flows remain unverified. No password was read, set, or changed by the agent. A later advisor scan, after account creation, reports leaked-password protection disabled; the current Free project marks that setting as Pro-only. No paid upgrade was selected. READY does not prove authenticated workflow acceptance. Keep real business intake disabled until the remaining integration checks above pass.

## Default password recovery follow-up

The owner requested a password reset after sign-in attempts returned invalid credentials. The existing token-hash callback required customized email templates, unavailable without SMTP/plan changes on this project. The added `/auth/recovery` callback supports default Supabase recovery emails while preserving server-managed HttpOnly cookies and staff authorization. It removes bearer fragments before requesting the server, validates session/user/active membership, clears rejected sessions, and navigates only to the fixed password page. No password is set by automation.

Local verification for this change: 81 unit/action/PostgreSQL tests, formatting, zero-warning lint, TypeScript and optimized build passed. All 22 desktop/mobile browser checks passed, including default recovery handoff/password submission, invalid fragments, storage/URL hygiene and nonstaff denial. Hosted reset email delivery and owner password submission must be verified separately; simulated test credentials do not prove either.
