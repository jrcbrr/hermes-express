import { Check } from "lucide-react";
import { STEPS, stepIndex, type StepId } from "@/lib/builder/state";
import { cn } from "@/lib/utils";

/** The six steps. Steps already reachable can be opened directly. */
export function StepProgress({
  current,
  furthest,
  onSelect,
}: {
  current: StepId;
  furthest: StepId;
  onSelect: (step: StepId) => void;
}) {
  const currentIndex = stepIndex(current);
  const furthestIndex = stepIndex(furthest);
  return (
    <nav aria-label="Builder steps">
      <p className="mb-2 text-sm text-muted-foreground">
        Step {currentIndex + 1} of {STEPS.length}
      </p>
      <ol className="flex gap-1">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                disabled={index > furthestIndex}
                onClick={() => onSelect(step.id)}
                className={cn(
                  "flex h-11 w-full flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[0.6875rem] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-full rounded-full",
                    isCurrent || isDone ? "bg-primary" : "bg-surface-muted",
                  )}
                />
                <span className="flex max-w-full items-center gap-0.5">
                  {isDone ? (
                    <Check className="size-3 shrink-0" aria-hidden="true" />
                  ) : null}
                  <span className="truncate">{step.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
