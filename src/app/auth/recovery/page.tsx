import { RecoveryLink } from "@/features/auth/recovery-link";

export const dynamic = "force-dynamic";

export default function Recovery() {
  return (
    <main id="main" className="standalone">
      <span className="eyebrow">MANUFACTURING OS / ACCOUNT ACCESS</span>
      <h1>Reset your staff password</h1>
      <RecoveryLink />
    </main>
  );
}
