import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
async function session(request: APIRequestContext, email: string) {
  const result = await request.post("http://127.0.0.1:54329/auth/v1/token", {
    data: { email, password: "Fixture-password-only-2026" },
  });
  expect(result.ok()).toBe(true);
  return (await result.json()).access_token as string;
}
async function record(
  request: APIRequestContext,
  token: string,
  table: string,
  data: object,
  id?: string,
) {
  const url = `http://127.0.0.1:54329/rest/v1/${table}${id ? `?id=eq.${id}` : ""}`;
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    data,
  };
  const response = id
    ? await request.patch(url, options)
    : await request.post(url, options);
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json())[0] as { id: string };
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fixture-password-only-2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
}
test("reported capability to engineering shortlist acceptance and stale-review recovery", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const operator = await session(request, "operator@fixture.test"),
    engineer = await session(request, "engineer@fixture.test");
  const organization_id = "10000000-0000-4000-8000-000000000001";
  const name = `TEST ONLY Shortlist supplier ${info.project.name}`;
  const supplier = await record(request, operator, "suppliers", {
    organization_id,
    name,
    city: "TEST ONLY City",
    region: "TEST ONLY Region",
    processes: "SYNTHETIC machining",
    materials: "SYNTHETIC steel",
    source_reference: "SYNTHETIC browser fixture, no supplier claim",
    observed_on: "2020-01-01",
  });
  const customer = await record(request, operator, "customers", {
    organization_id,
    name: `TEST ONLY Shortlist customer ${info.project.name}`,
    reference: "SYNTHETIC",
  });
  const rfq = await record(request, operator, "rfqs", {
    organization_id,
    customer_id: customer.id,
    title: `TEST ONLY Shortlist RFQ ${info.project.name}`,
    part_description: "SYNTHETIC requirements, no manufacturing specification",
    drawing_reference: "TEST ONLY DRAWING",
    drawing_revision: "A",
    quantity: 10,
    unit: "pieces",
  });
  await record(request, operator, "rfqs", { status: "reviewing" }, rfq.id);
  await record(
    request,
    engineer,
    "rfqs",
    { engineering_state: "approved", engineering_note: "SYNTHETIC TEST ONLY" },
    rfq.id,
  );
  await login(page, "operator@fixture.test");
  await page.goto(`/suppliers/${supplier.id}`);
  await page
    .getByRole("link", { name: "View and record reported capabilities" })
    .click();
  await page
    .getByLabel("Process", { exact: true })
    .fill(`SYNTHETIC machining ${info.project.name}`);
  await page
    .getByLabel("Material / grade", { exact: true })
    .fill("SYNTHETIC steel");
  await page
    .getByLabel("Reported tolerance and limitations")
    .fill("SYNTHETIC limitations, verify with engineer");
  await page
    .getByLabel("Reported inspection methods")
    .fill("SYNTHETIC inspection methods");
  await page
    .getByLabel("Capability evidence reference")
    .fill("SYNTHETIC TEST ONLY observation");
  await page.getByLabel("Capability observed on").fill("2020-01-01");
  await page
    .getByRole("button", { name: "Record reported capability" })
    .click();
  await expect(page.getByRole("status")).toContainText("does not qualify");
  await expect(
    page.getByRole("heading", {
      name: `SYNTHETIC machining ${info.project.name} · SYNTHETIC steel`,
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/rfqs/${rfq.id}`);
  await page
    .getByRole("link", { name: "Build and review supplier shortlist" })
    .click();
  await page
    .getByLabel("Search process")
    .fill(`SYNTHETIC machining ${info.project.name}`);
  await page.getByRole("button", { name: "Find capabilities" }).click();
  const candidate = page.getByRole("article", {
    name: `${name} capability`,
    exact: true,
  });
  await expect(
    candidate.getByText("discovered", { exact: true }),
  ).toBeVisible();
  await candidate
    .getByLabel("Proposal reason")
    .fill("SYNTHETIC proposal, human fit review required");
  await candidate.getByRole("button", { name: "Propose supplier" }).click();
  const entry = page.getByRole("article", { name, exact: true });
  await expect(entry.getByText("proposed", { exact: true })).toBeVisible();
  await expect(
    entry.getByRole("option", { name: "Accept part-specific fit" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "engineer@fixture.test");
  const shortlistUrl = `/rfqs/${rfq.id}/shortlist?process=${encodeURIComponent(`SYNTHETIC machining ${info.project.name}`)}`;
  await page.goto(shortlistUrl);
  await entry.getByLabel("Shortlist decision").selectOption("accepted");
  await entry
    .getByLabel("Shortlist review reason")
    .fill("SYNTHETIC attempted acceptance without qualification");
  await entry
    .getByLabel("Part-specific fit evidence")
    .fill("SYNTHETIC fit record");
  await entry.getByRole("button", { name: "Save shortlist review" }).click();
  await expect(entry.getByRole("alert")).toContainText("current requirements");
  for (const state of ["contact_review", "capability_review"])
    await record(
      request,
      operator,
      "suppliers",
      { qualification_state: state, review_note: "SYNTHETIC TEST ONLY" },
      supplier.id,
    );
  const expiry = new Date();
  expiry.setUTCDate(expiry.getUTCDate() + 30);
  await record(
    request,
    engineer,
    "suppliers",
    {
      qualification_state: "qualified",
      qualification_scope: "SYNTHETIC machining steel only",
      evidence_reference: "SYNTHETIC qualification, not a real assessment",
      qualification_expires_on: expiry.toISOString().slice(0, 10),
      review_note: "SYNTHETIC TEST ONLY decision",
    },
    supplier.id,
  );
  await page.reload();
  await expect(entry.getByText("needs review", { exact: true })).toBeVisible();
  await entry
    .getByLabel("Shortlist review reason")
    .fill("SYNTHETIC reproposal after supplier review");
  await entry.getByRole("button", { name: "Save shortlist review" }).click();
  await expect(entry.getByText("proposed", { exact: true })).toBeVisible();
  await entry.getByLabel("Shortlist decision").selectOption("accepted");
  await entry
    .getByLabel("Shortlist review reason")
    .fill("SYNTHETIC fit against exact revision A");
  await entry
    .getByLabel("Part-specific fit evidence")
    .fill("SYNTHETIC TEST ONLY fit evidence A");
  await entry.getByRole("button", { name: "Save shortlist review" }).click();
  await expect(entry.getByText("accepted", { exact: true })).toBeVisible();
  const stale = await page.context().newPage();
  await stale.goto(shortlistUrl);
  await page.goto(`/rfqs/${rfq.id}`);
  await page.getByText("Amend requirements", { exact: true }).click();
  await page.getByLabel("Drawing revision", { exact: true }).fill("B");
  await page
    .getByLabel("Amendment reason")
    .fill("SYNTHETIC updated customer revision");
  await page
    .getByRole("button", { name: "Save amendment and request review" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Requirements amended" }),
  ).toBeVisible();
  await page.goto(shortlistUrl);
  await expect(entry.getByText("needs review", { exact: true })).toBeVisible();
  const staleEntry = stale.getByRole("article", { name, exact: true });
  await staleEntry
    .getByLabel("Shortlist review reason")
    .fill("SYNTHETIC stale reproposal");
  await staleEntry
    .getByRole("button", { name: "Save shortlist review" })
    .click();
  await expect(staleEntry.getByRole("alert")).toContainText("Refresh");
  await stale.close();
  await entry
    .getByLabel("Shortlist review reason")
    .fill("SYNTHETIC review of new revision B");
  await entry.getByRole("button", { name: "Save shortlist review" }).click();
  await entry.getByLabel("Shortlist decision").selectOption("accepted");
  await entry
    .getByLabel("Shortlist review reason")
    .fill("SYNTHETIC attempted acceptance pending RFQ approval");
  await entry
    .getByLabel("Part-specific fit evidence")
    .fill("SYNTHETIC evidence B");
  await entry.getByRole("button", { name: "Save shortlist review" }).click();
  await expect(entry.getByRole("alert")).toContainText("engineering decision");
  const history = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Shortlist history",
      exact: true,
    }),
  });
  const acceptance = history
    .locator("li")
    .filter({ hasText: "SYNTHETIC fit against exact revision A" });
  await acceptance.getByText("Recorded decision and evidence").click();
  await expect(
    acceptance.getByText("SYNTHETIC TEST ONLY fit evidence A", { exact: true }),
  ).toBeVisible();
  await expect(
    acceptance.getByText("TEST ONLY DRAWING · revision A", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-shortlist.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
