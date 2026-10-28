import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
  if (!page.isClosed()) {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
async function login(page: Page, email = "operator@fixture.test") {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fixture-password-only-2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(
    email === "outsider@fixture.test"
      ? /access-denied/
      : "http://127.0.0.1:3100/",
  );
}
test("private routes require sign-in and responses prohibit caching", async ({
  page,
}) => {
  const response = await page.goto("/suppliers");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Manufacturing OS" }),
  ).toBeVisible();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
});
test("nonstaff cannot access the workspace", async ({ page }) => {
  await login(page, "outsider@fixture.test");
  await expect(page).toHaveURL(/access-denied/);
  await expect(
    page.getByRole("heading", { name: "Staff membership required" }),
  ).toBeVisible();
});
test("invalid credentials return a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("unknown@fixture.test");
  await page.getByLabel("Password", { exact: true }).fill("invalid-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Unable to sign in" }),
  ).toBeVisible();
});

test("default recovery email sessions reach password setup and keep tokens out of URLs and storage", async ({
  page,
  request,
}) => {
  const response = await request.post(
    "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
    {
      data: {
        email: "recovery@fixture.test",
        password: "Fixture-password-only-2026",
      },
    },
  );
  const session = await response.json();
  const fragment = new URLSearchParams({
    type: "recovery",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  await page.goto(`/auth/recovery#${fragment}`);
  await expect(page).toHaveURL("http://127.0.0.1:3100/set-password");
  await expect(
    page.getByRole("heading", { name: "Set your staff password" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.values(localStorage)
        .concat(Object.values(sessionStorage))
        .some((value) => value.includes("fixture-refresh-only")),
    ),
  ).toBe(false);
  await page
    .getByLabel("New password (12 characters minimum)")
    .fill("TEST-ONLY-reset-password-2026");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("TEST-ONLY-reset-password-2026");
  await page.getByRole("button", { name: "Set password", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Operations overview." }),
  ).toBeVisible();
});

test("invalid recovery links remove fragments and give a safe retry path", async ({
  page,
}) => {
  await page.goto(
    "/auth/recovery#type=recovery&access_token=TEST_ONLY_INVALID&refresh_token=TEST_ONLY_INVALID",
  );
  await expect(
    page.getByRole("alert", { name: "Password reset feedback" }),
  ).toContainText("invalid or expired");
  await expect(page).toHaveURL("http://127.0.0.1:3100/auth/recovery");
  await page.getByRole("link", { name: "Return to sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("a valid recovery session cannot bypass staff membership", async ({
  page,
  request,
}) => {
  const response = await request.post(
    "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
    {
      data: {
        email: "outsider@fixture.test",
        password: "Fixture-password-only-2026",
      },
    },
  );
  const session = await response.json();
  const fragment = new URLSearchParams({
    type: "recovery",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  await page.goto(`/auth/recovery#${fragment}`);
  await expect(
    page.getByRole("alert", { name: "Password reset feedback" }),
  ).toContainText("invalid or expired");
  await page.goto("/set-password");
  await expect(page).toHaveURL(/\/login$/);
});
test("staff can record discovery and provenance, review and sign out", async ({
  page,
}, info) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Operations overview." }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-overview.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Add supplier", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add a supplier", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-supplier-form.png`,
    fullPage: true,
    animations: "disabled",
  });
  const name = `TEST ONLY Supplier ${info.project.name}`;
  await page.getByLabel("Supplier business name").fill(name);
  await page.getByLabel("City / industrial cluster").fill("TEST ONLY City");
  await page.getByLabel("State / region").fill("TEST ONLY Region");
  await page.getByLabel("Observed on").fill("2020-01-01");
  await page
    .getByLabel("Reported processes")
    .fill("SYNTHETIC unverified process");
  await page
    .getByLabel("Reported materials")
    .fill("SYNTHETIC unverified material");
  await page
    .getByLabel("Discovery source / reference")
    .fill("SYNTHETIC browser fixture. No real supplier claim.");
  await page.getByRole("button", { name: "Add discovered supplier" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(
    page.locator("span.badge").filter({ hasText: /^discovered$/ }),
  ).toBeVisible();
  await page.getByLabel("Qualification state").selectOption("contact_review");
  await page
    .getByLabel("Review note / reason")
    .fill("TEST ONLY review of synthetic discovery");
  await page.getByRole("button", { name: "Record review" }).click();
  await expect(
    page.getByRole("status", { name: "Save feedback" }),
  ).toContainText("Review saved");
  await expect(
    page.getByText("discovered → contact review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { name }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/${info.project.name}-supplier.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/suppliers");
  await expect(page).toHaveURL(/login/);
});
test("RFQs require an engineering decision before sourcing", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/rfqs/customers/new");
  await page
    .getByLabel("Customer business name")
    .fill(`TEST ONLY Customer ${info.project.name}`);
  await page
    .getByLabel("Intake reference")
    .fill("SYNTHETIC browser fixture - no customer information");
  await page.getByRole("button", { name: "Add customer and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Create a draft RFQ" }),
  ).toBeVisible();
  await page
    .getByLabel("RFQ title / part name")
    .fill(`TEST ONLY RFQ ${info.project.name}`);
  await page
    .getByLabel("Part requirements")
    .fill("SYNTHETIC test requirements, not a manufacturing specification");
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Create draft RFQ" }).click();
  await expect(
    page.getByRole("heading", { name: `TEST ONLY RFQ ${info.project.name}` }),
  ).toBeVisible();
  await page.getByLabel("RFQ status").selectOption("reviewing");
  await page.getByRole("button", { name: "Save RFQ review" }).click();
  await expect(
    page.getByRole("status", { name: "Save feedback" }),
  ).toContainText("RFQ review saved");
  await page.getByLabel("RFQ status").selectOption("sourcing");
  await page.getByRole("button", { name: "Save RFQ review" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "require engineering approval" }),
  ).toBeVisible();
  const rfqUrl = page.url();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "engineer@fixture.test");
  await page.goto(rfqUrl);
  await page.getByLabel("Engineering decision").selectOption("approved");
  await page
    .getByLabel("Engineering review note")
    .fill(
      "SYNTHETIC TEST ONLY decision to exercise workflow. No actual part approval.",
    );
  await page.getByRole("button", { name: "Save RFQ review" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "drawing reference and revision" }),
  ).toBeVisible();
  await page.getByText("Amend requirements", { exact: true }).click();
  await page
    .getByLabel("Controlled drawing reference", { exact: true })
    .fill("SYNTHETIC DRAWING ONLY");
  await page.getByLabel("Drawing revision", { exact: true }).fill("A");
  await page
    .getByLabel("Amendment reason")
    .fill("TEST ONLY add controlled drawing identity");
  await page
    .getByRole("button", { name: "Save amendment and request review" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Requirements amended" }),
  ).toBeVisible();
  await expect(page.getByLabel("Engineering decision")).toHaveValue("pending");
  await page.getByLabel("Engineering decision").selectOption("approved");
  await page
    .getByLabel("Engineering review note")
    .fill("SYNTHETIC TEST ONLY approval of revision A");
  await page.getByRole("button", { name: "Save RFQ review" }).click();
  await expect(
    page
      .getByRole("status", { name: "Save feedback" })
      .filter({ hasText: "RFQ review saved" }),
  ).toContainText("RFQ review saved");
  await expect(page.getByLabel("Engineering decision")).toHaveValue("approved");
  await page.getByLabel("RFQ status").selectOption("sourcing");
  await page.getByRole("button", { name: "Save RFQ review" }).click();
  await expect(
    page
      .getByRole("status", { name: "Save feedback" })
      .filter({ hasText: "RFQ review saved" }),
  ).toContainText("RFQ review saved");
  await expect(
    page.locator("span.badge").filter({ hasText: /^sourcing$/ }),
  ).toBeVisible();
  const stale = await page.context().newPage();
  await stale.goto(rfqUrl);
  await stale.getByText("Amend requirements", { exact: true }).click();
  await page.getByLabel("Drawing revision", { exact: true }).fill("B");
  await page.getByLabel("Quantity", { exact: true }).fill("20");
  await page
    .getByLabel("Amendment reason")
    .fill("TEST ONLY revised drawing and quantity");
  await page
    .getByRole("button", { name: "Save amendment and request review" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Requirements amended" }),
  ).toBeVisible();
  await expect(page.getByLabel("Engineering decision")).toHaveValue("pending");
  await expect(page.getByLabel("RFQ status")).toHaveValue("reviewing");
  await stale.getByLabel("Drawing revision", { exact: true }).fill("C");
  await stale.getByLabel("Amendment reason").fill("TEST ONLY stale correction");
  await stale
    .getByRole("button", { name: "Save amendment and request review" })
    .click();
  await expect(
    stale.getByRole("alert").filter({ hasText: "Refresh" }),
  ).toBeVisible();
  await stale.close();
  const history = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Review history" }) });
  const latestAmendment = history
    .locator("li")
    .filter({ hasText: "TEST ONLY revised drawing and quantity" });
  await latestAmendment.getByText(/Requirement amendment/).click();
  await expect(
    latestAmendment.getByRole("heading", { name: /Before/ }),
  ).toBeVisible();
  await expect(
    latestAmendment.getByRole("heading", { name: /After/ }),
  ).toBeVisible();
  await page.getByLabel("RFQ status").selectOption("sourcing");
  await page.getByRole("button", { name: "Save RFQ review" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "require engineering approval" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-rfq.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("invite errors are safe and sign-in is visually complete", async ({
  page,
}, info) => {
  await page.goto("/auth/confirm?type=invite&token_hash=invalid-test-only");
  await expect(page).toHaveURL(/login\?error=invalid-link/);
  await expect(
    page.getByText(/This invitation or recovery link is invalid/),
  ).toBeVisible();
  await page.goto("/login");
  await page.screenshot({
    path: `test-results/${info.project.name}-login.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("quick find searches real workspace records and supports the keyboard", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/suppliers/new");
  const name = `TEST ONLY Quick Find ${info.project.name}`;
  await page.getByLabel("Supplier business name").fill(name);
  await page.getByLabel("City / industrial cluster").fill("TEST ONLY City");
  await page.getByLabel("State / region").fill("TEST ONLY Region");
  await page.getByLabel("Observed on").fill("2020-01-01");
  await page.getByLabel("Reported processes").fill("SYNTHETIC search fixture");
  await page.getByLabel("Reported materials").fill("SYNTHETIC");
  await page
    .getByLabel("Discovery source / reference")
    .fill("SYNTHETIC browser fixture, no real supplier claim");
  await page.getByRole("button", { name: "Add discovered supplier" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("button", { name: "Quick find" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Quick find workspace records",
  });
  await expect(dialog).toBeVisible();
  const search = page.getByRole("textbox", {
    name: "Search suppliers and RFQs",
  });
  await search.fill(`Quick Find ${info.project.name}`);
  await expect(
    dialog.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-quick-find.png`,
    fullPage: true,
    animations: "disabled",
  });
  await search.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  // Reproduce a previous native close event arriving after the dialog reopens.
  await dialog.dispatchEvent("close");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test.describe("motion presentation", () => {
  test("cinematic motion has a persistent reduced-motion control and honors system settings", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator(".auth-art")).toHaveCSS(
      "animation-name",
      "cinematic-camera",
    );
    await page.locator(".auth-art").evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    await page
      .getByRole("button", { name: "Reduce motion", exact: true })
      .click();
    await expect(page.locator(".auth-art")).toHaveCSS("animation-name", "none");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Use system motion", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Use system motion", exact: true })
      .click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".auth-art")).toHaveCSS("animation-name", "none");
  });
});
