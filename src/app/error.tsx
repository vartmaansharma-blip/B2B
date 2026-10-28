"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="standalone">
      <h1>Workspace unavailable</h1>
      <p>
        The request could not be completed. Refresh before retrying a save to
        check whether it succeeded. Contact your administrator if this
        continues.
      </p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
