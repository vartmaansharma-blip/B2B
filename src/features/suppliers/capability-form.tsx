import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import { addCapability } from "./capability-actions";
export function CapabilityForm({ supplierId }: { supplierId: string }) {
  return (
    <ActionForm action={addCapability} label="Record reported capability">
      <input type="hidden" name="supplier_id" value={supplierId} />
      <Field label="Process" name="process">
        <input id="process" name="process" required maxLength={200} />
      </Field>
      <Field label="Material / grade" name="material">
        <input id="material" name="material" required maxLength={200} />
      </Field>
      <Field label="Reported tolerance and limitations" name="tolerance_notes">
        <textarea
          id="tolerance_notes"
          name="tolerance_notes"
          required
          maxLength={2000}
        />
      </Field>
      <Field label="Reported inspection methods" name="inspection_notes">
        <textarea
          id="inspection_notes"
          name="inspection_notes"
          required
          maxLength={2000}
        />
      </Field>
      <Field label="Capability evidence reference" name="evidence_reference">
        <textarea
          id="evidence_reference"
          name="evidence_reference"
          required
          maxLength={4000}
        />
      </Field>
      <Field label="Capability observed on" name="observed_on">
        <input
          id="observed_on"
          name="observed_on"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
        />
      </Field>
    </ActionForm>
  );
}
