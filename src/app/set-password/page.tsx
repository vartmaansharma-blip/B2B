export const dynamic = "force-dynamic";
import { requireStaff } from "@/features/auth/server";
import { setPassword } from "@/features/auth/actions";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
export default async function Password() {
  await requireStaff();
  return (
    <main id="main" className="standalone">
      <h1>Set your staff password</h1>
      <ActionForm action={setPassword} label="Set password">
        <Field label="New password (12 characters minimum)" name="password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </Field>
        <Field label="Confirm password" name="confirm">
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </Field>
      </ActionForm>
    </main>
  );
}
