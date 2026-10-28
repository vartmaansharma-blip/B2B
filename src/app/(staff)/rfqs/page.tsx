import Link from "next/link";
import { listRfqs } from "@/features/rfqs/queries";
import { rfqStatuses } from "@/features/rfqs/model";
import { Badge } from "@/components/badge";
import { Pagination } from "@/components/pagination";
import { pageNumber, searchTerm } from "@/lib/pagination";
export default async function Rfqs({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; state?: string }>;
}) {
  const params = await searchParams;
  const page = pageNumber(params.page),
    q = searchTerm(params.q),
    state = params.state ?? "";
  const { rfqs, count } = await listRfqs(page, q, state);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMERS / REQUIREMENTS</span>
          <h1>Customer RFQs</h1>
          <p>
            Capture requirements, resolve engineering questions, and track
            sourcing readiness.
          </p>
        </div>
        <Link className="button" href="/rfqs/customers">
          Create RFQ
        </Link>
      </div>
      <div className="notice">
        <strong>Requirements and review</strong>
        <span>
          Engineering approval permits sourcing workflow. It does not approve
          production, a purchase order, or delivery.
        </span>
      </div>
      <form className="filters" method="get">
        <label htmlFor="q">
          RFQ title
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search RFQs"
            maxLength={100}
          />
        </label>
        <label htmlFor="state">
          Status
          <select id="state" name="state" defaultValue={state}>
            <option value="">All statuses</option>
            {rfqStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="secondary">Filter</button>
      </form>
      <section className="panel table-panel">
        {rfqs.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Customer requests for quotation
              </caption>
              <thead>
                <tr>
                  <th>RFQ / part</th>
                  <th>Quantity</th>
                  <th>Target date</th>
                  <th>Status</th>
                  <th>Engineering</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/rfqs/${r.id}`}>{r.title}</Link>
                      <small>{r.part_description.slice(0, 120)}</small>
                    </td>
                    <td>
                      {r.quantity} {r.unit}
                    </td>
                    <td>{r.target_date ?? "Not set"}</td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                    <td>
                      <Badge value={r.engineering_state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <span className="empty-symbol">▤</span>
            <h2>No RFQs found</h2>
            <p>Select or add a customer to create a draft requirement.</p>
            <Link href="/rfqs/customers">Create a customer RFQ →</Link>
          </div>
        )}
        <Pagination
          page={page}
          count={count}
          base="/rfqs"
          query={q}
          state={state}
        />
      </section>
    </>
  );
}
