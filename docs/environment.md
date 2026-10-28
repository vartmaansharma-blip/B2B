# Environment and staff setup

## Local development

Use Node 22 and a Docker-compatible container runtime for a full local Supabase stack. The app and automated PGlite/browser checks do not require Docker; Supabase Auth/PostgREST integration does.

```sh
npm ci
npx supabase --help
npx supabase start --help
npx supabase start
npx supabase db reset --help
npx supabase db reset --local
cp .env.example .env.local
```

`db reset --local` destroys and rebuilds **local** database data. Use it only on a disposable local workspace, never to repair a hosted database. There is no business seed file. The checked-in Supabase config disables public and anonymous registration; hosted settings do not automatically inherit it.

Set `NEXT_PUBLIC_SUPABASE_URL` to the local API URL and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the publishable key shown by the CLI. If your local stack exposes only a legacy anon JWT, the app accepts an anon-role key for local compatibility. It rejects secret/service-role keys. Do not paste local CLI output containing privileged keys into issues or PRs.

```sh
npm run db:types
npm run dev
```

Type generation requires the local stack. The script preserves the existing type contract if generation fails. No remote project is selected by this command. Next.js dev defaults to port 3000. The local Auth site URL is `http://127.0.0.1:3000`; use that origin consistently for local sign-in and email links. Local mail is available in the inbox UI reported by the CLI.

Without valid configuration, staff routes redirect to `/setup` and login displays setup guidance. Invalid/unreachable but syntactically valid connection details do not enable demo access.

## Hosted staging setup (separate operator step)

The application does not automatically create, link, migrate, or deploy a hosted project. The separately authorized staging setup is recorded in [verification](verification.md#authorized-staging-follow-up--28-october-2026-ist). For each new private staging project:

1. Review all pending migrations and approve the exact project before applying them. Ensure backups and a rollback/recovery plan appropriate to that environment.
2. Inspect CLI help, link the exact staging project, review migration status, then apply the committed migrations. Verify tables, indexes, policies, grants, triggers and advisors on that project. Keep `private` out of exposed API schemas. Never run these operations against an inferred or unrelated project.
3. Set Auth public sign-up and anonymous sign-in **off** in hosted settings. Configure a 12-character minimum password, appropriate provider rate limits and email delivery. Configure the exact staging site URL and redirect allowlist, without wildcards. Enable leaked-password protection where available; MFA enforcement is a future security enhancement.
4. Set only the project URL and publishable key in the app environment. The app does not need a secret/service-role key or a database password.
5. Use HTTPS. Production-mode session cookies are Secure, HttpOnly and SameSite=Lax. All auth and staff responses must remain private/no-store at any CDN or reverse proxy.
6. Provision test staff in the intended organization, then perform the integration checks in `verification.md` before allowing real business records.

## Drawing-control migration rollout

The new `20261028023900_rfq_drawing_revisions.sql` migration must follow V0 and precede deployment of the amendment UI. It is not applied by the app. Recheck migration history and existing approvals before applying it to the explicitly authorized staging project. An older approved RFQ has no structured revision: the constraint intentionally stops the migration rather than guessing a revision or silently changing approval history. Have an accountable engineer first return those records to reviewing/pending under the old workflow. After migration, staff can add exact drawing references/revisions with an amendment and request a fresh engineering decision. Verify the new schema and regenerate types before deploying the reviewed application. Keep the updated application out of a V0-only database: writes to new columns will fail. Do not drop the new columns to roll back an application deployment; preserve audit history and use an additive repair if needed.

## Capability and shortlist migration rollout

Review `20261028115224_procurement_shortlists.sql` with the drawing-control migration immediately before it. It adds three RLS-protected tables, a caller-scoped live-status view and an RFQ requirements counter; it does not create staff, business records, qualifications or shortlists. Existing RFQs start with requirements version 1. This is the baseline for future changes, not a reconstruction of older amendments. No applied migration is edited.

1. Obtain approval for the exact hosted project and both pending files. Check its migration history, existing approvals and backup/recovery state. Current observed staging has only V0; do not infer that remains true later.
2. Apply missing migrations in order: `20261028023900_rfq_drawing_revisions.sql`, then `20261028115224_procurement_shortlists.sql`. The first migration fails safely if legacy approvals lack drawing revisions; resolve those through accountable engineering review first.
3. Verify nine public tables with RLS, the `rfq_shortlist_status` view with `security_invoker=true`, staff-only grants, tenant-safe composite foreign keys and revoked trigger-function execution. Keep `private` excluded from PostgREST. Run security/performance advisors on the approved project and inspect results.
4. Generate types from the migrated environment and compare the committed contract. The contract is manually maintained until a real Supabase stack is available; passing PGlite tests is not type regeneration.
5. Deploy the exact checked `feat/procurement-shortlists` commit to the protected review environment. Do not merge into or deploy `main`. Verify actual staff sign-in, capability/proposal/acceptance flows, stale decisions, cross-tenant API denial, history and HTTPS/cache behaviour before using real records.

The application does not apply migrations. A V0-only database is incompatible with drawing-revision and shortlist screens; do not publish a usable-workflow claim against it. On failure, preserve tables and ledger entries; restore the earlier application if appropriate and use a reviewed additive repair. Do not drop audit tables to roll back the UI.

### Applied staging history and future migration tooling

The user approved both exact files and B2B staging on 28 October 2026. Supabase's migration API applied them successfully and recorded its generated versions:

| Repository file                             | Hosted version   | Hosted name              |
| ------------------------------------------- | ---------------- | ------------------------ |
| `20261028023900_rfq_drawing_revisions.sql`  | `20261028120807` | `rfq_drawing_revisions`  |
| `20261028115224_procurement_shortlists.sql` | `20261028120816` | `procurement_shortlists` |

The earlier V0 history remains `20261027182029`. Automatic approval review rejected rewriting the new history versions as outside the migration approval; provider-assigned history is preserved. Do not automatically run CLI push/pull/reset/repair against this project: compare migration names and exact SQL with this mapping first, and obtain explicit approval for any metadata reconciliation. Do not reapply these files merely because their repository timestamps differ. No business records were changed by the migrations. New environments still apply repository files in their existing order.

## First organization and staff

An application admin is not a database administrator. No app role may create memberships or promote itself. Use the Supabase dashboard / trusted database operator for provisioning.

1. Create one organization in the private database. Note its UUID privately.
2. Invite the staff member through Supabase Auth's administrative interface. Confirm the intended recipient and role. Read the resulting Auth UUID from the dashboard.
3. Add the membership with that Auth UUID and organization UUID, using one of `operator`, `engineer`, `admin`. Complete this before the recipient opens the invitation. One membership per account is supported in V0.
4. Use the invite email link, set the password, and sign in. No public sign-up endpoint is provided by the app.

The following is an operator template, not a seed. Replace placeholders privately; never commit the completed SQL or real identifiers.

```sql
insert into public.organizations(name)
values ('<private workspace name>') returning id;

insert into public.staff_memberships(organization_id,user_id,role)
values ('<organization uuid>','<invited auth user uuid>','operator');
```

## Invite and recovery email templates

The `/auth/confirm` route accepts a token hash with `type=invite` or `type=recovery`, verifies it with Supabase and redirects to `/set-password`. It accepts no arbitrary destination.

The current Supabase Free dashboard requires custom SMTP or a plan upgrade to customize these templates. Do not send the default invitation as if it supports this server-side token-hash flow. Configure email delivery/templates first for invitations. For a one-person staging workspace, an operator can alternatively create the initial Auth account in the trusted dashboard, with the owner entering their password directly, then provision membership out of band. Never put that password in chat, SQL, scripts, or the repository. Invite/recovery testing remains required before wider staff rollout.

Configure the Supabase **Invite user** email template link as:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite"
  >Accept staff invitation</a
>
```

For custom email delivery, configure the **Reset password** template similarly with `type=recovery`.

### Default recovery emails without custom SMTP

`/auth/recovery` supports Supabase's default implicit-flow **recovery** link. Add the exact HTTPS callback URL to the Auth redirect allowlist. A trusted operator can initiate `resetPasswordForEmail` using the public client and that exact `redirectTo`, or send the equivalent Auth `/recover` request with `redirect_to`. Do not use a PKCE client from an unrelated operator machine: its verifier would not be present in the user's browser. No secret/service-role key is needed for the recovery request. The default email service has recipient and rate limits; configure custom delivery before wider staff rollout.

Open the staging site in the same browser first and complete Vercel authentication before opening a recovery email. Keep deployment protection enabled. The callback extracts only recovery credentials, immediately removes the URL fragment, and sends the bounded credentials in a same-origin Next.js server action. Supabase validates the session and user; active database membership is checked before password setup is permitted. Credentials stay out of local/session storage, query strings, logs and repository files. Missing/expired links and nonstaff sessions return a generic error and clear the local session. The `type=recovery` marker alone never authorizes a password change. The password action independently verifies staff access again.

Only the account owner enters and submits the new password. V0 does not provide public recovery email submission. The member must still have active workspace access to set a password. Expired/invalid tokens return a generic login message.

Token hashes and passwords are secrets. Do not log auth query strings, request bodies, cookies or full URLs in application/proxy observability. Supabase handles rate limiting of authentication requests; use appropriate hosted settings and upstream protection for an internet-accessible deployment.

## Revoke access

Set `staff_memberships.active = false` for the exact account. RLS reads membership on each database statement, so no JWT refresh is needed to remove business-data access. Also revoke sessions through Supabase Auth and follow account offboarding procedures. Deleting an Auth user alone does not necessarily invalidate an already-issued token. Review/audit records reference authors, so prefer deactivation and session revocation to deleting historical identities.
