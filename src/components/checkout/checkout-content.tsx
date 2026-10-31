import { connection } from "next/server";
import { MenuUnavailable } from "@/components/menu/menu-unavailable";
import { siteConfig } from "@/config/site";
import { formatPhPhone } from "@/lib/format";
import { isAsapAvailable, scheduleSlots } from "@/lib/schedule";
import { requireUser } from "@/server/auth/session";
import { getSelectedBranchSlug, loadCatalog } from "@/server/catalog/queries";
import { CheckoutForm, type BranchTiming } from "./checkout-form";

/**
 * The live part of /checkout. Login is required; the proxy already sent
 * signed-out visitors to /login, and this checks the session for real.
 */
export async function CheckoutContent() {
  const user = await requireUser("/checkout");
  await connection();
  const [branchSlug, snapshot] = await Promise.all([
    getSelectedBranchSlug(),
    loadCatalog(),
  ]);
  if (!snapshot) return <MenuUnavailable />;

  // Worked out here, on one clock; placeOrder checks the choice again.
  const now = new Date();
  const timings: Record<string, BranchTiming> = Object.fromEntries(
    siteConfig.branches.map((b) => [
      b.slug,
      {
        asap: isAsapAvailable(b, now),
        slots: scheduleSlots(b, now).map((slot) => slot.toISOString()),
      },
    ]),
  );

  return (
    <CheckoutForm
      snapshot={snapshot}
      now={now}
      initialBranch={branchSlug}
      pointsBalance={user.pointsBalance ?? 0}
      timings={timings}
      defaults={{
        contactName: user.name,
        phone: user.phone ? formatPhPhone(user.phone) : "",
        receiptEmail: user.email,
      }}
    />
  );
}
