import { z } from "zod";

function publicKey(key: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  // Local Supabase may still return legacy anon JWTs. Reject privileged keys.
  try {
    return (
      JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
        .role === "anon"
    );
  } catch {
    return false;
  }
}
const configSchema = z.object({
  url: z.url().refine((value) => {
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" ||
        (u.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(u.hostname))
      );
    } catch {
      return false;
    }
  }),
  key: z.string().refine(publicKey),
});
export function readConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const result = configSchema.safeParse({
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}
