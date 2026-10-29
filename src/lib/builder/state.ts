/**
 * The coffee builder's state machine (docs/PLAN.md §5).
 *
 * A pure reducer: every action returns a new state, and an action that would
 * make the drink invalid changes nothing. Each change to the drink pushes the
 * previous drink onto an undo stack. The live price comes from
 * calculateDrinkPrice(), the same function the server uses.
 */
import {
  calculateDrinkPrice,
  MAX_LINE_QUANTITY,
  NOT_SERVED_HOT,
  PricingError,
  type DrinkPrice,
  type PricingCatalog,
} from "@/lib/pricing";
import {
  DRINK_NAME_MAX_LENGTH,
  MAX_SHOTS,
  MIN_SHOTS,
  SWEETNESS_LEVELS,
  type AmountLevel,
  type DrinkConfig,
  type DrinkSize,
  type DrinkTemperature,
  type SweetnessLevel,
} from "@/lib/validation/drink";
import type { BuilderCatalog } from "./catalog";

export const STEPS = [
  { id: "cup", label: "Cup" },
  { id: "base", label: "Base" },
  { id: "milk", label: "Milk" },
  { id: "sweetener", label: "Sweetener" },
  { id: "toppings", label: "Toppings" },
  { id: "review", label: "Review" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/** Undo keeps this many earlier versions of the drink. */
export const MAX_UNDO = 50;

/** A drink in progress: like DrinkConfig, but base and milk may be unchosen. */
export type BuilderDraft = {
  size: DrinkSize;
  temperature: DrinkTemperature;
  iceLevel?: AmountLevel;
  base: string | null;
  shots?: number;
  milk: string | null;
  milkAmount: AmountLevel;
  sweetness: SweetnessLevel;
  syrups: string[];
  toppings: string[];
  /** As typed; trimmed when the drink is turned into a DrinkConfig. */
  name: string;
  signature?: string;
};

export type EditKind =
  | "size"
  | "temperature"
  | "ice"
  | "base"
  | "shots"
  | "milk"
  | "milkAmount"
  | "sweetness"
  | "syrup"
  | "topping"
  | "name"
  | "undo"
  | "reset"
  | "load";

export type BuilderState = {
  draft: BuilderDraft;
  /** Where Reset goes back to: an empty cup, or the signature recipe. */
  start: BuilderDraft;
  /** Earlier versions of the drink, oldest first. */
  past: BuilderDraft[];
  step: StepId;
  quantity: number;
  lastEdit: EditKind | null;
};

export type BuilderAction =
  | { type: "setSize"; size: DrinkSize }
  | { type: "setTemperature"; temperature: DrinkTemperature }
  | { type: "setIceLevel"; level: AmountLevel }
  | { type: "setBase"; base: string }
  | { type: "setShots"; shots: number }
  | { type: "setMilk"; milk: string }
  | { type: "setMilkAmount"; amount: AmountLevel }
  | { type: "setSweetness"; sweetness: SweetnessLevel }
  | { type: "toggleSyrup"; syrup: string }
  | { type: "toggleTopping"; topping: string }
  | { type: "setName"; name: string }
  | { type: "setQuantity"; quantity: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "goToStep"; step: StepId }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "load"; draft: BuilderDraft; step?: StepId };

/** What the reducer needs to know about the catalog. */
export type BuilderRules = {
  /** Base slug → shots included in its price (null: takes no shots). */
  bases: ReadonlyMap<string, number | null>;
  milks: ReadonlySet<string>;
  syrups: ReadonlySet<string>;
  toppings: ReadonlySet<string>;
};

export function builderRules(catalog: BuilderCatalog): BuilderRules {
  return {
    bases: new Map(catalog.bases.map((b) => [b.slug, b.includedShots])),
    milks: new Set(catalog.milks.map((m) => m.slug)),
    syrups: new Set(catalog.syrups.map((s) => s.slug)),
    toppings: new Set(catalog.toppings.map((t) => t.slug)),
  };
}

export const EMPTY_DRAFT: BuilderDraft = {
  size: "12oz",
  temperature: "hot",
  base: null,
  milk: null,
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
  name: "",
};

/** True when the base cannot be served hot (Cold Brew). */
export function isNotServedHot(base: string | null): boolean {
  return base !== null && (NOT_SERVED_HOT as readonly string[]).includes(base);
}

/** A finished drink (e.g. a random one) as a draft. */
export function draftFromConfig(config: DrinkConfig): BuilderDraft {
  const draft: BuilderDraft = {
    size: config.size,
    temperature: config.temperature,
    base: config.base,
    milk: config.milk,
    milkAmount: config.milkAmount,
    sweetness: config.sweetness,
    syrups: [...config.syrups],
    toppings: [...config.toppings],
    name: config.name ?? "",
  };
  if (config.iceLevel !== undefined) draft.iceLevel = config.iceLevel;
  if (config.shots !== undefined) draft.shots = config.shots;
  if (config.signature !== undefined) draft.signature = config.signature;
  return draft;
}

/** A signature drink's recipe as a draft, still priced as that signature. */
export function draftFromRecipe(
  recipe: DrinkConfig,
  signatureSlug: string,
): BuilderDraft {
  return { ...draftFromConfig(recipe), signature: signatureSlug };
}

/**
 * The drink as a DrinkConfig, or null until a base is chosen. An unchosen
 * milk counts as "none", so the price shows from the Base step on.
 */
export function toDrinkConfig(draft: BuilderDraft): DrinkConfig | null {
  if (draft.base === null) return null;
  const config: DrinkConfig = {
    size: draft.size,
    temperature: draft.temperature,
    base: draft.base,
    milk: draft.milk ?? "none",
    milkAmount: draft.milkAmount,
    sweetness: draft.sweetness,
    syrups: [...draft.syrups],
    toppings: [...draft.toppings],
  };
  if (draft.iceLevel !== undefined) config.iceLevel = draft.iceLevel;
  if (draft.shots !== undefined) config.shots = draft.shots;
  const name = draft.name.trim();
  if (name !== "") config.name = name;
  if (draft.signature !== undefined) config.signature = draft.signature;
  return config;
}

/** The live price, or null when there is nothing to price yet (or it can't be priced). */
export function draftPrice(
  draft: BuilderDraft,
  pricing: PricingCatalog,
): DrinkPrice | null {
  const config = toDrinkConfig(draft);
  if (config === null) return null;
  try {
    return calculateDrinkPrice(config, pricing);
  } catch (error) {
    if (error instanceof PricingError) return null;
    throw error;
  }
}

/** Ingredient slugs in the drink that are not available (e.g. sold out at the branch). */
export function unavailableChoices(
  draft: BuilderDraft,
  unavailable: ReadonlySet<string>,
): string[] {
  return [draft.base, draft.milk, ...draft.syrups, ...draft.toppings].filter(
    (slug): slug is string => slug !== null && unavailable.has(slug),
  );
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

export function sameDraft(a: BuilderDraft, b: BuilderDraft): boolean {
  return (
    a.size === b.size &&
    a.temperature === b.temperature &&
    a.iceLevel === b.iceLevel &&
    a.base === b.base &&
    a.shots === b.shots &&
    a.milk === b.milk &&
    a.milkAmount === b.milkAmount &&
    a.sweetness === b.sweetness &&
    sameList(a.syrups, b.syrups) &&
    sameList(a.toppings, b.toppings) &&
    a.name === b.name &&
    a.signature === b.signature
  );
}

export function stepIndex(step: StepId): number {
  return STEPS.findIndex((s) => s.id === step);
}

/** The furthest step the customer may open: a base and a milk must be chosen first. */
export function furthestStep(draft: BuilderDraft): StepId {
  if (draft.base === null) return "base";
  if (draft.milk === null) return "milk";
  return "review";
}

export function canAdvance(state: BuilderState): boolean {
  return stepIndex(state.step) < stepIndex(furthestStep(state.draft));
}

function clampStep(step: StepId, draft: BuilderDraft): StepId {
  const furthest = furthestStep(draft);
  return stepIndex(step) > stepIndex(furthest) ? furthest : step;
}

export function createBuilderState(
  start: BuilderDraft = EMPTY_DRAFT,
): BuilderState {
  return {
    draft: start,
    start,
    past: [],
    step: "cup",
    quantity: 1,
    lastEdit: null,
  };
}

/** Records a new version of the drink, keeping the old one for Undo. */
function commit(
  state: BuilderState,
  draft: BuilderDraft,
  edit: EditKind,
): BuilderState {
  if (sameDraft(draft, state.draft)) return state;
  // Typing a name is one undo step, not one per letter.
  const past =
    edit === "name" && state.lastEdit === "name"
      ? state.past
      : [...state.past, state.draft].slice(-MAX_UNDO);
  return {
    ...state,
    draft,
    past,
    step: clampStep(state.step, draft),
    lastEdit: edit,
  };
}

function withoutKey<T extends object, K extends keyof T>(
  value: T,
  key: K,
): Omit<T, K> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

/** Adds the item, or removes it when it's already there (no limit on how many). */
function toggle(list: readonly string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

/** Applies a change to the drink; returns null when the change is not allowed. */
function editDraft(
  draft: BuilderDraft,
  action: BuilderAction,
  rules: BuilderRules,
): [BuilderDraft, EditKind] | null {
  switch (action.type) {
    case "setSize":
      return [{ ...draft, size: action.size }, "size"];

    case "setTemperature": {
      if (action.temperature === "hot" && isNotServedHot(draft.base)) {
        return null;
      }
      const next = withoutKey(draft, "iceLevel");
      return action.temperature === "iced"
        ? [
            {
              ...next,
              temperature: "iced",
              iceLevel: draft.iceLevel ?? "regular",
            },
            "temperature",
          ]
        : [{ ...next, temperature: action.temperature }, "temperature"];
    }

    case "setIceLevel":
      return draft.temperature === "iced"
        ? [{ ...draft, iceLevel: action.level }, "ice"]
        : null;

    case "setBase": {
      if (!rules.bases.has(action.base)) return null;
      if (draft.temperature === "hot" && isNotServedHot(action.base)) {
        return null;
      }
      const included = rules.bases.get(action.base) ?? null;
      const next = { ...withoutKey(draft, "shots"), base: action.base };
      return included === null
        ? [next, "base"]
        : [{ ...next, shots: draft.shots ?? included }, "base"];
    }

    case "setShots": {
      const takesShots =
        draft.base !== null && (rules.bases.get(draft.base) ?? null) !== null;
      if (
        !takesShots ||
        !Number.isInteger(action.shots) ||
        action.shots < MIN_SHOTS ||
        action.shots > MAX_SHOTS
      ) {
        return null;
      }
      return [{ ...draft, shots: action.shots }, "shots"];
    }

    case "setMilk":
      return rules.milks.has(action.milk)
        ? [{ ...draft, milk: action.milk }, "milk"]
        : null;

    case "setMilkAmount":
      return [{ ...draft, milkAmount: action.amount }, "milkAmount"];

    case "setSweetness":
      return (SWEETNESS_LEVELS as readonly number[]).includes(action.sweetness)
        ? [{ ...draft, sweetness: action.sweetness }, "sweetness"]
        : null;

    case "toggleSyrup": {
      if (!rules.syrups.has(action.syrup)) return null;
      return [
        { ...draft, syrups: toggle(draft.syrups, action.syrup) },
        "syrup",
      ];
    }

    case "toggleTopping": {
      if (!rules.toppings.has(action.topping)) return null;
      return [
        { ...draft, toppings: toggle(draft.toppings, action.topping) },
        "topping",
      ];
    }

    case "setName":
      return [
        { ...draft, name: action.name.slice(0, DRINK_NAME_MAX_LENGTH) },
        "name",
      ];

    /* v8 ignore next 2 -- every other action is handled in reduceBuilder */
    default:
      return null;
  }
}

export function reduceBuilder(
  state: BuilderState,
  action: BuilderAction,
  rules: BuilderRules,
): BuilderState {
  switch (action.type) {
    case "next":
      return canAdvance(state)
        ? { ...state, step: STEPS[stepIndex(state.step) + 1]!.id }
        : state;

    case "back": {
      const index = stepIndex(state.step);
      return index > 0 ? { ...state, step: STEPS[index - 1]!.id } : state;
    }

    case "goToStep":
      return stepIndex(action.step) <= stepIndex(furthestStep(state.draft))
        ? { ...state, step: action.step }
        : state;

    case "setQuantity": {
      const quantity = Math.trunc(action.quantity);
      if (!Number.isFinite(quantity)) return state;
      return {
        ...state,
        quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity)),
      };
    }

    case "undo": {
      const previous = state.past.at(-1);
      if (previous === undefined) return state;
      return {
        ...state,
        draft: previous,
        past: state.past.slice(0, -1),
        step: clampStep(state.step, previous),
        lastEdit: "undo",
      };
    }

    case "reset": {
      const next = commit(state, state.start, "reset");
      return next === state ? state : { ...next, step: "cup" };
    }

    case "load": {
      const next = commit(state, action.draft, "load");
      return action.step === undefined
        ? next
        : { ...next, step: clampStep(action.step, next.draft) };
    }

    default: {
      const edited = editDraft(state.draft, action, rules);
      return edited ? commit(state, edited[0], edited[1]) : state;
    }
  }
}
