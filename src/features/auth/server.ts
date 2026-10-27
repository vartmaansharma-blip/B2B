import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readConfig } from "@/lib/env";

export const requireStaff = cache(async function requireStaff() {
  if (!readConfig()) redirect("/setup");
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || user.is_anonymous) redirect("/login");
  const { data: member, error: memberError } = await client
    .from("staff_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (memberError)
    throw new Error(
      "Staff access could not be verified. Check database setup.",
    );
  if (!member) redirect("/access-denied");
  return {
    client,
    user,
    organizationId: member.organization_id,
    role: member.role,
  };
});
