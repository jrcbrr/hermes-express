import { cn } from "@/lib/utils";

export type Choice<Value extends string> = {
  value: Value;
  label: string;
  description?: string;
  disabled?: boolean;
};

/** A set of radio buttons drawn as cards, with a legend and an optional error. */
export function ChoiceGroup<Value extends string>({
  name,
  legend,
  choices,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  choices: readonly Choice<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  error?: string;
}) {
  const errorId = error ? `field-${name}-error` : undefined;
  return (
    <fieldset aria-describedby={errorId}>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              choice.disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              disabled={choice.disabled}
              onChange={() => onChange(choice.value)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block font-semibold">{choice.label}</span>
              {choice.description ? (
                <span className="block text-sm text-muted-foreground">
                  {choice.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
