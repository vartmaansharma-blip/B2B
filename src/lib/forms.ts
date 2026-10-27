import { z } from "zod";
export type ActionState = { error?: string; success?: string };
export const requiredText = (max: number) => z.string().trim().min(1).max(max);
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
export const recordId = z.uuid();
export const versionSchema = z.coerce.number().int().positive();
export const dateSchema = z.iso.date();
export const optionalDate = z
  .union([dateSchema, z.literal("")])
  .transform((v) => v || null);
export function fields(data: FormData) {
  return Object.fromEntries(data.entries());
}
export const saveError =
  "Unable to save. Check your access and values, or refresh to see whether the record was saved before retrying.";
