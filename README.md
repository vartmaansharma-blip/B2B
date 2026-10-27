# B2B — Manufacturing OS

Internal operating software for an engineering-led industrial manufacturing and supplier network in India.

**Current phase:** V0 foundation. The business opportunity and initial product category remain research hypotheses; no suppliers are approved and no purchase orders are active.

## First release
- Invite-only staff sign-in
- Private supplier discovery registry with evidence provenance
- Capability and verification records (discovered ≠ qualified)
- Schema for customer requirements and RFQs
- Engineering approvals before production commitments

## Guardrails
- Never commit customer drawings, private supplier rates, passwords, API keys or personal data.
- Public repository contains **source code and synthetic examples only**.
- Customer-specific records belong in a private authenticated database with row-level security.
- AI can assist extraction and search; it cannot approve a manufacturer's qualifications.

See `docs/roadmap.md`, `docs/architecture.md` and `supabase/migrations/` after the feature branch is merged.
