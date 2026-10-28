# V0 verification

Local evidence, 28 October 2026 (IST). This is implementation verification, not supplier validation or release authorization.

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
