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

1. Review this migration and approve the exact project before applying it. Ensure backups and a rollback/recovery plan appropriate to that environment.
2. Inspect CLI help, link the exact staging project, review migration status, then apply the committed migrations. Verify tables, indexes, policies, grants, triggers and advisors on that project. Keep `private` out of exposed API schemas. Never run these operations against an inferred or unrelated project.
3. Set Auth public sign-up and anonymous sign-in **off** in hosted settings. Configure a 12-character minimum password, appropriate provider rate limits and email delivery. Configure the exact staging site URL and redirect allowlist, without wildcards. Enable leaked-password protection where available; MFA enforcement is a future security enhancement.
4. Set only the project URL and publishable key in the app environment. The app does not need a secret/service-role key or a database password.
5. Use HTTPS. Production-mode session cookies are Secure, HttpOnly and SameSite=Lax. All auth and staff responses must remain private/no-store at any CDN or reverse proxy.
6. Provision test staff in the intended organization, then perform the integration checks in `verification.md` before allowing real business records.

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

The current Supabase Free dashboard requires custom SMTP or a plan upgrade to customize these templates. Do not send the default invitation as if it supports this server-side token-hash flow. Configure email delivery/templates first. For a one-person staging workspace, an operator can alternatively create the initial Auth account in the trusted dashboard, with the owner entering their password directly, then provision membership out of band. Never put that password in chat, SQL, scripts, or the repository. Invite/recovery testing remains required before wider staff rollout.

Configure the Supabase **Invite user** email template link as:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite"
  >Accept staff invitation</a
>
```

Configure the **Reset password** template similarly with `type=recovery`. An administrator initiates recovery through the trusted Auth dashboard/admin interface; V0 does not provide public recovery email submission. The member must still have active workspace access to set a password. Expired/invalid tokens return a generic login message.

Token hashes and passwords are secrets. Do not log auth query strings, request bodies, cookies or full URLs in application/proxy observability. Supabase handles rate limiting of authentication requests; use appropriate hosted settings and upstream protection for an internet-accessible deployment.

## Revoke access

Set `staff_memberships.active = false` for the exact account. RLS reads membership on each database statement, so no JWT refresh is needed to remove business-data access. Also revoke sessions through Supabase Auth and follow account offboarding procedures. Deleting an Auth user alone does not necessarily invalidate an already-issued token. Review/audit records reference authors, so prefer deactivation and session revocation to deleting historical identities.
