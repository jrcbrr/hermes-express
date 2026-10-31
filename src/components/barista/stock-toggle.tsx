"use client";

import { useState, useTransition } from "react";
import type { StockItem } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { setSoldOut } from "@/server/barista/actions";

/** One item's sold-out switch. It flips at once and flips back on failure. */
export function StockToggle({
  item,
  kind,
  branchId,
}: {
  item: StockItem;
  kind: "product" | "ingredient";
  branchId: string;
}) {
  const [soldOut, setLocalSoldOut] = useState(item.isSoldOut);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !soldOut;
    setLocalSoldOut(next);
    setError(null);
    startTransition(async () => {
      const result = await setSoldOut({
        branchId,
        kind,
        itemId: item.id,
        soldOut: next,
      });
      if (!result.ok) {
        setLocalSoldOut(!next);
        setError(result.message);
      }
    });
  };

  return (
    <li className="flex flex-col gap-1 rounded-xl border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-medium">{item.name}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "text-sm",
              soldOut ? "font-semibold text-danger" : "text-muted-foreground",
            )}
          >
            {soldOut ? "Sold out" : "In stock"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={soldOut}
            aria-label={`${item.name} sold out`}
            disabled={pending}
            onClick={toggle}
            className={cn(
              "relative h-7 w-12 rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60",
              soldOut ? "bg-danger" : "bg-muted-foreground/40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-surface transition-transform",
                soldOut && "translate-x-5",
              )}
            />
          </button>
        </span>
      </div>
      {item.blockedBy.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Unavailable because {item.blockedBy.join(", ")}{" "}
          {item.blockedBy.length === 1 ? "is" : "are"} sold out.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}
