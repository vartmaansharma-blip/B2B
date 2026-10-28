import Link from "next/link";
import { listCustomers } from "@/features/rfqs/queries";
import { pageNumber, searchTerm } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";
export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = pageNumber(params.page),
    q = searchTerm(params.q);
  const { customers, count } = await listCustomers(page, q);
  return (
    <>
      <Link className="back-link" href="/rfqs">
        ← Customer RFQs
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RFQ / SELECT CUSTOMER</span>
          <h1>Customer registry</h1>
          <p>Use an existing business record or add a new customer.</p>
        </div>
        <Link className="button" href="/rfqs/customers/new">
          + Add customer
        </Link>
      </div>
      <form className="filters">
        <label htmlFor="q">
          Business name
          <input id="q" name="q" defaultValue={q} maxLength={100} />
        </label>
        <button className="secondary">Search</button>
      </form>
      <section className="panel table-panel">
        {customers.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Customer businesses</caption>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Intake reference</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.reference}</td>
                    <td>
                      <Link href={`/rfqs/new?customer=${c.id}`}>
                        Create RFQ →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <h2>No customers found</h2>
            <p>Add a customer business to record your first RFQ.</p>
            <Link href="/rfqs/customers/new">Add customer →</Link>
          </div>
        )}
        <Pagination
          page={page}
          count={count}
          base="/rfqs/customers"
          query={q}
        />
      </section>
    </>
  );
}
