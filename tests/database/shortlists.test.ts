import { afterAll, beforeAll, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { asUser, database, ids, supplierInsert } from "./harness";
import type {
  Rfq,
  RfqShortlist,
  ShortlistEvent,
  Supplier,
  SupplierCapability,
} from "@/lib/types";
import {
  effectiveShortlistState,
  parseShortlistSnapshot,
} from "@/features/rfqs/shortlist-model";
let db: PGlite;
let sequence = 0;
beforeAll(async () => {
  db = await database();
});
afterAll(async () => {
  await db?.close();
});
const capabilitySql = `insert into public.supplier_capabilities(organization_id,supplier_id,process,material,tolerance_notes,inspection_notes,evidence_reference,observed_on) values($1,$2,'TEST ONLY machining','TEST ONLY steel','SYNTHETIC tolerance','SYNTHETIC inspection','SYNTHETIC observation',current_date) returning *`;
async function fixture(qualified = true, approved = true) {
  const suffix = ++sequence;
  let supplier = (
    await asUser<Supplier>(db, ids.operator, supplierInsert, [
      ids.orgA,
      `TEST ONLY Shortlist ${suffix}`,
    ])
  ).rows[0];
  if (qualified) {
    for (const state of ["contact_review", "capability_review"])
      await asUser(
        db,
        ids.operator,
        "update public.suppliers set qualification_state=$2,review_note='SYNTHETIC TEST ONLY' where id=$1",
        [supplier.id, state],
      );
    supplier = (
      await asUser<Supplier>(
        db,
        ids.engineer,
        "update public.suppliers set qualification_state='qualified',qualification_scope='SYNTHETIC machining steel',evidence_reference='SYNTHETIC qualification',qualification_expires_on=current_date+30,review_note='SYNTHETIC TEST ONLY' where id=$1 returning *",
        [supplier.id],
      )
    ).rows[0];
  }
  if (supplier.qualification_expires_on)
    supplier.qualification_expires_on = new Date(
      supplier.qualification_expires_on,
    )
      .toISOString()
      .slice(0, 10);
  const capability = (
    await asUser<SupplierCapability>(db, ids.operator, capabilitySql, [
      ids.orgA,
      supplier.id,
    ])
  ).rows[0];
  const customer = (
    await asUser<{ id: string }>(
      db,
      ids.operator,
      "insert into public.customers(organization_id,name,reference) values($1,$2,'SYNTHETIC') returning id",
      [ids.orgA, `TEST ONLY Shortlist customer ${suffix}`],
    )
  ).rows[0];
  let rfq = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "insert into public.rfqs(organization_id,customer_id,title,part_description,drawing_reference,drawing_revision,quantity,unit) values($1,$2,'TEST ONLY shortlist RFQ','SYNTHETIC','TEST ONLY DRAWING','A',10,'pieces') returning *",
      [ids.orgA, customer.id],
    )
  ).rows[0];
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set status='reviewing' where id=$1",
    [rfq.id],
  );
  if (approved)
    rfq = (
      await asUser<Rfq>(
        db,
        ids.engineer,
        "update public.rfqs set engineering_state='approved',engineering_note='SYNTHETIC TEST ONLY' where id=$1 returning *",
        [rfq.id],
      )
    ).rows[0];
  return { rfq, supplier, capability };
}
async function propose(
  f: Awaited<ReturnType<typeof fixture>>,
  user = ids.operator,
  org = ids.orgA,
) {
  return (
    await asUser<RfqShortlist>(
      db,
      user,
      "insert into public.rfq_shortlists(organization_id,rfq_id,supplier_id,capability_id,requirements_version,supplier_version,review_note) values($1,$2,$3,$4,$5,$6,'SYNTHETIC proposal') returning *",
      [
        org,
        f.rfq.id,
        f.supplier.id,
        f.capability.id,
        f.rfq.requirements_version,
        f.supplier.version,
      ],
    )
  ).rows[0];
}
async function accept(
  e: RfqShortlist,
  r: Rfq,
  user = ids.engineer,
  evidence = "SYNTHETIC fit evidence",
) {
  return (
    await asUser<RfqShortlist>(
      db,
      user,
      "update public.rfq_shortlists set state='accepted',review_note='SYNTHETIC fit review',fit_evidence_reference=$2,rfq_reviewed_at=$3,reviewed_by=$4,requirements_snapshot='{}',supplier_snapshot='{}' where id=$1 returning *",
      [e.id, evidence, r.reviewed_at, ids.operator],
    )
  ).rows[0];
}
it("creates source observations without changing qualification or trusting authors", async () => {
  const f = await fixture(false);
  const c = (
    await asUser<SupplierCapability>(
      db,
      ids.operator,
      "insert into public.supplier_capabilities(organization_id,supplier_id,process,material,tolerance_notes,inspection_notes,evidence_reference,observed_on,created_by) values($1,$2,'TEST','TEST','TEST','TEST','SYNTHETIC',current_date,$3) returning *",
      [ids.orgA, f.supplier.id, ids.engineer],
    )
  ).rows[0];
  expect(c.created_by).toBe(ids.operator);
  expect(
    (
      await asUser<Supplier>(
        db,
        ids.operator,
        "select * from public.suppliers where id=$1",
        [f.supplier.id],
      )
    ).rows[0].qualification_state,
  ).toBe("discovered");
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.supplier_capabilities set process='changed' where id=$1",
      [c.id],
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    asUser(
      db,
      ids.operator,
      "delete from public.supplier_capabilities where id=$1",
      [c.id],
    ),
  ).rejects.toThrow(/permission denied/);
});
it("proposes unqualified leads and snapshots exact requirements and capability evidence", async () => {
  const f = await fixture(false);
  const e = await propose(f);
  expect(e.state).toBe("proposed");
  const event = (
    await asUser<ShortlistEvent>(
      db,
      ids.operator,
      "select * from public.shortlist_events where shortlist_id=$1",
      [e.id],
    )
  ).rows[0];
  const snapshot = parseShortlistSnapshot(event.snapshot);
  expect(snapshot?.requirements_snapshot).toMatchObject({
    drawing_revision: "A",
    quantity: 10,
  });
  expect(snapshot?.supplier_snapshot.capability.evidence_reference).toContain(
    "SYNTHETIC",
  );
  expect(event.actor_id).toBe(ids.operator);
  await expect(accept(e, f.rfq)).rejects.toThrow(
    /Current supplier qualification/,
  );
});
it("requires engineering role, RFQ approval and fit evidence, and stamps the actual reviewer", async () => {
  const f = await fixture();
  const e = await propose(f);
  await expect(accept(e, f.rfq, ids.operator)).rejects.toThrow(
    /Engineering role/,
  );
  await expect(accept(e, f.rfq, ids.engineer, "  ")).rejects.toThrow(
    /fit evidence/,
  );
  const accepted = await accept(e, f.rfq);
  expect(accepted.reviewed_by).toBe(ids.engineer);
  expect(accepted.requirements_snapshot).toEqual(e.requirements_snapshot);
  expect(accepted.supplier_snapshot).toEqual(e.supplier_snapshot);
  expect(effectiveShortlistState(accepted, f.rfq, f.supplier)).toBe("accepted");
  expect(
    (
      await asUser<{ effective_state: string }>(
        db,
        ids.operator,
        "select effective_state from public.rfq_shortlist_status where id=$1",
        [accepted.id],
      )
    ).rows[0].effective_state,
  ).toBe("accepted");
  const pending = await fixture(true, false);
  await expect(accept(await propose(pending), pending.rfq)).rejects.toThrow(
    /approved RFQ/,
  );
});
it("rejects inserting preaccepted entries and duplicate supplier proposals", async () => {
  const f = await fixture();
  const e = await propose(f);
  await expect(propose(f)).rejects.toThrow(/unique constraint/);
  await expect(
    asUser(
      db,
      ids.engineer,
      "insert into public.rfq_shortlists(organization_id,rfq_id,supplier_id,capability_id,requirements_version,supplier_version,review_note,state) values($1,$2,$3,$4,1,$5,'SYNTHETIC','accepted')",
      [ids.orgA, f.rfq.id, f.supplier.id, f.capability.id, f.supplier.version],
    ),
  ).rejects.toThrow(/start proposed/);
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.rfq_shortlists set review_note=' ' where id=$1",
      [e.id],
    ),
  ).rejects.toThrow(/check constraint/);
});
it.each([ids.outsider, ids.other, ids.anonymous])(
  "blocks unrelated and anonymous-auth users (%s)",
  async (user) => {
    const f = await fixture();
    const e = await propose(f);
    for (const table of [
      "supplier_capabilities",
      "rfq_shortlists",
      "shortlist_events",
      "rfq_shortlist_status",
    ])
      expect(
        (
          await asUser(
            db,
            user,
            `select * from public.${table} where organization_id=$1`,
            [ids.orgA],
          )
        ).rows,
      ).toHaveLength(0);
    await expect(propose(f, user)).rejects.toThrow();
    expect(
      (
        await asUser(
          db,
          user,
          "update public.rfq_shortlists set state='removed',review_note='SYNTHETIC' where id=$1 returning id",
          [e.id],
        )
      ).rows,
    ).toHaveLength(0);
  },
);
it("prevents cross-organization supplier and capability references", async () => {
  const f = await fixture();
  await expect(propose(f, ids.other, ids.orgB)).rejects.toThrow(
    /unavailable|row-level security/,
  );
  await expect(
    asUser(db, ids.other, capabilitySql, [ids.orgB, f.supplier.id]),
  ).rejects.toThrow(/foreign key/);
  const other = await fixture();
  await expect(propose({ ...f, capability: other.capability })).rejects.toThrow(
    /Related records unavailable/,
  );
});
it("checks parent versions before proposing and accepting stale entries", async () => {
  const f = await fixture();
  const e = await propose(f);
  const r = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "update public.rfqs set quantity=20,amendment_note='SYNTHETIC correction',requirements_version=999 where id=$1 returning *",
      [f.rfq.id],
    )
  ).rows[0];
  expect(r.requirements_version).toBe(2);
  expect(effectiveShortlistState(e, r, f.supplier)).toBe("needs_review");
  await expect(accept(e, f.rfq)).rejects.toThrow(/changed; repropose/);
  const freshSupplier = await fixture();
  await asUser(
    db,
    ids.operator,
    "update public.suppliers set source_reference='SYNTHETIC updated source' where id=$1",
    [freshSupplier.supplier.id],
  );
  await expect(propose(freshSupplier)).rejects.toThrow(/changed; repropose/);
});
it("preserves the requirements counter through workflow changes and catches change-and-revert", async () => {
  const f = await fixture();
  const accepted = await accept(await propose(f), f.rfq);
  const moved = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "update public.rfqs set status='sourcing',requirements_version=100 where id=$1 returning *",
      [f.rfq.id],
    )
  ).rows[0];
  expect(moved.requirements_version).toBe(1);
  expect(effectiveShortlistState(accepted, moved, f.supplier)).toBe("accepted");
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set quantity=20,amendment_note='SYNTHETIC changed' where id=$1",
    [f.rfq.id],
  );
  const reverted = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "update public.rfqs set quantity=10,amendment_note='SYNTHETIC reverted' where id=$1 returning *",
      [f.rfq.id],
    )
  ).rows[0];
  expect(reverted.requirements_version).toBe(3);
  expect(effectiveShortlistState(accepted, reverted, f.supplier)).toBe(
    "needs_review",
  );
});
it("requires a current engineering decision and does not resurrect old acceptance after reapproval", async () => {
  const f = await fixture();
  const e = await propose(f);
  const accepted = await accept(e, f.rfq);
  const changed = (
    await asUser<Rfq>(
      db,
      ids.engineer,
      "update public.rfqs set engineering_note='SYNTHETIC changed engineering decision' where id=$1 returning *",
      [f.rfq.id],
    )
  ).rows[0];
  expect(effectiveShortlistState(accepted, changed, f.supplier)).toBe(
    "needs_review",
  );
  const p = await fixture();
  const proposed = await propose(p);
  await asUser(
    db,
    ids.engineer,
    "update public.rfqs set engineering_note='SYNTHETIC newer decision' where id=$1",
    [p.rfq.id],
  );
  await expect(accept(proposed, p.rfq)).rejects.toThrow(
    /Engineering decision changed/,
  );
});
it("invalidates suspended, changed and expired suppliers even when stored state is accepted", async () => {
  const f = await fixture();
  const accepted = await accept(await propose(f), f.rfq);
  const s = (
    await asUser<Supplier>(
      db,
      ids.operator,
      "update public.suppliers set qualification_state='suspended',review_note='SYNTHETIC suspension' where id=$1 returning *",
      [f.supplier.id],
    )
  ).rows[0];
  expect(effectiveShortlistState(accepted, f.rfq, s)).toBe("needs_review");
  expect(
    (
      await asUser<{ effective_state: string }>(
        db,
        ids.operator,
        "select effective_state from public.rfq_shortlist_status where id=$1",
        [accepted.id],
      )
    ).rows[0].effective_state,
  ).toBe("needs_review");
  expect(
    effectiveShortlistState(accepted, f.rfq, f.supplier, "2999-01-01"),
  ).toBe("needs_review");
  expect(effectiveShortlistState(accepted, f.rfq, undefined)).toBe(
    "needs_review",
  );
  const p = await fixture();
  const e = await propose(p);
  // Simulate time passage only in the isolated fixture without forging a staff review.
  await db.exec("alter table public.suppliers disable trigger user;");
  try {
    await db.query(
      "update public.suppliers set qualification_expires_on=current_date-1 where id=$1",
      [p.supplier.id],
    );
  } finally {
    await db.exec("alter table public.suppliers enable trigger user;");
  }
  await expect(accept(e, p.rfq)).rejects.toThrow(
    /Current supplier qualification/,
  );
});
it("reproposes stale entries with fresh snapshots and keeps earlier events immutable", async () => {
  const f = await fixture();
  const accepted = await accept(await propose(f), f.rfq);
  const supplier = (
    await asUser<Supplier>(
      db,
      ids.operator,
      "update public.suppliers set source_reference='SYNTHETIC updated source' where id=$1 returning *",
      [f.supplier.id],
    )
  ).rows[0];
  const reproposed = (
    await asUser<RfqShortlist>(
      db,
      ids.operator,
      "update public.rfq_shortlists set state='proposed',supplier_version=$2,review_note='SYNTHETIC reproposal' where id=$1 returning *",
      [accepted.id, supplier.version],
    )
  ).rows[0];
  expect(reproposed.reviewed_by).toBeNull();
  expect(reproposed.fit_evidence_reference).toBeNull();
  expect((await accept(reproposed, f.rfq)).state).toBe("accepted");
  const events = (
    await asUser<ShortlistEvent>(
      db,
      ids.operator,
      "select * from public.shortlist_events where shortlist_id=$1 order by created_at",
      [accepted.id],
    )
  ).rows;
  expect(events.map((e) => e.to_state)).toEqual([
    "proposed",
    "accepted",
    "proposed",
    "accepted",
  ]);
  expect(
    parseShortlistSnapshot(events[1].snapshot)?.supplier_snapshot
      .evidence_reference,
  ).toBe("SYNTHETIC qualification");
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.shortlist_events set note='FORGED'",
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    asUser(
      db,
      ids.operator,
      "insert into public.shortlist_events(organization_id,rfq_id,shortlist_id,to_state,note,snapshot,actor_id) values($1,$2,$3,'accepted','FORGED','{}',$4)",
      [ids.orgA, f.rfq.id, accepted.id, ids.engineer],
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    asUser(db, ids.operator, "delete from public.rfq_shortlists where id=$1", [
      accepted.id,
    ]),
  ).rejects.toThrow(/permission denied/);
});
it("rejects stale edits, identity swaps, acceptance-scope changes and closed RFQs", async () => {
  const f = await fixture();
  const e = await propose(f);
  await asUser(
    db,
    ids.operator,
    "update public.rfq_shortlists set state='removed',review_note='SYNTHETIC removed' where id=$1",
    [e.id],
  );
  expect(
    (
      await asUser(
        db,
        ids.operator,
        "update public.rfq_shortlists set state='proposed',review_note='SYNTHETIC stale' where id=$1 and version=$2 returning id",
        [e.id, e.version],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(accept(e, f.rfq)).rejects.toThrow(/Propose before acceptance/);
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.rfq_shortlists set organization_id=$2 where id=$1",
      [e.id, ids.orgB],
    ),
  ).rejects.toThrow();
  const p = await fixture();
  const proposed = await propose(p);
  await expect(
    asUser(
      db,
      ids.engineer,
      "update public.rfq_shortlists set state='accepted',supplier_version=999 where id=$1",
      [proposed.id],
    ),
  ).rejects.toThrow(/Repropose before changing/);
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set status='closed' where id=$1",
    [p.rfq.id],
  );
  await expect(accept(proposed, p.rfq)).rejects.toThrow(/RFQ is closed/);
  await expect(propose(p)).rejects.toThrow(/RFQ is closed/);
});
it("records engineering rejection without erasing acceptance evidence and requires fresh review", async () => {
  const f = await fixture();
  const accepted = await accept(await propose(f), f.rfq);
  const before = (
    await asUser<ShortlistEvent>(
      db,
      ids.engineer,
      "select * from public.shortlist_events where shortlist_id=$1 order by created_at,id",
      [accepted.id],
    )
  ).rows;
  const removed = (
    await asUser<RfqShortlist>(
      db,
      ids.engineer,
      "update public.rfq_shortlists set state='removed',review_note='SYNTHETIC engineering rejection' where id=$1 and version=$2 returning *",
      [accepted.id, accepted.version],
    )
  ).rows[0];
  expect(removed.state).toBe("removed");
  expect(effectiveShortlistState(removed, f.rfq, f.supplier)).toBe("removed");
  await expect(accept(removed, f.rfq)).rejects.toThrow(
    /Propose before acceptance/,
  );
  const history = (
    await asUser<ShortlistEvent>(
      db,
      ids.engineer,
      "select * from public.shortlist_events where shortlist_id=$1 order by created_at,id",
      [accepted.id],
    )
  ).rows;
  expect(
    history.filter((event) => before.some((old) => old.id === event.id)),
  ).toEqual(before);
  expect(
    history.filter((event) => !before.some((old) => old.id === event.id)),
  ).toMatchObject([
    {
      to_state: "removed",
      actor_id: ids.engineer,
      note: "SYNTHETIC engineering rejection",
    },
  ]);
  const reproposed = (
    await asUser<RfqShortlist>(
      db,
      ids.operator,
      "update public.rfq_shortlists set state='proposed',review_note='SYNTHETIC reconsider after rejection' where id=$1 and version=$2 returning *",
      [removed.id, removed.version],
    )
  ).rows[0];
  expect(reproposed.reviewed_by).toBeNull();
  expect(reproposed.fit_evidence_reference).toBeNull();
  await expect(accept(reproposed, f.rfq, ids.engineer, " ")).rejects.toThrow(
    /fit evidence/,
  );
  expect((await accept(reproposed, f.rfq)).state).toBe("accepted");
});
it("upgrades existing drawing-controlled RFQs without inventing shortlists or approvals", async () => {
  const legacy = await database("20261028023900_rfq_drawing_revisions.sql");
  try {
    const customer = (
      await asUser<{ id: string }>(
        legacy,
        ids.operator,
        "insert into public.customers(organization_id,name,reference) values($1,'TEST ONLY upgrade','SYNTHETIC') returning id",
        [ids.orgA],
      )
    ).rows[0];
    const r = (
      await asUser<Rfq>(
        legacy,
        ids.operator,
        "insert into public.rfqs(organization_id,customer_id,title,part_description,quantity,unit) values($1,$2,'TEST ONLY upgrade','SYNTHETIC',1,'piece') returning *",
        [ids.orgA, customer.id],
      )
    ).rows[0];
    await legacy.exec(
      readFileSync(
        "supabase/migrations/20261028115224_procurement_shortlists.sql",
        "utf8",
      ),
    );
    expect(
      (
        await asUser<Rfq>(
          legacy,
          ids.operator,
          "select * from public.rfqs where id=$1",
          [r.id],
        )
      ).rows[0],
    ).toMatchObject({
      engineering_state: "pending",
      requirements_version: 1,
      quantity: 1,
    });
    expect(
      (
        await asUser(
          legacy,
          ids.operator,
          "select * from public.rfq_shortlists",
        )
      ).rows,
    ).toEqual([]);
  } finally {
    await legacy.close();
  }
});
