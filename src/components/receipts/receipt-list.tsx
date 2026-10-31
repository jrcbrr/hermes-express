import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { formatReceiptDateTime, formatReceiptNumber } from "@/lib/receipt";
import { requireUser } from "@/server/auth/session";
import { listReceiptsForUser } from "@/server/orders/queries";

/** The signed-in customer's receipts, newest first. */
export async function ReceiptList() {
  const user = await requireUser("/receipts");
  const receipts = await listReceiptsForUser(user.id);

  if (receipts.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border bg-surface p-6">
        <p>You have no receipts yet. They will appear here after you order.</p>
        <Link
          href="/menu"
          className={buttonVariants({
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {receipts.map((r) => {
        const number = formatReceiptNumber(r.branchSlug, r.receiptNumber);
        return (
          <li key={r.id}>
            <Link
              href={`/receipts/${r.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border bg-surface p-4 hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{number}</span>
                <span className="block text-sm text-muted-foreground">
                  {formatReceiptDateTime(r.createdAt)} · {r.branchName} ·{" "}
                  {r.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatPeso(r.totalCentavos)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
