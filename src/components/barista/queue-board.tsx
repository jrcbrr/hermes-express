"use client";

import { useCallback, useRef, useState } from "react";
import { usePolling } from "@/hooks/use-polling";
import { useSound } from "@/hooks/use-sound";
import { findNewOrders, groupQueue } from "@/lib/order-queue";
import {
  isFinalStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-status";
import type { QueueOrder } from "@/server/orders/queries";
import { QueueCard } from "./queue-card";
import { QueueToast } from "./queue-toast";

/** The live queue for one branch, grouped by status. */
export function QueueBoard({
  branchSlug,
  initialOrders,
}: {
  branchSlug: string;
  initialOrders: QueueOrder[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [toast, setToast] = useState<string | null>(null);
  // Orders already on the board when it opened are not news.
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const { play } = useSound();
  const clearToast = useCallback(() => setToast(null), []);

  const { failed, refresh } = usePolling<{ orders: QueueOrder[] }>({
    url: `/api/barista/queue?branch=${encodeURIComponent(branchSlug)}`,
    onData: (data) => {
      const fresh = findNewOrders(knownIds.current, data.orders);
      if (fresh.length > 0) {
        setToast(
          fresh.length === 1
            ? `New order: ${fresh[0]!.code}`
            : `${fresh.length} new orders`,
        );
        play("ding");
      }
      for (const order of data.orders) knownIds.current.add(order.id);
      setOrders(data.orders);
    },
  });

  const handleMoved = (orderId: string, to: OrderStatus) => {
    setOrders((current) =>
      isFinalStatus(to)
        ? current.filter((o) => o.id !== orderId)
        : current.map((o) => (o.id === orderId ? { ...o, status: to } : o)),
    );
    void refresh();
  };

  return (
    <>
      {failed ? (
        <p className="mt-4 text-sm font-medium text-danger" role="alert">
          We could not refresh the queue. We will try again shortly.
        </p>
      ) : null}
      <div className="mt-6 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-4">
        {groupQueue(orders).map(({ status, orders: group }) => (
          <section
            key={status}
            aria-labelledby={`queue-${status}`}
            data-testid={`queue-group-${status}`}
          >
            <h2
              id={`queue-${status}`}
              className="font-heading text-lg font-extrabold"
            >
              {ORDER_STATUS_LABELS[status]} ({group.length})
            </h2>
            {group.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No orders.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {group.map((order) => (
                  <QueueCard
                    key={order.id}
                    order={order}
                    onMoved={handleMoved}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <QueueToast message={toast} onDone={clearToast} />
    </>
  );
}
