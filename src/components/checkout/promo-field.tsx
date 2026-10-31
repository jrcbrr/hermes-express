"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CartItem } from "@/lib/cart";
import { formatPeso } from "@/lib/money";
import { PROMO_CODE_MAX_LENGTH } from "@/lib/validation/checkout";
import { previewPromo } from "@/server/promos/actions";

export type AppliedPromo = {
  code: string;
  discountCentavos: number;
  /** The subtotal this discount was worked out for. */
  forSubtotal: number;
};

const CONNECTION_ERROR =
  "We could not check this code. Please check your connection and try again.";

/** Enter a promo code and see its discount. placeOrder checks it again. */
export function PromoField({
  items,
  branch,
  redeemItemId,
  applied,
  onChange,
}: {
  items: CartItem[];
  branch: string;
  redeemItemId?: string;
  applied: AppliedPromo | null;
  onChange: (promo: AppliedPromo | null) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    if (code.trim() === "") return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewPromo({
          code,
          branch,
          items,
          redeemItemId,
        });
        if (result.ok) {
          onChange(result);
          setCode("");
        } else {
          setError(result.message);
        }
      } catch {
        setError(CONNECTION_ERROR);
      }
    });
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-3 text-sm">
        <p role="status">
          <span className="font-semibold">{applied.code}</span> applied:{" "}
          {formatPeso(applied.discountCentavos)} off.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          onClick={() => onChange(null)}
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-surface p-3">
      <Label htmlFor="field-promoCode">Promo code</Label>
      <div className="flex gap-2">
        <Input
          id="field-promoCode"
          value={code}
          maxLength={PROMO_CODE_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "field-promoCode-error" : undefined}
          className="h-11 uppercase"
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            // Enter applies the code; it must not submit the whole checkout.
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          disabled={pending}
          onClick={apply}
        >
          {pending ? "Checking…" : "Apply"}
        </Button>
      </div>
      {error ? (
        <p
          id="field-promoCode-error"
          role="alert"
          className="text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
