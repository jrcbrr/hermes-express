import { AMOUNT_LEVELS } from "@/lib/validation/drink";
import { LevelSlider } from "../level-slider";
import { OptionGroup } from "../option-group";
import { AMOUNT_LABELS, toChoices, type StepProps } from "./shared";

export function MilkStep({ draft, catalog, unavailable, dispatch }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <OptionGroup
        legend="Choose a milk"
        options={toChoices(catalog.milks, unavailable)}
        value={draft.milk}
        onChange={(milk) => dispatch({ type: "setMilk", milk })}
      />
      {draft.milk !== null && draft.milk !== "none" ? (
        <LevelSlider
          label="Milk amount"
          levels={AMOUNT_LEVELS}
          value={draft.milkAmount}
          format={(level) => AMOUNT_LABELS[level]}
          onChange={(amount) => dispatch({ type: "setMilkAmount", amount })}
        />
      ) : null}
    </div>
  );
}
