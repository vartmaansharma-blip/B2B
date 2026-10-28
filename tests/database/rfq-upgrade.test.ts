import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { asUser, database, ids } from "./harness";
const baseline = "20261027182029_manufacturing_os_v0.sql";
const migration = readFileSync(
  "supabase/migrations/20261028023900_rfq_drawing_revisions.sql",
  "utf8",
);
async function legacy() {
  const db = await database(baseline);
  const customer = (
    await asUser<{ id: string }>(
      db,
      ids.operator,
      "insert into public.customers(organization_id,name,reference) values($1,'TEST ONLY upgrade customer','SYNTHETIC') returning id",
      [ids.orgA],
    )
  ).rows[0];
  const rfq = (
    await asUser<{ id: string }>(
      db,
      ids.operator,
      "insert into public.rfqs(organization_id,customer_id,title,part_description,quantity,unit) values($1,$2,'TEST ONLY upgrade RFQ','SYNTHETIC',10,'pieces') returning id",
      [ids.orgA, customer.id],
    )
  ).rows[0];
  return { db, rfq };
}
it("upgrades existing pending records without inventing historical snapshots", async () => {
  const { db, rfq } = await legacy();
  try {
    await db.exec(migration);
    expect(
      (
        await asUser(
          db,
          ids.operator,
          "select requirements_after from public.review_events where entity_id=$1",
          [rfq.id],
        )
      ).rows,
    ).toEqual([{ requirements_after: null }]);
    const changed = await asUser<{
      drawing_revision: string;
      engineering_state: string;
    }>(
      db,
      ids.operator,
      "update public.rfqs set drawing_reference='TEST ONLY DWG',drawing_revision='A',amendment_note='TEST ONLY add controlled identity' where id=$1 returning drawing_revision,engineering_state",
      [rfq.id],
    );
    expect(changed.rows[0]).toEqual({
      drawing_revision: "A",
      engineering_state: "pending",
    });
  } finally {
    await db.close();
  }
});
it("fails closed and rolls back if legacy approvals have no drawing revision", async () => {
  const { db, rfq } = await legacy();
  try {
    await asUser(
      db,
      ids.operator,
      "update public.rfqs set status='reviewing' where id=$1",
      [rfq.id],
    );
    await asUser(
      db,
      ids.engineer,
      "update public.rfqs set engineering_state='approved',engineering_note='SYNTHETIC TEST ONLY legacy approval' where id=$1",
      [rfq.id],
    );
    await expect(db.exec(migration)).rejects.toThrow(
      /rfq_controlled_drawing_approval/,
    );
    await db.exec("rollback");
    expect(
      (
        await db.query(
          "select column_name from information_schema.columns where table_name='rfqs' and column_name='drawing_revision'",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser<{ engineering_state: string }>(
          db,
          ids.engineer,
          "select engineering_state from public.rfqs where id=$1",
          [rfq.id],
        )
      ).rows[0].engineering_state,
    ).toBe("approved");
  } finally {
    await db.close();
  }
});
