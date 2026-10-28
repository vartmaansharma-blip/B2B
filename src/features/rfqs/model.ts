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
  quantity: z.coerce.number().int().min(1).max(1000000000),
  unit: requiredText(40),
  target_date: optionalDate,
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
