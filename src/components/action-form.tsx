"use client";
import { useActionState, startTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/forms";
export function ActionForm({
  action,
  children,
  label = "Save record",
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="form-stack"
      onSubmit={(event) => {
        // Keep entered values after validation failures and review saves.
        // The action attribute retains progressive enhancement without JavaScript.
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      {!pending && state.error && (
        <p role="alert" className="error-message">
          {state.error}
        </p>
      )}
      {!pending && state.success && (
        <p role="status" aria-label="Save feedback">
          {state.success}
        </p>
      )}
      <button disabled={pending} type="submit">
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
