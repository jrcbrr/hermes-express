import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { optionIndex } from "@/lib/builder/catalog";
import { unavailableChoices } from "@/lib/builder/state";
import { MAX_LINE_QUANTITY } from "@/lib/pricing";
import { DRINK_NAME_MAX_LENGTH } from "@/lib/validation/drink";
import { Stepper } from "../stepper";
import { AMOUNT_LABELS, type StepProps } from "./shared";

/** The finished drink: name, summary, quantity and the order buttons. */
export function ReviewStep({
  draft,
  catalog,
  unavailable,
  dispatch,
  quantity,
  branchName,
  isEditing,
  canAddToCart,
  cartStatus,
  onAddToCart,
}: StepProps & {
  quantity: number;
  branchName: string;
  /** Changing a drink already in the cart. */
  isEditing: boolean;
  canAddToCart: boolean;
  cartStatus: "idle" | "added" | "full";
  onAddToCart: () => void;
}) {
  const nameId = useId();
  const index = optionIndex(catalog);
  const name = (slug: string) => index.get(slug)?.name ?? slug;
  const list = (slugs: readonly string[]) =>
    slugs.length > 0 ? slugs.map(name).join(", ") : "None";

  const summary: [string, string][] = [
    [
      "Cup",
      [
        draft.size,
        name(draft.temperature),
        draft.iceLevel ? `${AMOUNT_LABELS[draft.iceLevel]} ice` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Base",
      draft.base === null
        ? "Not chosen"
        : [
            name(draft.base),
            draft.shots === undefined
              ? null
              : `${draft.shots} ${draft.shots === 1 ? "shot" : "shots"}`,
          ]
            .filter(Boolean)
            .join(" · "),
    ],
    [
      "Milk",
      draft.milk === null
        ? "Not chosen"
        : draft.milk === "none"
          ? name("none")
          : `${name(draft.milk)} · ${AMOUNT_LABELS[draft.milkAmount]}`,
    ],
    ["Sweetness", `${draft.sweetness}%`],
    ["Syrups", list(draft.syrups)],
    ["Toppings", list(draft.toppings)],
  ];
  const soldOut = unavailableChoices(draft, unavailable);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor={nameId} className="text-sm font-semibold">
          Name your drink (optional)
        </label>
        <input
          id={nameId}
          type="text"
          value={draft.name}
          maxLength={DRINK_NAME_MAX_LENGTH}
          placeholder="For example, Monday Fuel"
          autoComplete="off"
          onChange={(event) =>
            dispatch({ type: "setName", name: event.target.value })
          }
          className="mt-1 h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border bg-surface p-4 text-sm">
        {summary.map(([term, detail]) => (
          <div key={term} className="contents">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>

      {soldOut.length > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
        >
          {soldOut.map(name).join(", ")} {soldOut.length === 1 ? "is" : "are"}{" "}
          sold out at {branchName}. Please choose another option or another
          branch.
        </p>
      ) : null}

      <Stepper
        label="Quantity"
        unit="cup"
        value={quantity}
        min={1}
        max={MAX_LINE_QUANTITY}
        onChange={(value) => dispatch({ type: "setQuantity", quantity: value })}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="h-11 flex-1 font-semibold"
          disabled={!canAddToCart}
          onClick={onAddToCart}
        >
          {isEditing ? "Update cart" : "Add to cart"}
        </Button>
        {/* Wired up in Stage 8 (favorites). */}
        <Button
          size="lg"
          variant="outline"
          className="h-11 flex-1 font-semibold"
          disabled
        >
          Save to favorites
        </Button>
      </div>
      <p role="status" className="text-sm empty:hidden">
        {cartStatus === "added" ? (
          <>
            Added to your cart.{" "}
            <Link
              href="/cart"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              View cart
            </Link>
          </>
        ) : cartStatus === "full" ? (
          "Your cart is full. Please check out or remove an item first."
        ) : null}
      </p>
      <p className="text-xs text-muted-foreground">
        Saving drinks to your favorites opens soon.
      </p>
    </div>
  );
}
