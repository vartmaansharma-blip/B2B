import Link from "next/link";
import { notFound } from "next/navigation";
import { recordId } from "@/lib/forms";
import { pageNumber, searchTerm, PAGE_SIZE } from "@/lib/pagination";
import { Badge } from "@/components/badge";
import { ShortlistHistory } from "@/features/rfqs/shortlist-history";
import { getRfq } from "@/features/rfqs/queries";
import { getShortlist } from "@/features/rfqs/shortlist-queries";
import { effectiveQualification } from "@/features/suppliers/model";
import {
  ProposalForm,
  ShortlistReviewForm,
} from "@/features/rfqs/shortlist-forms";

export default async function ShortlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    candidates?: string;
    process?: string;
    material?: string;
  }>;
}) {
  const { id } = await params;
  if (!recordId.safeParse(id).success) notFound();
  const { rfq, role } = await getRfq(id);
  if (!rfq) notFound();
  const search = await searchParams;
  const page = pageNumber(search.page),
    candidatePage = pageNumber(search.candidates);
  const process = searchTerm(search.process),
    material = searchTerm(search.material);
  const { entries, count, candidates, candidateCount, suppliers, events } =
    await getShortlist(id, page, candidatePage, process, material);
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const href = (p: number, c: number) =>
    `/rfqs/${id}/shortlist?${new URLSearchParams({ page: String(p), candidates: String(c), process, material })}`;
  return (
    <>
      <Link className="back-link" href={`/rfqs/${id}`}>
        ← RFQ requirements and review
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RFQ / SUPPLIER SHORTLIST</span>
          <h1>{rfq.title}</h1>
          <p>
            Drawing {rfq.drawing_reference ?? "not provided"} · revision{" "}
            {rfq.drawing_revision ?? "not provided"} · {rfq.quantity} {rfq.unit}
          </p>
        </div>
        <Badge value={rfq.engineering_state} />
      </div>
      <p>
        Proposals are research leads. Engineering acceptance requires current
        supplier qualification and evidence of fit for these exact requirements.
        Every acceptance must be checked against the current record; it does not
        authorize production or contact a supplier.
      </p>
      <section className="panel">
        <h2>Supplier shortlist</h2>
        {!entries.length && <p>No suppliers proposed for this RFQ.</p>}
        {entries.map((entry) => {
          const supplier = supplierMap.get(entry.supplier_id);
          const state = entry.effective_state;
          return (
            <article
              className="panel"
              key={entry.id}
              aria-label={supplier?.name ?? "Supplier unavailable"}
            >
              <h3>
                {supplier ? (
                  <Link href={`/suppliers/${supplier.id}`}>
                    {supplier.name}
                  </Link>
                ) : (
                  "Supplier unavailable"
                )}
              </h3>
              <Badge value={state} />
              {state === "needs_review" && (
                <p>
                  Requirements, engineering approval, supplier details or
                  qualification changed. Repropose and obtain a fresh
                  engineering decision.
                </p>
              )}
              <p>{entry.review_note}</p>
              <p>
                Part-specific evidence:{" "}
                {entry.fit_evidence_reference ?? "No acceptance recorded"}
              </p>
              {supplier && (
                <ShortlistReviewForm
                  key={`${entry.id}-${entry.version}-${rfq.version}-${supplier.version}`}
                  entry={entry}
                  rfq={rfq}
                  supplier={supplier}
                  role={role}
                  capabilities={candidates.filter(
                    (c) => c.supplier_id === supplier.id,
                  )}
                />
              )}
            </article>
          );
        })}
        <nav className="pagination" aria-label="Shortlist pages">
          {page > 1 && (
            <Link href={href(page - 1, candidatePage)}>
              ← Previous suppliers
            </Link>
          )}
          <span>
            {count} shortlist entries · page {page}
          </span>
          {page * PAGE_SIZE < count && (
            <Link href={href(page + 1, candidatePage)}>Next suppliers →</Link>
          )}
        </nav>
      </section>
      <section className="panel">
        <h2>Find reported capabilities</h2>
        <p>
          Filter source observations by process and material. Results are
          unranked and may be unqualified or outdated. Inspect the evidence and
          observation date.
        </p>
        <form className="form-grid" method="get">
          <div className="field">
            <label htmlFor="process">Search process</label>
            <input
              id="process"
              name="process"
              defaultValue={process}
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="material">Search material / grade</label>
            <input
              id="material"
              name="material"
              defaultValue={material}
              maxLength={100}
            />
          </div>
          <button type="submit">Find capabilities</button>
        </form>
        {!candidates.length && (
          <p>
            No reported capabilities match. Record a dated observation in the
            supplier registry first.
          </p>
        )}
        {candidates.map((c) => {
          const supplier = supplierMap.get(c.supplier_id);
          if (!supplier) return null;
          return (
            <article
              className="panel"
              key={c.id}
              aria-label={`${supplier.name} capability`}
            >
              <h3>
                <Link href={`/suppliers/${supplier.id}/capabilities`}>
                  {supplier.name}
                </Link>{" "}
                · {c.process} · {c.material}
              </h3>
              <Badge value={effectiveQualification(supplier)} />
              <dl>
                <dt>Location</dt>
                <dd>
                  {supplier.city}, {supplier.region}
                </dd>
                <dt>Tolerance and limitations</dt>
                <dd>{c.tolerance_notes}</dd>
                <dt>Inspection</dt>
                <dd>{c.inspection_notes}</dd>
                <dt>Evidence</dt>
                <dd>{c.evidence_reference}</dd>
                <dt>Observed on</dt>
                <dd>{c.observed_on}</dd>
              </dl>
              {rfq.status !== "closed" && (
                <ProposalForm rfq={rfq} supplier={supplier} capability={c} />
              )}
            </article>
          );
        })}
        <nav className="pagination" aria-label="Capability search pages">
          {candidatePage > 1 && (
            <Link href={href(page, candidatePage - 1)}>
              ← Previous capabilities
            </Link>
          )}
          <span>
            {candidateCount} observations · page {candidatePage}
          </span>
          {candidatePage * PAGE_SIZE < candidateCount && (
            <Link href={href(page, candidatePage + 1)}>
              Next capabilities →
            </Link>
          )}
        </nav>
      </section>
      <ShortlistHistory events={events} />
    </>
  );
}
