import { useId } from "react";
import { cn } from "@/lib/utils";

export type ChoiceOption = {
  value: string;
  label: string;
  /** Short detail on the right, usually the price ("+₱20"). */
  detail?: string;
  /** Liquid colour shown as a small dot (ingredient data, not a theme colour). */
  swatch?: string | null;
  disabled?: boolean;
  /** Why the option is disabled, e.g. "Sold out at this branch". */
  note?: string;
};

export const choiceCard =
  "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-muted has-checked:border-primary has-checked:bg-primary/10 has-checked:font-semibold has-disabled:cursor-not-allowed has-disabled:opacity-60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

export function Swatch({ color }: { color: string | null | undefined }) {
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 rounded-full border border-foreground/20"
      style={{ backgroundColor: color }}
    />
  );
}

export function ChoiceText({ option }: { option: ChoiceOption }) {
  return (
    <>
      <Swatch color={option.swatch} />
      <span className="flex flex-1 flex-col">
        <span>{option.label}</span>
        {option.note ? (
          <span className="text-xs font-normal text-danger">{option.note}</span>
        ) : null}
      </span>
      {option.detail ? (
        <span className="text-xs font-normal text-muted-foreground">
          {option.detail}
        </span>
      ) : null}
    </>
  );
}

/** Pick one: a fieldset of radio buttons styled as cards. Arrow keys move between them. */
export function OptionGroup({
  legend,
  options,
  value,
  onChange,
  columns = 2,
}: {
  legend: string;
  options: ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 2 | 3;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div
        className={cn(
          "grid gap-2",
          columns === 3 ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {options.map((option) => (
          <label key={option.value} className={choiceCard}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <ChoiceText option={option} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
