import { buildReceipt } from "@/lib/receipt";
import { getSession } from "@/server/auth/session";
import { getOrderForUser } from "@/server/orders/queries";
import { renderReceiptPdf } from "@/server/receipts/pdf";

/**
 * GET /api/receipts/[id]/pdf: the receipt as a PDF download. Only someone who
 * may see the order gets it; "not yours" and "doesn't exist" are both 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/receipts/[id]/pdf">,
) {
  const session = await getSession();
  if (!session) {
    return new Response("Please log in to download this receipt.", {
      status: 401,
    });
  }
  const { id } = await params;
  const found = await getOrderForUser(id, session.user);
  if (!found) return new Response("Receipt not found.", { status: 404 });

  const receipt = buildReceipt(found);
  const pdf = await renderReceiptPdf(receipt);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.number}.pdf"`,
      // Receipts hold personal details: never keep them in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
