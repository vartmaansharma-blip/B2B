"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/auth/server";
import { fields, type ActionState } from "@/lib/forms";
import {
  shortlistProposalSchema,
  shortlistReviewSchema,
} from "./shortlist-model";

const failed =
  "Shortlist could not be saved. Refresh and check the current requirements, supplier review, engineering decision and fit evidence.";
export async function proposeSupplier(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId } = await requireStaff();
  const input = shortlistProposalSchema.safeParse(fields(form));
  if (!input.success)
    return {
      error:
        "Select a capability and add a proposal reason. Refresh if records changed.",
    };
  const { error } = await client
    .from("rfq_shortlists")
    .insert({ ...input.data, organization_id: organizationId });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "This supplier already has an entry. Use its review form to repropose it."
          : failed,
    };
  revalidatePath(`/rfqs/${input.data.rfq_id}`);
  return {
    success:
      "Supplier proposed for review. Engineering acceptance is separate.",
  };
}
export async function reviewShortlist(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, organizationId, role } = await requireStaff();
  const input = shortlistReviewSchema.safeParse(fields(form));
  if (!input.success)
    return { error: "Add a reason and part-specific evidence for acceptance." };
  const {
    id,
    rfq_id,
    version,
    state,
    capability_id,
    requirements_version,
    supplier_version,
    review_note,
    fit_evidence_reference,
    rfq_reviewed_at,
  } = input.data;
  if (state === "accepted" && role === "operator")
    return { error: "An engineer or admin must accept part-specific fit." };
  const patch =
    state === "proposed"
      ? {
          state,
          capability_id,
          requirements_version,
          supplier_version,
          review_note,
        }
      : { state, review_note, fit_evidence_reference, rfq_reviewed_at };
  const { data, error } = await client
    .from("rfq_shortlists")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("rfq_id", rfq_id)
    .eq("id", id)
    .eq("version", version)
    .select("id");
  if (error) return { error: failed };
  if (!data.length)
    return {
      error:
        "This entry changed or is unavailable. Refresh before reviewing again.",
    };
  revalidatePath(`/rfqs/${rfq_id}`);
  return { success: "Shortlist review saved in its audit history." };
}
