import { signOut } from "@/features/auth/actions";
export default function Denied() {
  return (
    <main id="main" className="standalone">
      <span className="eyebrow">ACCESS RESTRICTED</span>
      <h1>Staff membership required</h1>
      <p>
        Your account has no active workspace membership. Contact your
        administrator.
      </p>
      <form action={signOut}>
        <button>Sign out</button>
      </form>
    </main>
  );
}
