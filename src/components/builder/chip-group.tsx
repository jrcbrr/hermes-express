import { choiceCard, ChoiceText, type ChoiceOption } from "./option-group";

/**
 * Pick as many as you like: checkboxes styled as cards. Sold-out options are
 * disabled, but one already chosen can always be removed.
 */
export function ChipGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: ChoiceOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full justify-between gap-2 text-sm font-semibold">
        <span>{legend}</span>
        <span className="font-normal text-muted-foreground">
          {selected.length === 0 ? "None chosen" : `${selected.length} chosen`}
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
                disabled={!checked && option.disabled}
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
