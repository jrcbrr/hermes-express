"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeFavorite } from "@/server/favorites/actions";

export function RemoveFavoriteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeFavorite(id);
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        className="h-11 self-start px-4"
        disabled={pending}
        onClick={remove}
        aria-label={`Remove ${name} from favorites`}
      >
        Remove
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
