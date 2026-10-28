import Link from "next/link";
export default function Setup() {
  return (
    <main id="main" className="standalone">
      <span className="eyebrow">MANUFACTURING OS / SETUP</span>
      <h1>Connect your private workspace</h1>
      <p>
        The app needs a Supabase connection before staff can sign in. No sample
        records or qualification claims are loaded.
      </p>
      <ol>
        <li>
          Follow <code>docs/environment.md</code> in the repository.
        </li>
        <li>Apply the migrations to a local or approved staging database.</li>
        <li>
          Set the public URL and publishable key in <code>.env.local</code>.
        </li>
        <li>Invite staff and provision their organization membership.</li>
      </ol>
      <Link href="/login">Back to sign in →</Link>
    </main>
  );
}
