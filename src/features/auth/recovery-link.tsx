"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { acceptRecoverySession } from "./recovery-actions";
import { readRecoveryFragment } from "./recovery-model";

const invalidLink =
  "This reset link is invalid or expired. Request a new link from your administrator.";

export function RecoveryLink() {
  const [error, setError] = useState("");
  const operation = useRef<Promise<{ ok?: boolean; error?: string }> | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    if (!operation.current) {
      const input = readRecoveryFragment(window.location.hash);
      // Strip bearer credentials before any request or navigation. Never persist or log them.
      window.history.replaceState(null, "", window.location.pathname);
      operation.current = input
        ? acceptRecoverySession(input)
        : Promise.resolve({ error: invalidLink });
    }
    void operation.current
      .then((result) => {
        if (!active) return;
        if (result.ok) window.location.replace("/set-password");
        else setError(result.error || invalidLink);
      })
      .catch(() => {
        if (active) setError(invalidLink);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <p role={error ? "alert" : "status"} aria-label="Password reset feedback">
        {error || "Verifying your reset link…"}
      </p>
      {error && <Link href="/login">Return to sign in</Link>}
    </>
  );
}
