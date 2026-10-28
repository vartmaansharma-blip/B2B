import { describe, it, expect } from "vitest";
import {
  supplierSchema,
  qualificationSchema,
  effectiveQualification,
} from "@/features/suppliers/model";
import { rfqSchema, rfqReviewSchema } from "@/features/rfqs/model";
import { readConfig } from "@/lib/env";
import { pageNumber, searchTerm } from "@/lib/pagination";
const id = "10000000-0000-4000-8000-000000000001";
describe("input boundaries", () => {
  const supplier = {
    name: "TEST ONLY",
    city: "Test",
    region: "Test",
    processes: "Test",
    materials: "Test",
    source_reference: "SYNTHETIC",
    source_url: "",
    observed_on: "2020-01-01",
  };
  it("requires provenance and nonblank capabilities", () => {
    expect(supplierSchema.safeParse(supplier).success).toBe(true);
    expect(
      supplierSchema.safeParse({ ...supplier, source_reference: " " }).success,
    ).toBe(false);
    expect(
      supplierSchema.safeParse({ ...supplier, processes: " " }).success,
    ).toBe(false);
  });
  it("rejects future discovery and executable source links", () => {
    expect(
      supplierSchema.safeParse({ ...supplier, observed_on: "2999-01-01" })
        .success,
    ).toBe(false);
    expect(
      supplierSchema.safeParse({
        ...supplier,
        source_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
  it("requires qualification evidence, scope and expiry", () => {
    expect(
      qualificationSchema.safeParse({
        id,
        version: 1,
        qualification_state: "qualified",
        qualification_scope: "",
        evidence_reference: "",
        review_note: "TEST ONLY",
        qualification_expires_on: "",
      }).success,
    ).toBe(false);
  });
  it.each([0, -1, 1.5, 1000000001, Infinity, NaN])(
    "rejects invalid RFQ quantity %s",
    (quantity) => {
      expect(
        rfqSchema.safeParse({
          customer_id: id,
          title: "TEST",
          part_description: "TEST",
          drawing_reference: "",
          drawing_revision: "",
          quantity,
          unit: "pieces",
          target_date: "",
        }).success,
      ).toBe(false);
    },
  );
  it("rejects sourcing without approval", () => {
    expect(
      rfqReviewSchema.safeParse({
        id,
        version: 1,
        status: "sourcing",
        engineering_state: "pending",
        engineering_note: "",
      }).success,
    ).toBe(false);
  });
  it("shows expired qualifications without claiming validity", () => {
    expect(
      effectiveQualification(
        {
          qualification_state: "qualified",
          qualification_expires_on: "2020-01-01",
        },
        "2026-10-27",
      ),
    ).toBe("review_expired");
    expect(
      effectiveQualification({
        qualification_state: "qualified",
        qualification_expires_on: null,
      }),
    ).toBe("review_expired");
  });
  it("constrains pagination and filter syntax", () => {
    expect(pageNumber("-1")).toBe(1);
    expect(pageNumber("9999999999")).toBe(10000);
    expect(searchTerm("%(acme)_")).toBe("acme");
  });
});
describe("connection safety", () => {
  it("fails closed without config", () => {
    expect(readConfig({})).toBeNull();
  });
  it.each([
    "sb_secret_do_not_use",
    "service_role",
    "",
    `a.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.c`,
  ])("rejects a privileged or invalid key", (key) => {
    expect(
      readConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toBeNull();
  });
  it("accepts publishable keys and local URLs", () => {
    expect(
      readConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_testonly",
      }),
    ).not.toBeNull();
  });
  it("rejects insecure remote endpoints", () => {
    expect(
      readConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.com",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_testonly",
      }),
    ).toBeNull();
  });
});
