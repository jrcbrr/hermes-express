import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeList } from "@/components/rewards/badge-list";
import { BadgeNotice } from "@/components/rewards/badge-notice";
import { formatPeso } from "@/lib/money";
import {
  CENTAVOS_PER_POINT,
  REWARD_TIERS,
  type PointsReason,
} from "@/lib/points";
import { formatReceiptDateTime } from "@/lib/receipt";
import { requireUser } from "@/server/auth/session";
import { listEarnedBadges, listPointsHistory } from "@/server/rewards/queries";

export const metadata: Metadata = { title: "Rewards" };

function historyLabel(reason: PointsReason, delta: number, note: string) {
  if (note) return note;
  if (reason === "earn") return "Earned from an order";
  if (reason === "redeem") return delta < 0 ? "Free drink" : "Points returned";
  return "Adjustment";
}

async function RewardsContent() {
  const user = await requireUser("/rewards");
  const [history, badges] = await Promise.all([
    listPointsHistory(user.id),
    listEarnedBadges(user.id),
  ]);
  const balance = user.pointsBalance ?? 0;

  return (
    <>
      <section
        aria-label="Your points"
        className="mt-6 rounded-2xl border bg-surface p-6"
      >
        <p className="text-sm text-muted-foreground">Your balance</p>
        <p
          className="font-heading text-4xl font-extrabold"
          data-testid="points-balance"
        >
          {balance} points
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Earn 1 point for every {formatPeso(CENTAVOS_PER_POINT)} spent, after
          discounts and without the delivery fee. Points arrive when your order
          is completed.
        </p>
      </section>

      <section aria-labelledby="redeem-heading" className="mt-8">
        <h2 id="redeem-heading" className="font-heading text-xl font-extrabold">
          Free drinks
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {REWARD_TIERS.map((tier) => (
            <li key={tier.size} className="rounded-xl border bg-surface p-4">
              <p className="font-semibold">Free {tier.size} drink</p>
              <p className="text-sm text-muted-foreground">
                {tier.points} points
                {balance >= tier.points ? " · You have enough" : ""}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose your free drink at checkout. Add-ons are still charged.
        </p>
      </section>

      <section aria-labelledby="badges-heading" className="mt-8">
        <h2
          id="badges-heading"
          className="mb-3 font-heading text-xl font-extrabold"
        >
          Badges
        </h2>
        <BadgeList earned={badges} />
      </section>

      <section aria-labelledby="history-heading" className="mt-8">
        <h2
          id="history-heading"
          className="font-heading text-xl font-extrabold"
        >
          Points history
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-muted-foreground">No points yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex items-baseline justify-between gap-3 rounded-xl border bg-surface p-3 text-sm"
              >
                <span className="min-w-0">
                  {row.orderId ? (
                    <Link
                      href={`/orders/${row.orderId}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {historyLabel(row.reason, row.delta, row.note)}
                    </Link>
                  ) : (
                    historyLabel(row.reason, row.delta, row.note)
                  )}
                  <span className="block text-muted-foreground">
                    {formatReceiptDateTime(row.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {row.delta > 0 ? "+" : "−"}
                  {Math.abs(row.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <BadgeNotice path="/rewards" />
    </>
  );
}

export default function RewardsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Rewards
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your rewards…
          </p>
        }
      >
        <RewardsContent />
      </Suspense>
    </div>
  );
}
