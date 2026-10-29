import { isNotServedHot } from "@/lib/builder/state";
import { formatPeso } from "@/lib/money";
import { MAX_SHOTS, MIN_SHOTS } from "@/lib/validation/drink";
import { OptionGroup } from "../option-group";
import { Stepper } from "../stepper";
import { toChoices, type StepProps } from "./shared";

export function BaseStep({ draft, catalog, unavailable, dispatch }: StepProps) {
  const bases = toChoices(catalog.bases, unavailable, formatPeso).map(
    (choice) =>
      draft.temperature === "hot" &&
      isNotServedHot(choice.value) &&
      !choice.disabled
        ? { ...choice, disabled: true, note: "Served iced or blended only" }
        : choice,
  );
  const included =
    catalog.bases.find((b) => b.slug === draft.base)?.includedShots ?? null;
  const shotPrice = catalog.extraShotCentavos;

  return (
    <div className="flex flex-col gap-6">
      <OptionGroup
        legend="Choose a base"
        options={bases}
        value={draft.base}
        onChange={(slug) => dispatch({ type: "setBase", base: slug })}
      />
      {included !== null ? (
        <div>
          <Stepper
            label="Espresso shots"
            unit="shot"
            value={draft.shots ?? included}
            min={MIN_SHOTS}
            max={shotPrice === null ? included : MAX_SHOTS}
            onChange={(shots) => dispatch({ type: "setShots", shots })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {shotPrice === null
              ? "Extra shots are unavailable at the moment."
              : `Includes ${included} ${included === 1 ? "shot" : "shots"}. Each extra shot is +${formatPeso(shotPrice)}.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
