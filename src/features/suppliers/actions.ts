"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/auth/server";
import { fields, saveError, type ActionState } from "@/lib/forms";
import { supplierSchema, qualificationSchema } from "./model";
export async function createSupplier(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId } = await requireStaff();
  const input = supplierSchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Complete all required fields, use an HTTP(S) source URL, and use an observation date no later than today.",
    };
  const { data, error } = await client
    .from("suppliers")
    .insert({ ...input.data, organization_id: organizationId })
    .select("id")
    .single();
  if (error)
    return {
      error:
        error.code === "23505"
          ? "A supplier with this name and city already exists. Search the registry before adding another."
          : saveError,
    };
  revalidatePath("/suppliers");
  redirect(`/suppliers/${data.id}`);
}
export async function reviewSupplier(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId, role } = await requireStaff();
  const input = qualificationSchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Add a review note. Qualification also requires scope, evidence, and an expiry date within the next year.",
    };
  const { id, version, ...patch } = input.data;
  if (patch.qualification_state === "qualified" && role === "operator")
    return { error: "An engineer or administrator must record qualification." };
  const { data, error } = await client
    .from("suppliers")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("version", version)
    .select("id");
  if (error)
    return {
      error:
        "Review could not be saved. Check the transition, role, evidence, and future expiry (within one year). Refresh before retrying.",
    };
  if (!data.length)
    return {
      error:
        "This record changed or is unavailable. Refresh before reviewing again.",
    };
  revalidatePath(`/suppliers/${id}`);
  revalidatePath("/suppliers");
  revalidatePath("/");
  return { success: "Review saved and added to history." };
}
