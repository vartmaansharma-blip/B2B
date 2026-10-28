import { z } from "zod";

export const recoverySessionSchema = z
  .object({
    type: z.literal("recovery"),
    access_token: z.string().min(1).max(8192),
    refresh_token: z.string().min(1).max(1024),
  })
  .strict();

export function readRecoveryFragment(fragment: string) {
  if (fragment.length > 12000) return null;
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.has("error") || params.has("error_code")) return null;
  const result = recoverySessionSchema.safeParse({
    type: params.get("type"),
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  });
  return result.success ? result.data : null;
}
