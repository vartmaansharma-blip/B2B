import Link from "next/link";
import { notFound } from "next/navigation";
import { recordId } from "@/lib/forms";
import { pageNumber } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";
import { getSupplier } from "@/features/suppliers/queries";
import { listCapabilities } from "@/features/suppliers/capability-queries";
import { CapabilityForm } from "@/features/suppliers/capability-form";
export default async function Capabilities({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  if (!recordId.safeParse(id).success) notFound();
  const { supplier } = await getSupplier(id);
  if (!supplier) notFound();
  const page = pageNumber((await searchParams).page);
  const { capabilities, count } = await listCapabilities(id, page);
  return (
    <>
      <Link className="back-link" href={`/suppliers/${id}`}>
        ← Supplier record
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REPORTED CAPABILITIES</span>
          <h1>{supplier.name}</h1>
          <p>
            Source observations support review. They do not establish
            qualification or part-specific fit.
          </p>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>Capability observations</h2>
          <p>
            Observations are retained as recorded. Add a dated correction when
            information changes; assess its evidence before proposing a
            supplier.
          </p>
          {!capabilities.length && <p>No capability observations recorded.</p>}
          {capabilities.map((c) => (
            <article key={c.id}>
              <h3>
                {c.process} · {c.material}
              </h3>
              <dl>
                <dt>Tolerance and limitations</dt>
                <dd>{c.tolerance_notes}</dd>
                <dt>Inspection</dt>
                <dd>{c.inspection_notes}</dd>
                <dt>Evidence</dt>
                <dd>{c.evidence_reference}</dd>
                <dt>Observed on</dt>
                <dd>{c.observed_on}</dd>
              </dl>
            </article>
          ))}
          <Pagination
            page={page}
            count={count}
            base={`/suppliers/${id}/capabilities`}
          />
        </section>
        <section className="panel">
          <h2>Record an observation</h2>
          <CapabilityForm supplierId={id} />
        </section>
      </div>
    </>
  );
}
