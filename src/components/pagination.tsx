import Link from "next/link";
import { PAGE_SIZE } from "@/lib/pagination";
export function Pagination({
  page,
  count,
  base,
  query = "",
  state = "",
}: {
  page: number;
  count: number;
  base: string;
  query?: string;
  state?: string;
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (p: number) =>
    `${base}?${new URLSearchParams({ page: String(p), q: query, state })}`;
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}>← Previous</Link> : <span />}
      <span>
        Page {page} of {pages} · {count} records
      </span>
      {page < pages ? <Link href={href(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
