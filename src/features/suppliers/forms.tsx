import type { Supplier, Role } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import { createSupplier, reviewSupplier } from "./actions";
import { transitions } from "./model";
export function SupplierForm() {
  return (
    <ActionForm action={createSupplier} label="Add discovered supplier">
      <div className="form-grid">
        <Field label="Supplier business name" name="name">
          <input id="name" name="name" required maxLength={200} />
        </Field>
        <Field label="City / industrial cluster" name="city">
          <input id="city" name="city" required maxLength={120} />
        </Field>
        <Field label="State / region" name="region">
          <input id="region" name="region" required maxLength={120} />
        </Field>
        <Field label="Observed on" name="observed_on">
          <input
            id="observed_on"
            name="observed_on"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>
      </div>
      <Field
        label="Reported processes"
        name="processes"
        hint="Record what the source reports. This is not verified capability."
      >
        <textarea id="processes" name="processes" required maxLength={2000} />
      </Field>
      <Field label="Reported materials" name="materials">
        <textarea id="materials" name="materials" required maxLength={2000} />
      </Field>
      <Field
        label="Discovery source / reference"
        name="source_reference"
        hint="Use a directory entry, referral reference, or visit record. Do not paste personal contact details."
      >
        <textarea
          id="source_reference"
          name="source_reference"
          required
          maxLength={2000}
        />
      </Field>
      <Field label="Public source URL (optional)" name="source_url">
        <input id="source_url" name="source_url" type="url" maxLength={2000} />
      </Field>
    </ActionForm>
  );
}
export function QualificationForm({
  supplier,
  role,
}: {
  supplier: Supplier;
  role: Role;
}) {
  const choices = [
    supplier.qualification_state,
    ...transitions[supplier.qualification_state],
  ].filter((s) => s !== "qualified" || role !== "operator");
  if (!choices.length)
    return <p>An engineer must review this qualification.</p>;
  return (
    <ActionForm action={reviewSupplier} label="Record review">
      <input type="hidden" name="id" value={supplier.id} />
      <input type="hidden" name="version" value={supplier.version} />
      <Field label="Qualification state" name="qualification_state">
        <select
          id="qualification_state"
          name="qualification_state"
          defaultValue={choices[0]}
        >
          {choices.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Scope of qualification"
        name="qualification_scope"
        hint="Specify process, material, tolerances, and applicable limitations."
      >
        <textarea
          id="qualification_scope"
          name="qualification_scope"
          defaultValue={supplier.qualification_scope ?? ""}
          maxLength={2000}
        />
      </Field>
      <Field
        label="Private evidence reference"
        name="evidence_reference"
        hint="Reference a controlled assessment or inspection record. Do not upload drawings or rates here."
      >
        <textarea
          id="evidence_reference"
          name="evidence_reference"
          defaultValue={supplier.evidence_reference ?? ""}
          maxLength={4000}
        />
      </Field>
      <Field
        label="Qualification expiry"
        name="qualification_expires_on"
        hint="Required for qualification, within the next year. Expired records display as review expired."
      >
        <input
          id="qualification_expires_on"
          name="qualification_expires_on"
          type="date"
          defaultValue={supplier.qualification_expires_on ?? ""}
        />
      </Field>
      <Field label="Review note / reason" name="review_note">
        <textarea
          id="review_note"
          name="review_note"
          required
          maxLength={4000}
        />
      </Field>
    </ActionForm>
  );
}
