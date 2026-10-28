"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/auth/server";
import { fields, saveError, type ActionState } from "@/lib/forms";
import { capabilitySchema } from "./capability-model";

export async function addCapability(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId } = await requireStaff();
  const input = capabilitySchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Complete the reported capability, evidence and a valid observation date.",
    };
  const { error } = await client
    .from("supplier_capabilities")
    .insert({ ...input.data, organization_id: organizationId });
  if (error) return { error: saveError };
  revalidatePath(`/suppliers/${input.data.supplier_id}`);
  revalidatePath(`/suppliers/${input.data.supplier_id}/capabilities`);
  return {
    success:
      "Reported capability recorded. This does not qualify the supplier.",
  };
}
