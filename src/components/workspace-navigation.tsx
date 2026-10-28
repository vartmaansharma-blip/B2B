"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  Files,
  Building2,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/suppliers", label: "Supplier registry", icon: Factory },
  { href: "/rfqs", label: "Customer RFQs", icon: Files },
];
export function WorkspaceNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Main navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
            {active && <span className="active-marker" />}
          </Link>
        );
      })}
      <div className="nav-divider" />
      <span className="nav-section-label">RELATIONSHIPS</span>
      <Link
        href="/rfqs/customers"
        className={path.startsWith("/rfqs/customers") ? "customer-active" : ""}
      >
        <Building2 size={17} strokeWidth={1.7} />
        <span>Customers</span>
        <ArrowUpRight size={13} />
      </Link>
    </nav>
  );
}
export function WorkspaceBreadcrumb() {
  const path = usePathname();
  const section = path.startsWith("/suppliers")
    ? "Supplier registry"
    : path.startsWith("/rfqs")
      ? "Customer RFQs"
      : "Overview";
  return (
    <div className="breadcrumb">
      <span>Workspace</span>
      <ChevronRight size={12} />
      <strong>{section}</strong>
    </div>
  );
}
