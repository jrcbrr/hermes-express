import { describe, expect, it } from "vitest";
import { formatPeso, formatTime } from "./format";

describe("formatPeso", () => {
  it("shows whole pesos without decimals", () => {
    expect(formatPeso(15000)).toBe("₱150");
    expect(formatPeso(0)).toBe("₱0");
  });

  it("adds thousands separators", () => {
    expect(formatPeso(125000)).toBe("₱1,250");
  });

  it("shows centavos when there are any", () => {
    expect(formatPeso(15050)).toBe("₱150.50");
    expect(formatPeso(5)).toBe("₱0.05");
  });

  it("rejects values that are not integer centavos", () => {
    expect(() => formatPeso(150.5)).toThrow(TypeError);
    expect(() => formatPeso(Number.NaN)).toThrow(TypeError);
  });
});

describe("formatTime", () => {
  it.each([
    ["00:00", "12:00 AM"],
    ["07:00", "7:00 AM"],
    ["11:59", "11:59 AM"],
    ["12:00", "12:00 PM"],
    ["22:30", "10:30 PM"],
    ["23:00", "11:00 PM"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it.each(["7:00", "24:00", "12:60", "noon"])("rejects %s", (input) => {
    expect(() => formatTime(input)).toThrow(RangeError);
  });
});
