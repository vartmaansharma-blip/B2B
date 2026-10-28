"use server";

import { createClient } from "@/lib/supabase/server";
import { readConfig } from "@/lib/env";
import { recoverySessionSchema } from "./recovery-model";

const invalidLink =
  "This reset link is invalid or expired. Request a new link from your administrator.";

export async function acceptRecoverySession(
  input: unknown,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = recoverySessionSchema.safeParse(input);
  if (!parsed.success || !readConfig()) return { error: invalidLink };
  const client = await createClient();
  try {
    // Supabase validates these bearer credentials; the fragment's type is not authorization.
    const { error } = await client.auth.setSession({
      access_token: parsed.data.access_token,
      refresh_token: parsed.data.refresh_token,
    });
    if (error) {
      await client.auth.signOut({ scope: "local" });
      return { error: invalidLink };
    }
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user || user.is_anonymous) {
      await client.auth.signOut({ scope: "local" });
      return { error: invalidLink };
    }
    const { data: member, error: memberError } = await client
      .from("staff_memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (memberError || !member) {
      await client.auth.signOut({ scope: "local" });
      return { error: invalidLink };
    }
    return { ok: true };
  } catch {
    await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { error: invalidLink };
  }
}
