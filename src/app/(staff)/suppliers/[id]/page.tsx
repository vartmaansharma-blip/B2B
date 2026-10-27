import Link from "next/link";
import { CopyReference } from "@/components/copy-reference";
import { notFound } from "next/navigation";
import { recordId } from "@/lib/forms";
import { getSupplier } from "@/features/suppliers/queries";
import { effectiveQualification } from "@/features/suppliers/model";
import { QualificationForm } from "@/features/suppliers/forms";
import { Badge } from "@/components/badge";
import { ReviewHistory } from "@/components/review-history";
export default async function SupplierDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!recordId.safeParse(id).success) notFound();
  const { supplier: s, events, role } = await getSupplier(id);
  if (!s) notFound();
  return (
    <>
      <Link href="/suppliers" className="back-link">
        ← Supplier registry
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SUPPLIER / RECORD</span>
          <h1>{s.name}</h1>
          <p>
            {s.city}, {s.region}
          </p>
        </div>
        <Badge value={effectiveQualification(s)} />
      </div>
      <CopyReference id={s.id} />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Discovery evidence</h2>
            <dl>
              <dt>Reported processes</dt>
              <dd>{s.processes}</dd>
              <dt>Reported materials</dt>
              <dd>{s.materials}</dd>
              <dt>Discovery reference</dt>
              <dd>{s.source_reference}</dd>
              <dt>Observed on</dt>
              <dd>{s.observed_on}</dd>
              {s.source_url && (
                <>
                  <dt>Public source</dt>
                  <dd>
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View source ↗
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </section>
          <section className="panel">
            <h2>Recorded qualification</h2>
            <dl>
              <dt>Scope</dt>
              <dd>{s.qualification_scope ?? "No scope recorded"}</dd>
              <dt>Evidence reference</dt>
              <dd>{s.evidence_reference ?? "No assessment recorded"}</dd>
              <dt>Expires on</dt>
              <dd>{s.qualification_expires_on ?? "Not qualified"}</dd>
            </dl>
            <p className="muted">
              Qualification applies only to the recorded scope and validity
              period. Part-specific acceptance requires engineering review.
            </p>
          </section>
          <ReviewHistory events={events} />
        </div>
        <section className="panel">
          <h2>Record a review</h2>
          <p>Use traceable evidence and a clear reason for each decision.</p>
          <QualificationForm supplier={s} role={role} />
        </section>
      </div>
    </>
  );
}
