import { choiceCard, ChoiceText, type ChoiceOption } from "./option-group";

/**
 * Pick up to `max`: checkboxes styled as cards. Once the limit is reached,
 * the unchosen ones are disabled (chosen ones can always be removed).
 */
export function ChipGroup({
  legend,
  noun,
  options,
  selected,
  max,
  onToggle,
}: {
  legend: string;
  /** Plural, for the counter: "syrups", "toppings". */
  noun: string;
  options: ChoiceOption[];
  selected: readonly string[];
  max: number;
  onToggle: (value: string) => void;
}) {
  const full = selected.length >= max;
  return (
    <fieldset>
      <legend className="mb-2 flex w-full justify-between gap-2 text-sm font-semibold">
        <span>{legend}</span>
        <span className="font-normal text-muted-foreground">
          {selected.length} of {max} {noun}
        </span>
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label key={option.value} className={choiceCard}>
              <input
                type="checkbox"
                value={option.value}
                checked={checked}
                disabled={!checked && (option.disabled || full)}
                onChange={() => onToggle(option.value)}
                className="sr-only"
              />
              <ChoiceText option={option} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
