"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
export function CopyReference({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="copy-reference">
      <span className="eyebrow">RECORD</span>
      <code title={id}>{id.slice(0, 8)}</code>
      <button
        aria-label="Copy record reference"
        className="icon-button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setState("copied");
          } catch {
            setState("error");
          }
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setState("idle"), 2500);
        }}
      >
        {state === "copied" ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <span role="status" aria-label="Copy feedback">
        {state === "copied"
          ? "Copied"
          : state === "error"
            ? "Copy unavailable"
            : ""}
      </span>
    </div>
  );
}
