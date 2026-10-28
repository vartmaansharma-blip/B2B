import { beforeEach, it, expect, vi } from "vitest";
const { requireStaff, client, chain, revalidatePath } = vi.hoisted(() => {
  const chain = {
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
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
import { createCustomer, createRfq, reviewRfq } from "@/features/rfqs/actions";
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
it.each([createSupplier, reviewSupplier, createCustomer, createRfq, reviewRfq])(
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
