"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BranchPicker } from "@/components/menu/branch-picker";
import { siteConfig } from "@/config/site";
import { useSound } from "@/hooks/use-sound";
import type { BuilderCatalog } from "@/lib/builder/catalog";
import { randomDrink } from "@/lib/builder/random";
import {
  builderRules,
  canAdvance,
  createBuilderState,
  draftFromConfig,
  draftPrice,
  furthestStep,
  reduceBuilder,
  sameDraft,
  STEPS,
  type BuilderAction,
  type BuilderDraft,
  type StepId,
} from "@/lib/builder/state";
import { describeDrink } from "@/lib/builder/visual";
import { branchCookieString } from "@/lib/catalog";
import { formatPeso, multiplyCentavos } from "@/lib/money";
import { BuilderCup } from "./builder-cup";
import { BuilderToolbar } from "./builder-toolbar";
import { PriceBar } from "./price-bar";
import { StepNav } from "./step-nav";
import { StepProgress } from "./step-progress";
import { BaseStep } from "./steps/base-step";
import { CupStep } from "./steps/cup-step";
import { MilkStep } from "./steps/milk-step";
import { ReviewStep } from "./steps/review-step";
import type { StepProps } from "./steps/shared";
import { SweetenerStep } from "./steps/sweetener-step";
import { ToppingsStep } from "./steps/toppings-step";

const STEP_PANELS: Record<
  Exclude<StepId, "review">,
  (props: StepProps) => ReactNode
> = {
  cup: CupStep,
  base: BaseStep,
  milk: MilkStep,
  sweetener: SweetenerStep,
  toppings: ToppingsStep,
};

/**
 * The coffee builder (docs/PLAN.md §5). All state lives in one reducer
 * (src/lib/builder/state.ts); this component wires it to the cup, the step
 * panels, the price bar and the branch picker.
 */
export function CoffeeBuilder({
  catalog,
  start,
  signatureName,
  notice,
  initialBranch,
  soldOutByBranch,
}: {
  catalog: BuilderCatalog;
  start: BuilderDraft;
  signatureName: string | null;
  notice: string | null;
  initialBranch: string;
  soldOutByBranch: Record<string, string[]>;
}) {
  const rules = useMemo(() => builderRules(catalog), [catalog]);
  const [state, dispatchRaw] = useReducer(
    (s: ReturnType<typeof createBuilderState>, a: BuilderAction) =>
      reduceBuilder(s, a, rules),
    start,
    createBuilderState,
  );
  const [branch, setBranch] = useState(initialBranch);
  const [announcement, setAnnouncement] = useState("");
  const { play } = useSound();

  const unavailable = useMemo(
    () => new Set(soldOutByBranch[branch] ?? []),
    [soldOutByBranch, branch],
  );
  const branchName =
    siteConfig.branches.find((b) => b.slug === branch)?.name ?? branch;
  const price = draftPrice(state.draft, catalog.pricing);
  const furthest = furthestStep(state.draft);
  const stepLabel = STEPS.find((s) => s.id === state.step)!.label;

  function dispatch(action: BuilderAction) {
    if (
      action.type === "toggleTopping" &&
      !state.draft.toppings.includes(action.topping)
    ) {
      play("clink");
    }
    dispatchRaw(action);
  }

  function surprise() {
    const drink = randomDrink(catalog, unavailable);
    if (drink === null) {
      setAnnouncement(
        `We cannot make a surprise drink at ${branchName} right now.`,
      );
      return;
    }
    dispatch({ type: "load", draft: draftFromConfig(drink), step: "review" });
  }

  function chooseBranch(slug: string) {
    setBranch(slug);
    document.cookie = branchCookieString(
      slug,
      window.location.protocol === "https:",
    );
  }

  // Tell screen reader users what the drink and price are after each change.
  // Typing a name is skipped so every letter isn't read out.
  const { draft, lastEdit } = state;
  const [spoken, setSpoken] = useState(draft);
  if (!sameDraft(spoken, draft)) {
    setSpoken(draft);
    if (lastEdit !== "name") {
      const prefix =
        lastEdit === "undo"
          ? "Undone. "
          : lastEdit === "reset"
            ? "Reset. "
            : "";
      setAnnouncement(
        `${prefix}${describeDrink(draft, catalog)}.${
          price
            ? ` ${formatPeso(multiplyCentavos(price.unitPriceCentavos, state.quantity))}.`
            : ""
        }`,
      );
    }
  }

  // Move focus to the new step's heading, except on the first render.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(state.step);
  useEffect(() => {
    if (shownStep.current === state.step) return;
    shownStep.current = state.step;
    headingRef.current?.focus();
  }, [state.step]);

  const stepProps: StepProps = { draft, catalog, unavailable, dispatch };
  const Panel = state.step === "review" ? null : STEP_PANELS[state.step];

  return (
    <div className="mt-6 grid gap-6 pb-48 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:pb-0">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Phones: a compact cup pinned under the header, so it stays in view while choosing. */}
      <div className="sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur md:top-24 md:mx-0 md:self-start md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <BuilderCup draft={draft} catalog={catalog} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {signatureName ? (
          <p className="text-sm text-muted-foreground">
            Customizing <span className="font-semibold">{signatureName}</span>
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl border bg-surface p-4 text-sm">
            {notice}
          </p>
        ) : null}
        <BuilderToolbar
          canUndo={state.past.length > 0}
          canReset={!sameDraft(draft, state.start)}
          onUndo={() => dispatch({ type: "undo" })}
          onReset={() => dispatch({ type: "reset" })}
          onSurprise={surprise}
        />
        <BranchPicker selected={branch} onSelect={chooseBranch} />
        <StepProgress
          current={state.step}
          furthest={furthest}
          onSelect={(step) => dispatch({ type: "goToStep", step })}
        />

        <section aria-labelledby="builder-step-heading">
          <h2
            id="builder-step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mb-4 font-heading text-2xl font-extrabold outline-none"
          >
            {stepLabel}
          </h2>
          {Panel ? (
            <Panel {...stepProps} />
          ) : (
            <ReviewStep
              {...stepProps}
              quantity={state.quantity}
              branchName={branchName}
            />
          )}
        </section>

        {/* Phones: pinned above the bottom tab bar. Desktop: sticks to the bottom of the column. */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-surface/95 px-4 py-2 backdrop-blur md:sticky md:bottom-4 md:rounded-2xl md:border md:px-4 md:shadow-sm">
          <PriceBar price={price} quantity={state.quantity} />
          <StepNav
            step={state.step}
            canAdvance={canAdvance(state)}
            onBack={() => dispatch({ type: "back" })}
            onNext={() => dispatch({ type: "next" })}
          />
        </div>
      </div>
    </div>
  );
}
