import type { BuilderCatalog, BuilderOption } from "@/lib/builder/catalog";
import type { BuilderAction, BuilderDraft } from "@/lib/builder/state";
import { formatPeso } from "@/lib/money";
import type { ChoiceOption } from "../option-group";

export type StepProps = {
  draft: BuilderDraft;
  catalog: BuilderCatalog;
  /** Ingredient slugs sold out at the selected branch. */
  unavailable: ReadonlySet<string>;
  dispatch: (action: BuilderAction) => void;
};

export const SOLD_OUT_LABEL = "Sold out at this branch";

export const AMOUNT_LABELS = {
  light: "Light",
  regular: "Regular",
  extra: "Extra",
} as const;

/** "+₱20" for add-ons, nothing when free. */
export function extraPrice(centavos: number): string | undefined {
  return centavos > 0 ? `+${formatPeso(centavos)}` : undefined;
}

/** Catalog options as choices, with sold-out ones disabled and labelled. */
export function toChoices(
  options: readonly BuilderOption[],
  unavailable: ReadonlySet<string>,
  price: (centavos: number) => string | undefined = extraPrice,
): ChoiceOption[] {
  return options.map((option) => {
    const soldOut = unavailable.has(option.slug);
    return {
      value: option.slug,
      label: option.name,
      detail: price(option.priceCentavos),
      swatch: option.color,
      disabled: soldOut,
      note: soldOut ? SOLD_OUT_LABEL : undefined,
    };
  });
}
