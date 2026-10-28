# Architecture

Manufacturing OS V0 is one Next.js App Router application using TypeScript, React Server Components and Supabase Auth/Postgres. It is an internal staff tool, not a public supplier marketplace. A single deployable application avoids multiple packages and build systems before there is a second consumer. Domain boundaries let features grow without changing the repository layout.

```text
src/
  app/                         Next.js routes and layouts only
    (staff)/                   Overview, suppliers, RFQs, customer intake
    auth/confirm/              Invite/recovery token exchange
    login/                     Staff sign-in
    set-password/              Authenticated password setup
    access-denied/             Nonstaff response
    setup/                     Missing-configuration response
  features/
    auth/                      Membership checks and auth mutations
    suppliers/                 Model, queries, actions, forms
    rfqs/                      Model, queries, actions, forms; customer intake
    search/                    Authenticated quick find and keyboard dialog
  components/                  Forms, fields, badges, history, pagination
  lib/                         Environment, shared primitives, Supabase client/types
  proxy.ts                     Session refresh and uncached responses
supabase/
  config.toml                  Local development settings; sign-up disabled
  migrations/                  Ordered source of truth for the database
scripts/                       Small maintenance commands
tests/                        Pure, action, database, browser tests
docs/                         Index, architecture, setup, ADRs, operating guidance
.github/workflows/             Reproducible checks on pull requests
```

## Request and trust boundaries

A route composes a feature. Its queries or actions call `requireStaff()` to validate the user with Supabase Auth and read an active server-managed membership. Every mutation authenticates again; the shared layout is not the only gate. No cached cross-request client, user or query result is used. The publishable API key is not a privilege; requests use the current user's cookie session. No service-role key is required by the app.

RLS independently checks membership for the record's organization. The narrow `private.staff_role()` lookup checks `auth.uid()` against staff membership and excludes anonymous Auth users. It is a definer function because the membership table has its own RLS. Trigger-only audit writing also uses a narrowly scoped definer function; it has no public execution grant. All other guards run as the caller. `private` must never be exposed through PostgREST.

## Data model

- `organizations`: workspace identity
- `staff_memberships`: one organization per account in V0, with operator/engineer/admin role and active flag; provisioned outside the app
- `suppliers`: provenance, reported capability and current qualification decision
- `customers`: minimal business identity and intake reference
- `rfqs`: customer requirements, quantities, controlled drawing reference, workflow and engineering decision
- `review_events`: append-only supplier/RFQ review history written transactionally by triggers

Every business record has an organization. RFQ customer references use a composite foreign key to prevent linking another organization's customer. Names are normalized for duplicate protection within a workspace (supplier name + city, customer name). Identity/creation fields cannot change. Lists use deterministic ordering and 25-row pages. Detail history shows the newest 50 events; older events remain in the database. Application updates include a version predicate; a stale edit returns a refresh message.

## Feature contracts

`model.ts` is pure validation and display/state logic. `queries.ts` owns authenticated reads. `actions.ts` validates input and owns authenticated writes. `forms.tsx` composes shared controls. Routes select and render these pieces. Database triggers remain authoritative for role-restricted review decisions and transitions even if a caller bypasses the UI.

`database.types.ts` starts as a schema-derived V0 contract, not output claimed from a hosted project. `npm run db:types` atomically regenerates it from a running local Supabase stack; `lib/types.ts` provides stable domain aliases. Schema changes and regenerated contracts belong in the same PR.

## Expansion rules

Add `src/features/<domain>` and its routes when that domain is implemented. Customer intake stays with RFQs until it has a separate workflow. Add a new migration for schema changes after this initial migration has been applied. Extract shared components only when multiple features need them. ADR 0001 defines when a second application or package becomes justified.

No speculative empty domains, event bus, microservices, scraping pipeline, AI qualification, global client store or generic repository abstraction are included. There is no guarantee that any layout will need zero future maintenance; this structure minimizes changes to boundaries as the business grows.
