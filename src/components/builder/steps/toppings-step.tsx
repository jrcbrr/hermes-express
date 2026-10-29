import { MAX_TOPPINGS } from "@/lib/validation/drink";
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
      noun="toppings"
      max={MAX_TOPPINGS}
      options={toChoices(catalog.toppings, unavailable)}
      selected={draft.toppings}
      onToggle={(topping) => dispatch({ type: "toggleTopping", topping })}
    />
  );
}
