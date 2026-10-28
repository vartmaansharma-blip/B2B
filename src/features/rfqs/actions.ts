"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/auth/server";
import { fields, saveError, type ActionState } from "@/lib/forms";
import {
  customerSchema,
  rfqSchema,
  rfqReviewSchema,
  rfqAmendmentSchema,
} from "./model";
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
        "Review could not be saved. Check the status transition, engineering approval, drawing reference and revision, and review note. Refresh before retrying.",
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

export async function amendRfq(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId } = await requireStaff();
  const input = rfqAmendmentSchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Complete the requirements and amendment reason. Use a positive whole-number quantity.",
    };
  const { id, version, ...patch } = input.data;
  const current = await client
    .from("rfqs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("version", version)
    .maybeSingle();
  if (current.error) return { error: saveError };
  if (!current.data)
    return {
      error:
        "This record changed or is unavailable. Refresh before amending again.",
    };
  const existing = current.data;
  const { amendment_note: reason, ...requirements } = patch;
  if (
    !Object.entries(requirements).some(
      ([key, value]) => existing[key as keyof typeof requirements] !== value,
    )
  )
    return {
      error: "Change at least one requirement before saving an amendment.",
    };
  const { data, error } = await client
    .from("rfqs")
    .update({ ...requirements, amendment_note: reason })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("version", version)
    .select("id");
  if (error)
    return {
      error:
        "Amendment could not be saved. Change at least one requirement, add a reason, and refresh before retrying.",
    };
  if (!data.length)
    return {
      error:
        "This record changed or is unavailable. Refresh before amending again.",
    };
  revalidatePath(`/rfqs/${id}`);
  revalidatePath("/rfqs");
  revalidatePath("/");
  return {
    success:
      "Requirements amended. Engineering approval is pending and the change is recorded in history.",
  };
}
