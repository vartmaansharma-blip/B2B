"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readConfig } from "@/lib/env";
import { fields, type ActionState } from "@/lib/forms";
import { requireStaff } from "./server";

export async function signIn(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const input = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
    .safeParse(fields(form));
  if (!input.success) return { error: "Enter a valid email and password." };
  if (!readConfig())
    return {
      error: "Staff sign-in is not configured. Contact your administrator.",
    };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error)
    return {
      error:
        "Unable to sign in. Check your credentials or contact your administrator.",
    };
  await requireStaff();
  redirect("/");
}
export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error)
    throw new Error("Sign-out could not be completed. Please try again.");
  redirect("/login");
}
export async function setPassword(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client } = await requireStaff();
  const input = z
    .object({ password: z.string().min(12).max(128), confirm: z.string() })
    .refine((v) => v.password === v.confirm)
    .safeParse(fields(form));
  if (!input.success)
    return {
      error: "Use at least 12 characters and make both passwords match.",
    };
  const { error } = await client.auth.updateUser({
    password: input.data.password,
  });
  if (error)
    return { error: "Unable to update password. Contact your administrator." };
  redirect("/");
}
