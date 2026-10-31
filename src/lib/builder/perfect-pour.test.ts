import { describe, expect, it } from "vitest";
import {
  GOLD_LINE_PERCENT,
  POUR_TOLERANCE_PERCENT,
  pourLevel,
  pourOutcome,
} from "./perfect-pour";

describe("pourLevel", () => {
  it("fills steadily and stops at the brim", () => {
    expect(pourLevel(0)).toBe(0);
    expect(pourLevel(2000)).toBe(50);
    expect(pourLevel(60_000)).toBe(100);
  });

  it("treats a backwards clock as empty", () => {
    expect(pourLevel(-5)).toBe(0);
  });
});

describe("pourOutcome", () => {
  it("accepts the line and its margin, inclusive", () => {
    expect(pourOutcome(GOLD_LINE_PERCENT)).toBe("perfect");
    expect(pourOutcome(GOLD_LINE_PERCENT - POUR_TOLERANCE_PERCENT)).toBe(
      "perfect",
    );
    expect(pourOutcome(GOLD_LINE_PERCENT + POUR_TOLERANCE_PERCENT)).toBe(
      "perfect",
    );
  });

  it("says which way a miss went", () => {
    expect(pourOutcome(GOLD_LINE_PERCENT - POUR_TOLERANCE_PERCENT - 1)).toBe(
      "short",
    );
    expect(pourOutcome(GOLD_LINE_PERCENT + POUR_TOLERANCE_PERCENT + 1)).toBe(
      "over",
    );
  });
});
