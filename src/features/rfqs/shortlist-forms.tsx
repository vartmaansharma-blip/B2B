import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import type {
  Rfq,
  RfqShortlist,
  Role,
  Supplier,
  SupplierCapability,
} from "@/lib/types";
import { proposeSupplier, reviewShortlist } from "./shortlist-actions";
export function ProposalForm({
  rfq,
  supplier,
  capability,
}: {
  rfq: Rfq;
  supplier: Supplier;
  capability: SupplierCapability;
}) {
  return (
    <ActionForm action={proposeSupplier} label="Propose supplier">
      <input type="hidden" name="rfq_id" value={rfq.id} />
      <input type="hidden" name="supplier_id" value={supplier.id} />
      <input type="hidden" name="capability_id" value={capability.id} />
      <input
        type="hidden"
        name="requirements_version"
        value={rfq.requirements_version}
      />
      <input type="hidden" name="supplier_version" value={supplier.version} />
      <Field label="Proposal reason" name={`proposal-${capability.id}`}>
        <textarea
          id={`proposal-${capability.id}`}
          name="review_note"
          required
          maxLength={4000}
        />
      </Field>
    </ActionForm>
  );
}
export function ShortlistReviewForm({
  entry,
  rfq,
  supplier,
  role,
  capabilities,
}: {
  entry: RfqShortlist;
  rfq: Rfq;
  supplier: Supplier;
  role: Role;
  capabilities: SupplierCapability[];
}) {
  return (
    <ActionForm action={reviewShortlist} label="Save shortlist review">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="rfq_id" value={rfq.id} />
      <input type="hidden" name="version" value={entry.version} />
      <input
        type="hidden"
        name="requirements_version"
        value={rfq.requirements_version}
      />
      <input type="hidden" name="supplier_version" value={supplier.version} />
      <input
        type="hidden"
        name="rfq_reviewed_at"
        value={rfq.reviewed_at ?? ""}
      />
      <Field label="Shortlist decision" name={`decision-${entry.id}`}>
        <select
          id={`decision-${entry.id}`}
          name="state"
          defaultValue="proposed"
        >
          <option value="proposed">Repropose for current requirements</option>
          {role !== "operator" && entry.state === "proposed" && (
            <option value="accepted">Accept part-specific fit</option>
          )}
          <option value="removed">Remove from shortlist</option>
        </select>
      </Field>
      <Field
        label="Capability observation"
        name={`capability-${entry.id}`}
        hint="Search for newer observations below to make them available for reproposal."
      >
        <select
          id={`capability-${entry.id}`}
          name="capability_id"
          defaultValue={entry.capability_id}
        >
          <option value={entry.capability_id}>Recorded observation</option>
          {capabilities
            .filter((c) => c.id !== entry.capability_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.process} · {c.material} · {c.observed_on}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Shortlist review reason" name={`reason-${entry.id}`}>
        <textarea
          id={`reason-${entry.id}`}
          name="review_note"
          required
          maxLength={4000}
        />
      </Field>
      {role !== "operator" ? (
        <Field
          label="Part-specific fit evidence"
          name={`evidence-${entry.id}`}
          hint="Required for acceptance. Confirm process, material, tolerance, inspection and qualification scope against this drawing revision."
        >
          <textarea
            id={`evidence-${entry.id}`}
            name="fit_evidence_reference"
            maxLength={4000}
          />
        </Field>
      ) : (
        <input type="hidden" name="fit_evidence_reference" value="" />
      )}
    </ActionForm>
  );
}
