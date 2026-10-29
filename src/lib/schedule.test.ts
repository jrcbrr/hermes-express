import { describe, expect, it } from "vitest";
import {
  formatSlot,
  formatSlotDay,
  formatSlotTime,
  isAsapAvailable,
  isValidSlot,
  scheduleSlots,
} from "./schedule";

const hours = { opensAt: "07:00", closesAt: "22:00" };
const manila = (iso: string) => new Date(`${iso}+08:00`);

describe("isAsapAvailable", () => {
  it("is open from opening time", () => {
    expect(isAsapAvailable(hours, manila("2026-11-15T07:00:00"))).toBe(true);
    expect(isAsapAvailable(hours, manila("2026-11-15T06:59:59"))).toBe(false);
  });

  it("stops 15 minutes before closing", () => {
    expect(isAsapAvailable(hours, manila("2026-11-15T21:44:59"))).toBe(true);
    expect(isAsapAvailable(hours, manila("2026-11-15T21:45:00"))).toBe(false);
    expect(isAsapAvailable(hours, manila("2026-11-15T23:30:00"))).toBe(false);
  });

  it("uses Manila time, not the server's time zone", () => {
    // 23:30 UTC is 07:30 the next morning in Manila.
    expect(isAsapAvailable(hours, new Date("2026-11-15T23:30:00Z"))).toBe(
      true,
    );
  });

  it("rejects hours that close before they open", () => {
    expect(() =>
      isAsapAvailable({ opensAt: "22:00", closesAt: "07:00" }, new Date()),
    ).toThrow(RangeError);
    expect(() =>
      isAsapAvailable({ opensAt: "7am", closesAt: "22:00" }, new Date()),
    ).toThrow(RangeError);
  });
});

describe("scheduleSlots", () => {
  it("offers 15-minute slots from 20 minutes after now until 15 minutes before closing", () => {
    const now = manila("2026-11-15T21:00:00");
    const slots = scheduleSlots(hours, now);
    const today = slots.filter((s) => s < manila("2026-11-16T00:00:00"));
    expect(today.map((s) => s.toISOString())).toEqual([
      manila("2026-11-15T21:30:00").toISOString(),
      manila("2026-11-15T21:45:00").toISOString(),
    ]);
  });

  it("rounds up to the next slot when now is between slots", () => {
    const [first] = scheduleSlots(hours, manila("2026-11-15T10:01:00"));
    expect(first).toEqual(manila("2026-11-15T10:30:00"));
  });

  it("includes a slot exactly 20 minutes away", () => {
    const [first] = scheduleSlots(hours, manila("2026-11-15T09:55:00"));
    expect(first).toEqual(manila("2026-11-15T10:15:00"));
  });

  it("starts at opening time before the branch opens", () => {
    const [first] = scheduleSlots(hours, manila("2026-11-15T03:00:00"));
    expect(first).toEqual(manila("2026-11-15T07:00:00"));
  });

  it("goes up to 2 days ahead and no further", () => {
    const slots = scheduleSlots(hours, manila("2026-11-15T23:00:00"));
    expect(slots[0]).toEqual(manila("2026-11-16T07:00:00"));
    expect(slots.at(-1)).toEqual(manila("2026-11-17T21:45:00"));
    // 7:00 AM to 9:45 PM is 60 slots a day; today has none left.
    expect(slots).toHaveLength(120);
  });

  it("follows each branch's own hours", () => {
    const bgc = { opensAt: "07:00", closesAt: "23:00" };
    const slots = scheduleSlots(bgc, manila("2026-11-15T22:00:00"));
    expect(slots[0]).toEqual(manila("2026-11-15T22:30:00"));
    expect(slots[1]).toEqual(manila("2026-11-15T22:45:00"));
  });

  it("handles a server clock just after Manila midnight", () => {
    const now = manila("2026-11-16T00:05:00");
    const slots = scheduleSlots(hours, now);
    expect(slots[0]).toEqual(manila("2026-11-16T07:00:00"));
    expect(slots.at(-1)).toEqual(manila("2026-11-18T21:45:00"));
  });
});

describe("isValidSlot", () => {
  const now = manila("2026-11-15T10:00:00");

  it("accepts an offered slot", () => {
    expect(isValidSlot(hours, manila("2026-11-15T12:15:00"), now)).toBe(true);
  });

  it("rejects slots that are too soon, off the grid, after hours or too far ahead", () => {
    expect(isValidSlot(hours, manila("2026-11-15T10:15:00"), now)).toBe(false);
    expect(isValidSlot(hours, manila("2026-11-15T12:10:00"), now)).toBe(false);
    expect(isValidSlot(hours, manila("2026-11-15T22:00:00"), now)).toBe(false);
    expect(isValidSlot(hours, manila("2026-11-18T09:00:00"), now)).toBe(false);
  });
});

describe("formatting", () => {
  const now = manila("2026-11-15T10:00:00");

  it("names the day relative to today", () => {
    expect(formatSlotDay(manila("2026-11-15T21:00:00"), now)).toBe("Today");
    expect(formatSlotDay(manila("2026-11-16T07:00:00"), now)).toBe(
      "Tomorrow",
    );
    expect(formatSlotDay(manila("2026-11-17T07:00:00"), now)).toMatch(
      /Tuesday/,
    );
  });

  it("formats the time in Manila", () => {
    expect(formatSlotTime(manila("2026-11-15T07:15:00"))).toBe("7:15 AM");
    expect(formatSlotTime(manila("2026-11-15T21:45:00"))).toBe("9:45 PM");
    expect(formatSlot(manila("2026-11-16T12:00:00"), now)).toBe(
      "Tomorrow, 12:00 PM",
    );
  });
});
