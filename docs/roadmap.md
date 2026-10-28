# Delivery roadmap

## V0: private operating foundation

Implemented in the feature PR: one modular application; staff authentication and invitations/recovery; tenant-aware schema and RLS; supplier provenance and qualification review; customer/RFQ intake and engineering decisions; audit ledger; responsive staff UI; validation, version protection, pagination; local tests and CI.

Current verified baseline, 28 October 2026: PR #1 and PR #2 are merged; fetched `main` is `dd26b88aa7f5d9dea3d1d3407d045bd8fbdbc981`. The hosted B2B staging database still has only the V0 migration, and the latest observed deployment is the earlier V0 staging build. These are independent states. Read [verification](verification.md) for current evidence and limits. No supplier or business hypothesis has been validated by this build.

Drawing-reference/revision approval gates and reasoned RFQ amendments are merged in PR #2, with hosted migration and deployment still pending. A revision reference does not provide controlled document storage.

## Current branch: capability observations and RFQ supplier shortlists

`feat/procurement-shortlists` is the working/publishing source at the user's request; keep `main` separate. It adds structured reported capabilities, bounded process/material search, RFQ proposals, engineer/admin part-fit acceptance and immutable snapshots. The database derives current shortlist status from requirement revision, supplier version, qualification validity and the current RFQ engineering decision. Repropose and accept again after those change. This is an internal human review workflow; it sends no supplier communications and grants no production authority.

The forward migration is `20261028115224_procurement_shortlists.sql`. Apply the missing drawing-control migration first. Hosted database writes require exact project/file approval; publishing code alone cannot install a schema. See [environment](environment.md) for the rollout and [verification](verification.md) for evidence. Existing authentication and tenant boundaries were extended, rather than replaced.

## Next: learn from a narrow real workflow

Choose one part category and one manufacturing cluster with accountable human engineering support. Capture consented customer requirements and permitted supplier discovery evidence in the private system. Measure whether provenance, capability review and RFQ handling solve an expensive purchasing problem. No promise of identifying every manufacturer or achieving the lowest rate follows from a registry.

## Extend only when the operating need is clear

1. Extend the implemented RFQ amendment/history pattern to supplier/customer corrections; supplier contacts with private-data controls.
2. Controlled document storage and drawing revisions with scoped authorization and retention rules.
3. Quote records and comparable engineering/commercial assumptions after using the implemented shortlist workflow.
4. Inspection plans, independent acceptance evidence and explicit human production approval gates.
5. Purchase orders, production coordination and delivery accountability after legal/operational design.
6. Assisted extraction/search, permitted directory ingestion and coverage measurement after provenance and review controls are proven.

These are deferred capabilities, not commitments or empty code modules. Each should follow the feature checklist and preserve the canonical architecture unless a documented requirement justifies changing it.
