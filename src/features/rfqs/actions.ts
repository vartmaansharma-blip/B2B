"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/auth/server";
import { fields, saveError, type ActionState } from "@/lib/forms";
import { customerSchema, rfqSchema, rfqReviewSchema } from "./model";
export async function createCustomer(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId } = await requireStaff();
  const input = customerSchema.safeParse(fields(form));
  if (!input.success)
    return { error: "Enter the customer business name and intake reference." };
  const { data, error } = await client
    .from("customers")
    .insert({ ...input.data, organization_id: organizationId })
    .select("id")
    .single();
  if (error)
    return {
      error:
        error.code === "23505"
          ? "This customer exists. Select them from the customer registry."
          : saveError,
    };
  revalidatePath("/rfqs/customers");
  redirect(`/rfqs/new?customer=${data.id}`);
}
export async function createRfq(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId } = await requireStaff();
  const input = rfqSchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Complete the required fields and use a positive whole-number quantity (up to one billion).",
    };
  const { data, error } = await client
    .from("rfqs")
    .insert({ ...input.data, organization_id: organizationId })
    .select("id")
    .single();
  if (error) return { error: saveError };
  revalidatePath("/rfqs");
  redirect(`/rfqs/${data.id}`);
}
export async function reviewRfq(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId, role } = await requireStaff();
  const input = rfqReviewSchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Use a valid status. Sourcing and quoted RFQs require engineering approval.",
    };
  const { id, version, status, engineering_state, engineering_note } =
    input.data;
  const patch =
    role === "operator"
      ? { status }
      : { status, engineering_state, engineering_note };
  const { data, error } = await client
    .from("rfqs")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("version", version)
    .select("id");
  if (error)
    return {
      error:
        "Review could not be saved. Check the status transition, engineering approval, and review note. Refresh before retrying.",
    };
  if (!data.length)
    return {
      error:
        "This record changed or is unavailable. Refresh before reviewing again.",
    };
  revalidatePath(`/rfqs/${id}`);
  revalidatePath("/rfqs");
  revalidatePath("/");
  return { success: "RFQ review saved and added to history." };
}
