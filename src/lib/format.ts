/**
 * Display formatting for dates and times. Money formatting (formatPeso) lives
 * in ./money.ts.
 */

/** 24-hour "HH:MM" -> "7:00 AM" / "10:00 PM". */
export function formatTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new RangeError(`Expected 24-hour "HH:MM", got "${time}"`);
  }
  const hours = Number(match[1]);
  const period = hours < 12 ? "AM" : "PM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${match[2]} ${period}`;
}
