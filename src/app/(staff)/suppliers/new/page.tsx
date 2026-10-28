import Link from "next/link";
import { requireStaff } from "@/features/auth/server";
import { SupplierForm } from "@/features/suppliers/forms";
export default async function NewSupplier() {
  await requireStaff();
  return (
    <>
      <Link href="/suppliers" className="back-link">
        ← Supplier registry
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DISCOVERY / NEW RECORD</span>
          <h1>Add a supplier</h1>
          <p>
            Every supplier starts as discovered. Reported capabilities are not a
            qualification.
          </p>
        </div>
      </div>
      <section className="panel form-panel">
        <SupplierForm />
      </section>
    </>
  );
}
