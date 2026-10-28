import type { ShortlistEvent } from "@/lib/types";
import { parseShortlistSnapshot } from "./shortlist-model";
export function ShortlistHistory({ events }: { events: ShortlistEvent[] }) {
  return (
    <section className="panel">
      <h2>Shortlist history</h2>
      <p>
        Latest 50 decisions. Earlier events remain in the private audit ledger.
      </p>
      {!events.length && <p>No shortlist decisions recorded.</p>}
      <ol>
        {events.map((e) => {
          const snapshot = parseShortlistSnapshot(e.snapshot);
          const r = snapshot?.requirements_snapshot,
            s = snapshot?.supplier_snapshot;
          return (
            <li key={e.id}>
              <strong>
                {e.from_state ?? "new"} → {e.to_state}
              </strong>
              <p>{e.note}</p>
              <small>
                {new Date(e.created_at).toISOString()} · actor {e.actor_id}
              </small>
              <details>
                <summary>Recorded decision and evidence</summary>
                {r && s ? (
                  <dl>
                    <dt>Supplier</dt>
                    <dd>{s.name}</dd>
                    <dt>Requirements</dt>
                    <dd>
                      {r.title} · {r.part_description}
                    </dd>
                    <dt>Drawing</dt>
                    <dd>
                      {r.drawing_reference ?? "Not provided"} · revision{" "}
                      {r.drawing_revision ?? "Not provided"}
                    </dd>
                    <dt>Quantity</dt>
                    <dd>
                      {r.quantity} {r.unit}
                    </dd>
                    <dt>Target date</dt>
                    <dd>{r.target_date ?? "Not set"}</dd>
                    <dt>Reported capability</dt>
                    <dd>
                      {s.capability.process} · {s.capability.material}
                    </dd>
                    <dt>Tolerance and limitations</dt>
                    <dd>{s.capability.tolerance_notes}</dd>
                    <dt>Inspection</dt>
                    <dd>{s.capability.inspection_notes}</dd>
                    <dt>Capability evidence</dt>
                    <dd>
                      {s.capability.evidence_reference} · observed{" "}
                      {s.capability.observed_on}
                    </dd>
                    <dt>Qualification at proposal</dt>
                    <dd>
                      {s.qualification_state} ·{" "}
                      {s.qualification_scope ?? "No scope"} · expires{" "}
                      {s.qualification_expires_on ?? "Not set"}
                    </dd>
                    <dt>Qualification evidence</dt>
                    <dd>{s.evidence_reference ?? "Not recorded"}</dd>
                    <dt>Part-specific fit evidence</dt>
                    <dd>{snapshot.fit_evidence_reference ?? "Not accepted"}</dd>
                  </dl>
                ) : (
                  <p>
                    Historical snapshot could not be displayed. Ask the
                    workspace administrator to inspect the retained event.
                  </p>
                )}
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
