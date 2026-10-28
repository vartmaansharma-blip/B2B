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

Select a customer business or add one with an intake reference, then create an RFQ. Capture requirements, quantity/unit, optional target date, and a controlled drawing reference and exact customer-issued revision. Drafts can be incomplete, but engineering approval requires both reference and revision. Drawing uploads and commercial terms are outside V0. New RFQs start `draft / pending`.

| Current RFQ status | Allowed next statuses     |
| ------------------ | ------------------------- |
| draft              | reviewing, closed         |
| reviewing          | sourcing, closed          |
| sourcing           | reviewing, quoted, closed |
| quoted             | reviewing, closed         |
| closed             | reviewing                 |

Operators can progress workflow status; engineers/admins record `pending`, `approved` or `changes_requested` decisions with a note. Sourcing and quoted statuses require an approved engineering decision. An engineering decision is separate from supplier qualification. Use **Amend requirements** to correct the title, specifications, drawing identity, quantity/unit or target date. Add a reason and save. Customer identity is fixed: create a new RFQ for a different customer. Every changed requirement invalidates approval and returns the RFQ to reviewing/pending, clearing reviewer attribution. Database checks enforce this even outside the app. A simultaneous attempt to amend and approve remains pending; engineering must review the new requirements separately. The app checks the loaded record version; stale edits require refreshing. No-op amendments are rejected.

Amendment history contains the reason, authenticated actor, time, previous requirements and replacement requirements, with record versions. Reviews also retain a snapshot of the requirements at that decision. Staff cannot forge or edit these ledger entries. The screen shows the latest 50 events; earlier events remain private in the database. Events created before the amendment migration retain their original evidence without invented snapshots. This workflow is available only after the new migration and application receive staging acceptance.

V0 UI supports creation, review and reasoned RFQ amendments. The current branch adds the capability and shortlist workflow below. Supplier/customer corrections, file handling, real quote comparison and production approvals remain deferred. Correct a supplier/customer intake error by closing/rejecting its affected workflow with a clear reason and creating a correct record, or use a reviewed administrative correction. No deletion is available to app roles. Quoted is a staff tracking status, not a stored quotation or price claim.

## Capability observations and RFQ shortlists

From a supplier record, open **View and record reported capabilities**. Record one process/material combination, tolerance limits, inspection methods, evidence reference and observation date. Use explicit uncertainty such as "not established" where the source does not support a claim. These are append-only observations; a correction is a new dated observation. No observation changes qualification or establishes part fit. Earlier observations remain visible, so the reviewer must assess freshness and choose the appropriate evidence.

From an RFQ, open **Build and review supplier shortlist**. Search observations by process/material; results are bounded, paginated and unranked. Inspect source evidence, supplier location, current qualification and exact requirements, then add a proposal reason. Unqualified discovery leads can be proposed for research, but cannot be accepted. One entry exists per supplier/RFQ; repropose that entry instead of creating duplicates. Use the observation selector to choose a newer result for the same supplier if needed.

An engineer/admin must separately accept part-specific fit with a reason and evidence reference. Acceptance requires an engineering-approved RFQ in reviewing/sourcing, current supplier qualification, the same requirements revision and supplier version, and the current RFQ engineering decision. Check process, material, tolerance, inspection, drawing revision and qualification scope yourself; the software does not compare engineering semantics or certify a factory. Operators cannot accept fit. Any staff member may remove an entry with a reason.

Requirements changes, supplier changes, suspension, qualification expiry, a changed RFQ engineering decision or closure make acceptance display **needs review** through a database live-status view. Ordinary sourcing/quoted transitions alone preserve acceptance. Reopening an unchanged closed RFQ restores the validity of an unchanged, still-current decision; closure blocks use while closed. A requirements change followed by changing back still advances its separate revision counter. Repropose against the current records and obtain a fresh acceptance after a material change. Old snapshots remain unchanged. Stored `state='accepted'` is a historical decision; all current-eligibility consumers must use `rfq_shortlist_status.effective_state`.

The shortlist history retains the actor, reason, exact requirements, selected capability evidence, qualification scope/evidence/expiry and fit evidence at every decision. The screen shows the newest 50 events. Saving a stale entry fails with a refresh message; updates cannot silently overwrite another review. This workflow sends no supplier messages, publishes no RFQ, and issues no quotation, order or production approval. Existing RFQ sourcing status remains an internal tracker; it is not a supplier release mechanism.

## Responsibility

Business records and review evidence stay private. Software records decisions; it does not validate a factory, negotiate a contract, inspect a part or assume delivery liability. No purchase order, production release, payment or customer communication can be issued from V0.
