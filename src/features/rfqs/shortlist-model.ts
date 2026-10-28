import { z } from "zod";
import {
  optionalText,
  recordId,
  requiredText,
  versionSchema,
} from "@/lib/forms";
import { effectiveQualification } from "@/features/suppliers/model";
import type { Rfq, RfqShortlist, Supplier } from "@/lib/types";

export const shortlistProposalSchema = z.object({
  rfq_id: recordId,
  supplier_id: recordId,
  capability_id: recordId,
  requirements_version: versionSchema,
  supplier_version: versionSchema,
  review_note: requiredText(4000),
});
export const shortlistReviewSchema = z
  .object({
    id: recordId,
    rfq_id: recordId,
    version: versionSchema,
    state: z.enum(["proposed", "accepted", "removed"]),
    capability_id: recordId,
    requirements_version: versionSchema,
    supplier_version: versionSchema,
    review_note: requiredText(4000),
    fit_evidence_reference: optionalText(4000),
    rfq_reviewed_at: optionalText(100),
  })
  .refine((v) => v.state !== "accepted" || !!v.fit_evidence_reference);

const shortlistSnapshotSchema = z.object({
  requirements_snapshot: z.object({
    title: z.string(),
    part_description: z.string(),
    drawing_reference: z.string().nullable(),
    drawing_revision: z.string().nullable(),
    quantity: z.number(),
    unit: z.string(),
    target_date: z.string().nullable(),
  }),
  supplier_snapshot: z.object({
    name: z.string(),
    qualification_state: z.string(),
    qualification_scope: z.string().nullable(),
    evidence_reference: z.string().nullable(),
    qualification_expires_on: z.string().nullable(),
    capability: z.object({
      process: z.string(),
      material: z.string(),
      tolerance_notes: z.string(),
      inspection_notes: z.string(),
      evidence_reference: z.string(),
      observed_on: z.string(),
    }),
  }),
  fit_evidence_reference: z.string().nullable(),
});
export function parseShortlistSnapshot(value: unknown) {
  const parsed = shortlistSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Generated view columns are nullable; validate their table-derived invariants.
const shortlistStatusSchema = z.object({
  id: recordId,
  organization_id: recordId,
  rfq_id: recordId,
  supplier_id: recordId,
  capability_id: recordId,
  requirements_version: z.number().int().positive(),
  supplier_version: z.number().int().positive(),
  version: z.number().int().positive(),
  state: z.enum(["proposed", "accepted", "removed"]),
  effective_state: z.enum(["proposed", "accepted", "removed", "needs_review"]),
  review_note: z.string(),
  fit_evidence_reference: z.string().nullable(),
  requirements_snapshot: z.json(),
  supplier_snapshot: z.json(),
  reviewed_by: recordId.nullable(),
  reviewed_at: z.string().nullable(),
  rfq_reviewed_at: z.string().nullable(),
  created_by: recordId,
  created_at: z.string(),
  updated_at: z.string(),
});
export function parseShortlistStatus(value: unknown) {
  const parsed = shortlistStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function effectiveShortlistState(
  entry: RfqShortlist,
  rfq: Rfq,
  supplier: Supplier | undefined,
  today = new Date().toISOString().slice(0, 10),
) {
  if (entry.state === "removed") return "removed";
  if (
    !supplier ||
    rfq.status === "closed" ||
    entry.requirements_version !== rfq.requirements_version ||
    entry.supplier_version !== supplier.version
  )
    return "needs_review";
  if (
    entry.state === "accepted" &&
    (rfq.engineering_state !== "approved" ||
      !["reviewing", "sourcing", "quoted"].includes(rfq.status) ||
      !entry.rfq_reviewed_at ||
      !rfq.reviewed_at ||
      new Date(entry.rfq_reviewed_at).getTime() !==
        new Date(rfq.reviewed_at).getTime() ||
      effectiveQualification(supplier, today) !== "qualified")
  )
    return "needs_review";
  return entry.state;
}
