"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setProductActive } from "@/server/admin/menu-actions";

/** Shows or hides a product from the menu list. */
export function ProductActiveToggle({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await setProductActive({ id, active: !isActive });
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
        aria-label={`${isActive ? "Hide" : "Show"} ${name}`}
      >
        {isActive ? "Hide" : "Show"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
