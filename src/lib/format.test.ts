import { describe, expect, it } from "vitest";
import { formatPhPhone, formatTime } from "./format";

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

describe("formatPhPhone", () => {
  it("writes a stored number the local way", () => {
    expect(formatPhPhone("+639171234567")).toBe("0917 123 4567");
  });

  it("leaves anything else alone", () => {
    expect(formatPhPhone("")).toBe("");
    expect(formatPhPhone("12345")).toBe("12345");
  });
});
