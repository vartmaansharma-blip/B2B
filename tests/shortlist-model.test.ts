import { expect, it } from "vitest";
import {
  parseShortlistStatus,
  parseShortlistSnapshot,
} from "@/features/rfqs/shortlist-model";
const id = "10000000-0000-4000-8000-000000000001";
const row = {
  id,
  organization_id: id,
  rfq_id: id,
  supplier_id: id,
  capability_id: id,
  requirements_version: 1,
  supplier_version: 1,
  version: 1,
  state: "proposed",
  effective_state: "needs_review",
  review_note: "SYNTHETIC",
  fit_evidence_reference: null,
  requirements_snapshot: {},
  supplier_snapshot: {},
  reviewed_by: null,
  reviewed_at: null,
  rfq_reviewed_at: null,
  created_by: id,
  created_at: "2026-10-28T00:00:00Z",
  updated_at: "2026-10-28T00:00:00Z",
};
it("fails closed for nullable generated view fields and unknown workflow states", () => {
  expect(parseShortlistStatus(row)?.effective_state).toBe("needs_review");
  expect(parseShortlistStatus({ ...row, id: null })).toBeNull();
  expect(
    parseShortlistStatus({ ...row, requirements_version: null }),
  ).toBeNull();
  expect(
    parseShortlistStatus({ ...row, effective_state: "production_approved" }),
  ).toBeNull();
  expect(parseShortlistSnapshot({ supplier_snapshot: "malformed" })).toBeNull();
});
