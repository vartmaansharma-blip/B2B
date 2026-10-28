import { beforeEach, it, expect, vi } from "vitest";
const { requireStaff, client, chain, revalidatePath } = vi.hoisted(() => {
  const chain = {
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const client = { from: vi.fn() };
  return { requireStaff: vi.fn(), client, chain, revalidatePath: vi.fn() };
});
vi.mock("@/features/auth/server", () => ({ requireStaff }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
import { createSupplier, reviewSupplier } from "@/features/suppliers/actions";
import { addCapability } from "@/features/suppliers/capability-actions";
import {
  proposeSupplier,
  reviewShortlist,
} from "@/features/rfqs/shortlist-actions";
import {
  createCustomer,
  createRfq,
  reviewRfq,
  amendRfq,
} from "@/features/rfqs/actions";
const org = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
function form(values: Record<string, string>) {
  const f = new FormData();
  Object.entries(values).forEach(([k, v]) => f.set(k, v));
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
  client.from.mockReturnValue(chain);
  for (const key of ["insert", "update", "eq"] as const)
    chain[key].mockReturnValue(chain);
  requireStaff.mockResolvedValue({
    client,
    organizationId: org,
    role: "operator",
  });
  chain.select.mockResolvedValue({ data: [{ id }], error: null });
});
const proposal = {
  rfq_id: id,
  supplier_id: id,
  capability_id: id,
  requirements_version: "2",
  supplier_version: "3",
  review_note: "SYNTHETIC proposal",
};
it("derives shortlist organization from staff and ignores injected approval fields", async () => {
  chain.insert.mockResolvedValueOnce({ error: null });
  expect(
    (
      await proposeSupplier(
        {},
        form({
          ...proposal,
          organization_id: "FORGED",
          state: "accepted",
          reviewed_by: "FORGED",
          requirements_snapshot: "{}",
        }),
      )
    ).success,
  ).toBeTruthy();
  expect(chain.insert).toHaveBeenCalledWith({
    ...proposal,
    requirements_version: 2,
    supplier_version: 3,
    organization_id: org,
  });
});
it("rejects operator shortlist acceptance before querying", async () => {
  expect(
    (
      await reviewShortlist(
        {},
        form({
          ...proposal,
          id,
          version: "1",
          state: "accepted",
          fit_evidence_reference: "SYNTHETIC",
          rfq_reviewed_at: "2026-10-28T00:00:00Z",
        }),
      )
    ).error,
  ).toContain("engineer");
  expect(client.from).not.toHaveBeenCalled();
});
it("scopes shortlist reviews by organization, RFQ and loaded entry version", async () => {
  expect(
    (
      await reviewShortlist(
        {},
        form({
          ...proposal,
          id,
          version: "4",
          state: "proposed",
          fit_evidence_reference: "",
          rfq_reviewed_at: "",
        }),
      )
    ).success,
  ).toBeTruthy();
  expect(chain.eq).toHaveBeenCalledWith("organization_id", org);
  expect(chain.eq).toHaveBeenCalledWith("rfq_id", id);
  expect(chain.eq).toHaveBeenCalledWith("version", 4);
  expect(chain.update).toHaveBeenCalledWith({
    state: "proposed",
    capability_id: id,
    requirements_version: 2,
    supplier_version: 3,
    review_note: "SYNTHETIC proposal",
  });
});
it("reports a stale shortlist instead of success or leaking database errors", async () => {
  chain.select.mockResolvedValue({ data: [], error: null });
  const values = form({
    ...proposal,
    id,
    version: "4",
    state: "removed",
    fit_evidence_reference: "",
    rfq_reviewed_at: "",
  });
  expect((await reviewShortlist({}, values)).error).toContain("Refresh");
  expect(revalidatePath).not.toHaveBeenCalled();
  chain.select.mockResolvedValue({
    data: null,
    error: { message: "PRIVATE DETAIL" },
  });
  expect((await reviewShortlist({}, values)).error).not.toContain(
    "PRIVATE DETAIL",
  );
});
it("authenticates capability and shortlist reads independently", async () => {
  requireStaff.mockRejectedValue(new Error("Access denied"));
  const { listCapabilities } =
    await import("@/features/suppliers/capability-queries");
  const { getShortlist } = await import("@/features/rfqs/shortlist-queries");
  await expect(listCapabilities(id, 1)).rejects.toThrow("Access denied");
  await expect(getShortlist(id, 1, 1, "", "")).rejects.toThrow("Access denied");
  expect(client.from).not.toHaveBeenCalled();
});
it.each([
  createSupplier,
  reviewSupplier,
  createCustomer,
  createRfq,
  reviewRfq,
  amendRfq,
  addCapability,
  proposeSupplier,
  reviewShortlist,
])(
  "authenticates every mutation independently of the layout",
  async (action) => {
    requireStaff.mockRejectedValue(new Error("Access denied"));
    await expect(action({}, new FormData())).rejects.toThrow("Access denied");
    expect(client.from).not.toHaveBeenCalled();
  },
);
it("rejects invalid supplier input before querying", async () => {
  expect((await createSupplier({}, new FormData())).error).toBeTruthy();
  expect(client.from).not.toHaveBeenCalled();
});
it("blocks operator qualification before querying", async () => {
  const r = await reviewSupplier(
    {},
    form({
      id,
      version: "1",
      qualification_state: "qualified",
      qualification_scope: "SYNTHETIC",
      evidence_reference: "SYNTHETIC",
      review_note: "SYNTHETIC",
      qualification_expires_on: "2026-12-01",
    }),
  );
  expect(r.error).toContain("engineer");
  expect(client.from).not.toHaveBeenCalled();
});
it("binds organization and version when reviewing", async () => {
  await reviewSupplier(
    {},
    form({
      id,
      version: "4",
      qualification_state: "contact_review",
      qualification_scope: "",
      evidence_reference: "",
      review_note: "TEST ONLY",
      qualification_expires_on: "",
    }),
  );
  expect(chain.eq).toHaveBeenCalledWith("organization_id", org);
  expect(chain.eq).toHaveBeenCalledWith("version", 4);
  expect(chain.update).toHaveBeenCalledWith(
    expect.not.objectContaining({ organization_id: expect.anything() }),
  );
});
it("reports a stale review rather than claiming success", async () => {
  chain.select.mockResolvedValue({ data: [], error: null });
  const r = await reviewSupplier(
    {},
    form({
      id,
      version: "4",
      qualification_state: "contact_review",
      qualification_scope: "",
      evidence_reference: "",
      review_note: "TEST ONLY",
      qualification_expires_on: "",
    }),
  );
  expect(r.error).toContain("Refresh");
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("strips engineering fields from operator RFQ updates", async () => {
  await reviewRfq(
    {},
    form({
      id,
      version: "1",
      status: "reviewing",
      engineering_state: "approved",
      engineering_note: "Injected",
    }),
  );
  expect(chain.update).toHaveBeenCalledWith({ status: "reviewing" });
});
it("does not expose database error details", async () => {
  chain.select.mockResolvedValue({
    data: null,
    error: { message: "PRIVATE DATABASE DETAIL" },
  });
  const r = await reviewRfq(
    {},
    form({
      id,
      version: "1",
      status: "reviewing",
      engineering_state: "pending",
      engineering_note: "",
    }),
  );
  expect(r.error).toBeTruthy();
  expect(r.error).not.toContain("PRIVATE DATABASE DETAIL");
});

it("authenticates quick find before returning any results", async () => {
  const { searchWorkspace } = await import("@/features/search/actions");
  requireStaff.mockRejectedValue(new Error("Access denied"));
  await expect(searchWorkspace("TEST ONLY")).rejects.toThrow("Access denied");
  expect(client.from).not.toHaveBeenCalled();
});
it("scopes and bounds quick find at the database query", async () => {
  const { searchWorkspace } = await import("@/features/search/actions");
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  for (const name of ["select", "eq", "ilike", "order"] as const)
    query[name].mockReturnValue(query);
  client.from.mockReturnValue(query);
  expect((await searchWorkspace("TEST%_")).results).toEqual([]);
  expect(query.eq).toHaveBeenCalledWith("organization_id", org);
  expect(query.limit).toHaveBeenCalledWith(6);
  expect(query.ilike).toHaveBeenCalledWith("name", "%TEST%");
});

const amendment = {
  id,
  version: "4",
  title: "TEST ONLY RFQ",
  part_description: "SYNTHETIC",
  drawing_reference: "TEST ONLY DWG",
  drawing_revision: "B",
  quantity: "20",
  unit: "pieces",
  target_date: "",
  amendment_note: "TEST ONLY revision correction",
};
function amendmentRead(data: unknown) {
  chain.select.mockReturnValueOnce(chain);
  chain.maybeSingle.mockResolvedValue({ data, error: null });
}
it("requires a reason before reading or writing an amendment", async () => {
  expect(
    (await amendRfq({}, form({ ...amendment, amendment_note: " " }))).error,
  ).toBeTruthy();
  expect(client.from).not.toHaveBeenCalled();
});
it("scopes amendments and ignores injected approval and customer fields", async () => {
  amendmentRead({ title: "TEST ONLY old" });
  expect(
    (
      await amendRfq(
        {},
        form({
          ...amendment,
          organization_id: "injected",
          customer_id: "injected",
          engineering_state: "approved",
        }),
      )
    ).success,
  ).toBeTruthy();
  expect(chain.eq).toHaveBeenCalledWith("organization_id", org);
  expect(chain.eq).toHaveBeenCalledWith("version", 4);
  expect(chain.update).toHaveBeenCalledWith({
    title: amendment.title,
    part_description: amendment.part_description,
    drawing_reference: amendment.drawing_reference,
    drawing_revision: "B",
    quantity: 20,
    unit: "pieces",
    target_date: null,
    amendment_note: amendment.amendment_note,
  });
});
it("rejects a no-op amendment without a write", async () => {
  amendmentRead({ ...amendment, quantity: 20, target_date: null });
  expect((await amendRfq({}, form(amendment))).error).toContain(
    "at least one requirement",
  );
  expect(chain.update).not.toHaveBeenCalled();
});
it("rejects a stale amendment before writing", async () => {
  amendmentRead(null);
  expect((await amendRfq({}, form(amendment))).error).toContain("Refresh");
  expect(chain.update).not.toHaveBeenCalled();
});
it("handles an edit racing after the amendment read", async () => {
  amendmentRead({ title: "TEST ONLY old" });
  chain.select.mockResolvedValue({ data: [], error: null });
  expect((await amendRfq({}, form(amendment))).error).toContain("Refresh");
  expect(revalidatePath).not.toHaveBeenCalled();
});
