import { describe, expect, it } from "vitest";
import { calculateDrinkPrice } from "@/lib/pricing";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { toBuilderCatalog } from "./catalog";
import {
  builderRules,
  canAdvance,
  createBuilderState,
  draftFromConfig,
  draftFromRecipe,
  draftPrice,
  EMPTY_DRAFT,
  furthestStep,
  MAX_UNDO,
  reduceBuilder,
  sameDraft,
  toDrinkConfig,
  unavailableChoices,
  type BuilderAction,
  type BuilderState,
} from "./state";

const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);
const rules = builderRules(catalog);

/** Runs actions in order from a fresh (or given) state. */
function run(
  actions: BuilderAction[],
  state: BuilderState = createBuilderState(),
): BuilderState {
  return actions.reduce((s, a) => reduceBuilder(s, a, rules), state);
}

const price = (state: BuilderState) =>
  draftPrice(state.draft, catalog.pricing)?.unitPriceCentavos ?? null;

const olympus = catalog.signatures.find((s) => s.slug === "olympus-latte")!;

describe("createBuilderState", () => {
  it("starts with an empty cup on the Cup step", () => {
    const state = createBuilderState();
    expect(state).toEqual({
      draft: EMPTY_DRAFT,
      start: EMPTY_DRAFT,
      past: [],
      step: "cup",
      quantity: 1,
      lastEdit: null,
    });
  });
});

describe("cup step", () => {
  it("sets the size", () => {
    expect(run([{ type: "setSize", size: "22oz" }]).draft.size).toBe("22oz");
  });

  it("adds a regular ice level for iced drinks and removes it otherwise", () => {
    const iced = run([{ type: "setTemperature", temperature: "iced" }]);
    expect(iced.draft.iceLevel).toBe("regular");

    const extra = run([{ type: "setIceLevel", level: "extra" }], iced);
    expect(extra.draft.iceLevel).toBe("extra");
    // Staying iced keeps the chosen level.
    expect(
      run([{ type: "setTemperature", temperature: "iced" }], extra).draft
        .iceLevel,
    ).toBe("extra");

    const blended = run(
      [{ type: "setTemperature", temperature: "blended" }],
      extra,
    );
    expect(blended.draft.temperature).toBe("blended");
    expect("iceLevel" in blended.draft).toBe(false);
  });

  it("ignores an ice level when the drink is not iced", () => {
    const state = createBuilderState();
    expect(run([{ type: "setIceLevel", level: "light" }], state)).toBe(state);
  });
});

describe("base step", () => {
  it("rejects unknown bases", () => {
    const state = createBuilderState();
    expect(run([{ type: "setBase", base: "tea" }], state)).toBe(state);
  });

  it("gives espresso bases their included shots and others none", () => {
    const latte = run([{ type: "setBase", base: "latte" }]);
    expect(latte.draft.shots).toBe(1);
    const matcha = run([{ type: "setBase", base: "matcha" }], latte);
    expect("shots" in matcha.draft).toBe(false);
  });

  it("keeps extra shots when switching between espresso bases", () => {
    const state = run([
      { type: "setBase", base: "latte" },
      { type: "setShots", shots: 3 },
      { type: "setBase", base: "mocha" },
    ]);
    expect(state.draft.shots).toBe(3);
  });

  it("keeps shots between 1 and 4, for espresso bases only", () => {
    const latte = run([{ type: "setBase", base: "latte" }]);
    for (const shots of [0, 5, 1.5]) {
      expect(run([{ type: "setShots", shots }], latte)).toBe(latte);
    }
    const matcha = run([{ type: "setBase", base: "matcha" }]);
    expect(run([{ type: "setShots", shots: 2 }], matcha)).toBe(matcha);
    expect(
      run([{ type: "setShots", shots: 2 }], createBuilderState()).draft.shots,
    ).toBeUndefined();
  });

  it("never serves Cold Brew hot", () => {
    const hot = createBuilderState();
    expect(run([{ type: "setBase", base: "cold-brew" }], hot)).toBe(hot);

    const icedColdBrew = run([
      { type: "setTemperature", temperature: "iced" },
      { type: "setBase", base: "cold-brew" },
    ]);
    expect(icedColdBrew.draft.base).toBe("cold-brew");
    expect(
      run([{ type: "setTemperature", temperature: "hot" }], icedColdBrew),
    ).toBe(icedColdBrew);
  });
});

describe("milk, sweetener and toppings", () => {
  it("sets a known milk and its amount", () => {
    const state = run([
      { type: "setMilk", milk: "oat" },
      { type: "setMilkAmount", amount: "extra" },
      { type: "setMilk", milk: "goat" },
    ]);
    expect(state.draft.milk).toBe("oat");
    expect(state.draft.milkAmount).toBe("extra");
  });

  it("only accepts the five sweetness levels", () => {
    const state = run([{ type: "setSweetness", sweetness: 75 }]);
    expect(state.draft.sweetness).toBe(75);
    const odd = {
      type: "setSweetness",
      sweetness: 30,
    } as unknown as BuilderAction;
    expect(run([odd], state)).toBe(state);
  });

  it("toggles syrups, up to three", () => {
    const three = run(
      ["vanilla", "caramel", "honey"].map((syrup) => ({
        type: "toggleSyrup" as const,
        syrup,
      })),
    );
    expect(three.draft.syrups).toEqual(["vanilla", "caramel", "honey"]);
    expect(run([{ type: "toggleSyrup", syrup: "toffee" }], three)).toBe(three);
    expect(run([{ type: "toggleSyrup", syrup: "maple" }], three)).toBe(three);
    expect(
      run([{ type: "toggleSyrup", syrup: "caramel" }], three).draft.syrups,
    ).toEqual(["vanilla", "honey"]);
  });

  it("toggles toppings, up to five", () => {
    const slugs = [
      "whipped-cream",
      "caramel-drizzle",
      "cookie-crumble",
      "cocoa-powder",
      "coffee-jelly",
    ];
    const five = run(
      slugs.map((topping) => ({ type: "toggleTopping" as const, topping })),
    );
    expect(five.draft.toppings).toEqual(slugs);
    expect(
      run([{ type: "toggleTopping", topping: "nata-de-coco" }], five),
    ).toBe(five);
    expect(run([{ type: "toggleTopping", topping: "glitter" }], five)).toBe(
      five,
    );
    expect(
      run([{ type: "toggleTopping", topping: "whipped-cream" }], five).draft
        .toppings,
    ).toHaveLength(4);
  });
});

describe("review step", () => {
  it("limits the name to 40 characters", () => {
    const state = run([{ type: "setName", name: "x".repeat(60) }]);
    expect(state.draft.name).toHaveLength(40);
  });

  it("keeps the quantity between 1 and 20, outside the undo history", () => {
    expect(run([{ type: "setQuantity", quantity: 3 }]).quantity).toBe(3);
    expect(run([{ type: "setQuantity", quantity: 0 }]).quantity).toBe(1);
    expect(run([{ type: "setQuantity", quantity: 99 }]).quantity).toBe(20);
    expect(run([{ type: "setQuantity", quantity: 2.7 }]).quantity).toBe(2);
    const nan = createBuilderState();
    expect(run([{ type: "setQuantity", quantity: Number.NaN }], nan)).toBe(nan);
    expect(run([{ type: "setQuantity", quantity: 3 }]).past).toEqual([]);
  });
});

describe("undo", () => {
  it("steps back through every change", () => {
    const state = run([
      { type: "setSize", size: "16oz" },
      { type: "setBase", base: "latte" },
      { type: "setMilk", milk: "oat" },
    ]);
    expect(state.past).toHaveLength(3);

    const once = run([{ type: "undo" }], state);
    expect(once.draft.milk).toBeNull();
    expect(once.lastEdit).toBe("undo");
    const all = run([{ type: "undo" }, { type: "undo" }], once);
    expect(sameDraft(all.draft, EMPTY_DRAFT)).toBe(true);
    expect(run([{ type: "undo" }], all)).toBe(all);
  });

  it("does not record changes that change nothing", () => {
    const state = run([
      { type: "setSize", size: "12oz" },
      { type: "setMilkAmount", amount: "regular" },
    ]);
    expect(state.past).toEqual([]);
  });

  it("treats typing a name as one change", () => {
    const typed = run([
      { type: "setSize", size: "16oz" },
      { type: "setName", name: "M" },
      { type: "setName", name: "Mo" },
      { type: "setName", name: "Monday" },
    ]);
    expect(typed.past).toHaveLength(2);
    expect(run([{ type: "undo" }], typed).draft.name).toBe("");
  });

  it(`keeps the last ${MAX_UNDO} versions`, () => {
    const sizes = ["16oz", "12oz"] as const;
    const state = run(
      Array.from({ length: MAX_UNDO + 10 }, (_, i) => ({
        type: "setSize" as const,
        size: sizes[i % 2]!,
      })),
    );
    expect(state.past).toHaveLength(MAX_UNDO);
  });

  it("moves back to a step that is still reachable", () => {
    const onMilk = run([
      { type: "setBase", base: "latte" },
      { type: "next" },
      { type: "next" },
    ]);
    expect(onMilk.step).toBe("milk");
    expect(run([{ type: "undo" }], onMilk).step).toBe("base");
  });
});

describe("reset", () => {
  it("returns an empty build to an empty cup, and can be undone", () => {
    const built = run([
      { type: "setBase", base: "latte" },
      { type: "next" },
      { type: "next" },
    ]);
    const reset = run([{ type: "reset" }], built);
    expect(sameDraft(reset.draft, EMPTY_DRAFT)).toBe(true);
    expect(reset.step).toBe("cup");
    expect(reset.lastEdit).toBe("reset");
    expect(run([{ type: "undo" }], reset).draft.base).toBe("latte");
  });

  it("returns to the signature recipe when the drink started from one", () => {
    const start = draftFromRecipe(olympus.recipe, olympus.slug);
    const changed = run(
      [
        { type: "setMilk", milk: "whole" },
        { type: "toggleSyrup", syrup: "vanilla" },
      ],
      createBuilderState(start),
    );
    const reset = run([{ type: "reset" }], changed);
    expect(sameDraft(reset.draft, start)).toBe(true);
    expect(price(reset)).toBe(17500);
  });

  it("does nothing when already at the start", () => {
    const state = createBuilderState();
    expect(run([{ type: "reset" }], state)).toBe(state);
  });
});

describe("load", () => {
  it("replaces the drink as one undoable change and can jump to a step", () => {
    const random = draftFromConfig({
      ...olympus.recipe,
      signature: undefined,
    });
    const loaded = run([{ type: "load", draft: random, step: "review" }]);
    expect(loaded.draft.base).toBe("latte");
    expect(loaded.step).toBe("review");
    expect(loaded.lastEdit).toBe("load");
    expect(run([{ type: "undo" }], loaded).draft.base).toBeNull();
  });

  it("keeps the current step when none is given, clamped to what is reachable", () => {
    const state = run([{ type: "load", draft: EMPTY_DRAFT, step: "review" }]);
    expect(state.step).toBe("base");
    const loaded = run(
      [{ type: "load", draft: { ...EMPTY_DRAFT, size: "22oz" } }],
      state,
    );
    expect(loaded.step).toBe("base");
  });
});

describe("step navigation", () => {
  it("needs a base before Milk and a milk before Sweetener", () => {
    let state = run([{ type: "next" }]);
    expect(state.step).toBe("base");
    expect(canAdvance(state)).toBe(false);
    expect(run([{ type: "next" }], state)).toBe(state);

    state = run([{ type: "setBase", base: "latte" }, { type: "next" }], state);
    expect(state.step).toBe("milk");
    expect(run([{ type: "next" }], state)).toBe(state);

    state = run(
      [
        { type: "setMilk", milk: "none" },
        { type: "next" },
        { type: "next" },
        { type: "next" },
      ],
      state,
    );
    expect(state.step).toBe("review");
    expect(canAdvance(state)).toBe(false);
    expect(run([{ type: "next" }], state)).toBe(state);
  });

  it("goes back one step at a time, stopping at Cup", () => {
    const state = run([{ type: "next" }, { type: "back" }]);
    expect(state.step).toBe("cup");
    expect(run([{ type: "back" }], state)).toBe(state);
  });

  it("jumps only to steps that are reachable", () => {
    const state = createBuilderState();
    expect(run([{ type: "goToStep", step: "base" }], state).step).toBe("base");
    expect(run([{ type: "goToStep", step: "review" }], state)).toBe(state);
    const signature = createBuilderState(
      draftFromRecipe(olympus.recipe, olympus.slug),
    );
    expect(run([{ type: "goToStep", step: "review" }], signature).step).toBe(
      "review",
    );
  });

  it("knows the furthest reachable step", () => {
    expect(furthestStep(EMPTY_DRAFT)).toBe("base");
    expect(furthestStep({ ...EMPTY_DRAFT, base: "latte" })).toBe("milk");
    expect(furthestStep({ ...EMPTY_DRAFT, base: "latte", milk: "oat" })).toBe(
      "review",
    );
  });
});

describe("toDrinkConfig", () => {
  it("is null until a base is chosen", () => {
    expect(toDrinkConfig(EMPTY_DRAFT)).toBeNull();
  });

  it("counts an unchosen milk as none, trims the name and drops an empty one", () => {
    expect(
      toDrinkConfig({ ...EMPTY_DRAFT, base: "matcha", name: "   " }),
    ).toEqual({
      size: "12oz",
      temperature: "hot",
      base: "matcha",
      milk: "none",
      milkAmount: "regular",
      sweetness: 50,
      syrups: [],
      toppings: [],
    });
    expect(
      toDrinkConfig({ ...EMPTY_DRAFT, base: "matcha", name: " Monday " })?.name,
    ).toBe("Monday");
  });

  it("round-trips a signature recipe", () => {
    const draft = draftFromRecipe(olympus.recipe, olympus.slug);
    expect(toDrinkConfig(draft)).toEqual({
      ...olympus.recipe,
      signature: "olympus-latte",
    });
    const iced = catalog.signatures.find((s) => s.slug === "golden-sandal")!;
    expect(toDrinkConfig(draftFromConfig(iced.recipe))).toEqual(iced.recipe);
    expect(draftFromConfig({ ...iced.recipe, name: "Gold" }).name).toBe("Gold");
  });
});

describe("live price", () => {
  it("follows every change, matching calculateDrinkPrice", () => {
    const steps: [BuilderAction, number | null][] = [
      [{ type: "setSize", size: "16oz" }, null],
      [{ type: "setBase", base: "latte" }, 15000],
      [{ type: "setMilk", milk: "oat" }, 18000],
      [{ type: "setShots", shots: 2 }, 22000],
      [{ type: "setTemperature", temperature: "blended" }, 24000],
      [{ type: "toggleSyrup", syrup: "vanilla" }, 26000],
      [{ type: "toggleTopping", topping: "cold-foam" }, 29000],
      [{ type: "undo" }, 26000],
    ];
    let state = createBuilderState();
    for (const [action, expected] of steps) {
      state = run([action], state);
      expect(price(state)).toBe(expected);
      const config = toDrinkConfig(state.draft);
      if (config) {
        expect(price(state)).toBe(
          calculateDrinkPrice(config, catalog.pricing).unitPriceCentavos,
        );
      }
    }
  });

  it("prices an unchanged signature at its menu price, and changes on top", () => {
    const state = createBuilderState(
      draftFromRecipe(olympus.recipe, olympus.slug),
    );
    expect(price(state)).toBe(17500);
    expect(price(run([{ type: "setSize", size: "16oz" }], state))).toBe(19500);
  });

  it("is null when the catalog cannot price the drink", () => {
    expect(
      draftPrice(
        { ...EMPTY_DRAFT, base: "latte" },
        {
          ingredients: [],
          signatures: [],
        },
      ),
    ).toBeNull();
  });

  it("rethrows errors that are not pricing errors", () => {
    const broken = {
      get ingredients(): never {
        throw new Error("boom");
      },
      signatures: [],
    };
    expect(() => draftPrice({ ...EMPTY_DRAFT, base: "latte" }, broken)).toThrow(
      "boom",
    );
  });
});

describe("unavailableChoices", () => {
  it("lists chosen options that are unavailable", () => {
    const draft = {
      ...EMPTY_DRAFT,
      base: "latte",
      milk: "oat",
      syrups: ["vanilla"],
      toppings: ["cold-foam"],
    };
    expect(
      unavailableChoices(draft, new Set(["oat", "cold-foam", "honey"])),
    ).toEqual(["oat", "cold-foam"]);
    expect(unavailableChoices(EMPTY_DRAFT, new Set(["oat"]))).toEqual([]);
  });
});
