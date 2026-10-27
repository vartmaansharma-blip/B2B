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

No hosted project was created or modified, no migration was applied remotely, and no app was merged or deployed as part of this implementation. These remain separate reviewed and authorized actions.
