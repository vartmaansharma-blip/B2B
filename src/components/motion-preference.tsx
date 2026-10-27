"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Waves, Pause } from "lucide-react";
const key = "manufacturing-os-motion";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("manufacturing-motion", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("manufacturing-motion", listener);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(key) === "reduced" ? "reduced" : "system";
  } catch {
    return "system";
  }
}
export function MotionPreference() {
  const preference = useSyncExternalStore(subscribe, snapshot, () => "system");
  useEffect(() => {
    document.documentElement.dataset.motion = preference;
  }, [preference]);
  return (
    <button
      className="motion-preference"
      title={
        preference === "reduced"
          ? "Follow your system motion preference"
          : "Use minimal motion throughout the workspace"
      }
      aria-label={
        preference === "reduced" ? "Use system motion" : "Reduce motion"
      }
      onClick={() => {
        try {
          if (preference === "reduced") localStorage.removeItem(key);
          else localStorage.setItem(key, "reduced");
          window.dispatchEvent(new Event("manufacturing-motion"));
        } catch {
          document.documentElement.dataset.motion = "reduced";
        }
      }}
    >
      {preference === "reduced" ? <Pause size={12} /> : <Waves size={12} />}
      <span>{preference === "reduced" ? "Motion reduced" : "Motion"}</span>
    </button>
  );
}
