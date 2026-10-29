import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEPS, stepIndex, type StepId } from "@/lib/builder/state";

/** Back and Next. Next explains what is missing when it can't go on yet. */
export function StepNav({
  step,
  canAdvance,
  onBack,
  onNext,
}: {
  step: StepId;
  canAdvance: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const index = stepIndex(step);
  const next = STEPS[index + 1];
  const hint =
    step === "base"
      ? "Choose a base to continue."
      : step === "milk"
        ? "Choose a milk to continue."
        : null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 px-4 font-semibold"
        disabled={index === 0}
        onClick={onBack}
      >
        <ChevronLeft aria-hidden="true" />
        Back
      </Button>
      <p
        aria-live="polite"
        className="flex-1 text-center text-xs text-muted-foreground"
      >
        {!canAdvance && next ? hint : null}
      </p>
      {next ? (
        <Button
          type="button"
          size="lg"
          className="h-11 px-4 font-semibold"
          disabled={!canAdvance}
          onClick={onNext}
        >
          Next: {next.label}
          <ChevronRight aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
