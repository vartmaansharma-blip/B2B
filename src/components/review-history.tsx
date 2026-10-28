import type { ReviewEvent } from "@/lib/types";
export function ReviewHistory({ events }: { events: ReviewEvent[] }) {
  return (
    <section className="panel">
      <h2>Review history</h2>
      <p className="muted">
        Latest 50 decisions. Previous events remain in the private database.
      </p>
      {!events.length ? (
        <p>No reviews recorded.</p>
      ) : (
        <ol className="timeline">
          {events.map((e) => (
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
              {e.scope && <p>Scope: {e.scope}</p>}
              {e.qualification_expires_on && (
                <p>Qualification expiry: {e.qualification_expires_on}</p>
              )}
              {e.evidence_reference && <p>Evidence: {e.evidence_reference}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
