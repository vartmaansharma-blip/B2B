import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, database, ids } from "./harness";
import type { Rfq, ReviewEvent } from "@/lib/types";
let db: PGlite;
let customer: string;
beforeAll(async () => {
  db = await database();
  customer = (
    await asUser<{ id: string }>(
      db,
      ids.operator,
      "insert into public.customers(organization_id,name,reference) values($1,'TEST ONLY revision customer','SYNTHETIC') returning id",
      [ids.orgA],
    )
  ).rows[0].id;
});
afterAll(async () => {
  await db?.close();
});
async function draft(
  reference: string | null = "TEST ONLY DWG",
  revision: string | null = "A",
) {
  return (
    await asUser<Rfq>(
      db,
      ids.operator,
      "insert into public.rfqs(organization_id,customer_id,title,part_description,drawing_reference,drawing_revision,quantity,unit) values($1,$2,'TEST ONLY revision RFQ','SYNTHETIC',$3,$4,10,'pieces') returning *",
      [ids.orgA, customer, reference, revision],
    )
  ).rows[0];
}
async function approve(r: Rfq) {
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set status='reviewing' where id=$1",
    [r.id],
  );
  await asUser(
    db,
    ids.engineer,
    "update public.rfqs set engineering_state='approved',engineering_note='SYNTHETIC TEST ONLY engineering decision' where id=$1",
    [r.id],
  );
}
it.each([
  [null, null],
  ["TEST ONLY DWG", null],
  [null, "A"],
  ["   ", "A"],
  ["TEST ONLY DWG", " "],
])(
  "blocks approval with missing/blank drawing control (%s, %s)",
  async (reference, revision) => {
    const r = await draft(reference, revision);
    await expect(approve(r)).rejects.toThrow(/rfq_controlled_drawing_approval/);
  },
);
it("records the exact requirements with engineering approval", async () => {
  const r = await draft();
  await approve(r);
  const events = (
    await asUser<ReviewEvent>(
      db,
      ids.operator,
      "select * from public.review_events where entity_id=$1 and to_state='reviewing/approved'",
      [r.id],
    )
  ).rows;
  expect(events).toHaveLength(1);
  expect(events[0].actor_id).toBe(ids.engineer);
  expect(events[0].requirements_after).toMatchObject({
    drawing_reference: "TEST ONLY DWG",
    drawing_revision: "A",
    quantity: 10,
    version: 3,
  });
});
it("requires a reason and preserves the previous approval if amendment fails", async () => {
  const r = await draft();
  await approve(r);
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.rfqs set drawing_revision='B' where id=$1",
      [r.id],
    ),
  ).rejects.toThrow(/Amendment reason required/);
  const current = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "select * from public.rfqs where id=$1",
      [r.id],
    )
  ).rows[0];
  expect(current.engineering_state).toBe("approved");
  expect(current.drawing_revision).toBe("A");
});
it("invalidates approval atomically and records before/after without trusting submitted reviewer fields", async () => {
  const r = await draft();
  await approve(r);
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set status='sourcing' where id=$1",
    [r.id],
  );
  const changed = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "update public.rfqs set drawing_revision='B',quantity=20,amendment_note='TEST ONLY revised quantity and drawing',engineering_state='approved',reviewed_by=$2 where id=$1 returning *",
      [r.id, ids.engineer],
    )
  ).rows[0];
  expect(changed).toMatchObject({
    status: "reviewing",
    engineering_state: "pending",
    engineering_note: null,
    reviewed_by: null,
    reviewed_at: null,
  });
  const events = (
    await asUser<ReviewEvent>(
      db,
      ids.operator,
      "select * from public.review_events where entity_id=$1 and requirements_before is not null",
      [r.id],
    )
  ).rows;
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    actor_id: ids.operator,
    note: "TEST ONLY revised quantity and drawing",
    requirements_before: { drawing_revision: "A", quantity: 10, version: 4 },
    requirements_after: { drawing_revision: "B", quantity: 20, version: 5 },
  });
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.rfqs set status='sourcing' where id=$1",
      [r.id],
    ),
  ).rejects.toThrow(/check constraint/);
});
it("audits subsequent amendments while already pending", async () => {
  const r = await draft();
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set quantity=20,amendment_note='TEST ONLY correction' where id=$1",
    [r.id],
  );
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set quantity=30,amendment_note='TEST ONLY correction' where id=$1",
    [r.id],
  );
  const events = (
    await asUser<ReviewEvent>(
      db,
      ids.operator,
      "select * from public.review_events where entity_id=$1 and requirements_before is not null order by created_at",
      [r.id],
    )
  ).rows;
  expect(events).toHaveLength(2);
  expect(events[1].requirements_before).toMatchObject({ quantity: 20 });
  expect(events[1].requirements_after).toMatchObject({ quantity: 30 });
});
it("keeps customer identity fixed even within the same organization", async () => {
  const r = await draft();
  const other = (
    await asUser<{ id: string }>(
      db,
      ids.operator,
      "insert into public.customers(organization_id,name,reference) values($1,'TEST ONLY another customer','SYNTHETIC') returning id",
      [ids.orgA],
    )
  ).rows[0];
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.rfqs set customer_id=$2,amendment_note='TEST ONLY attempted transfer' where id=$1",
      [r.id, other.id],
    ),
  ).rejects.toThrow(/Customer identity is immutable/);
});
it("rejects a stale amendment and keeps history private and immutable", async () => {
  const r = await draft();
  await asUser(
    db,
    ids.operator,
    "update public.rfqs set quantity=20,amendment_note='TEST ONLY correction' where id=$1",
    [r.id],
  );
  expect(
    (
      await asUser(
        db,
        ids.operator,
        "update public.rfqs set quantity=30,amendment_note='TEST ONLY stale' where id=$1 and version=$2 returning id",
        [r.id, r.version],
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await asUser(
        db,
        ids.other,
        "select * from public.review_events where entity_id=$1",
        [r.id],
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await asUser(
        db,
        ids.outsider,
        "select * from public.review_events where entity_id=$1",
        [r.id],
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await asUser(
        db,
        ids.other,
        "update public.rfqs set quantity=30,amendment_note='TEST ONLY cross-tenant' where id=$1 returning id",
        [r.id],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(
    asUser(
      db,
      ids.operator,
      "update public.review_events set requirements_after='{}' where entity_id=$1",
      [r.id],
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    asUser(
      db,
      ids.operator,
      "insert into public.review_events(organization_id,entity_type,entity_id,to_state,actor_id,requirements_after) values($1,'rfq',$2,'reviewing/approved',$3,'{}')",
      [ids.orgA, r.id, ids.engineer],
    ),
  ).rejects.toThrow(/permission denied/);
});
