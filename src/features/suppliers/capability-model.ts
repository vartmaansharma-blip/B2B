import { z } from "zod";
import { dateSchema, recordId, requiredText } from "@/lib/forms";
export const capabilitySchema = z.object({
  supplier_id: recordId,
  process: requiredText(200),
  material: requiredText(200),
  tolerance_notes: requiredText(2000),
  inspection_notes: requiredText(2000),
  evidence_reference: requiredText(4000),
  observed_on: dateSchema.refine(
    (v) => v <= new Date().toISOString().slice(0, 10),
  ),
});
