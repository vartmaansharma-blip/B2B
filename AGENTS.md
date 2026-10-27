# Manufacturing OS development contract

Read `docs/README.md` and the applicable feature code before editing. Preserve the business guardrails in README. This repository is public: never commit drawings, rates, contacts, credentials, live exports, or customer records.

## Stable boundaries

- `src/app`: route composition, layouts, request boundaries. Keep business rules out of routes.
- `src/features/<domain>`: `model.ts` for pure validation and state rules; `queries.ts` for authenticated reads; `actions.ts` for authenticated writes; `forms.tsx` for feature UI.
- `src/components`: reusable UI without feature queries or credentials.
- `src/lib`: genuinely shared infrastructure and primitive types. No miscellaneous business helpers.
- `supabase/migrations`: canonical ordered schema, grants, RLS, triggers. New migrations after any release; never edit an applied migration.
- `tests`: pure/action tests, SQL authorization tests, and isolated browser tests. Test data stays here and must be visibly synthetic.

Start with the existing feature pattern. Add a domain only when implementing it. A second app, workspace packages, repository/service wrappers, and global state management need an actual requirement and an architecture decision; do not add speculative scaffolding. See ADR 0001 and the feature checklist.

## Security and evidence

Every page/query/action must verify staff independently; layouts are not a security boundary. RLS is mandatory on every exposed table; scope writes and foreign keys by organization. Authorization uses server-managed membership, never editable user metadata. No service-role or secret key in the app. Keep auth and data responses private and uncached. Staff enrolment is out of band. Keep Supabase's private schema out of the exposed API schemas.

Discovery never implies qualification. Only engineers/admins can record qualification, with scope, evidence, expiry, and a database audit event. Engineering RFQ approval does not authorize production. Never add demo qualifications to application seeds.

## Verification and release

Run `npm run check` then `npm run test:e2e` for app, schema, or auth changes. Browser checks require a preceding production build. Tests use PGlite and simulated Auth/PostgREST; describe their limits honestly. Keep hosted integration, migration application, merge, and deployment claims separate. Use feature branches and PRs. No live database changes, merge, or production deployment without explicit authorization.
