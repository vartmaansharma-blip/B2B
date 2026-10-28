import type { ReviewEvent } from "@/lib/types";
import {
  parseRequirementSnapshot,
  type RequirementSnapshot as Snapshot,
} from "@/features/rfqs/model";
export function ReviewHistory({ events }: { events: ReviewEvent[] }) {
  return (
    <section className="panel">
      <h2>Review history</h2>
      <p className="muted">
        Latest 50 decisions and amendments. Previous events remain in the
        private database.
      </p>
      {!events.length ? (
        <p>No reviews recorded.</p>
      ) : (
        <ol className="timeline">
          {events.map((e) => {
            const before = parseRequirementSnapshot(e.requirements_before);
            const after = parseRequirementSnapshot(e.requirements_after);
            return (
              <li key={e.id}>
                <strong>
                  {(e.from_state ?? "new").replaceAll("_", " ")} →{" "}
                  {e.to_state.replaceAll("_", " ")}
                </strong>
                <small>
                  {new Date(e.created_at)
                    .toISOString()
                    .slice(0, 16)
                    .replace("T", " ")}{" "}
                  UTC · Staff {e.actor_id.slice(0, 8)}
                </small>
                {e.note && <p>{e.note}</p>}
                {after && (
                  <details>
                    <summary>
                      {before
                        ? "Requirement amendment"
                        : e.from_state === null
                          ? "Initial requirements"
                          : "Requirements at this decision"}{" "}
                      · version {after.version}
                    </summary>
                    {before && (
                      <RequirementSnapshot label="Before" snapshot={before} />
                    )}
                    <RequirementSnapshot
                      label={before ? "After" : "Recorded"}
                      snapshot={after}
                    />
                  </details>
                )}
                {e.scope && <p>Scope: {e.scope}</p>}
                {e.qualification_expires_on && (
                  <p>Qualification expiry: {e.qualification_expires_on}</p>
                )}
                {e.evidence_reference && (
                  <p>Evidence: {e.evidence_reference}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function RequirementSnapshot({
  label,
  snapshot,
}: {
  label: string;
  snapshot: Snapshot;
}) {
  return (
    <div>
      <h3>
        {label} · version {snapshot.version}
      </h3>
      <dl>
        <dt>Part name</dt>
        <dd>{snapshot.title}</dd>
        <dt>Part specification</dt>
        <dd>{snapshot.part_description}</dd>
        <dt>Controlled drawing reference</dt>
        <dd>{snapshot.drawing_reference ?? "Not provided"}</dd>
        <dt>Drawing revision</dt>
        <dd>{snapshot.drawing_revision ?? "Not provided"}</dd>
        <dt>Quantity</dt>
        <dd>
          {snapshot.quantity} {snapshot.unit}
        </dd>
        <dt>Customer target date</dt>
        <dd>{snapshot.target_date ?? "Not set"}</dd>
      </dl>
    </div>
  );
}
