import Link from "next/link";
import { MotionPreference } from "@/components/motion-preference";
import { QuickFind } from "@/features/search/quick-find";
import { ShieldCheck, LogOut, ArrowUpRight, Hexagon } from "lucide-react";
import { requireStaff } from "@/features/auth/server";
import { signOut } from "@/features/auth/actions";
import {
  WorkspaceNavigation,
  WorkspaceBreadcrumb,
} from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireStaff();
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Manufacturing OS home">
          <span className="brand-mark">
            <Hexagon size={27} strokeWidth={1.6} />
            <span>m</span>
          </span>
          <span className="brand-name">
            Manufacturing<span>OS</span>
          </span>
        </Link>
        <div className="workspace-selector">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Operations workspace</strong>
            <small>Private staff access</small>
          </div>
          <span className="version">V0</span>
        </div>
        <span className="nav-section-label">WORKSPACE</span>
        <WorkspaceNavigation />
        <div className="sidebar-bottom">
          <div className="sidebar-principle">
            <span className="signal-dot" />
            <strong>Evidence before approval.</strong>
            <p>
              Build the network.
              <br />
              Establish the capability.
            </p>
            <Link href="/suppliers">
              Open your registry <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="staff-profile">
            <span className="staff-avatar">
              {role.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{role[0].toUpperCase() + role.slice(1)}</strong>
              <small>Staff workspace</small>
            </div>
            <form action={signOut}>
              <button
                className="icon-button"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <WorkspaceBreadcrumb />
          <QuickFind />
          <MotionPreference />
          <span className="private-indicator">
            <ShieldCheck size={13} />
            Private workspace
          </span>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span>
            MANUFACTURING OS <span className="footer-slash">/</span> V0
          </span>
          <span>Engineering-led. Evidence-first.</span>
        </footer>
      </div>
    </div>
  );
}
