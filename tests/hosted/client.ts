import { ensure, type Actor, type Scope, type State } from "./safety.ts";
export type Session = {
  access_token: string;
  refresh_token: string;
  user: { id: string };
  expires_at?: number;
};
export type Result = { status: number; data: unknown; code?: string };
export class Hosted {
  readonly base: string;
  readonly evidence: {
    resource: string;
    method: string;
    status: number;
    code?: string;
  }[] = [];
  sessions = {} as Record<Actor, Session>;
  readonly scope: Scope;
  readonly state: State;
  readonly env: NodeJS.ProcessEnv;
  constructor(scope: Scope, state: State, env: NodeJS.ProcessEnv) {
    this.scope = scope;
    this.state = state;
    this.env = env;
    this.base = `https://${scope.project}.supabase.co`;
  }

  async request(
    path: string,
    token: string | undefined,
    method = "GET",
    data?: unknown,
    admin = false,
    extra: Record<string, string> = {},
  ): Promise<Result> {
    ensure(
      path.startsWith("/rest/v1/") || path.startsWith("/auth/v1/"),
      "API path rejected",
    );
    const key = admin
      ? this.env.B2B_HOSTED_ADMIN_KEY
      : this.env.B2B_HOSTED_PUBLIC_KEY;
    ensure(key, "API key missing");
    const response = await fetch(`${this.base}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      headers: {
        apikey: key,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...extra,
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    const text = await response.text();
    let value: unknown;
    try {
      value = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("Non-JSON API response");
    }
    const code = (value as { code?: string } | null)?.code;
    this.evidence.push({
      resource: path
        .split("?")[0]
        .replace(/\/users\/[^/]+$/, "/users/:synthetic-id"),
      method,
      status: response.status,
      ...(typeof code === "string" && /^[A-Z0-9]{5,12}$/.test(code)
        ? { code }
        : {}),
    });
    return {
      status: response.status,
      data: value,
      code: (value as { code?: string } | null)?.code,
    };
  }
  async api(
    actor: Actor | null,
    table: string,
    method = "GET",
    data?: unknown,
    query = "",
  ) {
    ensure(/^[a-z_]+$/.test(table), "Table rejected");
    return this.request(
      `/rest/v1/${table}${query ? `?${query}` : ""}`,
      actor ? this.sessions[actor].access_token : undefined,
      method,
      data,
    );
  }
  async rows<T>(actor: Actor, table: string, query = ""): Promise<T[]> {
    const r = await this.api(actor, table, "GET", undefined, query);
    ensure(r.status === 200 && Array.isArray(r.data), "Read failed");
    return r.data as T[];
  }
  async insert<T>(actor: Actor, table: string, data: object): Promise<T> {
    const r = await this.api(actor, table, "POST", data);
    ensure(
      r.status === 201 && Array.isArray(r.data) && r.data.length === 1,
      "Insert failed",
    );
    return r.data[0] as T;
  }
  async patch<T>(
    actor: Actor,
    table: string,
    id: string,
    data: object,
    version?: number,
  ): Promise<T> {
    const r = await this.api(
      actor,
      table,
      "PATCH",
      data,
      `id=eq.${id}${version === undefined ? "" : `&version=eq.${version}`}`,
    );
    ensure(
      r.status === 200 && Array.isArray(r.data) && r.data.length === 1,
      "Update failed",
    );
    return r.data[0] as T;
  }
  async login(actor: Actor) {
    const account = this.state.accounts[actor];
    ensure(account, "Account missing");
    const r = await this.request(
      "/auth/v1/token?grant_type=password",
      undefined,
      "POST",
      { email: this.scope.accounts[actor], password: account.password },
    );
    ensure(r.status === 200, "Auth login failed");
    const s = r.data as Session;
    ensure(
      s.user.id === account.id && s.access_token && s.refresh_token,
      "Auth identity mismatch",
    );
    this.sessions[actor] = s;
  }
  async membership(actor: Exclude<Actor, "nonstaff">, active: boolean) {
    const account = this.state.accounts[actor];
    ensure(account, "Account missing");
    const user = await this.request(
      `/auth/v1/admin/users/${account.id}`,
      this.env.B2B_HOSTED_ADMIN_KEY,
      "GET",
      undefined,
      true,
    );
    const identity = user.data as {
      email?: string;
      app_metadata?: { synthetic_acceptance?: string };
    };
    ensure(
      user.status === 200 &&
        identity.email === this.scope.accounts[actor] &&
        identity.app_metadata?.synthetic_acceptance === this.scope.run,
      "Refusing membership change outside synthetic accounts",
    );
    const org =
      actor === "other"
        ? this.scope.organizations.b
        : this.scope.organizations.a;
    const r = await this.request(
      `/rest/v1/staff_memberships?user_id=eq.${account.id}&organization_id=eq.${org}`,
      this.env.B2B_HOSTED_ADMIN_KEY,
      "PATCH",
      { active },
      true,
    );
    ensure(
      r.status === 200 && Array.isArray(r.data) && r.data.length === 1,
      "Scoped membership change failed",
    );
  }
}
export function denied(r: Result, codes: string[] = ["42501"]) {
  ensure(
    [400, 401, 403, 409].includes(r.status) &&
      !!r.code &&
      codes.includes(r.code),
    "Expected API denial",
  );
}
export function empty(r: Result) {
  ensure(
    r.status === 200 && Array.isArray(r.data) && r.data.length === 0,
    "Expected RLS empty result",
  );
}
