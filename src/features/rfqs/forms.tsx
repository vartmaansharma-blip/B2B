import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import type { Rfq, Role } from "@/lib/types";
import { createCustomer, createRfq, reviewRfq } from "./actions";
import { engineeringStates, rfqTransitions } from "./model";
export function CustomerForm() {
  return (
    <ActionForm action={createCustomer} label="Add customer and continue">
      <Field label="Customer business name" name="name">
        <input id="name" name="name" required maxLength={200} />
      </Field>
      <Field
        label="Intake reference"
        name="reference"
        hint="Private business reference only. Keep contact details and confidential documents in approved systems."
      >
        <textarea id="reference" name="reference" required maxLength={2000} />
      </Field>
    </ActionForm>
  );
}
export function RfqForm({ customerId }: { customerId: string }) {
  return (
    <ActionForm action={createRfq} label="Create draft RFQ">
      <input type="hidden" name="customer_id" value={customerId} />
      <Field label="RFQ title / part name" name="title">
        <input id="title" name="title" required maxLength={200} />
      </Field>
      <Field
        label="Part requirements"
        name="part_description"
        hint="Describe process, material, tolerances, and inspection requirements. Use a controlled reference for confidential specifications."
      >
        <textarea
          id="part_description"
          name="part_description"
          required
          maxLength={4000}
        />
      </Field>
      <Field
        label="Controlled drawing reference (optional)"
        name="drawing_reference"
        hint="Reference only. File uploads are outside V0."
      >
        <input
          id="drawing_reference"
          name="drawing_reference"
          maxLength={2000}
        />
      </Field>
      <div className="form-grid">
        <Field label="Quantity" name="quantity">
          <input
            id="quantity"
            name="quantity"
            type="number"
            required
            min={1}
            max={1000000000}
            step={1}
          />
        </Field>
        <Field label="Unit" name="unit">
          <input
            id="unit"
            name="unit"
            required
            maxLength={40}
            defaultValue="pieces"
          />
        </Field>
        <Field label="Customer target date (optional)" name="target_date">
          <input id="target_date" name="target_date" type="date" />
        </Field>
      </div>
    </ActionForm>
  );
}
export function RfqReviewForm({ rfq, role }: { rfq: Rfq; role: Role }) {
  return (
    <ActionForm action={reviewRfq} label="Save RFQ review">
      <input type="hidden" name="id" value={rfq.id} />
      <input type="hidden" name="version" value={rfq.version} />
      <Field label="RFQ status" name="status">
        <select id="status" name="status" defaultValue={rfq.status}>
          {[rfq.status, ...rfqTransitions[rfq.status]].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      {role !== "operator" ? (
        <>
          <Field label="Engineering decision" name="engineering_state">
            <select
              id="engineering_state"
              name="engineering_state"
              defaultValue={rfq.engineering_state}
            >
              {engineeringStates.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Engineering review note" name="engineering_note">
            <textarea
              id="engineering_note"
              name="engineering_note"
              maxLength={4000}
              defaultValue={rfq.engineering_note ?? ""}
            />
          </Field>
        </>
      ) : (
        <>
          <input
            type="hidden"
            name="engineering_state"
            value={rfq.engineering_state}
          />
          <input
            type="hidden"
            name="engineering_note"
            value={rfq.engineering_note ?? ""}
          />
          <p>Engineering decisions require an engineer or administrator.</p>
        </>
      )}
    </ActionForm>
  );
}
