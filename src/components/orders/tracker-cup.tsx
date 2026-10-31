"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import type { OrderStatus } from "@/lib/order-status";

const CUP_INSIDE = "M14 12 L20 68 Q21 74 27 74 H53 Q59 74 60 68 L66 12 Z";
const FULL_Y = 16;
const EMPTY_Y = 76;

/** How high the coffee sits: empty until brewing starts, then full. */
function liquidY(status: OrderStatus): number {
  return status === "received" || status === "cancelled" ? EMPTY_Y : FULL_Y;
}

/** The tracker's cup. It fills slowly while the order is brewing. */
export function TrackerCup({ status }: { status: OrderStatus }) {
  const clipId = useId();
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 80 80"
      className="size-20 shrink-0 text-foreground"
      aria-hidden="true"
      data-testid="tracker-cup"
      data-fill={liquidY(status) === FULL_Y ? "full" : "empty"}
    >
      <clipPath id={clipId}>
        <path d={CUP_INSIDE} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <motion.rect
          x="0"
          width="80"
          height="80"
          className="fill-coffee-espresso"
          // Opening the page mid-brew still shows the cup filling.
          initial={status === "brewing" ? { y: EMPTY_Y } : false}
          animate={{ y: liquidY(status) }}
          transition={
            reduced ? { duration: 0 } : { duration: 8, ease: "easeInOut" }
          }
        />
      </g>
      <path
        d={CUP_INSIDE}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </svg>
  );
}
