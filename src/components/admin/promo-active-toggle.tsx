"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setPromoActive } from "@/server/admin/promo-actions";

/** Switches a code on or off from the promos list. */
export function PromoActiveToggle({
  id,
  code,
  isActive,
}: {
  id: string;
  code: string;
  isActive: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await setPromoActive({ id, active: !isActive });
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-11 px-4"
        disabled={pending}
        onClick={toggle}
        aria-label={`Switch ${isActive ? "off" : "on"}: ${code}`}
      >
        {isActive ? "Switch off" : "Switch on"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
