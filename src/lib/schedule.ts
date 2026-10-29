/**
 * When an order can be ready (docs/PLAN.md §7): ASAP while the branch is open,
 * or a 15-minute slot within branch hours, up to 2 days ahead.
 *
 * Pure functions: `now` is always passed in, so the server can re-check the
 * customer's choice with its own clock. All times are Manila time (UTC+8, no
 * daylight saving), so plain arithmetic is exact.
 */

export const SLOT_MINUTES = 15;
/** The earliest slot is at least this far from now (time to brew and pack). */
export const LEAD_MINUTES = 20;
/** Today plus this many following days. */
export const DAYS_AHEAD = 2;
/** ASAP stops this long before closing; the last slot is the same. */
export const LAST_ORDER_MINUTES = 15;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MANILA_OFFSET_MS = 8 * 60 * MINUTE_MS;
export const MANILA_TIME_ZONE = "Asia/Manila";

export type BranchHours = {
  /** 24-hour "HH:MM", Manila time. */
  opensAt: string;
  /** 24-hour "HH:MM", Manila time. Must be later than opensAt. */
  closesAt: string;
};

function minutesOf(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new RangeError(`Expected 24-hour "HH:MM", got "${time}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Epoch milliseconds of midnight in Manila on the day `now` falls on. */
function manilaMidnight(now: Date): number {
  const local = now.getTime() + MANILA_OFFSET_MS;
  return local - (((local % DAY_MS) + DAY_MS) % DAY_MS) - MANILA_OFFSET_MS;
}

/** Opening and closing time (epoch ms) on the Manila day `dayOffset` days from now. */
function openingOn(hours: BranchHours, now: Date, dayOffset: number) {
  const opens = minutesOf(hours.opensAt);
  const closes = minutesOf(hours.closesAt);
  if (closes <= opens) {
    throw new RangeError("Closing time must be after opening time.");
  }
  const midnight = manilaMidnight(now) + dayOffset * DAY_MS;
  return {
    opensAt: midnight + opens * MINUTE_MS,
    closesAt: midnight + closes * MINUTE_MS,
  };
}

/** True when an ASAP order can be placed now: open, and not in the last 15 minutes. */
export function isAsapAvailable(hours: BranchHours, now: Date): boolean {
  const { opensAt, closesAt } = openingOn(hours, now, 0);
  const time = now.getTime();
  return time >= opensAt && time < closesAt - LAST_ORDER_MINUTES * MINUTE_MS;
}

/** Every slot the customer may pick, earliest first. */
export function scheduleSlots(hours: BranchHours, now: Date): Date[] {
  const earliest = now.getTime() + LEAD_MINUTES * MINUTE_MS;
  const slots: Date[] = [];
  for (let day = 0; day <= DAYS_AHEAD; day++) {
    const { opensAt, closesAt } = openingOn(hours, now, day);
    const last = closesAt - LAST_ORDER_MINUTES * MINUTE_MS;
    for (let t = opensAt; t <= last; t += SLOT_MINUTES * MINUTE_MS) {
      if (t >= earliest) slots.push(new Date(t));
    }
  }
  return slots;
}

/** True when `slot` is exactly one of the slots offered at `now`. */
export function isValidSlot(
  hours: BranchHours,
  slot: Date,
  now: Date,
): boolean {
  const time = slot.getTime();
  return scheduleSlots(hours, now).some((s) => s.getTime() === time);
}

const timeFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIME_ZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
});

/** "Today", "Tomorrow", or e.g. "Monday, Nov 17" (Manila days). */
export function formatSlotDay(slot: Date, now: Date): string {
  const days = Math.round(
    (manilaMidnight(slot) - manilaMidnight(now)) / DAY_MS,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return dayFormat.format(slot);
}

/** "7:15 AM", in Manila time. */
export function formatSlotTime(slot: Date): string {
  return timeFormat
    .format(slot)
    .replace(/\s?([ap])\.?m\.?$/i, (_, p) => ` ${String(p).toUpperCase()}M`);
}

/** "Today, 7:15 AM". */
export function formatSlot(slot: Date, now: Date): string {
  return `${formatSlotDay(slot, now)}, ${formatSlotTime(slot)}`;
}
