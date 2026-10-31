import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveDraft, takeSavedDraft } from "./saved-draft";
import { EMPTY_DRAFT } from "./state";

const saved = {
  step: "base" as const,
  draft: { ...EMPTY_DRAFT, base: "latte" },
};

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("saved draft", () => {
  it("gives the drink back once", () => {
    saveDraft(saved);
    expect(takeSavedDraft()).toEqual(saved);
    expect(takeSavedDraft()).toBeNull();
  });

  it("ignores broken or tampered data", () => {
    sessionStorage.setItem("hx_build_draft", "{not json");
    expect(takeSavedDraft()).toBeNull();
    sessionStorage.setItem(
      "hx_build_draft",
      JSON.stringify({ step: "nope", draft: EMPTY_DRAFT }),
    );
    expect(takeSavedDraft()).toBeNull();
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveDraft(saved)).not.toThrow();
  });
});
