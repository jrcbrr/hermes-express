import { useId } from "react";

/**
 * A slider over a few named levels (e.g. Light / Regular / Extra). A native
 * range input, so arrow keys, Home/End and screen readers work as expected.
 */
export function LevelSlider<T extends string | number>({
  label,
  levels,
  value,
  onChange,
  format = String,
}: {
  label: string;
  levels: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (level: T) => string;
}) {
  const id = useId();
  const index = Math.max(0, levels.indexOf(value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <span className="text-muted-foreground">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={levels.length - 1}
        step={1}
        value={index}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(levels[Number(event.target.value)]!)}
        className="h-11 w-full cursor-pointer accent-primary"
      />
      <div
        aria-hidden="true"
        className="flex justify-between text-xs text-muted-foreground"
      >
        {levels.map((level) => (
          <span key={String(level)}>{format(level)}</span>
        ))}
      </div>
    </div>
  );
}
