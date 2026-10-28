import "server-only";
import { requireStaff } from "@/features/auth/server";
import { pageRange } from "@/lib/pagination";
import { rfqStatuses } from "./model";
export async function listRfqs(page: number, q: string, state: string) {
  const { client, organizationId } = await requireStaff();
  let request = client
    .from("rfqs")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (q) request = request.ilike("title", `%${q}%`);
  const status = rfqStatuses.find((s) => s === state);
  if (status) request = request.eq("status", status);
  const { data, error, count } = await request;
  if (error) throw new Error("RFQ register unavailable.");
  return { rfqs: data ?? [], count: count ?? 0 };
}
export async function getRfq(id: string) {
  const { client, organizationId, role } = await requireStaff();
  const [record, history] = await Promise.all([
    client
      .from("rfqs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle(),
    client
      .from("review_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("entity_type", "rfq")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (record.error || history.error) throw new Error("RFQ record unavailable.");
  let customerName = "Customer unavailable";
  if (record.data) {
    const customer = await client
      .from("customers")
      .select("name")
      .eq("organization_id", organizationId)
      .eq("id", record.data.customer_id)
      .single();
    if (customer.error) throw new Error("Customer unavailable.");
    customerName = customer.data.name;
  }
  return { rfq: record.data, events: history.data ?? [], role, customerName };
}
export async function getCustomer(id: string) {
  const { client, organizationId } = await requireStaff();
  const { data, error } = await client
    .from("customers")
    .select("id,name")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Customer unavailable.");
  return data;
}
export async function listCustomers(page: number, q: string) {
  const { client, organizationId } = await requireStaff();
  let request = client
    .from("customers")
    .select("id,name,reference", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("name")
    .order("id")
    .range(...pageRange(page));
  if (q) request = request.ilike("name", `%${q}%`);
  const { data, error, count } = await request;
  if (error) throw new Error("Customer registry unavailable.");
  return { customers: data ?? [], count: count ?? 0 };
}
