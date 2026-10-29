import { MAX_SYRUPS, SWEETNESS_LEVELS } from "@/lib/validation/drink";
import { ChipGroup } from "../chip-group";
import { LevelSlider } from "../level-slider";
import { toChoices, type StepProps } from "./shared";

export function SweetenerStep({
  draft,
  catalog,
  unavailable,
  dispatch,
}: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <LevelSlider
        label="Sweetness"
        levels={SWEETNESS_LEVELS}
        value={draft.sweetness}
        format={(level) => `${level}%`}
        onChange={(sweetness) => dispatch({ type: "setSweetness", sweetness })}
      />
      <ChipGroup
        legend="Syrups"
        noun="syrups"
        max={MAX_SYRUPS}
        options={toChoices(catalog.syrups, unavailable)}
        selected={draft.syrups}
        onToggle={(syrup) => dispatch({ type: "toggleSyrup", syrup })}
      />
    </div>
  );
}
