import Link from "next/link";
import { listSuppliers } from "@/features/suppliers/queries";
import {
  effectiveQualification,
  qualifications,
} from "@/features/suppliers/model";
import { Badge } from "@/components/badge";
import { Pagination } from "@/components/pagination";
import { pageNumber, searchTerm } from "@/lib/pagination";
export default async function Suppliers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; state?: string }>;
}) {
  const params = await searchParams;
  const page = pageNumber(params.page),
    q = searchTerm(params.q),
    state = params.state ?? "";
  const { suppliers, count } = await listSuppliers(page, q, state);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">NETWORK / SUPPLIERS</span>
          <h1>Supplier registry</h1>
          <p>
            A private record of capabilities, provenance, and engineering
            decisions.
          </p>
        </div>
        <Link className="button" href="/suppliers/new">
          Add supplier
        </Link>
      </div>
      <form className="filters" method="get">
        <label htmlFor="q">
          Business name
          <input
            id="q"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Search suppliers"
          />
        </label>
        <label htmlFor="state">
          Recorded state
          <select id="state" name="state" defaultValue={state}>
            <option value="">All states</option>
            {qualifications.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary">Filter</button>
      </form>
      <p className="muted">
        Filters use the recorded state; expired qualifications display as
        “review expired”. Reported capabilities remain unverified until
        reviewed.
      </p>
      <section className="panel table-panel">
        {suppliers.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Suppliers in your workspace</caption>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Location</th>
                  <th>Reported processes</th>
                  <th>Review state</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/suppliers/${s.id}`}>{s.name}</Link>
                      <small>{s.materials}</small>
                    </td>
                    <td>
                      {s.city}
                      <small>{s.region}</small>
                    </td>
                    <td>{s.processes}</td>
                    <td>
                      <Badge value={effectiveQualification(s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <span className="empty-symbol">⊕</span>
            <h2>{count ? "No records on this page" : "No suppliers found"}</h2>
            <p>Add a supplier with a source reference to begin discovery.</p>
            <Link href="/suppliers/new">Add your first discovery →</Link>
          </div>
        )}
        <Pagination
          page={page}
          count={count}
          base="/suppliers"
          query={q}
          state={state}
        />
      </section>
    </>
  );
}
