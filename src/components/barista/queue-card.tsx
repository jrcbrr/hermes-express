"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  advanceStatus,
  nextStatuses,
  type OrderStatus,
} from "@/lib/order-status";
import { formatSlot } from "@/lib/schedule";
import { advanceOrder } from "@/server/barista/actions";
import type { QueueOrder } from "@/server/orders/queries";

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  brewing: "Start brewing",
  ready_for_pickup: "Mark ready for pickup",
  out_for_delivery: "Send out for delivery",
  completed: "Mark completed",
};

/** One order on the board, with its one-tap next-status button. */
export function QueueCard({
  order,
  onMoved,
}: {
  order: QueueOrder;
  onMoved: (orderId: string, to: OrderStatus) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const next = advanceStatus(order.status, order.fulfillment);
  const canCancel = nextStatuses(order.status, order.fulfillment).includes(
    "cancelled",
  );

  const move = (to: OrderStatus) =>
    startTransition(async () => {
      const result = await advanceOrder({ orderId: order.id, to });
      setError(result.ok ? null : result.message);
      setConfirmingCancel(false);
      // On failure too: the order probably moved, so the board should catch up.
      onMoved(order.id, result.ok ? to : order.status);
    });

  return (
    <li
      className="flex flex-col gap-2 rounded-xl border bg-surface p-4"
      data-testid="queue-order"
      data-code={order.code}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/orders/${order.id}`}
          className="font-heading text-lg font-extrabold underline-offset-4 hover:underline"
        >
          {order.code}
        </Link>
        <span className="text-sm font-semibold">
          {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
        </span>
      </div>
      {order.scheduledFor ? (
        <p
          className="self-start rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-accent-foreground"
          data-testid="queue-scheduled"
        >
          Scheduled: {formatSlot(new Date(order.scheduledFor), new Date())}
        </p>
      ) : null}
      <p className="text-sm">
        {order.contactName} · {order.phone}
      </p>
      {order.address ? <p className="text-sm">{order.address}</p> : null}
      <ul className="text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            <span className="font-semibold">
              {item.quantity} × {item.name}
            </span>
            {item.details.length > 0 ? (
              <span className="block text-muted-foreground">
                {item.details.join(" · ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {order.notes ? (
        <p className="text-sm">
          <span className="font-semibold">Note:</span> {order.notes}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {next ? (
        <Button
          size="lg"
          className="h-11 font-semibold"
          disabled={pending}
          onClick={() => move(next)}
        >
          {NEXT_LABELS[next]}
        </Button>
      ) : null}
      {canCancel && !confirmingCancel ? (
        <Button
          variant="ghost"
          size="lg"
          className="h-11"
          disabled={pending}
          onClick={() => setConfirmingCancel(true)}
        >
          Cancel order
        </Button>
      ) : null}
      {confirmingCancel ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            disabled={pending}
            onClick={() => move("cancelled")}
          >
            Confirm cancel
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-11"
            disabled={pending}
            onClick={() => setConfirmingCancel(false)}
          >
            Keep order
          </Button>
        </div>
      ) : null}
    </li>
  );
}
