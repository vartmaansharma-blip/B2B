import { createHash } from "node:crypto";
import { expect } from "@playwright/test";
import type {
  Supplier,
  Rfq,
  RfqShortlist,
  SupplierCapability,
  ShortlistEvent,
} from "../../src/lib/types.ts";
import { denied, empty, type Hosted, type Session } from "./client.ts";
import { ensure, roles, type Actor } from "./safety.ts";
import { reviewBrowser } from "./browser.ts";
export type Step = (name: string, fn: () => Promise<void>) => Promise<void>;
const note = "SYNTHETIC TEST ONLY; no real engineering or supplier claim";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const byId = (id: string) => `id=eq.${id}`;
async function one<T>(h: Hosted, table: string, id: string): Promise<T> {
  const rows = await h.rows<T>("engineer", table, byId(id));
  ensure(rows.length === 1, "Expected one record");
  return rows[0];
}
async function events(h: Hosted, entry: string) {
  return h.rows<ShortlistEvent>(
    "engineer",
    "shortlist_events",
    `shortlist_id=eq.${entry}&order=created_at.asc,id.asc`,
  );
}
async function effective(h: Hosted, id: string, value: string) {
  const row = await one<RfqShortlist & { effective_state: string }>(
    h,
    "rfq_shortlist_status",
    id,
  );
  ensure(row.effective_state === value, "Incorrect live shortlist status");
}
async function qualify(h: Hosted, supplier: Supplier, expiry: string) {
  if (supplier.qualification_state !== "capability_review")
    supplier = await h.patch<Supplier>(
      "operator",
      "suppliers",
      supplier.id,
      { qualification_state: "capability_review", review_note: note },
      supplier.version,
    );
  return h.patch<Supplier>(
    "engineer",
    "suppliers",
    supplier.id,
    {
      qualification_state: "qualified",
      qualification_scope: note,
      evidence_reference: note,
      qualification_expires_on: expiry,
      review_note: note,
    },
    supplier.version,
  );
}
async function proposal(h: Hosted, s: Supplier, r: Rfq, c: SupplierCapability) {
  return h.insert<RfqShortlist>("operator", "rfq_shortlists", {
    organization_id: h.scope.organizations.a,
    rfq_id: r.id,
    supplier_id: s.id,
    capability_id: c.id,
    supplier_version: s.version,
    requirements_version: r.requirements_version,
    review_note: note,
  });
}
async function repropose(h: Hosted, e: RfqShortlist, s: Supplier, r: Rfq) {
  return h.patch<RfqShortlist>(
    "operator",
    "rfq_shortlists",
    e.id,
    {
      state: "proposed",
      supplier_version: s.version,
      requirements_version: r.requirements_version,
      review_note: note,
    },
    e.version,
  );
}
function acceptance(r: Rfq) {
  return {
    state: "accepted",
    review_note: note,
    fit_evidence_reference: note,
    rfq_reviewed_at: r.reviewed_at,
  };
}
export async function workflow(h: Hosted, step: Step, save: () => void) {
  ensure(
    !h.state.workflowStarted,
    "Workflow already attempted; retain evidence and prepare a new approved run",
  );
  const org = h.scope.organizations.a;
  const name = `TEST ONLY ${h.scope.run}`;
  let supplier!: Supplier,
    rfq!: Rfq,
    capability!: SupplierCapability,
    entry!: RfqShortlist;
  const browser = await reviewBrowser(h);
  try {
    const operator = await browser.page("operator");
    const engineer = await browser.page("engineer");
    await step("https-private-responses-cookies", async () => {
      await browser.privateResponse(operator, "/");
      await browser.cookies(operator);
    });
    await step("synthetic-intake-real-postgrest", async () => {
      // Mark immediately before business writes; preflight failures are safe to retry.
      h.state.workflowStarted = true;
      save();
      supplier = await h.insert<Supplier>("operator", "suppliers", {
        organization_id: org,
        name,
        city: "TEST ONLY City",
        region: "TEST ONLY Region",
        processes: note,
        materials: note,
        source_reference: note,
        observed_on: "2020-01-01",
      });
      const customer = await h.insert<{ id: string }>("operator", "customers", {
        organization_id: org,
        name,
        reference: note,
      });
      await h.insert("other", "customers", {
        organization_id: h.scope.organizations.b,
        name,
        reference: note,
      });
      rfq = await h.insert<Rfq>("operator", "rfqs", {
        organization_id: org,
        customer_id: customer.id,
        title: name,
        part_description: note,
        drawing_reference: "SYNTHETIC drawing",
        drawing_revision: "A",
        quantity: 10,
        unit: "TEST pieces",
      });
      rfq = await h.patch<Rfq>(
        "operator",
        "rfqs",
        rfq.id,
        { status: "reviewing" },
        rfq.version,
      );
    });
    await step(
      "operator-capability-and-proposal-through-review-ui",
      async () => {
        await browser.privateResponse(
          operator,
          `/suppliers/${supplier.id}/capabilities`,
        );
        await operator.getByLabel("Process", { exact: true }).fill(name);
        await operator
          .getByLabel("Material / grade", { exact: true })
          .fill("SYNTHETIC steel");
        for (const label of [
          "Reported tolerance and limitations",
          "Reported inspection methods",
          "Capability evidence reference",
        ])
          await operator.getByLabel(label).fill(note);
        await operator.getByLabel("Capability observed on").fill("2020-01-01");
        await operator
          .getByRole("button", { name: "Record reported capability" })
          .click();
        await expect(operator.getByRole("status")).toContainText(
          "does not qualify",
        );
        const capabilities = await h.rows<SupplierCapability>(
          "operator",
          "supplier_capabilities",
          `supplier_id=eq.${supplier.id}`,
        );
        ensure(
          capabilities.length === 1 &&
            capabilities[0].created_by === h.state.accounts.operator!.id,
          "Capability actor mismatch",
        );
        capability = capabilities[0];
        ensure(
          (await one<Supplier>(h, "suppliers", supplier.id))
            .qualification_state === "discovered",
          "Observation qualified supplier",
        );
        await browser.privateResponse(
          operator,
          `/rfqs/${rfq.id}/shortlist?process=${encodeURIComponent(name)}`,
        );
        const candidate = operator.getByRole("article", {
          name: `${name} capability`,
          exact: true,
        });
        await candidate.getByLabel("Proposal reason").fill(note);
        await candidate
          .getByRole("button", { name: "Propose supplier" })
          .click();
        await expect(
          operator
            .getByRole("article", { name, exact: true })
            .getByText("proposed", { exact: true }),
        ).toBeVisible();
        const entries = await h.rows<RfqShortlist>(
          "operator",
          "rfq_shortlists",
          `rfq_id=eq.${rfq.id}`,
        );
        ensure(
          entries.length === 1 &&
            entries[0].created_by === h.state.accounts.operator!.id,
          "Proposal actor mismatch",
        );
        entry = entries[0];
      },
    );
    await step(
      "operator-denied-engineering-and-required-evidence",
      async () => {
        for (const state of ["contact_review", "capability_review"])
          supplier = await h.patch<Supplier>(
            "operator",
            "suppliers",
            supplier.id,
            { qualification_state: state, review_note: note },
            supplier.version,
          );
        const expiry = new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .slice(0, 10);
        const q = {
          qualification_state: "qualified",
          qualification_scope: note,
          evidence_reference: note,
          qualification_expires_on: expiry,
          review_note: note,
        };
        denied(
          await h.api("operator", "suppliers", "PATCH", q, byId(supplier.id)),
        );
        denied(
          await h.api(
            "operator",
            "rfqs",
            "PATCH",
            { engineering_state: "approved", engineering_note: note },
            byId(rfq.id),
          ),
        );
        supplier = await h.patch<Supplier>(
          "engineer",
          "suppliers",
          supplier.id,
          q,
          supplier.version,
        );
        entry = await repropose(h, entry, supplier, rfq);
        denied(
          await h.api(
            "operator",
            "rfq_shortlists",
            "PATCH",
            acceptance(rfq),
            byId(entry.id),
          ),
        );
        denied(
          await h.api(
            "engineer",
            "rfq_shortlists",
            "PATCH",
            acceptance(rfq),
            byId(entry.id),
          ),
          ["23514"],
        );
        denied(
          await h.api(
            "engineer",
            "rfqs",
            "PATCH",
            { engineering_state: "approved", engineering_note: " " },
            byId(rfq.id),
          ),
          ["23514"],
        );
        rfq = await h.patch<Rfq>(
          "engineer",
          "rfqs",
          rfq.id,
          { engineering_state: "approved", engineering_note: note },
          rfq.version,
        );
        ensure(
          rfq.reviewed_by === h.state.accounts.engineer!.id,
          "RFQ reviewer mismatch",
        );
        denied(
          await h.api(
            "engineer",
            "rfq_shortlists",
            "PATCH",
            { ...acceptance(rfq), fit_evidence_reference: " " },
            byId(entry.id),
          ),
          ["23514"],
        );
      },
    );
    await step("engineer-acceptance-through-review-ui", async () => {
      await browser.privateResponse(engineer, `/rfqs/${rfq.id}/shortlist`);
      const article = engineer.getByRole("article", { name, exact: true });
      await article.getByLabel("Shortlist decision").selectOption("accepted");
      await article.getByLabel("Shortlist review reason").fill(note);
      await article.getByLabel("Part-specific fit evidence").fill(note);
      await article
        .getByRole("button", { name: "Save shortlist review" })
        .click();
      await expect(
        article.getByText("accepted", { exact: true }),
      ).toBeVisible();
      entry = await one(h, "rfq_shortlists", entry.id);
      ensure(
        entry.reviewed_by === h.state.accounts.engineer!.id &&
          entry.fit_evidence_reference === note,
        "Fit evidence missing",
      );
      await effective(h, entry.id, "accepted");
    });
    await step(
      "engineer-rejection-and-fresh-evidence-after-reproposal",
      async () => {
        const before = await events(h, entry.id);
        const rejection = `${note}; engineering fit rejected, remove from shortlist`;
        const article = engineer.getByRole("article", { name, exact: true });
        await article.getByLabel("Shortlist decision").selectOption("removed");
        await article.getByLabel("Shortlist review reason").fill(rejection);
        await article
          .getByRole("button", { name: "Save shortlist review" })
          .click();
        await expect(
          article.getByText("removed", { exact: true }),
        ).toBeVisible();
        entry = await one(h, "rfq_shortlists", entry.id);
        await effective(h, entry.id, "removed");
        const after = await events(h, entry.id);
        ensure(
          hash(
            after.filter((event) => before.some((old) => old.id === event.id)),
          ) === hash(before),
          "Rejection changed earlier evidence",
        );
        const decision = after.filter(
          (event) => !before.some((old) => old.id === event.id),
        );
        ensure(
          decision.length === 1 &&
            decision[0].to_state === "removed" &&
            decision[0].actor_id === h.state.accounts.engineer!.id &&
            decision[0].note === rejection,
          "Engineering rejection audit missing",
        );
        denied(
          await h.api(
            "engineer",
            "rfq_shortlists",
            "PATCH",
            acceptance(rfq),
            byId(entry.id),
          ),
          ["23514"],
        );
        entry = await repropose(h, entry, supplier, rfq);
        ensure(
          entry.reviewed_by === null && entry.fit_evidence_reference === null,
          "Reproposal retained acceptance authority",
        );
        denied(
          await h.api(
            "engineer",
            "rfq_shortlists",
            "PATCH",
            { ...acceptance(rfq), fit_evidence_reference: " " },
            byId(entry.id),
          ),
          ["23514"],
        );
        entry = await h.patch(
          "engineer",
          "rfq_shortlists",
          entry.id,
          acceptance(rfq),
          entry.version,
        );
        await effective(h, entry.id, "accepted");
      },
    );
    const originalEvents = await events(h, entry.id);
    const stalePage = await engineer.context().newPage();
    await stalePage.goto(`${h.scope.origin}/rfqs/${rfq.id}/shortlist`);
    await step("drawing-amendment-and-stale-ui-rejection", async () => {
      const prior = rfq;
      rfq = await h.patch<Rfq>(
        "operator",
        "rfqs",
        rfq.id,
        { drawing_revision: "B", amendment_note: note },
        rfq.version,
      );
      ensure(
        rfq.engineering_state === "pending" &&
          rfq.reviewed_by === null &&
          rfq.requirements_version === prior.requirements_version + 1,
        "Amendment retained approval",
      );
      await effective(h, entry.id, "needs_review");
      const article = stalePage.getByRole("article", { name, exact: true });
      await article.getByLabel("Shortlist review reason").fill(note);
      await article
        .getByRole("button", { name: "Save shortlist review" })
        .click();
      await expect(article.getByRole("alert")).toContainText("Refresh");
      empty(
        await h.api(
          "operator",
          "rfqs",
          "PATCH",
          { quantity: 20, amendment_note: note },
          `${byId(rfq.id)}&version=eq.${prior.version}`,
        ),
      );
      denied(
        await h.api(
          "engineer",
          "rfq_shortlists",
          "PATCH",
          acceptance(prior),
          byId(entry.id),
        ),
        ["23514"],
      );
      entry = await repropose(h, entry, supplier, rfq);
      denied(
        await h.api(
          "engineer",
          "rfq_shortlists",
          "PATCH",
          acceptance(rfq),
          byId(entry.id),
        ),
        ["23514"],
      );
      rfq = await h.patch<Rfq>(
        "engineer",
        "rfqs",
        rfq.id,
        { engineering_state: "approved", engineering_note: note },
        rfq.version,
      );
      entry = await h.patch(
        "engineer",
        "rfq_shortlists",
        entry.id,
        acceptance(rfq),
        entry.version,
      );
      await effective(h, entry.id, "accepted");
    });
    await stalePage.close();
    await step(
      "suspension-requalification-and-reapproval-invalidation",
      async () => {
        supplier = await h.patch<Supplier>(
          "operator",
          "suppliers",
          supplier.id,
          { qualification_state: "suspended", review_note: note },
          supplier.version,
        );
        await effective(h, entry.id, "needs_review");
        entry = await repropose(h, entry, supplier, rfq);
        denied(
          await h.api(
            "engineer",
            "rfq_shortlists",
            "PATCH",
            acceptance(rfq),
            byId(entry.id),
          ),
          ["23514"],
        );
        supplier = await qualify(
          h,
          supplier,
          new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        );
        entry = await repropose(h, entry, supplier, rfq);
        entry = await h.patch(
          "engineer",
          "rfq_shortlists",
          entry.id,
          acceptance(rfq),
          entry.version,
        );
        const oldDecision = rfq;
        rfq = await h.patch<Rfq>(
          "engineer",
          "rfqs",
          rfq.id,
          { engineering_note: `${note}; reapproval` },
          rfq.version,
        );
        await effective(h, entry.id, "needs_review");
        entry = await repropose(h, entry, supplier, rfq);
        denied(
          await h.api(
            "engineer",
            "rfq_shortlists",
            "PATCH",
            acceptance(oldDecision),
            byId(entry.id),
          ),
          ["23514"],
        );
        entry = await h.patch(
          "engineer",
          "rfq_shortlists",
          entry.id,
          acceptance(rfq),
          entry.version,
        );
        await effective(h, entry.id, "accepted");
        empty(
          await h.api(
            "operator",
            "rfq_shortlists",
            "PATCH",
            { state: "removed", review_note: note },
            `${byId(entry.id)}&version=eq.${entry.version - 1}`,
          ),
        );
      },
    );
    await step("immutable-history-and-observations-real-api", async () => {
      const current = await events(h, entry.id);
      ensure(
        hash(
          current.filter((e) => originalEvents.some((old) => old.id === e.id)),
        ) === hash(originalEvents),
        "Historical snapshot changed",
      );
      for (const [table, id, patch] of [
        ["supplier_capabilities", capability.id, { process: note }],
        ["shortlist_events", current[0].id, { note: "SYNTHETIC tamper" }],
        [
          "review_events",
          (
            await h.rows<{ id: string }>(
              "engineer",
              "review_events",
              `entity_id=eq.${rfq.id}`,
            )
          )[0].id,
          { note: "SYNTHETIC tamper" },
        ],
      ] as const) {
        denied(await h.api("engineer", table, "PATCH", patch, byId(id)));
        denied(await h.api("engineer", table, "DELETE", undefined, byId(id)));
      }
      denied(
        await h.api("engineer", "shortlist_events", "POST", {
          organization_id: org,
          rfq_id: rfq.id,
          shortlist_id: entry.id,
          to_state: "accepted",
          note,
          snapshot: {},
          actor_id: h.state.accounts.engineer!.id,
        }),
      );
      denied(
        await h.api("engineer", "review_events", "POST", {
          organization_id: org,
          entity_type: "rfq",
          entity_id: rfq.id,
          to_state: "approved",
          note,
          actor_id: h.state.accounts.engineer!.id,
        }),
      );
      denied(
        await h.api(
          "engineer",
          "rfq_shortlists",
          "DELETE",
          undefined,
          byId(entry.id),
        ),
      );
    });
    await step(
      "nonstaff-anonymous-and-cross-organization-api-denial",
      async () => {
        const tables = [
          "organizations",
          "staff_memberships",
          "suppliers",
          "customers",
          "rfqs",
          "supplier_capabilities",
          "rfq_shortlists",
          "shortlist_events",
          "review_events",
          "rfq_shortlist_status",
        ];
        for (const table of tables) {
          const query = `${table === "organizations" ? "id" : "organization_id"}=eq.${org}`;
          for (const actor of ["nonstaff", "other"] as const)
            empty(await h.api(actor, table, "GET", undefined, query));
          denied(await h.api(null, table, "GET", undefined, query));
        }
        for (const actor of ["nonstaff", "other"] as const) {
          empty(
            await h.api(
              actor,
              "suppliers",
              "PATCH",
              { source_reference: note },
              byId(supplier.id),
            ),
          );
          empty(
            await h.api(
              actor,
              "rfqs",
              "PATCH",
              { status: "closed" },
              byId(rfq.id),
            ),
          );
          empty(
            await h.api(
              actor,
              "rfq_shortlists",
              "PATCH",
              { state: "removed", review_note: note },
              byId(entry.id),
            ),
          );
          denied(
            await h.api(actor, "customers", "POST", {
              organization_id: org,
              name: `TEST ONLY forbidden ${h.scope.run}`,
              reference: note,
            }),
          );
          denied(
            await h.api(actor, "supplier_capabilities", "POST", {
              organization_id: org,
              supplier_id: supplier.id,
              process: note,
              material: note,
              tolerance_notes: note,
              inspection_notes: note,
              evidence_reference: note,
              observed_on: "2020-01-01",
            }),
          );
          denied(
            await h.api(actor, "rfq_shortlists", "POST", {
              organization_id: org,
              rfq_id: rfq.id,
              supplier_id: supplier.id,
              capability_id: capability.id,
              requirements_version: rfq.requirements_version,
              supplier_version: supplier.version,
              review_note: note,
            }),
            ["23514", "42501"],
          );
        }
        denied(
          await h.api("other", "supplier_capabilities", "POST", {
            organization_id: h.scope.organizations.b,
            supplier_id: supplier.id,
            process: note,
            material: note,
            tolerance_notes: note,
            inspection_notes: note,
            evidence_reference: note,
            observed_on: "2020-01-01",
          }),
          ["23503"],
        );
        denied(
          await h.api(
            "operator",
            "staff_memberships",
            "PATCH",
            { role: "admin" },
            `user_id=eq.${h.state.accounts.operator!.id}`,
          ),
        );
        const privateProfile = await h.request(
          "/rest/v1/suppliers",
          h.sessions.operator.access_token,
          "GET",
          undefined,
          false,
          { "Accept-Profile": "private" },
        );
        ensure(
          privateProfile.status === 406 && privateProfile.code === "PGRST106",
          "Private schema exposed",
        );
        await browser.page("nonstaff");
        const anonymous = await operator.context().browser()!.newContext();
        try {
          const r = await anonymous.request.get(h.scope.origin, {
            maxRedirects: 0,
          });
          ensure(
            [302, 401, 403].includes(r.status()),
            "Review protection absent",
          );
        } finally {
          await anonymous.close();
        }
      },
    );
    await step("real-auth-and-proxy-session-refresh", async () => {
      const previous = h.sessions.operator;
      const response = await h.request(
        "/auth/v1/token?grant_type=refresh_token",
        undefined,
        "POST",
        { refresh_token: previous.refresh_token },
      );
      ensure(response.status === 200, "Auth refresh rejected");
      const next = response.data as Session;
      ensure(
        next.user.id === previous.user.id &&
          next.access_token &&
          next.refresh_token,
        "Refreshed identity mismatch",
      );
      h.sessions.operator = next;
      const user = await h.request("/auth/v1/user", next.access_token);
      ensure(
        user.status === 200 &&
          (user.data as { id: string }).id === next.user.id,
        "Refreshed token rejected",
      );
      await browser.refresh(operator);
    });
    await step("membership-revocation-existing-jwt-and-browser", async () => {
      await h.membership("operator", false);
      try {
        empty(
          await h.api(
            "operator",
            "suppliers",
            "GET",
            undefined,
            byId(supplier.id),
          ),
        );
        empty(
          await h.api(
            "operator",
            "rfq_shortlists",
            "PATCH",
            { state: "removed", review_note: note },
            byId(entry.id),
          ),
        );
        denied(
          await h.api("operator", "customers", "POST", {
            organization_id: org,
            name: `TEST ONLY revoked ${h.scope.run}`,
            reference: note,
          }),
        );
        await operator.goto(`${h.scope.origin}/rfqs/${rfq.id}/shortlist`);
        await expect(operator).toHaveURL(`${h.scope.origin}/access-denied`);
      } finally {
        await h.membership("operator", true);
      }
    });
    await step("prepare-natural-expiry-checkpoint", async () => {
      // PostgreSQL staging uses UTC (separately verified by read-only catalog audit).
      const tomorrow = new Date(Date.now() + 86400000)
        .toISOString()
        .slice(0, 10);
      let s = await h.insert<Supplier>("operator", "suppliers", {
        organization_id: org,
        name: `${name} expiry`,
        city: "TEST ONLY City",
        region: "TEST ONLY Region",
        processes: note,
        materials: note,
        source_reference: note,
        observed_on: "2020-01-01",
      });
      s = await h.patch<Supplier>(
        "operator",
        "suppliers",
        s.id,
        { qualification_state: "contact_review", review_note: note },
        s.version,
      );
      s = await qualify(h, s, tomorrow);
      const c = await h.insert<SupplierCapability>(
        "operator",
        "supplier_capabilities",
        {
          organization_id: org,
          supplier_id: s.id,
          process: note,
          material: note,
          tolerance_notes: note,
          inspection_notes: note,
          evidence_reference: note,
          observed_on: "2020-01-01",
        },
      );
      let e = await proposal(h, s, rfq, c);
      e = await h.patch(
        "engineer",
        "rfq_shortlists",
        e.id,
        acceptance(rfq),
        e.version,
      );
      await effective(h, e.id, "accepted");
      h.state.expiry = {
        supplier: s.id,
        entry: e.id,
        rfq: rfq.id,
        date: tomorrow,
        snapshotHash: hash(await events(h, e.id)),
      };
      save();
    });
    await step("browser-signout", async () => {
      await engineer
        .getByRole("button", { name: "Sign out", exact: true })
        .click();
      await expect(engineer).toHaveURL(`${h.scope.origin}/login`);
      ensure(
        !(await engineer.context().cookies(h.scope.origin)).some((c) =>
          c.name.startsWith(`sb-${h.scope.project}-auth-token`),
        ),
        "Signout retained session cookie",
      );
    });
  } finally {
    await browser.close();
  }
}
export async function expiry(h: Hosted, step: Step, save: () => void) {
  const checkpoint = h.state.expiry;
  ensure(checkpoint && !h.state.expiryComplete, "Expiry checkpoint required");
  ensure(
    new Date().toISOString().slice(0, 10) >= checkpoint.date,
    "Expiry not reached; rerun after recorded UTC date",
  );
  await step("natural-expiry-live-status-and-api-denial", async () => {
    let e = await one<RfqShortlist>(h, "rfq_shortlists", checkpoint.entry);
    const s = await one<Supplier>(h, "suppliers", checkpoint.supplier);
    const r = await one<Rfq>(h, "rfqs", checkpoint.rfq);
    ensure(
      e.state === "accepted" &&
        s.qualification_state === "qualified" &&
        s.qualification_expires_on === checkpoint.date,
      "Expiry fixture changed",
    );
    ensure(
      hash(await events(h, e.id)) === checkpoint.snapshotHash,
      "Expiry history changed",
    );
    await effective(h, e.id, "needs_review");
    e = await repropose(h, e, s, r);
    denied(
      await h.api(
        "engineer",
        "rfq_shortlists",
        "PATCH",
        acceptance(r),
        byId(e.id),
      ),
      ["23514"],
    );
    h.state.expiryComplete = true;
    save();
  });
}
export async function signoutAll(h: Hosted) {
  for (const actor of roles) {
    const token = h.sessions[actor]?.access_token;
    if (token) {
      const r = await h.request("/auth/v1/logout?scope=global", token, "POST");
      ensure([200, 204].includes(r.status), "Auth session signout failed");
    }
  }
}
export type { Actor };
