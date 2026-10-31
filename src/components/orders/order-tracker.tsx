"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { HermesMascot } from "@/components/brand/hermes-mascot";
import { usePolling } from "@/hooks/use-polling";
import { useSound } from "@/hooks/use-sound";
import {
  isFinalStatus,
  ORDER_STATUS_LABELS,
  trackerStepIndex,
  trackerSteps,
  type OrderStatus,
} from "@/lib/order-status";
import { formatSlotTime } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { OrderTracking } from "@/server/orders/queries";
import { TrackerCup } from "./tracker-cup";

const MESSAGES: Record<OrderStatus, string> = {
  received: "Your order has been received.",
  brewing: "Your order is being prepared.",
  ready_for_pickup: "Your order is ready at the counter.",
  out_for_delivery: "Hermes is on his way with your order.",
  completed: "Your order is complete. Thank you.",
  cancelled: "This order has been cancelled. Please contact the branch.",
};

/** Live order progress: the mascot walks the steps as staff update the order. */
export function OrderTracker({
  orderId,
  initial,
}: {
  orderId: string;
  initial: OrderTracking;
}) {
  const [tracking, setTracking] = useState(initial);
  const { play } = useSound();
  const reduced = useReducedMotion();
  const { status, fulfillment, events } = tracking;

  const { failed } = usePolling<OrderTracking>({
    url: `/api/orders/${orderId}/status`,
    enabled: !isFinalStatus(status),
    onData: (next) => {
      if (next.status !== status) play("ding");
      setTracking(next);
    },
  });

  const steps = trackerSteps(fulfillment);
  const current = trackerStepIndex(status, fulfillment);

  return (
    <div className="flex w-full flex-col gap-4" data-testid="order-tracker">
      <div className="flex items-center gap-4">
        <TrackerCup status={status} />
        <div className="min-w-0">
          <p>
            Status:{" "}
            <span className="font-semibold" data-testid="order-status">
              {ORDER_STATUS_LABELS[status]}
            </span>
          </p>
          <p role="status" className="text-sm text-muted-foreground">
            {MESSAGES[status]}
          </p>
        </div>
      </div>

      {current >= 0 ? (
        <div>
          <div className="relative h-16" aria-hidden="true">
            <motion.div
              className="absolute bottom-0 w-14 text-primary"
              data-testid="tracker-mascot"
              data-step={current}
              initial={false}
              style={{ x: "-50%" }}
              animate={{ left: `${((current + 0.5) / steps.length) * 100}%` }}
              transition={
                reduced ? { duration: 0 } : { duration: 1.2, ease: "easeInOut" }
              }
            >
              <HermesMascot flapping={status === "out_for_delivery"} />
            </motion.div>
          </div>
          <ol className="grid grid-cols-4 gap-1 border-t-2 pt-2 text-center text-xs sm:text-sm">
            {steps.map((step, index) => {
              const at = events.findLast((e) => e.status === step)?.at;
              return (
                <li
                  key={step}
                  aria-current={index === current ? "step" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5",
                    index > current && "text-muted-foreground",
                    index === current && "font-semibold",
                  )}
                >
                  {index < current ? (
                    <Check className="size-4 text-success" aria-label="Done" />
                  ) : null}
                  <span>{ORDER_STATUS_LABELS[step]}</span>
                  {at && index <= current ? (
                    <span className="font-normal text-muted-foreground">
                      {formatSlotTime(new Date(at))}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {failed ? (
        <p className="text-sm text-muted-foreground">
          We could not refresh your order just now. We will try again shortly.
        </p>
      ) : null}
    </div>
  );
}
