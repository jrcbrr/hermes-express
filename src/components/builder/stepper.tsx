import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";

/** − value + buttons for a small whole number (shots, quantity). */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Singular noun for the button labels: "shot" → "Remove a shot". */
  unit: string;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex items-center gap-3">
      <span id={id} className="flex-1 text-sm font-semibold">
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        className="size-11"
        aria-label={`Remove a ${unit}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden="true" />
      </Button>
      <output aria-live="polite" className="w-8 text-center text-lg font-bold">
        {value}
      </output>
      <Button
        type="button"
        variant="outline"
        className="size-11"
        aria-label={`Add a ${unit}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
