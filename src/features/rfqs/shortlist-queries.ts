import "server-only";
import { requireStaff } from "@/features/auth/server";
import { pageRange } from "@/lib/pagination";
export async function getShortlist(
  rfqId: string,
  page: number,
  candidatePage: number,
  process: string,
  material: string,
) {
  const { client, organizationId } = await requireStaff();
  let candidatesQuery = client
    .from("supplier_capabilities")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(candidatePage));
  if (process)
    candidatesQuery = candidatesQuery.ilike("process", `%${process}%`);
  if (material)
    candidatesQuery = candidatesQuery.ilike("material", `%${material}%`);
  const [entries, candidates, history] = await Promise.all([
    client
      .from("rfq_shortlist_status")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("rfq_id", rfqId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(...pageRange(page)),
    candidatesQuery,
    client
      .from("shortlist_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("rfq_id", rfqId)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(50),
  ]);
  if (entries.error || candidates.error || history.error)
    throw new Error(
      "Shortlist unavailable. Verify database migration before using this feature.",
    );
  const supplierIds = [
    ...new Set([
      ...(entries.data ?? []).map((e) => e.supplier_id),
      ...(candidates.data ?? []).map((c) => c.supplier_id),
    ]),
  ];
  const suppliers = supplierIds.length
    ? await client
        .from("suppliers")
        .select("*")
        .eq("organization_id", organizationId)
        .in("id", supplierIds)
    : { data: [], error: null };
  if (suppliers.error) throw new Error("Supplier records unavailable.");
  return {
    entries: entries.data ?? [],
    count: entries.count ?? 0,
    candidates: candidates.data ?? [],
    candidateCount: candidates.count ?? 0,
    suppliers: suppliers.data ?? [],
    events: history.data ?? [],
  };
}
