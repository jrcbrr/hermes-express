"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { rateItem } from "@/server/ratings/actions";

const STARS = [1, 2, 3, 4, 5] as const;
const COMMENT_MAX_LENGTH = 300;

/** Rate one item: 1 to 5 stars and an optional comment. */
export function RatingForm({
  orderItemId,
  name,
}: {
  orderItemId: string;
  name: string;
}) {
  const id = useId();
  const [stars, setStars] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await rateItem({ orderItemId, stars, comment });
        if (!result.ok) setError(result.message);
      } catch {
        setError("We could not save your rating. Please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="font-semibold">Rate {name}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {STARS.map((value) => (
            <label key={value} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={`${id}-stars`}
                checked={stars === value}
                onChange={() => setStars(value)}
                className="size-4"
              />
              {value} {value === 1 ? "star" : "stars"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-comment`}>Comment (optional)</Label>
        <textarea
          id={`${id}-comment`}
          rows={2}
          maxLength={COMMENT_MAX_LENGTH}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 self-start px-4 font-semibold"
        disabled={stars === null || pending}
        onClick={submit}
        aria-label={`Submit rating for ${name}`}
      >
        {pending ? "Saving…" : "Submit rating"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
