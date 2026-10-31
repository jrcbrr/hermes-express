import { getSession } from "@/server/auth/session";
import { getOrderTracking } from "@/server/orders/queries";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/orders/[id]/status: what the tracker polls every 10 seconds. Only
 * someone who may see the order gets it; "not yours" and "doesn't exist" are
 * both 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/orders/[id]/status">,
) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Please log in." },
      { status: 401, headers: NO_STORE },
    );
  }
  const { id } = await params;
  const tracking = await getOrderTracking(id, session.user);
  if (!tracking) {
    return Response.json(
      { error: "Order not found." },
      { status: 404, headers: NO_STORE },
    );
  }
  return Response.json(tracking, { headers: NO_STORE });
}
