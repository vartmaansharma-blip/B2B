import { beforeAll, afterAll, describe, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, database, ids, supplierInsert } from "./harness";
import type { Supplier, Rfq } from "@/lib/types";
let db: PGlite;
let supplier: Supplier;
let otherSupplier: Supplier;
let customerId: string;
let rfq: Rfq;
beforeAll(async () => {
  db = await database();
  supplier = (
    await asUser<Supplier>(db, ids.operator, supplierInsert, [
      ids.orgA,
      "TEST ONLY Supplier A",
    ])
  ).rows[0];
  otherSupplier = (
    await asUser<Supplier>(db, ids.other, supplierInsert, [
      ids.orgB,
      "TEST ONLY Supplier B",
    ])
  ).rows[0];
  customerId = (
    await asUser<{ id: string }>(
      db,
      ids.operator,
      "insert into public.customers(organization_id,name,reference) values($1,'TEST ONLY Customer A','SYNTHETIC') returning id",
      [ids.orgA],
    )
  ).rows[0].id;
  rfq = (
    await asUser<Rfq>(
      db,
      ids.operator,
      "insert into public.rfqs(organization_id,customer_id,title,part_description,drawing_reference,drawing_revision,quantity,unit) values($1,$2,'TEST ONLY RFQ','SYNTHETIC','SYNTHETIC DRAWING','A',10,'pieces') returning *",
      [ids.orgA, customerId],
    )
  ).rows[0];
});
afterAll(async () => {
  await db?.close();
});
describe("database authorization", () => {
  it("enables RLS on every public table", async () => {
    const r = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'",
    );
    expect(r.rows).toHaveLength(6);
    expect(r.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  it.each([
    "organizations",
    "staff_memberships",
    "suppliers",
    "customers",
    "rfqs",
    "review_events",
  ])("denies anonymous reads of %s", async (table) => {
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        await tx.query(`select * from public.${table}`);
      }),
    ).rejects.toThrow(/permission denied/);
  });
  it.each(["suppliers", "customers", "rfqs", "review_events", "organizations"])(
    "hides %s from nonstaff",
    async (table) => {
      expect(
        (await asUser(db, ids.outsider, `select * from public.${table}`)).rows,
      ).toHaveLength(0);
    },
  );
  it("blocks anonymous-auth accounts with memberships", async () => {
    expect(
      (await asUser(db, ids.anonymous, "select * from public.suppliers")).rows,
    ).toHaveLength(0);
    await expect(
      asUser(db, ids.anonymous, supplierInsert, [ids.orgA, "TEST Anonymous"]),
    ).rejects.toThrow();
  });
  it("isolates organizations, writes, and audit history", async () => {
    expect(
      (
        await asUser<Supplier>(
          db,
          ids.operator,
          "select * from public.suppliers",
        )
      ).rows.map((r) => r.id),
    ).toEqual([supplier.id]);
    expect(
      (
        await asUser(
          db,
          ids.operator,
          "select * from public.review_events where entity_id=$1",
          [otherSupplier.id],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(
          db,
          ids.operator,
          "update public.suppliers set name='Attack' where id=$1 returning id",
          [otherSupplier.id],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      asUser(db, ids.operator, supplierInsert, [ids.orgB, "TEST Cross tenant"]),
    ).rejects.toThrow();
  });
  it("blocks tenant reassignment", async () => {
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.suppliers set organization_id=$1 where id=$2",
        [ids.orgB, supplier.id],
      ),
    ).rejects.toThrow();
  });
  it("blocks self-enrolment and promotion", async () => {
    await expect(
      asUser(
        db,
        ids.outsider,
        "insert into public.staff_memberships(organization_id,user_id,role) values($1,$2,'admin')",
        [ids.orgA, ids.outsider],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.staff_memberships set role='admin' where user_id=$1",
        [ids.operator],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("hides other memberships", async () => {
    expect(
      (
        await asUser<{ user_id: string }>(
          db,
          ids.operator,
          "select * from public.staff_memberships",
        )
      ).rows.map((r) => r.user_id),
    ).toEqual([ids.operator]);
  });
  it("revokes access without refreshing a JWT", async () => {
    await db.query(
      "update public.staff_memberships set active=false where user_id=$1",
      [ids.operator],
    );
    expect(
      (await asUser(db, ids.operator, "select * from public.suppliers")).rows,
    ).toHaveLength(0);
    await expect(
      asUser(db, ids.operator, supplierInsert, [ids.orgA, "TEST Revoked"]),
    ).rejects.toThrow();
    await db.query(
      "update public.staff_memberships set active=true where user_id=$1",
      [ids.operator],
    );
  });
  it("denies audit tampering and record deletion", async () => {
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.review_events set to_state='qualified'",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, ids.operator, "delete from public.suppliers"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(
        db,
        ids.operator,
        "insert into public.review_events(organization_id,entity_type,entity_id,to_state,actor_id) values($1,'supplier',$2,'qualified',$3)",
        [ids.orgA, supplier.id, ids.engineer],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("revokes direct execution of trigger helpers", async () => {
    const r = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated',p.oid,'EXECUTE') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname<>'staff_role'",
    );
    expect(r.rows.every((f) => !f.allowed)).toBe(true);
  });
  it("prevents cross-tenant customer references", async () => {
    await expect(
      asUser(
        db,
        ids.other,
        "insert into public.rfqs(organization_id,customer_id,title,part_description,quantity,unit) values($1,$2,'TEST Cross tenant','SYNTHETIC',1,'pieces')",
        [ids.orgB, customerId],
      ),
    ).rejects.toThrow(/foreign key/);
  });
});
describe("qualification review", () => {
  it("starts discovered and denies prequalified inserts", async () => {
    expect(supplier.qualification_state).toBe("discovered");
    await expect(
      asUser(
        db,
        ids.engineer,
        "insert into public.suppliers(organization_id,name,city,region,processes,materials,source_reference,observed_on,qualification_state) values($1,'TEST Invalid','Test','Test','Test','Test','SYNTHETIC',current_date,'qualified')",
        [ids.orgA],
      ),
    ).rejects.toThrow(/start discovered/);
  });
  it("rejects skipped stages and absent review notes", async () => {
    await expect(
      asUser(
        db,
        ids.engineer,
        "update public.suppliers set qualification_state='qualified',review_note='SYNTHETIC' where id=$1",
        [supplier.id],
      ),
    ).rejects.toThrow(/transition/);
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.suppliers set qualification_state='contact_review' where id=$1",
        [supplier.id],
      ),
    ).rejects.toThrow(/review note/);
  });
  it("allows staff to record early stages", async () => {
    await asUser(
      db,
      ids.operator,
      "update public.suppliers set qualification_state='contact_review',review_note='TEST ONLY contact review' where id=$1",
      [supplier.id],
    );
    await asUser(
      db,
      ids.operator,
      "update public.suppliers set qualification_state='capability_review',review_note='TEST ONLY capability review' where id=$1",
      [supplier.id],
    );
  });
  it("blocks operators from qualification", async () => {
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.suppliers set qualification_state='qualified',qualification_scope='SYNTHETIC',evidence_reference='SYNTHETIC',review_note='TEST ONLY',qualification_expires_on=current_date+30 where id=$1",
        [supplier.id],
      ),
    ).rejects.toThrow(/Engineering role/);
  });
  it("requires scope, evidence, and future expiry", async () => {
    await expect(
      asUser(
        db,
        ids.engineer,
        "update public.suppliers set qualification_state='qualified',review_note='TEST ONLY',qualification_expires_on=current_date+30 where id=$1",
        [supplier.id],
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asUser(
        db,
        ids.engineer,
        "update public.suppliers set qualification_state='qualified',qualification_scope='TEST ONLY',evidence_reference='SYNTHETIC',review_note='TEST ONLY',qualification_expires_on=current_date where id=$1",
        [supplier.id],
      ),
    ).rejects.toThrow(/expiry/);
  });
  it("records the real actor and evidence atomically", async () => {
    const r = (
      await asUser<Supplier>(
        db,
        ids.engineer,
        "update public.suppliers set qualification_state='qualified',qualification_scope='TEST ONLY no real qualification',evidence_reference='SYNTHETIC TEST ONLY',review_note='SYNTHETIC TEST ONLY decision',qualification_expires_on=current_date+30,qualified_by=$2 where id=$1 returning *",
        [supplier.id, ids.operator],
      )
    ).rows[0];
    expect(r.qualified_by).toBe(ids.engineer);
    expect(r.qualified_at).toBeTruthy();
    const events = (
      await asUser<{ actor_id: string; evidence_reference: string }>(
        db,
        ids.engineer,
        "select * from public.review_events where entity_id=$1 and to_state='qualified'",
        [supplier.id],
      )
    ).rows;
    expect(events).toHaveLength(1);
    expect(events[0].actor_id).toBe(ids.engineer);
    expect(events[0].evidence_reference).toContain("SYNTHETIC");
  });
  it("requires a new review when capability changes", async () => {
    await expect(
      asUser(
        db,
        ids.engineer,
        "update public.suppliers set processes='Changed process' where id=$1",
        [supplier.id],
      ),
    ).rejects.toThrow(/new review/);
  });
  it("prevents forging the reviewer", async () => {
    const r = (
      await asUser<Supplier>(
        db,
        ids.operator,
        "update public.suppliers set qualified_by=$2 where id=$1 returning *",
        [supplier.id, ids.operator],
      )
    ).rows[0];
    expect(r.qualified_by).toBe(ids.engineer);
  });
  it("prevents stale writes using the version predicate", async () => {
    const r = (
      await asUser<Supplier>(
        db,
        ids.engineer,
        "select * from public.suppliers where id=$1",
        [supplier.id],
      )
    ).rows[0];
    await asUser(
      db,
      ids.engineer,
      "update public.suppliers set source_reference='TEST ONLY updated source' where id=$1 and version=$2",
      [supplier.id, r.version],
    );
    expect(
      (
        await asUser(
          db,
          ids.engineer,
          "update public.suppliers set source_reference='STALE' where id=$1 and version=$2 returning id",
          [supplier.id, r.version],
        )
      ).rows,
    ).toHaveLength(0);
  });
});
describe("RFQ review", () => {
  it("starts draft and pending", () => {
    expect(rfq.status).toBe("draft");
    expect(rfq.engineering_state).toBe("pending");
  });
  it("blocks unreviewed sourcing and production statuses", async () => {
    await asUser(
      db,
      ids.operator,
      "update public.rfqs set status='reviewing' where id=$1",
      [rfq.id],
    );
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.rfqs set status='sourcing' where id=$1",
        [rfq.id],
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asUser(
        db,
        ids.engineer,
        "update public.rfqs set status='production' where id=$1",
        [rfq.id],
      ),
    ).rejects.toThrow();
  });
  it("requires an engineering role", async () => {
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.rfqs set engineering_state='approved',engineering_note='SYNTHETIC' where id=$1",
        [rfq.id],
      ),
    ).rejects.toThrow(/Engineering role/);
  });
  it("requires a note and records engineer approval", async () => {
    await expect(
      asUser(
        db,
        ids.engineer,
        "update public.rfqs set engineering_state='approved' where id=$1",
        [rfq.id],
      ),
    ).rejects.toThrow(/note required/);
    const r = (
      await asUser<Rfq>(
        db,
        ids.engineer,
        "update public.rfqs set engineering_state='approved',engineering_note='SYNTHETIC TEST ONLY' where id=$1 returning *",
        [rfq.id],
      )
    ).rows[0];
    expect(r.reviewed_by).toBe(ids.engineer);
    await asUser(
      db,
      ids.operator,
      "update public.rfqs set status='sourcing' where id=$1",
      [rfq.id],
    );
  });
  it("invalidates approval after requirements change", async () => {
    const r = (
      await asUser<Rfq>(
        db,
        ids.operator,
        "update public.rfqs set quantity=20,amendment_note='TEST ONLY quantity correction' where id=$1 returning *",
        [rfq.id],
      )
    ).rows[0];
    expect(r.engineering_state).toBe("pending");
    expect(r.reviewed_by).toBeNull();
    expect(r.status).toBe("reviewing");
  });
  it("rejects invalid quantities in the database", async () => {
    await expect(
      asUser(
        db,
        ids.operator,
        "update public.rfqs set quantity=0,amendment_note='TEST ONLY invalid correction' where id=$1",
        [rfq.id],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});
