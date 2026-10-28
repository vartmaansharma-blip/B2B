import Link from "next/link";
import { requireStaff } from "@/features/auth/server";
import { CustomerForm } from "@/features/rfqs/forms";
export default async function NewCustomer() {
  await requireStaff();
  return (
    <>
      <Link href="/rfqs/customers" className="back-link">
        ← Customer registry
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMER / NEW RECORD</span>
          <h1>Add a customer business</h1>
          <p>Capture a minimal business reference before creating an RFQ.</p>
        </div>
      </div>
      <section className="panel form-panel">
        <CustomerForm />
      </section>
    </>
  );
}
