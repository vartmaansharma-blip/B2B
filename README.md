# B2B — Manufacturing OS

Private operating software for an engineering-led manufacturing and supplier network in India.

**Phase: V0 draft PR and protected staging; drawing-control follow-up pending review and staging acceptance.** The business opportunity and initial product category remain hypotheses. This code does not establish supplier qualifications, customer demand, purchase orders, or delivery commitments.

## V0

- Invite-only Supabase staff sign-in and password setup/recovery
- Organization-scoped supplier registry with discovery provenance, reported processes and materials
- Qualification stages with engineering-only approval, scope, evidence, expiry, and immutable review history
- Customer business records, RFQ requirements, controlled drawing identity, engineering review, and sourcing workflow
- Reasoned RFQ amendments with before/after history and automatic approval invalidation
- Server-side access checks plus database RLS, grants, tenant-safe foreign keys and workflow triggers
- Desktop/mobile screens, quick find with keyboard navigation, copyable record references, loading states and accessible feedback
- Cinematic sign-in art, animated engineering linework, page transitions and persistent reduced-motion controls
- Pagination, input validation, concurrency protection and CI

## Start

Use Node 22 (`.nvmrc`).

```sh
npm ci
cp .env.example .env.local
# Follow docs/environment.md to configure a local/private Supabase environment.
npm run dev
```

Without configuration, the app displays setup instructions. No sample business data is loaded. See the [documentation index](docs/README.md) for architecture, setup, operating sequence, security, tests and roadmap.

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Database tests execute the migrations under PostgreSQL roles in PGlite. Browser tests use an isolated Auth/PostgREST protocol fixture backed by PGlite, not a live Supabase project. They need no customer data or hosted credentials.

## Guardrails

- Never commit drawings, private supplier rates, passwords, API keys, personal data or live exports.
- This public repository contains source code and visibly synthetic test fixtures only.
- Customer and supplier records belong in a private authenticated database with RLS.
- Discovery is not qualification. AI cannot approve a manufacturer's capabilities.
- V0 has no production-commitment, payment, purchase-order, customer portal or document-upload feature.

The repository does not automatically provision, migrate or deploy hosted services. V0 was separately staged; see the dated [verification record](docs/verification.md) for exact code, database and deployment evidence. Merge, migration application and deployment are separate reviewed steps.
