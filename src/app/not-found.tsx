import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="standalone">
      <h1>Record not found</h1>
      <p>This record is unavailable in your workspace.</p>
      <Link href="/">Return to overview</Link>
    </main>
  );
}
