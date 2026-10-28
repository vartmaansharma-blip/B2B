import "server-only";
import { requireStaff } from "@/features/auth/server";
import { pageRange } from "@/lib/pagination";
export async function listCapabilities(supplierId: string, page: number) {
  const { client, organizationId } = await requireStaff();
  const { data, error, count } = await client
    .from("supplier_capabilities")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error)
    throw new Error(
      "Capability register unavailable. Verify database migration before using this feature.",
    );
  return { capabilities: data ?? [], count: count ?? 0 };
}
