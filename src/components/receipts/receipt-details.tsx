import { Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { buildReceipt } from "@/lib/receipt";
import { requireUser } from "@/server/auth/session";
import { getOrderForUser } from "@/server/orders/queries";
import { EmailReceiptButton } from "./email-receipt-button";
import { ReceiptView } from "./receipt-view";

/** One receipt, for its owner (or staff who may see the order). */
export async function ReceiptDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/receipts/${id}`);
  const found = await getOrderForUser(id, user);
  if (!found) notFound();
  const receipt = buildReceipt(found);

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-3 print:hidden">
        <a
          href={`/api/receipts/${found.id}/pdf`}
          download={`${receipt.number}.pdf`}
          className={buttonVariants({
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          <Download className="size-4" aria-hidden="true" />
          Download PDF
        </a>
        {found.userId === user.id && (
          <EmailReceiptButton orderId={found.id} email={found.receiptEmail} />
        )}
        <Link
          href={`/orders/${found.id}`}
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          View order
        </Link>
      </div>
      <ReceiptView receipt={receipt} />
      <Link
        href="/receipts"
        className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline print:hidden"
      >
        All receipts
      </Link>
    </div>
  );
}
