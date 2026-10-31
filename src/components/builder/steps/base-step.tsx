"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { saveDraft } from "@/lib/builder/saved-draft";
import { isNotServedHot } from "@/lib/builder/state";
import { formatPeso } from "@/lib/money";
import { MAX_SHOTS, MIN_SHOTS } from "@/lib/validation/drink";
import { OptionGroup } from "../option-group";
import { Stepper } from "../stepper";
import { toChoices, type StepProps } from "./shared";

// Loaded only when opened: most customers will never play.
const PerfectPour = dynamic(
  () => import("../perfect-pour").then((module) => module.PerfectPour),
  { loading: () => <Skeleton className="h-72 w-full rounded-2xl" /> },
);

export function BaseStep({ draft, catalog, unavailable, dispatch }: StepProps) {
  const [playing, setPlaying] = useState(false);
  const openRef = useRef<HTMLButtonElement>(null);
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
      {playing ? (
        <PerfectPour
          onClose={() => {
            setPlaying(false);
            // The opener returns on the next render; focus it then.
            requestAnimationFrame(() => openRef.current?.focus());
          }}
          onBeforeLogin={() => saveDraft({ draft, step: "base" })}
        />
      ) : (
        <div>
          <Button
            ref={openRef}
            type="button"
            variant="outline"
            className="h-11 px-3 font-semibold"
            onClick={() => setPlaying(true)}
          >
            Try the Perfect Pour
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            An optional game for a badge. It does not change your drink.
          </p>
        </div>
      )}
    </div>
  );
}
