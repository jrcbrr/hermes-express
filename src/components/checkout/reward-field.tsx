import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/money";
import type { DrinkReward } from "@/lib/points";

export type RewardOption = DrinkReward & { itemId: string; name: string };

/** Spend points on one free drink. Add-ons on it are still charged. */
export function RewardField({
  options,
  balance,
  value,
  onChange,
}: {
  options: RewardOption[];
  balance: number;
  value: string;
  onChange: (itemId: string) => void;
}) {
  const affordable = options.filter((option) => option.points <= balance);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-surface p-3">
      <Label htmlFor="field-redeem">
        Use your points ({balance} available)
      </Label>
      {affordable.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {options.length === 0
            ? "Add a drink to your cart to use points."
            : `Free drinks start at ${Math.min(...options.map((o) => o.points))} points for this order.`}
        </p>
      ) : (
        <>
          <select
            id="field-redeem"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          >
            <option value="">No free drink</option>
            {affordable.map((option) => (
              <option key={option.itemId} value={option.itemId}>
                {option.name}: {option.points} points for{" "}
                {formatPeso(option.valueCentavos)} off
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            One free drink per order. Add-ons are still charged.
          </p>
        </>
      )}
    </div>
  );
}
