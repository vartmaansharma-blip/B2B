"use server";
import { requireStaff } from "@/features/auth/server";
import { searchTerm } from "@/lib/pagination";
export type SearchResult = {
  id: string;
  kind: "supplier" | "rfq";
  title: string;
  subtitle: string;
  href: string;
};
export async function searchWorkspace(
  input: string,
): Promise<{ results: SearchResult[]; error?: string }> {
  const { client, organizationId } = await requireStaff();
  const query = searchTerm(typeof input === "string" ? input : "");
  if (query.length < 2) return { results: [] };
  const [suppliers, rfqs] = await Promise.all([
    client
      .from("suppliers")
      .select("id,name,city")
      .eq("organization_id", organizationId)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(6),
    client
      .from("rfqs")
      .select("id,title,status")
      .eq("organization_id", organizationId)
      .ilike("title", `%${query}%`)
      .order("title")
      .limit(6),
  ]);
  if (suppliers.error || rfqs.error)
    return { results: [], error: "Search is unavailable. Please try again." };
  return {
    results: [
      ...(suppliers.data ?? []).map((s) => ({
        id: s.id,
        kind: "supplier" as const,
        title: s.name,
        subtitle: s.city,
        href: `/suppliers/${s.id}`,
      })),
      ...(rfqs.data ?? []).map((r) => ({
        id: r.id,
        kind: "rfq" as const,
        title: r.title,
        subtitle: r.status,
        href: `/rfqs/${r.id}`,
      })),
    ],
  };
}
