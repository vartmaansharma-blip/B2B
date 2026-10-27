import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Factory,
  Files,
  ScanLine,
  ShieldCheck,
  CircleDashed,
  Check,
  Clock3,
} from "lucide-react";
import { requireStaff } from "@/features/auth/server";
import { TechnicalPart } from "@/components/technical-part";
import { Badge } from "@/components/badge";
import { effectiveQualification } from "@/features/suppliers/model";
export default async function Overview() {
  const { client, organizationId } = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  const [suppliers, qualified, rfqs, reviews, recentSuppliers, recentRfqs] =
    await Promise.all([
      client
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      client
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("qualification_state", "qualified")
        .gt("qualification_expires_on", today),
      client
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .neq("status", "closed"),
      client
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("engineering_state", "pending")
        .neq("status", "closed"),
      client
        .from("suppliers")
        .select("id,name,city,qualification_state,qualification_expires_on")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(4),
      client
        .from("rfqs")
        .select("id,title,engineering_state,status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);
  if (
    [suppliers, qualified, rfqs, reviews, recentSuppliers, recentRfqs].some(
      (r) => r.error,
    )
  )
    throw new Error("Overview unavailable.");
  const stats = [
    {
      label: "Supplier records",
      value: suppliers.count,
      detail: "In your private registry",
      icon: Factory,
      href: "/suppliers",
    },
    {
      label: "Current qualifications",
      value: qualified.count,
      detail: "Within scope and validity",
      icon: ShieldCheck,
      href: "/suppliers?state=qualified",
    },
    {
      label: "Open RFQs",
      value: rfqs.count,
      detail: "Requirements in progress",
      icon: Files,
      href: "/rfqs",
    },
    {
      label: "Awaiting engineering",
      value: reviews.count,
      detail: "A human decision is needed",
      icon: Clock3,
      href: "/rfqs",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR OPERATING PICTURE</span>
          <h1>
            Operations overview<span className="heading-dot">.</span>
          </h1>
          <p>Your supplier network and customer requirements, in one place.</p>
        </div>
        <Link className="button" href="/suppliers/new">
          <Plus size={15} />
          Add supplier
        </Link>
      </div>
      <section className="overview-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="signal-dot" />
            THE FOUNDATION FOR DEPENDABLE SUPPLY
          </span>
          <h2>
            Good manufacturing starts
            <br />
            with good evidence.
          </h2>
          <p>
            Discover the right capabilities. Ask the right questions.
            <br className="desktop-break" /> Put engineering judgment behind
            every approval.
          </p>
          <Link href="/rfqs/customers">
            Record a customer requirement
            <ArrowRight size={15} />
          </Link>
        </div>
        <TechnicalPart />
      </section>
      <section className="metrics" aria-label="Workspace metrics">
        {stats.map(({ label, value, detail, icon: Icon, href }) => (
          <Link className="metric" key={label} href={href}>
            <div className="metric-label">
              <span>{label}</span>
              <Icon size={16} strokeWidth={1.5} />
            </div>
            <strong>{String(value ?? 0).padStart(2, "0")}</strong>
            <small>{detail}</small>
          </Link>
        ))}
      </section>
      <div className="overview-grid">
        <div className="registry-previews">
          <section className="panel preview-panel">
            <div className="panel-heading">
              <div>
                <Factory size={17} />
                <h2>Supplier network</h2>
                <span className="count-chip">{suppliers.count ?? 0}</span>
              </div>
              <Link href="/suppliers">
                View registry
                <ArrowUpRight size={14} />
              </Link>
            </div>
            {recentSuppliers.data?.length ? (
              <div className="preview-rows">
                {recentSuppliers.data.map((s) => (
                  <Link
                    className="preview-row"
                    key={s.id}
                    href={`/suppliers/${s.id}`}
                  >
                    <span className="record-avatar">{s.name.slice(0, 1)}</span>
                    <span className="record-name">
                      <strong>{s.name}</strong>
                      <small>{s.city}</small>
                    </span>
                    <Badge value={effectiveQualification(s)} />
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="preview-empty">
                <div className="empty-graphic">
                  <Factory size={29} strokeWidth={1.2} />
                  <span className="empty-plus">
                    <Plus size={10} />
                  </span>
                </div>
                <h3>Your network begins with a discovery.</h3>
                <p>
                  Add a supplier and the source behind it.
                  <br />
                  Qualification comes after a human review.
                </p>
                <Link href="/suppliers/new">
                  Add your first supplier
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>
          <section className="panel preview-panel">
            <div className="panel-heading">
              <div>
                <Files size={17} />
                <h2>Customer RFQs</h2>
                <span className="count-chip">{rfqs.count ?? 0}</span>
              </div>
              <Link href="/rfqs">
                View RFQs
                <ArrowUpRight size={14} />
              </Link>
            </div>
            {recentRfqs.data?.length ? (
              <div className="preview-rows">
                {recentRfqs.data.map((r) => (
                  <Link
                    className="preview-row"
                    key={r.id}
                    href={`/rfqs/${r.id}`}
                  >
                    <span className="record-avatar">
                      <Files size={15} />
                    </span>
                    <span className="record-name">
                      <strong>{r.title}</strong>
                      <small>{r.status}</small>
                    </span>
                    <Badge value={r.engineering_state} />
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rfq-empty">
                <CircleDashed size={22} strokeWidth={1.3} />
                <div>
                  <h3>No customer requirements yet</h3>
                  <p>
                    Start with a business record, then capture the part
                    requirements.
                  </p>
                </div>
                <Link href="/rfqs/customers" aria-label="Create a customer RFQ">
                  <Plus size={18} />
                </Link>
              </div>
            )}
          </section>
        </div>
        <aside className="operating-guide">
          <div className="guide-heading">
            <ScanLine size={17} />
            <span>HOW WORK MOVES</span>
          </div>
          <h2>
            Build confidence.
            <br />
            One decision at a time.
          </h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Discover</h3>
                <p>Record reported capabilities and a traceable source.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Review</h3>
                <p>
                  Check the process, material, and evidence with engineering.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Qualify</h3>
                <p>
                  Define the scope, record the decision, and set its validity.
                </p>
              </div>
            </li>
          </ol>
          <div className="guide-note">
            <Check size={15} />
            <p>
              <strong>Discovered ≠ qualified.</strong>
              <br />A listing is a lead. Approval is a human decision.
            </p>
          </div>
          <div className="foundation-note">
            <span className="version">V0</span>
            <p>
              Foundation release
              <br />
              <small>No production commitments</small>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
