import { ChipGroup } from "../chip-group";
import { toChoices, type StepProps } from "./shared";

export function ToppingsStep({
  draft,
  catalog,
  unavailable,
  dispatch,
}: StepProps) {
  return (
    <ChipGroup
      legend="Toppings"
      options={toChoices(catalog.toppings, unavailable)}
      selected={draft.toppings}
      onToggle={(topping) => dispatch({ type: "toggleTopping", topping })}
    />
  );
}
