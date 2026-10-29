import { isNotServedHot } from "@/lib/builder/state";
import {
  AMOUNT_LEVELS,
  type DrinkSize,
  type DrinkTemperature,
} from "@/lib/validation/drink";
import { LevelSlider } from "../level-slider";
import { OptionGroup } from "../option-group";
import { AMOUNT_LABELS, toChoices, type StepProps } from "./shared";

export function CupStep({ draft, catalog, unavailable, dispatch }: StepProps) {
  const temperatures = toChoices(catalog.temperatures, unavailable).map(
    (choice) =>
      choice.value === "hot" && isNotServedHot(draft.base)
        ? {
            ...choice,
            disabled: true,
            note: "Not available for your base",
          }
        : choice,
  );

  return (
    <div className="flex flex-col gap-6">
      <OptionGroup
        legend="Size"
        columns={3}
        options={toChoices(catalog.sizes, unavailable)}
        value={draft.size}
        onChange={(size) =>
          dispatch({ type: "setSize", size: size as DrinkSize })
        }
      />
      <OptionGroup
        legend="Temperature"
        columns={3}
        options={temperatures}
        value={draft.temperature}
        onChange={(temperature) =>
          dispatch({
            type: "setTemperature",
            temperature: temperature as DrinkTemperature,
          })
        }
      />
      {draft.temperature === "iced" ? (
        <LevelSlider
          label="Ice"
          levels={AMOUNT_LEVELS}
          value={draft.iceLevel ?? "regular"}
          format={(level) => AMOUNT_LABELS[level]}
          onChange={(level) => dispatch({ type: "setIceLevel", level })}
        />
      ) : null}
    </div>
  );
}
