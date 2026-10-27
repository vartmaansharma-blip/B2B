# Adding a feature

1. Describe the staff problem and its allowed actions. Check the roadmap and existing domains first.
2. Choose an existing feature or create `src/features/<domain>` for a genuinely separate workflow. Document structural exceptions in an ADR.
3. Define tenant scope, provenance and the engineering decision boundary. Add an ordered migration for schema, constraints, indexes, grants and RLS. Use `supabase migration new <name>`; never modify a migration already applied to an environment.
4. Add pure validation to `model.ts`, reads to `queries.ts` and writes to `actions.ts`. Every operation verifies staff; mutations derive organization from membership and protect against stale versions.
5. Compose feature forms and route pages. Handle empty states, invalid IDs, denied access, loading/submission state and errors. Keep technical details out of user decision flows.
6. Add tests for material risks: access, tenant boundaries, invariants, role approvals and the complete staff interaction. Keep all fixtures isolated and visibly synthetic.
7. Regenerate local database types for schema changes. Run `npm run check` and `npm run test:e2e`; inspect desktop/mobile results.
8. Update this documentation index's existing documents where needed, then open a feature PR with exact checks and remaining integration limits. Approval of code is separate from migration or live-release authorization.
