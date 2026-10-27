import { z } from "zod";
import {
  requiredText,
  optionalText,
  recordId,
  versionSchema,
  dateSchema,
  optionalDate,
} from "@/lib/forms";
import type { Qualification, Supplier } from "@/lib/types";
export const qualifications = [
  "discovered",
  "contact_review",
  "capability_review",
  "qualified",
  "rejected",
  "suspended",
] as const;
export const transitions: Record<Qualification, readonly Qualification[]> = {
  discovered: ["contact_review", "rejected"],
  contact_review: ["capability_review", "rejected"],
  capability_review: ["qualified", "rejected"],
  qualified: ["suspended", "capability_review"],
  rejected: ["contact_review"],
  suspended: ["capability_review", "rejected"],
};
export const supplierSchema = z.object({
  name: requiredText(200),
  city: requiredText(120),
  region: requiredText(120),
  processes: requiredText(2000),
  materials: requiredText(2000),
  source_reference: requiredText(2000),
  source_url: z
    .union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")])
    .transform((v) => v || null),
  observed_on: dateSchema.refine(
    (v) => v <= new Date().toISOString().slice(0, 10),
  ),
});
export const qualificationSchema = z
  .object({
    id: recordId,
    version: versionSchema,
    qualification_state: z.enum(qualifications),
    qualification_scope: optionalText(2000),
    evidence_reference: optionalText(4000),
    review_note: requiredText(4000),
    qualification_expires_on: optionalDate,
  })
  .refine(
    (v) =>
      v.qualification_state !== "qualified" ||
      (!!v.qualification_scope &&
        !!v.evidence_reference &&
        !!v.qualification_expires_on),
    { message: "Qualification requires scope, evidence, and expiry." },
  );
export function effectiveQualification(
  supplier: Pick<Supplier, "qualification_state" | "qualification_expires_on">,
  today = new Date().toISOString().slice(0, 10),
) {
  return supplier.qualification_state === "qualified" &&
    (!supplier.qualification_expires_on ||
      supplier.qualification_expires_on <= today)
    ? "review_expired"
    : supplier.qualification_state;
}
