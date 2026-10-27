import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readConfig } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (!readConfig())
    return NextResponse.redirect(new URL("/setup", request.url));
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (token_hash && (type === "invite" || type === "recovery")) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(new URL("/set-password", request.url));
  }
  return NextResponse.redirect(
    new URL("/login?error=invalid-link", request.url),
  );
}
