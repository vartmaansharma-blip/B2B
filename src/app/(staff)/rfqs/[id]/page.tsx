import Link from "next/link";
import { CopyReference } from "@/components/copy-reference";
import { notFound } from "next/navigation";
import { recordId } from "@/lib/forms";
import { getRfq } from "@/features/rfqs/queries";
import { RfqReviewForm } from "@/features/rfqs/forms";
import { Badge } from "@/components/badge";
import { ReviewHistory } from "@/components/review-history";
export default async function RfqDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!recordId.safeParse(id).success) notFound();
  const { rfq: r, events, role, customerName } = await getRfq(id);
  if (!r) notFound();
  return (
    <>
      <Link className="back-link" href="/rfqs">
        ← Customer RFQs
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RFQ / REQUIREMENT RECORD</span>
          <h1>{r.title}</h1>
          <p>{customerName}</p>
        </div>
        <Badge value={r.status} />
      </div>
      <CopyReference id={r.id} />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Requirements</h2>
            <dl>
              <dt>Part specification</dt>
              <dd>{r.part_description}</dd>
              <dt>Quantity</dt>
              <dd>
                {r.quantity} {r.unit}
              </dd>
              <dt>Customer target date</dt>
              <dd>{r.target_date ?? "Not set"}</dd>
              <dt>Controlled drawing reference</dt>
              <dd>{r.drawing_reference ?? "Not provided"}</dd>
              <dt>Engineering decision</dt>
              <dd>
                <Badge value={r.engineering_state} />
              </dd>
              <dt>Engineering note</dt>
              <dd>{r.engineering_note ?? "No review recorded"}</dd>
            </dl>
          </section>
          <ReviewHistory events={events} />
        </div>
        <section className="panel">
          <h2>Review and progress</h2>
          <p>
            Sourcing requires engineering approval. This record does not
            authorize production.
          </p>
          <RfqReviewForm rfq={r} role={role} />
        </section>
      </div>
    </>
  );
}
