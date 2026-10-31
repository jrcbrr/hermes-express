"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BranchService } from "@/config/site";
import {
  nextStatuses,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-status";
import { updateOrderStatus } from "@/server/admin/order-actions";
import { controlClass } from "./admin-ui";

/** Offers only the moves this order can make. Final orders show plain text. */
export function OrderStatusSelect({
  orderId,
  code,
  status,
  fulfillment,
}: {
  orderId: string;
  code: string;
  status: OrderStatus;
  fulfillment: BranchService;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = nextStatuses(status, fulfillment);

  if (options.length === 0) return <span>{ORDER_STATUS_LABELS[status]}</span>;

  const change = (to: OrderStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId, to });
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        // Remounts on a new status, so the select shows the saved one.
        key={status}
        aria-label={`Status of order ${code}`}
        defaultValue={status}
        disabled={pending}
        onChange={(event) => change(event.target.value as OrderStatus)}
        className={controlClass}
      >
        <option value={status}>{ORDER_STATUS_LABELS[status]}</option>
        {options.map((to) => (
          <option key={to} value={to}>
            {ORDER_STATUS_LABELS[to]}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
