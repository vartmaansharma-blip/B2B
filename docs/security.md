# Security boundaries

## Permissions

| Actor                                        | Business data                               | Review authority                                     | Membership administration                 |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| No session / anon API key                    | None                                        | None                                                 | None                                      |
| Authenticated nonstaff / anonymous-auth user | None                                        | None                                                 | None                                      |
| Active operator                              | Own organization: create/read/update        | Early supplier review, suspension and RFQ status     | None                                      |
| Active engineer                              | Own organization: create/read/update        | Supplier qualification and RFQ engineering decisions | None                                      |
| Active admin                                 | Same organization and engineering authority | Same as engineer                                     | None in app                               |
| Trusted database/Auth operator               | Out-of-band privileged operation            | Accountable administrative control                   | Provision/deactivate exact staff accounts |

All nine public tables have RLS after the capability/shortlist migration. Anonymous roles have no table grants. Staff can select their own active membership only, with no insert/update/delete grant. Business tables grant select/insert/update, with tenant predicates on both USING and WITH CHECK. No app role can delete records or modify audit events, including private requirement snapshots. RFQ amendments require a reason, preserve customer identity, and invalidate engineering approval atomically; approving a drawing-controlled RFQ requires its drawing reference and revision. A composite customer FK prevents cross-tenant RFQ links. Staff roles use a database enum and cannot be chosen from user metadata or form input.

Private definer functions are limited to membership lookup and trigger-only ledger writing. Search paths are empty, object references are qualified and execution is revoked from PUBLIC/anon. The lookup alone is granted to authenticated for RLS evaluation; trigger functions are not directly callable. The private schema must not be exposed to the Data API. There are no exposed privileged RPCs or RLS-bypassing views.

## Capability and shortlist controls

The capability/shortlist migration adds three RLS-enabled tables and one caller-scoped (`security_invoker=true`) read-only view. Capability observations are insert/select only; staff cannot edit/delete them. Shortlist references use composite organization/RFQ/supplier/capability keys. Shortlist updates bind organization, RFQ, entry and loaded version in the app. Database triggers independently validate parent versions, stamp actors and snapshot actual database records; accepting fit requires engineer/admin authority, current qualification, approved RFQ and nonblank fit evidence. Parent rows are locked while snapshotting/accepting. Event writes run only through an audited private trigger; no app role may forge, edit or delete events. No new privileged public RPC is exposed.

Stored shortlist decisions are historical. `rfq_shortlist_status.effective_state` checks current requirement revision, supplier version, RFQ engineering decision and qualification expiry under caller RLS. The application reads this view, rather than displaying the historical accepted flag as current. Capability content is reported evidence, not automatically qualified scope. Human reviewers remain responsible for semantic fit and source freshness. Membership remains out of band and one organization per account; no self-enrolment or public supplier portal is introduced.

## Application controls

Supabase `getUser()` confirms identity. Active membership gates every query and write, independently of navigation/layout. PostgREST requests carry the staff user's session, never a service-role key. Server Actions use Next.js same-origin protections; no cross-origin allowed-origin overrides are configured. Auth redirects have fixed local destinations. Source links accept HTTP(S), render escaped and open with noopener/noreferrer. Submitted strings are rendered as text, not HTML.

Session cookies are HttpOnly/SameSite=Lax and Secure in production mode. Dynamic staff/auth responses prohibit caching; response headers also deny framing, MIME sniffing and browser access to camera/microphone/location. Credentials are never embedded in server error messages. No telemetry/analytics or browser session replay is installed. Avoid logging private request payloads and token-bearing URLs when configuring hosting.

## Limits

This is a V0 implementation, not a penetration test or compliance certification. Auth service configuration, email delivery, invitation/recovery behaviour, deployed cookies/CDN behaviour, backups, provider rate limits, migration advisors and real Supabase integration still require environment-specific verification. PGlite checks execute SQL policy/trigger logic, but use a minimal stub for `auth.users`/`auth.uid`; browser tests simulate the Auth/PostgREST protocol. No MFA enforcement, granular customer-level permissions, field encryption, file storage or production approval engine is included.

A staff member can record false evidence; software requires traceability and an authorized human decision, not proof that an assessment actually happened. Trusted database operators retain privileged access. Establish review procedures and private evidence controls before handling real records.

## Release boundary

Review the PR and exact migration. Verify in an approved staging project with test staff before considering a release. Confirm policy/grant/advisor results and browser flows on the exact deployed version. Merge, hosted migration and live deployment each need explicit authorization. No external customer communications, real production writes or supplier qualification claims are authorized by passing local checks.
