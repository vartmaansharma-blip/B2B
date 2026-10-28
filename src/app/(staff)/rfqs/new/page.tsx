import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { recordId } from "@/lib/forms";
import { getCustomer } from "@/features/rfqs/queries";
import { RfqForm } from "@/features/rfqs/forms";
export default async function NewRfq({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  if (!customer) redirect("/rfqs/customers");
  if (!recordId.safeParse(customer).success) notFound();
  const record = await getCustomer(customer);
  if (!record) notFound();
  return (
    <>
      <Link href="/rfqs/customers" className="back-link">
        ← Choose another customer
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REQUIREMENTS / NEW RFQ</span>
          <h1>Create a draft RFQ</h1>
          <p>Customer: {record.name}. Engineering review starts as pending.</p>
        </div>
      </div>
      <section className="panel form-panel">
        <RfqForm customerId={record.id} />
      </section>
    </>
  );
}
