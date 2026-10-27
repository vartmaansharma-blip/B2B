import "server-only";
import { requireStaff } from "@/features/auth/server";
import { pageRange } from "@/lib/pagination";
import { qualifications } from "./model";
export async function listSuppliers(page: number, q: string, state: string) {
  const { client, organizationId } = await requireStaff();
  let request = client
    .from("suppliers")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (q) request = request.ilike("name", `%${q}%`);
  const filter = qualifications.find((s) => s === state);
  if (filter) request = request.eq("qualification_state", filter);
  const { data, error, count } = await request;
  if (error) throw new Error("Supplier registry unavailable.");
  return { suppliers: data ?? [], count: count ?? 0 };
}
export async function getSupplier(id: string) {
  const { client, organizationId, role } = await requireStaff();
  const [record, history] = await Promise.all([
    client
      .from("suppliers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle(),
    client
      .from("review_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("entity_type", "supplier")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (record.error || history.error)
    throw new Error("Supplier record unavailable.");
  return { supplier: record.data, events: history.data ?? [], role };
}
