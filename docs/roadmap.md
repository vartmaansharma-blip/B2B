# Delivery roadmap

## V0: private operating foundation

Implemented in the feature PR: one modular application; staff authentication and invitations/recovery; tenant-aware schema and RLS; supplier provenance and qualification review; customer/RFQ intake and engineering decisions; audit ledger; responsive staff UI; validation, version protection, pagination; local tests and CI.

Current verified status: V0 remains in open draft PR #1, unmerged. A dedicated Supabase staging project has the V0 migration applied, and a protected Vercel staging deployment matches the latest V0 head. One staff account exists; business registers are empty. Read the dated current audit in [verification](verification.md) for exact SHAs, live RLS/grant/Auth results, advisor warnings and remaining authenticated acceptance. Code review/merge and production deployment are separate steps. No supplier or business hypothesis has been validated by this build.

Next implemented change, pending PR review and staging acceptance: drawing-reference/revision approval gates and reasoned RFQ amendments with immutable requirement snapshots, optimistic concurrency and automatic approval invalidation. Its forward migration and application are not deployed. A revision reference does not provide controlled document storage.

## Next: learn from a narrow real workflow

Choose one part category and one manufacturing cluster with accountable human engineering support. Capture consented customer requirements and permitted supplier discovery evidence in the private system. Measure whether provenance, capability review and RFQ handling solve an expensive purchasing problem. No promise of identifying every manufacturer or achieving the lowest rate follows from a registry.

## Extend only when the operating need is clear

1. Extend the implemented RFQ amendment/history pattern to supplier/customer corrections; supplier contacts with private-data controls.
2. Controlled document storage and drawing revisions with scoped authorization and retention rules.
3. Part-specific supplier shortlists, quote records and comparable engineering/commercial assumptions.
4. Inspection plans, independent acceptance evidence and explicit human production approval gates.
5. Purchase orders, production coordination and delivery accountability after legal/operational design.
6. Assisted extraction/search, permitted directory ingestion and coverage measurement after provenance and review controls are proven.

These are deferred capabilities, not commitments or empty code modules. Each should follow the feature checklist and preserve the canonical architecture unless a documented requirement justifies changing it.
