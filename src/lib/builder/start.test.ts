import { describe, expect, it } from "vitest";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { toBuilderCatalog } from "./catalog";
import { resolveBuilderStart } from "./start";
import { EMPTY_DRAFT } from "./state";

const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);

describe("resolveBuilderStart", () => {
  it("starts with an empty cup by default", () => {
    expect(resolveBuilderStart(catalog, {})).toEqual({
      draft: EMPTY_DRAFT,
      signatureName: null,
      notice: null,
      editId: null,
    });
  });

  it("starts from a signature recipe with ?from=, or the older ?drink=", () => {
    for (const params of [
      { from: "olympus-latte" },
      { drink: "olympus-latte" },
      { from: ["olympus-latte", "winged-mocha"] },
    ]) {
      const start = resolveBuilderStart(catalog, params);
      expect(start.signatureName).toBe("Olympus Latte");
      expect(start.draft).toMatchObject({
        base: "latte",
        milk: "oat",
        signature: "olympus-latte",
      });
      expect(start.notice).toBeNull();
    }
  });

  it("explains when the signature cannot be found", () => {
    const start = resolveBuilderStart(catalog, { from: "nectar" });
    expect(start.draft).toBe(EMPTY_DRAFT);
    expect(start.notice).toMatch(/could not find that drink/);
  });

  it("passes on the cart item to edit, which the browser loads", () => {
    const start = resolveBuilderStart(catalog, {
      edit: "item-1",
      from: "olympus-latte",
    });
    expect(start).toEqual({
      draft: EMPTY_DRAFT,
      signatureName: null,
      notice: null,
      editId: "item-1",
    });
  });

  it("ignores an empty edit id", () => {
    expect(resolveBuilderStart(catalog, { edit: "" }).editId).toBeNull();
  });
});
