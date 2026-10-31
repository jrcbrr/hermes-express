import { describe, expect, it } from "vitest";
import { recordPointsAdjustment } from "./ledger";

describe("recordPointsAdjustment", () => {
  it("is a safe no-op until Stage 8 adds the ledger", async () => {
    await expect(
      recordPointsAdjustment({
        userId: "u1",
        delta: 5,
        note: "Goodwill",
        adminId: "a1",
      }),
    ).resolves.toBeUndefined();
  });
});
