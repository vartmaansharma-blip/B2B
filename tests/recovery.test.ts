import { beforeEach, expect, it, vi } from "vitest";
import { readRecoveryFragment } from "@/features/auth/recovery-model";

const { client, query, createClient } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  const client = {
    auth: { setSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
  };
  return { client, query, createClient: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/env", () => ({
  readConfig: () => ({
    url: "https://fixture.test",
    key: "sb_publishable_fixture_only",
  }),
}));
import { acceptRecoverySession } from "@/features/auth/recovery-actions";
const input = {
  type: "recovery",
  access_token: "TEST_ONLY_ACCESS",
  refresh_token: "TEST_ONLY_REFRESH",
};

beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue(client);
  client.auth.setSession.mockResolvedValue({ error: null });
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: "TEST_ONLY_USER", is_anonymous: false } },
    error: null,
  });
  client.auth.signOut.mockResolvedValue({ error: null });
  client.from.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({
    data: { organization_id: "TEST_ONLY_ORG" },
    error: null,
  });
});

it("accepts only bounded recovery fragments, ignoring destination parameters", () => {
  expect(
    readRecoveryFragment(
      "#type=recovery&access_token=TEST_ONLY_ACCESS&refresh_token=TEST_ONLY_REFRESH&next=https://untrusted.test",
    ),
  ).toEqual(input);
});
it.each([
  "",
  "#type=invite&access_token=test&refresh_token=test",
  "#type=recovery&access_token=test",
  "#error=expired&type=recovery&access_token=test&refresh_token=test",
  "#" + "x".repeat(12001),
])("rejects missing, expired or unsupported recovery fragments", (fragment) => {
  expect(readRecoveryFragment(fragment)).toBeNull();
});
it("rejects malformed server input before creating a client", async () => {
  expect(
    (await acceptRecoverySession({ ...input, type: "invite" })).error,
  ).toBeTruthy();
  expect(createClient).not.toHaveBeenCalled();
});
it("validates the session and current user before checking active membership", async () => {
  expect(await acceptRecoverySession(input)).toEqual({ ok: true });
  expect(client.auth.setSession).toHaveBeenCalledWith({
    access_token: input.access_token,
    refresh_token: input.refresh_token,
  });
  expect(client.auth.getUser).toHaveBeenCalled();
  expect(client.from).toHaveBeenCalledWith("staff_memberships");
  expect(query.eq).toHaveBeenCalledWith("user_id", "TEST_ONLY_USER");
  expect(query.eq).toHaveBeenCalledWith("active", true);
});
it("clears a rejected session without querying membership", async () => {
  client.auth.setSession.mockResolvedValue({
    error: new Error("PRIVATE ERROR"),
  });
  expect((await acceptRecoverySession(input)).error).not.toContain(
    "PRIVATE ERROR",
  );
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(client.from).not.toHaveBeenCalled();
});
it("does not accept anonymous accounts", async () => {
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: "TEST_ONLY_USER", is_anonymous: true } },
    error: null,
  });
  expect((await acceptRecoverySession(input)).error).toBeTruthy();
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(client.from).not.toHaveBeenCalled();
});
it.each([
  { data: null, error: null },
  { data: null, error: new Error("PRIVATE DATABASE DETAIL") },
])("clears sessions without verified active staff access", async (result) => {
  query.maybeSingle.mockResolvedValue(result);
  const response = await acceptRecoverySession(input);
  expect(response.error).toBeTruthy();
  expect(response.error).not.toContain("PRIVATE");
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("returns a generic error and clears the session after network failures", async () => {
  client.auth.getUser.mockRejectedValue(new Error("PRIVATE NETWORK DETAIL"));
  const response = await acceptRecoverySession(input);
  expect(response.error).toBeTruthy();
  expect(response.error).not.toContain("PRIVATE");
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
});
