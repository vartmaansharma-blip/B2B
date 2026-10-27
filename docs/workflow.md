# V0 operating sequence

## Supplier discovery

Add the business name, city/region, reported processes/materials, discovery source and observation date. A public source URL is optional. A source may be an industry directory, referral, field visit or association record. Do not assume it is accurate because it is public. No directory can establish that every Indian manufacturer has been found; coverage and verification are future discovery work.

New records always start `discovered`. Operators can record early reviews and reasons. Database transitions are:

| Current state     | Allowed next states          |
| ----------------- | ---------------------------- |
| discovered        | contact_review, rejected     |
| contact_review    | capability_review, rejected  |
| capability_review | qualified, rejected          |
| qualified         | suspended, capability_review |
| rejected          | contact_review               |
| suspended         | capability_review, rejected  |

Every changed review needs a note. Qualification requires an engineer or admin, nonblank scope and evidence reference, and an expiry after today but no more than 365 days ahead (database dates use UTC). The database stamps the actor and time. Scope should identify process, material, tolerance, inspection and limitations; this is an accountable human assessment, not an automated certificate.

Expired qualifications display as `review expired` and do not count as current on the overview. The stored state remains qualified for historical accuracy; filters use that stored state. Renew in place with a new review note/evidence/expiry or return to capability review. Changing supplier capability while retaining a qualified state is rejected by the database. Operators may suspend a supplier or return it for review; they cannot create or renew qualification.

The audit ledger records review state, actor, note, scope, expiry and evidence reference. Staff cannot insert, update or delete ledger events directly. No production seeds or demo qualifications are provided.

## Customer and RFQ intake

Select a customer business or add one with an intake reference, then create an RFQ. Capture requirements, quantity/unit, optional target date and a controlled drawing reference. Drawing uploads and commercial terms are outside V0. New RFQs start `draft / pending`.

| Current RFQ status | Allowed next statuses     |
| ------------------ | ------------------------- |
| draft              | reviewing, closed         |
| reviewing          | sourcing, closed          |
| sourcing           | reviewing, quoted, closed |
| quoted             | reviewing, closed         |
| closed             | reviewing                 |

Operators can progress workflow status; engineers/admins record `pending`, `approved` or `changes_requested` decisions with a note. Sourcing and quoted statuses require an approved engineering decision. An engineering decision is separate from supplier qualification. Editing requirements through the Data API invalidates prior approval and returns the RFQ to reviewing/pending; database checks enforce this even outside the app.

V0 UI supports creating and reviewing records. General business-record editing, file handling, supplier shortlisting, real quote comparison and production approvals are deferred. Correct an intake error by closing/rejecting the record with a clear reason and creating a correct record, or use a reviewed administrative correction. No deletion is available to app roles. Quoted is a staff tracking status, not a stored quotation or price claim.

## Responsibility

Business records and review evidence stay private. Software records decisions; it does not validate a factory, negotiate a contract, inspect a part or assume delivery liability. No purchase order, production release, payment or customer communication can be issued from V0.
