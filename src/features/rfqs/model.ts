import { z } from "zod";
import {
  requiredText,
  optionalText,
  recordId,
  versionSchema,
  optionalDate,
} from "@/lib/forms";
import type { RfqStatus } from "@/lib/types";
export const rfqStatuses = [
  "draft",
  "reviewing",
  "sourcing",
  "quoted",
  "closed",
] as const;
export const engineeringStates = [
  "pending",
  "approved",
  "changes_requested",
] as const;
export const rfqTransitions: Record<RfqStatus, readonly RfqStatus[]> = {
  draft: ["reviewing", "closed"],
  reviewing: ["sourcing", "closed"],
  sourcing: ["reviewing", "quoted", "closed"],
  quoted: ["reviewing", "closed"],
  closed: ["reviewing"],
};
export const customerSchema = z.object({
  name: requiredText(200),
  reference: requiredText(2000),
});
export const rfqSchema = z.object({
  customer_id: recordId,
  title: requiredText(200),
  part_description: requiredText(4000),
  drawing_reference: optionalText(2000),
  drawing_revision: optionalText(120),
  quantity: z.coerce.number().int().min(1).max(1000000000),
  unit: requiredText(40),
  target_date: optionalDate,
});
export const rfqAmendmentSchema = rfqSchema.omit({ customer_id: true }).extend({
  id: recordId,
  version: versionSchema,
  amendment_note: requiredText(4000),
});
export const rfqReviewSchema = z
  .object({
    id: recordId,
    version: versionSchema,
    status: z.enum(rfqStatuses),
    engineering_state: z.enum(engineeringStates),
    engineering_note: optionalText(4000),
  })
  .refine(
    (v) =>
      !["sourcing", "quoted"].includes(v.status) ||
      v.engineering_state === "approved",
  );

// Database JSON is validated at the presentation boundary, including after type regeneration.
const requirementSnapshotSchema = rfqSchema.extend({
  drawing_reference: z.string().nullable(),
  drawing_revision: z.string().nullable(),
  target_date: z.iso.date().nullable(),
  version: z.number().int().positive(),
});
export type RequirementSnapshot = z.infer<typeof requirementSnapshotSchema>;
export function parseRequirementSnapshot(
  value: unknown,
): RequirementSnapshot | null {
  const parsed = requirementSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
