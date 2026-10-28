import {
  chromium,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { ensure, type Actor } from "./safety.ts";
import type { Hosted } from "./client.ts";

export async function reviewBrowser(h: Hosted) {
  ensure(
    h.env.VERCEL_OIDC_TOKEN,
    "Private Vercel development OIDC token required",
  );
  const browser = await chromium.launch();
  const contexts: BrowserContext[] = [];
  const errors: boolean[] = [];
  async function page(actor: Actor) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    contexts.push(context);
    // Origin scoping prevents forwarding Vercel credentials to redirects/CDNs.
    await context.route("**/*", async (route) => {
      const headers = { ...route.request().headers() };
      delete headers["x-vercel-trusted-oidc-idp-token"];
      if (new URL(route.request().url()).origin === h.scope.origin)
        headers["x-vercel-trusted-oidc-idp-token"] = h.env.VERCEL_OIDC_TOKEN!;
      await route.continue({ headers });
    });
    const p = await context.newPage();
    p.on("pageerror", () => errors.push(true));
    await p.goto(`${h.scope.origin}/login`);
    await p.getByLabel("Work email").fill(h.scope.accounts[actor]);
    await p
      .getByLabel("Password", { exact: true })
      .fill(h.state.accounts[actor]!.password);
    await p.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(p).toHaveURL(
      `${h.scope.origin}/${actor === "nonstaff" ? "access-denied" : ""}`,
    );
    return p;
  }
  async function privateResponse(p: Page, path: string) {
    const response = await p.goto(`${h.scope.origin}${path}`);
    ensure(response?.status() === 200, "Review page unavailable");
    const headers = await response.allHeaders();
    ensure(
      /private/i.test(headers["cache-control"] ?? "") &&
        /no-store/i.test(headers["cache-control"] ?? ""),
      "Private cache headers required",
    );
    ensure(
      headers["x-frame-options"] === "DENY" &&
        headers["x-content-type-options"] === "nosniff",
      "HTTPS response protections missing",
    );
  }
  async function cookies(p: Page) {
    const values = (await p.context().cookies(h.scope.origin)).filter((c) =>
      c.name.startsWith("sb-"),
    );
    ensure(
      values.length &&
        values.every(
          (c) =>
            c.secure && c.httpOnly && c.sameSite === "Lax" && c.path === "/",
        ),
      "Session cookie protections missing",
    );
    ensure(
      await p.evaluate(
        () =>
          !Object.keys(localStorage).some((k) => k.startsWith("sb-")) &&
          !Object.keys(sessionStorage).some((k) => k.startsWith("sb-")),
      ),
      "Session leaked into browser storage",
    );
  }
  return {
    page,
    privateResponse,
    cookies,
    async refresh(p: Page) {
      const all = await p.context().cookies(h.scope.origin);
      const auth = all
        .filter((c) => c.name.startsWith(`sb-${h.scope.project}-auth-token`))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        );
      const value = auth.map((c) => c.value).join("");
      ensure(value.startsWith("base64-"), "Unknown SSR cookie encoding");
      const session = JSON.parse(
        Buffer.from(value.slice(7), "base64url").toString(),
      ) as { access_token: string; expires_at: number };
      const before = session.access_token;
      // Expire only the client cookie metadata. The signed JWT and Auth server remain untouched.
      session.expires_at = 1;
      const replacement = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
      await p.context().clearCookies({
        name: new RegExp(`^sb-${h.scope.project}-auth-token`),
      });
      const chunks = replacement.match(/.{1,3180}/g)!;
      await p.context().addCookies(
        chunks.map((part, i) => ({
          name: `sb-${h.scope.project}-auth-token${chunks.length === 1 ? "" : `.${i}`}`,
          value: part,
          domain: new URL(h.scope.origin).hostname,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax" as const,
        })),
      );
      await privateResponse(p, "/");
      await cookies(p);
      const after = (await p.context().cookies(h.scope.origin))
        .filter((c) => c.name.startsWith(`sb-${h.scope.project}-auth-token`))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        )
        .map((c) => c.value)
        .join("");
      const renewed = JSON.parse(
        Buffer.from(after.slice(7), "base64url").toString(),
      ) as { access_token: string; expires_at: number };
      ensure(
        renewed.expires_at > Date.now() / 1000 &&
          renewed.access_token !== before,
        "Proxy session refresh not observed",
      );
    },
    async close() {
      await browser.close();
      ensure(errors.length === 0, "Browser page error");
    },
  };
}
