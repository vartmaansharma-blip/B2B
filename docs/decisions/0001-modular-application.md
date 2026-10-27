# ADR 0001: One modular application with feature boundaries

Status: proposed with V0 PR; accepted when merged.

## Context

The repository initially had only a README. V0 needs a staff workflow across suppliers, engineering and RFQs. There is no demonstrated need for multiple deployable applications or a shared package. The structure should remain understandable as new operational domains arrive.

## Decision

Use one Next.js app at the repository root. Organize business code under `src/features/<domain>` with four established entry points: model, queries, actions and forms. Keep route composition in `src/app`, reusable UI in `src/components`, and shared infrastructure in `src/lib`. Maintain one chronological database migration history and one documentation index. Tests mirror the boundaries that need verification, rather than copying every source filename.

## Consequences

A new domain fits the existing pattern. Features can be delivered independently while sharing authentication, database conventions and UI controls. One application keeps installation, CI and release understandable. Tenant keys are present from the beginning; V0 still intentionally supports one workspace per account.

Reconsider only when there is an actual second application, an independently deployed background worker, a shared library with multiple consumers, or a measured scale/security boundary demanding separation. Record the reason and migration plan in a new ADR. Do not reorganize solely for stylistic preference.

## Delivery sequence

Environment and identity → schema and access policies → pure models → authenticated reads/writes → UI → database/action/browser checks → documentation → PR review → approved staging integration → separately approved release.
